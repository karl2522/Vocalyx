import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';
import { registerAllModules } from 'handsontable/registry';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BsFileEarmarkSpreadsheet, BsFiletypeCsv, BsFiletypeXlsx } from 'react-icons/bs';
import { FiCheckCircle, FiDownload, FiFileText, FiFilter, FiInfo, FiMaximize, FiMinimize, FiUpload, FiX } from 'react-icons/fi';
import { HiSwitchHorizontal } from 'react-icons/hi';
import { MdDragIndicator, MdOutlineClass } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { classService } from '../services/api';
import DashboardLayout from './layouts/DashboardLayout';

registerAllModules();

const MAX_VISIBLE_ROWS = 100; 
const LAZY_LOAD_THRESHOLD = 50; 

// Add CSS for animations
const styleElement = document.createElement('style');
styleElement.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }
  
  .animate-pulse-custom {
    animation: pulse 2s infinite;
  }
`;
document.head.appendChild(styleElement);

const ClassDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [visibleRowCount, setVisibleRowCount] = useState(MAX_VISIBLE_ROWS);
  const hotTableRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportFileName, setExportFileName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewTab, setPreviewTab] = useState('info');
  const [previewRowsToShow, setPreviewRowsToShow] = useState(10);
  const [exportPreviewData, setExportPreviewData] = useState(null);
  const [excelFiles, setExcelFiles] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedData = useRef(null);
  const [detectedNameColumn, setDetectedNameColumn] = useState(null);
  const [customColumns, setCustomColumns] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [newColumnMaxScore, setNewColumnMaxScore] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const visibleData = useMemo(() => {
    if (!excelData) return null;
    
    if (excelData.data.length <= visibleRowCount) {
      return excelData.data;
    }
    
    return excelData.data.slice(0, visibleRowCount);
  }, [excelData, visibleRowCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (isDropdownOpen && !event.target.closest('.relative')) {
            setIsDropdownOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isDropdownOpen]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            const [classResponse, excelResponse] = await Promise.all([
                classService.getClassById(id),
                classService.getClassExcelFiles(id)
            ]);
            
            setClassData(classResponse.data);
            
            // If there are excel files, load the most recent one
            if (excelResponse.data.length > 0) {
                setExcelFiles(excelResponse.data);
                const latestFile = excelResponse.data[0]; // Assuming they're sorted by date
                
                // Set the excel data
                const headers = Object.keys(latestFile.sheet_data[0] || {});
                const data = latestFile.sheet_data.map(row => 
                    headers.map(header => row[header])
                );
                
                setExcelData({
                    headers,
                    data,
                    fileId: latestFile.id
                });
                setSelectedFile({ name: latestFile.file_name });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.status === 404) {
                navigate('/dashboard/courses', { replace: true });
            }
            setError(error.response?.data?.error || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, [id, navigate]);

  useEffect(() => {
    if (!excelData || excelData.data.length <= MAX_VISIBLE_ROWS) return;
    
    const handleScroll = (e) => {
      const container = e.target;
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
      if (scrollHeight - scrollPosition < LAZY_LOAD_THRESHOLD * 28) {
        if (visibleRowCount < excelData.data.length) {
          setVisibleRowCount(prev => Math.min(prev + LAZY_LOAD_THRESHOLD, excelData.data.length));
        }
      }
    };
    
    const tableContainer = document.querySelector('.excel-data-container .overflow-auto');
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
      return () => tableContainer.removeEventListener('scroll', handleScroll);
    }
  }, [excelData, visibleRowCount]);
  
  useEffect(() => {
    setVisibleRowCount(MAX_VISIBLE_ROWS);
  }, [activeSheet]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv'));
    
    if (validFiles.length > 0) {
      handleFileUpload(validFiles[0]);
    }
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      handleFileUpload(selectedFiles[0]);
    }
  };

  
  const handleDataChange = async (changes, source) => {
    // Ignore loadData events and null changes
    if (source === 'loadData' || !changes || changes.length === 0) return;
    
    // Only proceed if there are actual changes
    const hasChanges = changes.some(([, , oldValue, newValue]) => oldValue !== newValue);
    if (!hasChanges) return;

    try {
        setIsSaving(true);
        const currentData = hotTableRef.current.hotInstance.getData();
        
        const formattedData = currentData.map(row => {
            const rowData = {};
            excelData.headers.forEach((header, index) => {
                let value = row[index];
                if (value === "") {
                    value = null;
                } else if (typeof value === "string" && !isNaN(value)) {
                    value = Number(value);
                }
                rowData[header] = value;
            });
            return rowData;
        });

        const currentDataString = JSON.stringify(formattedData);
        if (currentDataString === lastSavedData.current) {
            setIsSaving(false);
            return;
        }

        console.log('Sending data update:', formattedData);

        await classService.updateExcelData(excelData.fileId, formattedData);
        
        lastSavedData.current = currentDataString;
        
        setExcelData(prev => ({
            ...prev,
            data: currentData
        }));

        setError(null);
    } catch (error) {
        console.error('Failed to update data:', error);
        console.error('Error details:', error.response?.data); 
        setError(error.response?.data?.error || 'Failed to save changes. Please try again.');
    } finally {
        setIsSaving(false);
    }
};
  const safeProcessWorksheet = (worksheet) => {
    if (!worksheet || !worksheet['!ref']) {
      return { headers: ['No data'], data: [] };
    }
    
    try {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const totalRows = range.e.r - range.s.r + 1;
      const totalCols = range.e.c - range.s.c + 1;
      
      setFileStats({ totalRows, totalCols });
      
      let headers = [];
      let data = [];
      
      // First, create default headers (in case header extraction fails)
      headers = Array(totalCols).fill().map((_, idx) => `Column ${idx + 1}`);
      
      // Now try to extract actual headers from first row
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v !== undefined) {
          // Make sure header is a string
          headers[c - range.s.c] = String(cell.v);
        }
      }
      
      // Extract data rows (starting from the second row)
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        let rowData = Array(totalCols).fill('');
        let hasData = false;
        
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined) {
            // Convert cell to appropriate string representation
            if (typeof cell.v === 'object') {
              try {
                rowData[c - range.s.c] = JSON.stringify(cell.v);
              } catch {
                rowData[c - range.s.c] = String(cell.v);
              }
            } else {
              rowData[c - range.s.c] = cell.v;
            }
            hasData = true;
          }
        }
        
        // Only add rows that have at least one non-empty cell
        if (hasData) {
          data.push(rowData);
        }
        
        // Stop if we've processed enough rows for initial display
        if (data.length >= MAX_VISIBLE_ROWS * 10) {
          break;
        }
      }
      
      return { headers, data };
    } catch (err) {
      console.error("Error processing worksheet:", err);
      return { headers: ['Error'], data: [] };
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // First show preview
    setSelectedFile(file);
    setError(null);
    setPreviewError(null);
    
    // Create preview info
    const previewData = {
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || getFileTypeFromExtension(file.name),
        lastModified: new Date(file.lastModified).toLocaleString()
    };
    
    setPreviewInfo(previewData);
    setShowPreview(true);
    
    // Try to generate a data preview
    try {
        const reader = new FileReader();
        
        reader.onload = async (event) => {  // Made this async
            try {
                if (!event.target || !event.target.result) {
                    throw new Error("Failed to read file for preview");
                }
                
                // Parse the Excel file
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    raw: true,
                    cellDates: true,
                    cellNF: false,
                    cellStyles: false
                });
                
                // Get sheet names
                const sheetNames = workbook.SheetNames || [];
                if (!sheetNames.length) {
                    throw new Error("No sheets found in Excel file");
                }
                
                // Process first sheet for preview (only first few rows)
                const firstSheet = workbook.Sheets[sheetNames[0]];
                
                // Extract a limited number of rows for preview
                const preview = extractPreviewData(firstSheet);
                setPreviewData(preview);

                // Add server upload here
                setFileLoading(true);
                try {
                    const response = await classService.uploadExcel(file, id);
                    
                    const { id: fileId, sheet_data, file_name } = response.data;
                    
                    // Add new file to excelFiles list
                    setExcelFiles(prev => [{
                        id: fileId,
                        file_name,
                        sheet_data,
                        uploaded_at: new Date().toISOString()
                    }, ...prev]);
                    
                    const headers = Object.keys(sheet_data[0] || {});
                    const data = sheet_data.map(row => 
                        headers.map(header => row[header])
                    );
                    
                    setExcelData({
                        headers,
                        data,
                        fileId
                    });
                } catch (uploadError) {
                    console.error("File upload error:", uploadError);
                    setError(uploadError.response?.data?.error || 'Failed to upload file');
                } finally {
                    setFileLoading(false);
                }
                
            } catch (error) {
                console.error("Preview generation error:", error);
                setPreviewError(`Couldn't generate preview: ${error.message}`);
            }
        };
        
        reader.onerror = () => {
            setPreviewError("Error reading file for preview");
        };
        
        // Read the file
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        console.error("Preview error:", error);
        setPreviewError(`Preview error: ${error.message}`);
    }
};
  
  // Extract a limited preview of data from a worksheet
  const extractPreviewData = (worksheet) => {
    // If no worksheet or no reference, return empty data
    if (!worksheet || !worksheet['!ref']) {
      return { headers: [], data: [] };
    }
    
    try {
      // Get the range
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      // Prepare headers and data arrays
      let headers = [];
      let data = [];
      
      // Calculate how many rows to extract for preview (max 50 for preview, but initially only show 10)
      const maxExtractRows = Math.min(50, range.e.r - range.s.r);
      
      // First, extract headers from first row
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v !== undefined) {
          // Make sure header is a string
          headers.push(String(cell.v));
        } else {
          // Use default header if cell is empty
          headers.push(`Column ${c + 1}`);
        }
      }
      
      // Extract data rows for preview (starting from the second row)
      for (let r = range.s.r + 1; r <= range.s.r + maxExtractRows && r <= range.e.r; r++) {
        let rowData = [];
        
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined) {
            // Format cell value appropriately
            if (cell.t === 'd' && cell.v instanceof Date) {
              // Format date
              rowData.push(cell.v.toLocaleString());
            } else if (typeof cell.v === 'object') {
              try {
                rowData.push(JSON.stringify(cell.v));
              } catch {
                rowData.push(String(cell.v));
              }
            } else {
              rowData.push(cell.v);
            }
          } else {
            // Empty cell
            rowData.push('');
          }
        }
        
        data.push(rowData);
      }
      
      return {
        headers,
        data,
        totalColumns: headers.length,
        totalRows: range.e.r - range.s.r,
        sheetName: worksheet['!Name'] || 'Sheet1'
      };
      
    } catch (err) {
      console.error("Error processing worksheet for preview:", err);
      return { headers: [], data: [] };
    }
  };
  
  // Show more rows in the preview
  const handleShowMoreRows = () => {
    setPreviewRowsToShow(prev => Math.min(prev + 10, previewData.data.length));
  };
  
  // Reset rows to show when changing preview
  useEffect(() => {
    if (previewTab === 'data') {
      setPreviewRowsToShow(10);
    }
  }, [previewTab]);
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getFileTypeFromExtension = (filename) => {
    if (filename.endsWith('.xlsx')) return 'Excel Workbook';
    if (filename.endsWith('.xls')) return 'Excel 97-2003 Workbook';
    if (filename.endsWith('.csv')) return 'CSV File';
    return 'Spreadsheet File';
  };
  
  const processSelectedFile = () => {
    if (!selectedFile) return;
    
    setFileLoading(true);
    setShowPreview(false);
    setExcelData(null);
    setSheets([]);
    setActiveSheet(0);
    
    // Initialize progress tracking
    setImportProgress(0);
    setImportStage('Reading file...');
    
    // Create detailed progress updates
    const progressStages = [
      { stage: 'Reading file...', targetProgress: 20 },
      { stage: 'Processing data...', targetProgress: 40 },
      { stage: 'Analyzing columns...', targetProgress: 60 },
      { stage: 'Preparing spreadsheet...', targetProgress: 80 },
      { stage: 'Finalizing import...', targetProgress: 95 }
    ];
    
    let currentStageIndex = 0;
    
    // Progress animation function
    const animateProgress = () => {
      const currentStage = progressStages[currentStageIndex];
      const nextProgress = Math.min(
        currentStage.targetProgress,
        importProgress + Math.random() * 2
      );
      
      setImportProgress(nextProgress);
      
      // Move to next stage if we've reached the target for current stage
      if (nextProgress >= currentStage.targetProgress && currentStageIndex < progressStages.length - 1) {
        currentStageIndex++;
        setImportStage(progressStages[currentStageIndex].stage);
      }
      
      // Continue animation if not at 100%
      if (nextProgress < 100) {
        setTimeout(animateProgress, 100);
      }
    };
    
    // Start progress animation
    animateProgress();

    try {
      // Create a FileReader to read the file data
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (!event.target || !event.target.result) {
            throw new Error("Failed to read file");
          }
          
          setImportStage('Processing Excel data...');
          
          // Parse the Excel file using a safe approach with minimal options
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            raw: true,
            cellDates: true,
            cellNF: false,
            cellStyles: false
          });
          
          // Get sheet names and validate
          const sheetNames = workbook.SheetNames || [];
          if (!sheetNames.length) {
            throw new Error("No sheets found in Excel file");
          }
          
          setSheets(sheetNames);
          
          // Process the first sheet
          const firstSheet = workbook.Sheets[sheetNames[0]];
          
          setImportStage('Analyzing student data...');
          
          const parsedData = safeProcessWorksheet(firstSheet);
          
          if (!parsedData.data.length) {
            throw new Error("No data found in Excel sheet");
          }
          
          // Apply custom columns if any were defined
          if (customColumns.length > 0) {
            // Add the custom columns to the headers
            parsedData.headers = [...parsedData.headers, ...customColumns.map(col => col.name)];
            
            // Add empty cells for the new columns in each row
            parsedData.data = parsedData.data.map(row => {
              return [...row, ...customColumns.map(() => '')];
            });
          }
          
          setImportStage('Finalizing import...');
          setImportProgress(100);
          
          // Delay to show the complete progress animation
          setTimeout(() => {
          setExcelData(parsedData);
          setFileLoading(false);
          setImportProgress(0);
            setImportStage('');
            setCustomColumns([]);
          }, 500);
          
        } catch (error) {
          console.error("Excel processing error:", error);
          setError(`Failed to process Excel file: ${error.message}`);
          setFileLoading(false);
          setImportProgress(0);
          setImportStage('');
        }
      };
      
      reader.onerror = () => {
        setError("Error reading file");
        setFileLoading(false);
        setImportProgress(0);
        setImportStage('');
      };
      
      // Read the file as an array buffer
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("File upload error:", error);
      setError(`File upload error: ${error.message}`);
      setFileLoading(false);
      setImportProgress(0);
      setImportStage('');
    }
  };
  
  const cancelImport = () => {
    // Reset all states related to import
    setSelectedFile(null);
    setShowPreview(false);
    setPreviewInfo(null);
    setImportProgress(0);
};

