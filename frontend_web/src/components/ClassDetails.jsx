import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUpload, FiFileText, FiDownload, FiFilter, FiX, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { MdOutlineClass, MdDragIndicator } from 'react-icons/md';
import { HiSwitchHorizontal } from 'react-icons/hi';
import { BsFiletypeXlsx, BsFiletypeCsv, BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import DashboardLayout from './layouts/DashboardLayout';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.css';
import * as XLSX from 'xlsx';
import { classService } from '../services/api';
import { debounce } from 'lodash';

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
                navigate('/dashboard', { replace: true });
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
    const hasChanges = changes.some(([row, prop, oldValue, newValue]) => oldValue !== newValue);
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

        const response = await classService.updateExcelData(excelData.fileId, formattedData);
        
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
      
      reader.onload = (event) => {
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
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 300);

    try {
      // Create a FileReader to read the file data
      const reader = new FileReader();
      
      reader.onload = (event) => {
        clearInterval(progressInterval);
        setImportProgress(100);
        
        try {
          if (!event.target || !event.target.result) {
            throw new Error("Failed to read file");
          }
          
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
          const parsedData = safeProcessWorksheet(firstSheet);
          
          if (!parsedData.data.length) {
            throw new Error("No data found in Excel sheet");
          }
          
          setExcelData(parsedData);
          setFileLoading(false);
          setImportProgress(0);
        } catch (error) {
          console.error("Excel processing error:", error);
          setError(`Failed to process Excel file: ${error.message}`);
          setFileLoading(false);
          setImportProgress(0);
        }
      };
      
      reader.onerror = () => {
        clearInterval(progressInterval);
        setError("Error reading file");
        setFileLoading(false);
        setImportProgress(0);
      };
      
      // Read the file as an array buffer
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("File upload error:", error);
      setError(`File upload error: ${error.message}`);
      setFileLoading(false);
      setImportProgress(0);
    }
  };
  
  const cancelImport = async () => {  // Added async here
  const cancelImport = () => {
    setSelectedFile(null);
    setShowPreview(false);
    setPreviewInfo(null);
    setImportProgress(0);
  };
    setFileLoading(true);
    setError(null);

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
        
        setSelectedFile({ name: file_name });
        setExcelData({
            headers,
            data,
            fileId
        });
    } catch (error) {
        console.error("File upload error:", error);
        setError(error.response?.data?.error || 'Failed to upload file');
    } finally {
        setFileLoading(false);
    }
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
  
  const cancelExport = () => {
    setShowExportOptions(false);
  };
        setFileLoading(true);
        
        const response = await classService.downloadExcel(excelData.fileId);
        
        const blob = new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedFile.name.split('.')[0]}_exported.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setFileLoading(false);
    } catch (error) {
        console.error("Export error:", error);
        setError(error.response?.data?.error || 'Failed to export file');
        setFileLoading(false);
    }
};

  const handleClearData = () => {
    setExcelData(null);
    setSelectedFile(null);
    setFileStats(null);
    setSheets([]);
    setActiveSheet(0);
    setVisibleRowCount(MAX_VISIBLE_ROWS);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#333D79]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* File Import Preview Modal */}
      {showPreview && previewInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full animate-fadeIn h-[80vh] flex flex-col border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                  <FiFileText className="h-5 w-5 text-[#333D79]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">File Preview</h3>
              </div>
              <button 
                onClick={cancelImport}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="flex border-b bg-gray-50">
              <button
                onClick={() => setPreviewTab('info')}
                className={`px-5 py-3 ${previewTab === 'info' 
                  ? 'text-[#333D79] border-b-2 border-[#333D79] font-medium bg-white' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white transition-colors'}`}
              >
                <div className="flex items-center">
                  <FiInfo className="mr-2" />
                  <span>File Information</span>
                </div>
              </button>
              <button
                onClick={() => setPreviewTab('data')}
                className={`px-5 py-3 ${previewTab === 'data' 
                  ? 'text-[#333D79] border-b-2 border-[#333D79] font-medium bg-white' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white transition-colors'}`}
              >
                <div className="flex items-center">
                  <FiFilter className="mr-2" />
                  <span>Data Preview</span>
                </div>
              </button>
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
              ) : (
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
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="w-12 h-12 border-3 border-[#EEF0F8] border-t-[#333D79] rounded-full animate-spin mb-3"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FiFilter className="h-5 w-5 text-[#333D79]" />
                          </div>
                        </div>
                        <p className="text-gray-700 font-medium mb-1">Analyzing file data...</p>
                        <p className="text-sm text-gray-500">Generating preview of your spreadsheet</p>
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
              )}
            </div>
            
            <div className="border-t p-4 flex justify-end space-x-3 bg-gray-50">
              <button
                onClick={cancelImport}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processSelectedFile}
                className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
              >
                <FiCheckCircle className="mr-2" />
                <span>Import File</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* File Export Options Modal */}
      {showExportOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
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

      <div className="pb-6">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {excelData ? 'Excel Data' : 'Class Data'}
            </h2>
            {selectedFile && (
              <div className="text-sm text-gray-500 flex items-center">
                <FiFileText className="mr-2 text-[#333D79]" />
                {selectedFile.name}
              </div>
            )}
          </div>

          {fileLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#EEF0F8] border-t-[#333D79] rounded-full animate-spin mb-3"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BsFileEarmarkSpreadsheet className="h-6 w-6 text-[#333D79]" />
                </div>
              </div>
              <p className="text-gray-700 font-medium mb-1">Processing your file...</p>
              <p className="text-sm text-gray-500">This may take a moment for larger files</p>
              <div className="mt-4 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#333D79] rounded-full transition-all duration-500" 
                     style={{ width: `${importProgress}%` }}></div>
              </div>
            </div>
          ) : !excelData ? (
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
                <h3 className="text-lg font-medium text-gray-700 mb-2">Upload your spreadsheet</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                  Drag and drop your Excel or CSV file here, or click the button below to browse
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <label htmlFor="file-upload-placeholder" className="cursor-pointer">
                    <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                      <FiUpload size={18} />
                      <span>Browse Files</span>
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
                <div className="grid grid-cols-3 gap-3 text-center mb-2">
                  <div className="flex flex-col items-center p-3 rounded-lg border border-gray-200">
                    <BsFiletypeXlsx className="h-7 w-7 text-[#217346] mb-1" />
                    <span className="text-xs text-gray-600">Excel (.xlsx)</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg border border-gray-200">
                    <BsFiletypeXlsx className="h-7 w-7 text-[#9faf4a] mb-1" />
                    <span className="text-xs text-gray-600">Excel (.xls)</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg border border-gray-200">
                    <BsFiletypeCsv className="h-7 w-7 text-[#333D79] mb-1" />
                    <span className="text-xs text-gray-600">CSV (.csv)</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center mt-2">
                  <FiInfo className="mr-1 text-[#333D79]" size={12} />
                  <span>Max file size: 10MB</span>
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

        {!excelData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Class Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F5F7FB] p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    classData.status === 'Active' ? 'bg-[#DCE3F9] text-[#333D79]' : 
                    classData.status === 'Completed' ? 'bg-[#E0F2ED] text-[#0F766E]' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {classData.status}
                  </span>
                </div>
              </div>
              <div className="bg-[#F5F7FB] p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Recordings</div>
                <div className="text-lg font-medium">{classData.recordings}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClassDetails; 