const handleFileSwitch = (file) => {
  const headers = Object.keys(file.sheet_data[0] || {});
  const data = file.sheet_data.map(row => 
      headers.map(header => row[header])
  );
  
  setSelectedFile({ name: file.file_name });
  setExcelData({
      headers,
      data,
      fileId: file.id
  });
};

  const handleChangeSheet = (sheetIndex) => {
    if (!selectedFile || sheetIndex === activeSheet || sheetIndex >= sheets.length) {
      return;
    }
    
    setFileLoading(true);
    setActiveSheet(sheetIndex);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (!event.target || !event.target.result) {
            throw new Error("Failed to read file");
          }
          
          // Parse the Excel file
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            raw: true,
            cellDates: true,
            cellNF: false,
            cellStyles: false
          });
          
          // Get the selected sheet
          const selectedSheetName = sheets[sheetIndex];
          const selectedSheet = workbook.Sheets[selectedSheetName];
          
          if (!selectedSheet) {
            throw new Error(`Sheet "${selectedSheetName}" not found`);
          }
          
          // Process the sheet data
          const parsedData = safeProcessWorksheet(selectedSheet);
          setExcelData(parsedData);
          setFileLoading(false);
        } catch (error) {
          console.error("Error processing sheet:", error);
          setError(`Failed to process sheet: ${error.message}`);
          setFileLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError("Error reading file");
        setFileLoading(false);
      };
      
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("Sheet change error:", error);
      setError(`Failed to change sheet: ${error.message}`);
      setFileLoading(false);
    }
  };

  const handleExport = async () => {
    if (!excelData?.fileId) return;
    
    // Generate a preview of the export data
    const previewRowCount = Math.min(5, excelData.data.length);
    const previewData = {
      headers: excelData.headers,
      rows: excelData.data.slice(0, previewRowCount),
      totalRows: excelData.data.length,
      totalColumns: excelData.headers.length
    };
    setExportPreviewData(previewData);
    
    // Show export options dialog
    setExportFileName(selectedFile.name.split('.')[0] || 'export');
    setShowExportOptions(true);
  };
  
  const processExport = () => {
    if (!excelData || !excelData.data.length) {
      return;
    }
    
    try {
      setExportLoading(true);
      setShowExportOptions(false);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Get current data from the HotTable instance if available
      let dataToExport = excelData.data;
      if (hotTableRef.current && hotTableRef.current.hotInstance) {
        const hotData = hotTableRef.current.hotInstance.getData();
        if (Array.isArray(hotData) && hotData.length) {
          dataToExport = hotData;
        }
      }
      
      // Convert data to worksheet format
      const ws = XLSX.utils.aoa_to_sheet([excelData.headers, ...dataToExport]);
      
      // Add worksheet to workbook
      const sheetName = sheets[activeSheet] || "Data";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate file name with selected extension
      const fileName = `${exportFileName || 'export'}.${exportFormat}`;
      
      // Use setTimeout to show loading animation
      setTimeout(() => {
        // Write file and trigger download
        XLSX.writeFile(wb, fileName);
        setExportLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Export error:", error);
      setError(`Failed to export data: ${error.message}`);
      setExportLoading(false);
    }
  };
  
  const cancelExport = async () => {
    setShowExportOptions(false);
    try {
      setExportLoading(true);
      setShowExportOptions(false);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Get current data from the HotTable instance if available
      let dataToExport = excelData.data;
      if (hotTableRef.current && hotTableRef.current.hotInstance) {
        const hotData = hotTableRef.current.hotInstance.getData();
        if (Array.isArray(hotData) && hotData.length) {
          dataToExport = hotData;
        }
      }
      
      // Convert data to worksheet format
      const ws = XLSX.utils.aoa_to_sheet([excelData.headers, ...dataToExport]);
      
      // Add worksheet to workbook
      const sheetName = sheets[activeSheet] || "Data";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate file name with selected extension
      const fileName = `${exportFileName || 'export'}.${exportFormat}`;
      
      // Use setTimeout to show loading animation
      setTimeout(() => {
        // Write file and trigger download
        XLSX.writeFile(wb, fileName);
        setExportLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Export error:", error);
      setError(`Failed to export data: ${error.message}`);
      setExportLoading(false);
    }
  };
  
  // We'll use this function later when implementing data reset functionality
  // const handleClearData = () => {
  //   setExcelData(null);
  //   setSelectedFile(null);
  //   setFileStats(null);
  //   setSheets([]);
  //   setActiveSheet(0);
  //   setVisibleRowCount(MAX_VISIBLE_ROWS);
  // };

  const handleAddColumnTemplate = (templateType) => {
    let newColumns = [];
    
    switch(templateType) {
      case 'quizzes':
        newColumns = [
          { id: `quiz_1_${Date.now()}`, name: 'Quiz 1 (10 pts)', type: 'number', maxScore: 10 },
          { id: `quiz_2_${Date.now()}`, name: 'Quiz 2 (10 pts)', type: 'number', maxScore: 10 },
          { id: `quiz_3_${Date.now()}`, name: 'Quiz 3 (10 pts)', type: 'number', maxScore: 10 },
          { id: `quiz_avg_${Date.now()}`, name: 'Quiz Average', type: 'formula', formula: 'AVERAGE' }
        ];
        break;
      case 'labs':
        newColumns = [
          { id: `lab_1_${Date.now()}`, name: 'Lab 1 (20 pts)', type: 'number', maxScore: 20 },
          { id: `lab_2_${Date.now()}`, name: 'Lab 2 (20 pts)', type: 'number', maxScore: 20 },
          { id: `lab_3_${Date.now()}`, name: 'Lab 3 (20 pts)', type: 'number', maxScore: 20 },
          { id: `lab_avg_${Date.now()}`, name: 'Lab Average', type: 'formula', formula: 'AVERAGE' }
        ];
        break;
      case 'exams':
        newColumns = [
          { id: `midterm_${Date.now()}`, name: 'Midterm (50 pts)', type: 'number', maxScore: 50 },
          { id: `final_${Date.now()}`, name: 'Final (100 pts)', type: 'number', maxScore: 100 },
          { id: `total_${Date.now()}`, name: 'Total (150 pts)', type: 'formula', formula: 'SUM' }
        ];
        break;
      default:
        return;
    }
    
    setCustomColumns(prev => [...prev, ...newColumns]);
  };

  // Add this right after your existing useEffect hooks
  useEffect(() => {
    // Auto-detect potential name columns when preview data is available
    if (previewData && previewData.headers && previewData.headers.length > 0) {
      // Look for common student name column patterns
      const namePatterns = ['name', 'student', 'learner', 'pupil', 'full name', 'first name', 'last name'];
      
      // Find the first column header that matches our patterns
      const potentialNameColumn = previewData.headers.findIndex(header => 
        namePatterns.some(pattern => 
          header.toLowerCase().includes(pattern.toLowerCase())
        )
      );
      
      if (potentialNameColumn !== -1) {
        setDetectedNameColumn(potentialNameColumn);
      }
    }
  }, [previewData]);

  const handleAddCustomColumn = () => {
    if (newColumnName.trim()) {
      let columnName = newColumnName.trim();
      
      // Add max score to column name if provided for number type
      if (newColumnType === 'number' && newColumnMaxScore) {
        columnName = `${columnName} (${newColumnMaxScore} pts)`;
      }
      
      const newColumn = {
        id: `custom_${Date.now()}`,
        name: columnName,
        type: newColumnType,
        ...(newColumnType === 'number' && newColumnMaxScore ? { maxScore: parseFloat(newColumnMaxScore) } : {})
      };
      
      setCustomColumns(prev => [...prev, newColumn]);
      setNewColumnName('');
      setNewColumnMaxScore('');
      setShowAddColumnModal(false);
    }
  };

  // Function to handle full screen toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Automatically go to full screen after import
  useEffect(() => {
    if (excelData && !isFullScreen) {
      setIsFullScreen(true);
    }
  }, [excelData]);

  // Render the full screen Excel view
  const renderExcelView = () => {
    return (
      <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
        <div className={`${isFullScreen ? 'h-screen flex flex-col' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFullScreen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <FiX size={24} />
              </button>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-3">
                  <BsFileEarmarkSpreadsheet className="h-5 w-5 text-[#333D79]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {selectedFile?.name || 'Excel Data'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {fileStats ? 
                      `${fileStats.totalRows.toLocaleString()} rows × ${fileStats.totalCols.toLocaleString()} columns` :
                      `${excelData.data.length.toLocaleString()} rows × ${excelData.headers.length} columns`
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExport}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <FiDownload size={18} />
                <span>Export</span>
              </button>
              <button
                onClick={toggleFullScreen}
                className="bg-[#333D79] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A5491] transition-colors"
              >
                {isFullScreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
                <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
            </div>
          </div>

          {/* Sheet tabs */}
          {sheets.length > 1 && (
            <div className="border-b bg-white">
              <div className="flex overflow-x-auto">
                {sheets.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChangeSheet(idx)}
                    className={`px-4 py-2 flex items-center whitespace-nowrap ${
                      idx === activeSheet
                        ? 'border-b-2 border-[#333D79] text-[#333D79] font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {idx === activeSheet && <HiSwitchHorizontal className="mr-1.5" size={14} />}
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Excel Content */}
          <div className={`flex-1 overflow-hidden ${isFullScreen ? 'h-full' : ''}`}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                <div className="flex items-center text-sm text-gray-500">
                  <FiFilter className="mr-2" />
                  <span>Use filters and context menu for advanced operations</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <HotTable
                  ref={hotTableRef}
                  data={visibleData || []}
                  colHeaders={excelData.headers}
                  rowHeaders={true}
                  height="100%"
                  width="100%"
                  licenseKey="non-commercial-and-evaluation"
                  className="htCustom"
                  stretchH="all"
                  autoColumnSize={false}
                  colWidths={120}
                  readOnly={false}
                  manualColumnResize={true}
                  manualRowResize={true}
                  filters={true}
                  dropdownMenu={true}
                  contextMenu={true}
                  columnSorting={true}
                  sortIndicator={true}
                  afterChange={handleDataChange}
                  rowHeights={28}
                  fixedRowsTop={0}
                  fixedColumnsLeft={0}
                  wordWrap={true}
                  outsideClickDeselects={false}
                  columnHeaderHeight={40}
                  afterGetColHeader={(col, TH) => {
                    TH.className = 'htCenter htMiddle font-medium text-gray-700';
                  }}
                  settings={{
                    minRows: 10,
                    minCols: excelData.headers.length,
                    minSpareRows: 0,
                    minSpareCols: 0,
                    renderAllRows: false,
                    viewportColumnRenderingOffset: 10,
                    viewportRowRenderingOffset: 10,
                    preventOverflow: 'horizontal'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#333D79]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Show the full screen Excel view when in full screen mode */}
      {isFullScreen && excelData ? (
        renderExcelView()
      ) : loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#333D79]"></div>
        </div>
      ) : (
        <>
          <div className="pb-6">
            {/* Breadcrumb navigation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <div className="flex items-center text-sm">
                  <a 
                    href="/dashboard/courses" 
                    className="text-gray-500 hover:text-[#333D79]"
                  >
                    Courses
                  </a>
                  <span className="mx-2 text-gray-400">/</span>
                  <span className="font-medium text-[#333D79]">{classData?.name}</span>
                </div>
              </div>
              
              {/* Class header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
                  <MdOutlineClass className="h-6 w-6 text-[#333D79]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{classData.name}</h1>
                  <p className="text-sm text-gray-500">
                    {excelData 
                      ? `Showing data from: ${selectedFile ? selectedFile.name : 'Imported file'}`
                      : `Last updated: ${classData.lastUpdated}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                {excelData ? (
                    <>
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <FiFileText size={18} />
                                <span>Switch File ({excelFiles.length})</span>
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1 max-h-60 overflow-auto">
                                        {excelFiles.map(file => (
                                            <button
                                                key={file.id}
                                                onClick={() => {
                                                    handleFileSwitch(file);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                                    file.id === excelData.fileId ? 'bg-[#EEF0F8] text-[#333D79]' : 'text-gray-700'
                                                }`}
                                            >
                                                {file.file_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <label htmlFor="add-file" className="cursor-pointer">
                            <div className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:bg-gray-50">
                                <FiUpload size={18} />
                                <span>Add File</span>
                            </div>
                            <input 
                                id="add-file" 
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                className="hidden"
                                onChange={handleFileInput}
                            />
                        </label>
                        <button
                            onClick={handleExport}
                            className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <FiDownload size={18} />
                            <span>Export Data</span>
                        </button>
                    </>
                ) : (
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                            <FiUpload size={18} />
                            <span>Import Files</span>
                        </div>
                        <input 
                            id="file-upload" 
                            type="file" 
                            accept=".xlsx,.xls,.csv" 
                            className="hidden"
                            onChange={handleFileInput}
                        />
                    </label>
                )}
            </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 flex justify-between items-center">
                <div>{error}</div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-800 hover:text-red-900"
                >
                  <FiX size={18} />
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-50 rounded-full opacity-20 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-50 rounded-full opacity-20 blur-3xl"></div>
              
              <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#EEF0F8] to-[#DCE3F9] flex items-center justify-center mr-3 shadow-sm">
                    {excelData ? (
                      <BsFileEarmarkSpreadsheet className="h-5 w-5 text-[#333D79]" />
                    ) : (
                      <MdOutlineClass className="h-5 w-5 text-[#333D79]" />
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800 relative">
                  {excelData ? 'Excel Data' : 'Class Data'}
                    <div className="absolute -top-1 -right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              </h2>
                </div>
                {selectedFile && (
                  <div className="text-sm text-gray-500 flex items-center px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-colors">
                    <FiFileText className="mr-2 text-[#333D79]" />
                    {selectedFile.name}
                  </div>
                )}
              </div>

              {fileLoading ? (
                <div className="flex flex-col items-center justify-center py-12 relative z-10">
                  <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 border-4 border-[#EEF0F8] border-t-[#333D79] rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BsFileEarmarkSpreadsheet className="h-8 w-8 text-[#333D79]" />
                    </div>
                  </div>
                    <h3 className="text-lg font-medium text-gray-800 text-center mb-2">{importStage || 'Processing your file...'}</h3>
                    <p className="text-sm text-gray-500 mb-4 text-center">This may take a moment for larger files</p>
                    
                    <div className="space-y-5 mb-4">
                      <div className="flex items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${importProgress >= 20 ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {importProgress >= 20 ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-700">Reading File</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 my-1.5">
                            <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, importProgress <= 20 ? importProgress * 5 : 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${importProgress >= 40 ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {importProgress >= 40 ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-700">Processing Data</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 my-1.5">
                            <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, importProgress <= 40 ? Math.max(0, (importProgress - 20) * 5) : 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${importProgress >= 60 ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {importProgress >= 60 ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-700">Analyzing Columns</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 my-1.5">
                            <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, importProgress <= 60 ? Math.max(0, (importProgress - 40) * 5) : 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${importProgress >= 80 ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {importProgress >= 80 ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-700">Preparing Spreadsheet</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 my-1.5">
                            <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, importProgress <= 80 ? Math.max(0, (importProgress - 60) * 5) : 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${importProgress >= 100 ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {importProgress >= 100 ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-700">Finalizing Import</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 my-1.5">
                            <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, importProgress <= 100 ? Math.max(0, (importProgress - 80) * 5) : 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-xs text-gray-500">{Math.round(importProgress)}% complete</p>
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {importStage || 'Processing...'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : !excelData ? (
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center relative z-10 ${
                    isDragging ? 'border-[#333D79] bg-[#EEF0F8] bg-opacity-30' : 'border-gray-300 bg-gradient-to-b from-gray-50 to-white'
                  } transition-all duration-300 backdrop-blur-sm`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="absolute top-5 right-10 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                  <div className="absolute bottom-10 left-10 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`mb-4 rounded-full bg-gradient-to-br from-[#333D79] to-[#4A5491] p-4 ${isDragging ? 'animate-pulse-custom transform scale-110' : ''} transition-all duration-300 shadow-md`}>
                      <MdDragIndicator className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2 relative">
                      Import Students
                      <div className="absolute -top-1 -right-4 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-md">
                      Upload a spreadsheet with your student data to get started
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <label htmlFor="file-upload-placeholder" className="cursor-pointer">
                        <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] hover:from-[#4A5491] hover:to-[#333D79] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow transform hover:-translate-y-0.5">
                          <FiUpload size={18} className="transform group-hover:rotate-12 transition-transform" />
                          <span>Upload Students</span>
                        </div>
                        <input 
                          id="file-upload-placeholder" 
                          type="file" 
                          accept=".xlsx,.xls,.csv" 
                          className="hidden"
                          onChange={handleFileInput}
                        />
                      </label>
                    </div>
                    <div className="text-xs flex items-center gap-1 mt-2 px-3 py-1.5 bg-white bg-opacity-70 rounded-full shadow-sm backdrop-blur-sm">
                      <FiInfo className="text-[#333D79]" size={12} />
                      <span className="text-gray-500">Supported formats: </span>
                      <span className="font-medium text-[#333D79]">.xlsx</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-medium text-[#333D79]">.xls</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-medium text-[#333D79]">.csv</span>
                      </div>
                  </div>
                </div>
              ) : (
                <div className="excel-data-container">
                  {/* Sheet tabs */}
                  {sheets.length > 1 && (
                    <div className="mb-4 border-b overflow-x-auto">
                      <div className="flex">
                        {sheets.map((sheet, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleChangeSheet(idx)}
                            className={`px-4 py-2 flex items-center whitespace-nowrap ${
                              idx === activeSheet
                                ? 'border-b-2 border-[#333D79] text-[#333D79] font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {idx === activeSheet && <HiSwitchHorizontal className="mr-1.5" size={14} />}
                            {sheet}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <FiFilter className="mr-2" />
                      <span>Use filters and context menu for advanced operations</span>
                    </div>
                    <div className="bg-[#F5F7FB] px-3 py-1.5 rounded-md text-sm text-gray-600 font-medium">
                      {fileStats ? 
                        `${fileStats.totalRows.toLocaleString()} rows × ${fileStats.totalCols.toLocaleString()} columns` :
                        `${excelData.data.length.toLocaleString()} rows × ${excelData.headers.length} columns`
                      }
                      {excelData.data.length > visibleRowCount && 
                        ` (showing ${visibleRowCount.toLocaleString()} rows)`}
                    </div>
                  </div>
                  
                  <div className="relative mb-4">
                    <div className="overflow-auto border rounded-lg shadow-sm" style={{ maxHeight: '70vh', maxWidth: '100%' }}>
                      <div style={{ minWidth: '100%', width: Math.max(excelData.headers.length * 120, 800) + 'px' }}>
                        <HotTable
                          ref={hotTableRef}
                          data={visibleData || []}
                          colHeaders={excelData.headers}
                          rowHeaders={true}
                          height="auto"
                          width="100%"
                          licenseKey="non-commercial-and-evaluation"
                          className="htCustom"
                          stretchH="none"
                          autoColumnSize={false}
                          colWidths={120}
                          readOnly={false}
                          manualColumnResize={true}
                          manualRowResize={true}
                          filters={true}
                          dropdownMenu={true}
                          contextMenu={true}
                          columnSorting={true}
                          sortIndicator={true}
                          afterChange={handleDataChange}
                          rowHeights={28}
                          fixedRowsTop={0}
                          fixedColumnsLeft={0}
                          wordWrap={true}
                          outsideClickDeselects={false}
                          columnHeaderHeight={40}
                          afterGetColHeader={(col, TH) => {
                            TH.className = 'htCenter htMiddle font-medium text-gray-700';
                          }}
                          settings={{
                            minRows: 10,
                            minCols: excelData.headers.length,
                            minSpareRows: 0,
                            minSpareCols: 0,
                            renderAllRows: false,
                            viewportColumnRenderingOffset: 10,
                            viewportRowRenderingOffset: 10,
                            preventOverflow: 'horizontal'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {excelData.data.length > visibleRowCount && (
                    <div className="text-center text-sm text-gray-500 mt-2">
                      <p>Showing {visibleRowCount.toLocaleString()} of {excelData.data.length.toLocaleString()} rows. Scroll down to load more rows.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isSaving && (
                <div className="fixed bottom-4 right-4 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-lg z-50">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#333D79] border-t-transparent"></div>
                        <span>Saving changes...</span>
                    </div>
                </div>
            )}

            {/* Mobile Recorded Data Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 pt-16 mb-8 relative overflow-hidden group">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-100 rounded-full opacity-20 blur-3xl"></div>
              <div className="absolute top-12 right-10 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              <div className="absolute bottom-10 left-10 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-20 right-20 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
              
              {/* Section Label */}
              <div className="absolute top-8 left-6 px-4 py-1.5 bg-[#333D79] text-white text-sm font-medium rounded-full shadow-md z-10 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
                </div>
              
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-20 h-20 mb-4 bg-gradient-to-br from-[#333D79] to-[#4A5491] rounded-2xl shadow-lg flex items-center justify-center transform rotate-3 relative hover:rotate-0 hover:scale-110 transition-all duration-300 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-10 w-10 animate-pulse-custom">
                    <path d="M12 16a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4zm0-12a2 2 0 0 1 2 2v5a2 2 0 1 1-4 0V6a2 2 0 0 1 2-2z"/>
                    <path d="M19 12a1 1 0 0 1-2 0 5 5 0 0 0-10 0 1 1 0 0 1-2 0 7 7 0 0 1 14 0z"/>
                    <path d="M12 20a8 8 0 0 1-8-8 1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 2 0 8 8 0 0 1-8 8z"/>
                  </svg>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-white bg-opacity-30 rounded-full"></div>
                  </div>
                <h3 className="text-gray-800 font-medium text-lg mb-2 relative">
                  No Recordings Yet
                  <div className="absolute -top-1 -right-4 w-2 h-2 bg-purple-500 rounded-full"></div>
                </h3>
                <p className="text-gray-500 text-sm max-w-md mb-6 leading-relaxed">
                  Recordings from mobile devices will appear here once they are uploaded. Use the Vocalyx mobile app to record and sync your classroom sessions.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-blue-200 cursor-pointer relative group/card">
                    <div className="w-8 h-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-2 group-hover/card:bg-gradient-to-r group-hover/card:from-[#EEF0F8] group-hover/card:to-[#DCE3F9] transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      </svg>
                  </div>
                    <p className="text-xs text-gray-600 text-center group-hover/card:text-[#333D79] transition-colors">Record audio with the mobile app</p>
                    <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover/card:opacity-10 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#333D79] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-blue-200 cursor-pointer relative group/card">
                    <div className="w-8 h-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-2 group-hover/card:bg-gradient-to-r group-hover/card:from-[#EEF0F8] group-hover/card:to-[#DCE3F9] transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
              </div>
                    <p className="text-xs text-gray-600 text-center group-hover/card:text-[#333D79] transition-colors">Sync data automatically to the cloud</p>
                    <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover/card:opacity-10 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#333D79] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-blue-200 cursor-pointer relative group/card">
                    <div className="w-8 h-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-2 group-hover/card:bg-gradient-to-r group-hover/card:from-[#EEF0F8] group-hover/card:to-[#DCE3F9] transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 text-center group-hover/card:text-[#333D79] transition-colors">Analyze speech data in the dashboard</p>
                    <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover/card:opacity-10 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#333D79] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Add Custom Column Modal */}
          {showAddColumnModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001] p-4 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddColumnModal(false);
                }
              }}
            >
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fadeIn">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-800">Add Custom Column</h3>
                  <button 
                    onClick={() => setShowAddColumnModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Enter column name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
                    <select
                      value={newColumnType}
                      onChange={(e) => setNewColumnType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number (Score)</option>
                      <option value="date">Date</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                  
                  {newColumnType === 'number' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Score</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={newColumnMaxScore}
                          onChange={(e) => setNewColumnMaxScore(e.target.value)}
                          placeholder="e.g., 100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                        />
                        <div className="ml-2 text-xs text-gray-500 flex-shrink-0">
                          <span className="bg-gray-100 px-2 py-1 rounded-md">Optional</span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Enter the maximum possible score for this column (e.g., 100 for percentage, 10 for points)
                      </p>
              </div>
            )}
          </div>
                
                  <div className="px-5 py-4 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAddColumnModal(false)}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCustomColumn}
                      className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors"
                    >
                      Add Column
                    </button>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
      
      {/* File Import Preview Modal */}
      {showPreview && previewInfo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal when clicking the backdrop (outside the modal)
            if (e.target === e.currentTarget) {
              cancelImport();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full animate-fadeIn h-[80vh] flex flex-col border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                  <FiFileText className="h-5 w-5 text-[#333D79]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">File Import</h3>
              </div>
              <button 
                onClick={cancelImport}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'info' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-500'} mb-2`}>
                    <span className="font-medium">1</span>
                  </div>
                  <span className={`text-xs ${previewTab === 'info' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>File Info</span>
                </div>
                
                <div className={`flex-1 h-1 mx-2 ${previewTab === 'info' ? 'bg-gray-200' : 'bg-[#333D79]'}`}></div>
                
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'data' ? 'bg-[#333D79] text-white' : previewTab === 'columns' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'} mb-2`}>
                    <span className="font-medium">2</span>
                  </div>
                  <span className={`text-xs ${previewTab === 'data' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Preview Data</span>
                </div>
                
                <div className={`flex-1 h-1 mx-2 ${previewTab === 'columns' ? 'bg-[#333D79]' : 'bg-gray-200'}`}></div>
                
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'columns' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-400'} mb-2`}>
                    <span className="font-medium">3</span>
                  </div>
                  <span className={`text-xs ${previewTab === 'columns' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Map Columns</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {previewTab === 'info' ? (
                <div className="h-full overflow-y-auto p-6">
                  <div className="flex flex-col md:flex-row gap-8 mb-8">
                    <div className="flex items-center justify-center flex-shrink-0 bg-[#F7F9FD] p-8 rounded-lg border border-gray-100 shadow-sm">
                      {previewInfo.name.endsWith('.xlsx') || previewInfo.name.endsWith('.xls') ? (
                        <BsFiletypeXlsx className="h-32 w-32 text-[#217346]" />
                      ) : previewInfo.name.endsWith('.csv') ? (
                        <BsFiletypeCsv className="h-32 w-32 text-[#333D79]" />
                      ) : (
                        <BsFileEarmarkSpreadsheet className="h-32 w-32 text-[#333D79]" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                        <span className="truncate">{previewInfo.name}</span>
                        <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                          {previewInfo.type.split(' ')[0]}
                        </span>
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <h5 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">File Details</h5>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                              <span className="text-sm text-gray-500">Size:</span>
                              <span className="text-sm font-medium text-gray-700">{previewInfo.size}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                              <span className="text-sm text-gray-500">Last modified:</span>
                              <span className="text-sm font-medium text-gray-700">{previewInfo.lastModified}</span>
                            </div>
                            {previewData && (
                              <>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                  <span className="text-sm text-gray-500">Total rows:</span>
                                  <span className="text-sm font-medium text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-full">{previewData.totalRows.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-500">Total columns:</span>
                                  <span className="text-sm font-medium text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-full">{previewData.totalColumns}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <h5 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Import Information</h5>
                          <ul className="space-y-2">
                            <li className="flex items-start">
                              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                                <span className="text-xs text-blue-600 font-bold">1</span>
                              </div>
                              <span className="text-sm text-gray-600">Data will be loaded into the spreadsheet editor</span>
                            </li>
                            <li className="flex items-start">
                              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                                <span className="text-xs text-blue-600 font-bold">2</span>
                              </div>
                              <span className="text-sm text-gray-600">Filter, sort, and modify columns and rows</span>
                            </li>
                            <li className="flex items-start">
                              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                                <span className="text-xs text-blue-600 font-bold">3</span>
                              </div>
                              <span className="text-sm text-gray-600">Save changes or export to a new file</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      {previewData && previewData.sheetName && (
                        <div className="text-xs bg-[#EEF0F8] text-[#333D79] px-3 py-1.5 rounded-md inline-block">
                          <span className="font-medium">Active Sheet:</span> {previewData.sheetName}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {previewError && (
                    <div className="bg-red-50 border border-red-100 text-red-800 rounded-lg p-4 mt-4 flex items-start">
                      <FiX className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Preview Error</p>
                        <p className="text-sm text-red-700">{previewError}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : previewTab === 'data' ? (
                <div className="h-full flex flex-col">
                  {previewError ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="bg-red-50 border border-red-100 text-red-800 rounded-lg p-6 max-w-lg shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                            <FiX className="h-5 w-5 text-red-600" />
                          </div>
                          <h4 className="text-lg font-medium text-red-800">Data Preview Unavailable</h4>
                        </div>
                        <p className="text-sm mb-4 text-red-700">{previewError}</p>
                        <p className="text-sm text-red-700 italic">You can still proceed with the import, but preview is not available.</p>
                      </div>
                    </div>
                  ) : !previewData ? (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center ${
                        isDragging ? 'border-[#333D79] bg-[#EEF0F8]' : 'border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`mb-4 rounded-full bg-[#EEF0F8] p-4 ${isDragging ? 'animate-pulse-custom' : ''}`}>
                          <MdDragIndicator className="h-12 w-12 text-[#333D79]" />
                          </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Import Students</h3>
                        <p className="text-sm text-gray-500 mb-4 max-w-md">
                          Upload a spreadsheet with your student data to get started
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                          <label htmlFor="file-upload-placeholder" className="cursor-pointer">
                            <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                              <FiUpload size={18} />
                              <span>Upload Students</span>
                        </div>
                            <input 
                              id="file-upload-placeholder" 
                              type="file" 
                              accept=".xlsx,.xls,.csv" 
                              className="hidden"
                              onChange={handleFileInput}
                            />
                          </label>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-2">
                          <FiInfo className="mr-1 text-[#333D79]" size={12} />
                          <span>Supported formats: .xlsx, .xls, .csv</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto p-6">
                      <div className="mb-4 flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="mr-2 bg-[#EEF0F8] text-[#333D79] text-xs font-medium px-2.5 py-1 rounded-full">
                            {Math.min(previewRowsToShow, previewData.data.length)} of {previewData.totalRows.toLocaleString()} rows
                          </div>
                          <span className="text-xs text-gray-500">showing preview only</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {previewData.sheetName && (
                            <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                              {previewData.sheetName}
                            </div>
                          )}
                          <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                            {previewData.totalColumns} columns
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 border-r border-gray-200">
                                  #
                                </th>
                                {previewData.headers.map((header, idx) => (
                                  <th 
                                    key={idx}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200 last:border-r-0"
                                    style={{ maxWidth: '200px', minWidth: '150px' }}
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {previewData.data.slice(0, previewRowsToShow).map((row, rowIdx) => (
                                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                  <td className="px-4 py-2.5 text-sm text-gray-500 font-medium border-r border-gray-200">
                                    {rowIdx + 1}
                                  </td>
                                  {row.map((cell, cellIdx) => (
                                    <td
                                      key={cellIdx}
                                      className="px-4 py-2.5 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200 last:border-r-0"
                                      style={{ maxWidth: '200px', minWidth: '150px' }}
                                    >
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-center">
                        {previewRowsToShow < previewData.data.length ? (
                          <button 
                            onClick={handleShowMoreRows}
                            className="flex items-center gap-2 px-4 py-2 bg-[#EEF0F8] text-[#333D79] rounded-lg hover:bg-[#DDE3F2] transition-colors shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Show {Math.min(10, previewData.data.length - previewRowsToShow)} More Rows
                          </button>
                        ) : (
                          <div className="text-center text-xs text-gray-500 mt-2">
                            Showing all available preview rows. Import the file to see all {previewData.totalRows.toLocaleString()} rows.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : previewTab === 'columns' ? (
                <div className="h-full overflow-y-auto p-6">
                  <div className="mb-4">
                    <h4 className="text-base font-medium text-gray-800 mb-2">Customize Column Mapping</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Map columns from your spreadsheet to student data fields. Student names will be automatically detected.
                    </p>
                    
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
                      <div className="flex items-start">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 mr-3">
                          <FiInfo className="h-3 w-3 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium mb-1">Column Mapping Tips</p>
                          <p className="text-xs text-blue-700">
                            You can add additional columns for grading categories or student information. 
                            Click on <strong>Add Default Columns</strong> to quickly add standard educational categories.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {previewData && (
                    <div className="border rounded-lg shadow-sm bg-white mb-6">
                      <div className="p-4 border-b bg-gray-50">
                        <h5 className="font-medium text-gray-700">Source Columns from File</h5>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {previewData.headers.map((header, idx) => (
                            <div key={idx} className={`flex items-center border rounded-lg p-3 ${
                              idx === detectedNameColumn 
                                ? 'bg-[#EEF0F8] border-[#333D79]' 
                                : 'bg-gray-50'
                            }`}>
                              <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                                <span className="text-xs text-[#333D79] font-bold">{idx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{header}</p>
                                <p className="text-xs text-gray-500">
                                  {idx === detectedNameColumn 
                                    ? 'Student Name (Auto-detected)' 
                                    : `Column ${idx + 1}`}
                                </p>
                              </div>
                              {idx === detectedNameColumn && (
                                <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  Student Name
                </div>
              )}
            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
            
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-medium text-gray-700">Add Default Column Templates</h5>
              <button
                      onClick={() => setShowAddColumnModal(true)}
                      className="text-sm bg-[#EEF0F8] text-[#333D79] px-3 py-1.5 rounded-md hover:bg-[#DCE3F9] transition-colors flex items-center"
              >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Custom Column
              </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div 
                      onClick={() => handleAddColumnTemplate('quizzes')}
                      className={`border rounded-lg shadow-sm bg-white p-4 hover:border-[#333D79] cursor-pointer transition-colors relative ${
                        customColumns.some(col => col.id.includes('quiz')) ? 'border-[#333D79] bg-[#F8F9FF]' : ''
                      }`}
                    >
                      <div className="flex items-center mb-3">
                        <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h6 className="font-medium text-gray-800">Quizzes</h6>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Adds columns for quiz scores with auto-calculated averages
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz 1</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz 2</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz 3</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz Avg</span>
                      </div>
                      {customColumns.some(col => col.id.includes('quiz')) && (
                        <div className="absolute top-2 right-2">
                          <div className="h-5 w-5 rounded-full bg-[#333D79] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div 
                      onClick={() => handleAddColumnTemplate('labs')}
                      className={`border rounded-lg shadow-sm bg-white p-4 hover:border-[#333D79] cursor-pointer transition-colors relative ${
                        customColumns.some(col => col.id.includes('lab')) ? 'border-[#333D79] bg-[#F8F9FF]' : ''
                      }`}
                    >
                      <div className="flex items-center mb-3">
                        <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <h6 className="font-medium text-gray-800">Lab Activities</h6>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Adds columns for tracking laboratory work and activities
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab 1</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab 2</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab 3</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab Avg</span>
                      </div>
                      {customColumns.some(col => col.id.includes('lab')) && (
                        <div className="absolute top-2 right-2">
                          <div className="h-5 w-5 rounded-full bg-[#333D79] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div 
                      onClick={() => handleAddColumnTemplate('exams')}
                      className={`border rounded-lg shadow-sm bg-white p-4 hover:border-[#333D79] cursor-pointer transition-colors relative ${
                        customColumns.some(col => col.id.includes('exam') || col.id.includes('midterm') || col.id.includes('final')) ? 'border-[#333D79] bg-[#F8F9FF]' : ''
                      }`}
                    >
                      <div className="flex items-center mb-3">
                        <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h6 className="font-medium text-gray-800">Exams</h6>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Adds columns for midterm, final and other examination scores
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Midterm</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Final</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Total</span>
                      </div>
                      {customColumns.some(col => col.id.includes('exam') || col.id.includes('midterm') || col.id.includes('final')) && (
                        <div className="absolute top-2 right-2">
                          <div className="h-5 w-5 rounded-full bg-[#333D79] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {customColumns.length > 0 && (
                    <div className="mb-6">
                      <div className="border rounded-lg shadow-sm bg-white">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                          <h5 className="font-medium text-gray-700">Added Custom Columns</h5>
              <button
                            onClick={() => setCustomColumns([])}
                            className="text-xs text-red-600 hover:text-red-800"
              >
                            Clear All
              </button>
                        </div>
                        <div className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {customColumns.map((column, idx) => (
                              <div key={idx} className="px-3 py-1.5 bg-[#EEF0F8] text-[#333D79] text-sm rounded-lg flex items-center gap-2">
                                {column.name}
              <button
                                  onClick={() => setCustomColumns(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-[#333D79] hover:text-red-600"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t pt-4 flex justify-end">
                    <div className="flex items-center text-xs text-gray-500 mr-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Selected columns will be added to your spreadsheet
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="border-t p-4 flex justify-between space-x-3 bg-gray-50">
              <div className="flex space-x-3">
                {previewTab !== 'info' && (
                  <button
                    onClick={() => setPreviewTab(previewTab === 'data' ? 'info' : 'data')}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                {previewTab === 'columns' && (
              <button
                    onClick={() => {
                      setPreviewTab('info');
                      processSelectedFile();
                    }}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Skip Column Mapping
                  </button>
                )}
                <button
                  onClick={previewTab === 'info' ? () => setPreviewTab('data') : 
                           previewTab === 'data' ? () => setPreviewTab('columns') : 
                           processSelectedFile}
                className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
              >
                  {previewTab === 'columns' ? (
                    <>
                      <FiCheckCircle className="mr-2" />
                      <span>Import File</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* File Export Options Modal */}
      {showExportOptions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal when clicking the backdrop (outside the modal)
            if (e.target === e.currentTarget) {
              setShowExportOptions(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full animate-fadeIn border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white relative z-10">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                  <FiDownload className="h-5 w-5 text-[#333D79]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Export Data</h3>
              </div>
              <button 
                onClick={cancelExport}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-white relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 shadow-sm mb-6">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Export Settings</h4>
                    
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File Name
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input 
                          type="text"
                          value={exportFileName}
                          onChange={(e) => setExportFileName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-white"
                          placeholder="Enter file name"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-gray-400 text-sm">.{exportFormat}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Format
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setExportFormat('xlsx')}
                          className={`p-3 rounded-lg border ${
                            exportFormat === 'xlsx' 
                              ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8]' 
                              : 'border-gray-200 hover:bg-gray-50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <BsFiletypeXlsx className={`h-9 w-9 mb-2 ${exportFormat === 'xlsx' ? 'text-[#217346]' : 'text-gray-400'}`} />
                            <span className={`text-sm ${exportFormat === 'xlsx' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>Excel (.xlsx)</span>
                            <span className="text-xs text-gray-500 mt-1">Full features</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setExportFormat('csv')}
                          className={`p-3 rounded-lg border ${
                            exportFormat === 'csv' 
                              ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8]' 
                              : 'border-gray-200 hover:bg-gray-50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <BsFiletypeCsv className={`h-9 w-9 mb-2 ${exportFormat === 'csv' ? 'text-[#333D79]' : 'text-gray-400'}`} />
                            <span className={`text-sm ${exportFormat === 'csv' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>CSV (.csv)</span>
                            <span className="text-xs text-gray-500 mt-1">Simple format</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <FiFileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Data Summary</h4>
                        <p className="text-xs text-blue-600">What will be exported</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-blue-800">{exportPreviewData?.totalRows.toLocaleString()} rows</div>
                      <div className="text-xs text-blue-600">{exportPreviewData?.totalColumns} columns</div>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Data Preview</h4>
                  <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                    <div className="p-2 bg-[#f8f9fc] border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-600">DATA PREVIEW</div>
                        <div className="text-xs text-gray-500">Showing 5 of {exportPreviewData?.totalRows} rows</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto bg-white">
                      <table className="w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="bg-gray-50 py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 border-r border-gray-200 sticky left-0 z-10">
                              #
                            </th>
                            {exportPreviewData?.headers.map((header, idx) => (
                              <th 
                                key={idx}
                                className="bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{ minWidth: '120px' }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {exportPreviewData?.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5 text-sm text-gray-500 font-medium border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                                {rowIdx + 1}
                              </td>
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap"
                                >
                                  {String(cell || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {/* Placeholder rows to show there's more data */}
                          {exportPreviewData?.totalRows > exportPreviewData?.rows.length && (
                            <tr className="border-t border-gray-200 border-dashed">
                              <td colSpan={exportPreviewData.headers.length + 1} className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {exportPreviewData?.totalRows > exportPreviewData?.rows.length && (
                      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-center">
                        <div className="flex items-center text-xs text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span>{(exportPreviewData.totalRows - exportPreviewData.rows.length).toLocaleString()} more rows not shown</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-600">All {exportPreviewData?.totalRows} rows will be included in the exported file</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t p-4 flex justify-between items-center bg-gray-50 relative z-10">
              <div className="flex items-center">
                <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                  <FiFileText className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{exportPreviewData?.totalRows.toLocaleString()}</span> rows × 
                  <span className="font-medium"> {exportPreviewData?.totalColumns}</span> columns
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelExport}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processExport}
                  className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
                >
                  <FiDownload className="mr-2" />
                  <span>Export File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Export */}
      {exportLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-16 h-16 border-4 border-[#EEF0F8] border-t-[#333D79] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiDownload className="h-6 w-6 text-[#333D79]" />
                </div>
              </div>
              <p className="text-gray-800 font-medium mb-2">Preparing your export</p>
              <p className="text-sm text-gray-500 mb-3 text-center">The file will download automatically when ready</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div className="bg-[#333D79] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {exportFormat === 'xlsx' ? 'Formatting Excel workbook...' : 'Formatting CSV data...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modify your existing Excel view to use renderExcelView when not in full screen */}
      {excelData && !isFullScreen && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {renderExcelView()}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ClassDetails; 