import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';
import { registerAllModules } from 'handsontable/registry';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BsFileEarmarkSpreadsheet, BsFiletypeCsv, BsFiletypeXlsx } from 'react-icons/bs';
import { FiCheckCircle, FiDownload, FiFileText, FiFilter, FiInfo, FiMaximize, FiMinimize, FiUpload, FiX, FiEye } from 'react-icons/fi';
import { HiSwitchHorizontal } from 'react-icons/hi';
import { MdDragIndicator, MdOutlineClass } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { classService } from '../services/api';
import DashboardLayout from './layouts/DashboardLayout';
import ImportPreviewModal from './modals/ImportPreviewModal'
import ExportOptionsModal from './modals/ExportOptionsModal';
import AddColumnModal from './modals/AddColumnModal';
import ImportProgress from './ImportProgress';
import ExcelViewer from './ExcelViewer';
import RecordingsSection from './RecordingSections';
import FileDropzone from './FileDropzone';

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

const ClassDetails = ({ accessInfo }) => {
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
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedData = useRef(null);
  const [detectedNameColumn, setDetectedNameColumn] = useState(null);
  const [customColumns, setCustomColumns] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [newColumnMaxScore, setNewColumnMaxScore] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [teamAccess, setTeamAccess] = useState(null);
  const initialDataLoadRef = useRef(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  
  const visibleData = useMemo(() => {
    if (!excelData) return null;
    
    if (excelData.data.length <= visibleRowCount) {
      return excelData.data;
    }
    
    return excelData.data.slice(0, visibleRowCount);
  }, [excelData, visibleRowCount]);

  useEffect(() => {
    console.log("ClassDetails received accessInfo:", accessInfo);
    
    if (accessInfo) {
      setTeamAccess({
        teamId: accessInfo.teamId,
        teamName: accessInfo.teamName,
        courseId: accessInfo.courseId,
        courseName: accessInfo.courseName,
        accessLevel: accessInfo.accessLevel
      });
    } else {
      setTeamAccess({
        accessLevel: 'full',
        accessType: 'owner'
      });
    }
    
  }, [id, accessInfo]);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          console.log("Fetching class data for id:", id, "User has team access:", teamAccess);
          
          const [classResponse, excelResponse] = await Promise.all([
            classService.getClassById(id),
            classService.getClassExcelFiles(id)
          ]);
          
          console.log("Class data received:", classResponse.data);
          setClassData(classResponse.data);
          
          if (excelResponse.data.length > 0) {
            setAvailableFiles(excelResponse.data);
            
            const latestFile = excelResponse.data[0]; 
            loadFileData(latestFile);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      };

      if (teamAccess !== null) {
          fetchData();
      }
  }, [id, navigate, teamAccess]);

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

  const loadFileData = (fileObj) => {
    console.log("Loading Excel file:", fileObj.file_name);
    
    const activeSheet = fileObj.active_sheet;
    const sheetNames = fileObj.sheet_names || [];
    const sheetData = fileObj.all_sheets[activeSheet];
    
    if (sheetData && sheetData.data && sheetData.data.length > 0) {
      const headers = sheetData.headers || Object.keys(sheetData.data[0] || {});
      const data = sheetData.data.map(row => 
        headers.map(header => row[header])
      );
      
      setExcelData({
        headers,
        data,
        fileId: fileObj.id,
        activeSheet: activeSheet,
        availableSheets: sheetNames
      });
      setSelectedFile({ 
        name: fileObj.file_name,
        id: fileObj.id
      });
      console.log("Excel data set successfully with", data.length, "rows");
    } else {
      console.log("No data in the active sheet:", activeSheet);
    }
  };

  const handleSwitchFile = async (fileId) => {
    setFileLoading(true);
    try {
      // Find the selected file in the available files
      const selectedFileObj = availableFiles.find(file => file.id === fileId);
      
      if (selectedFileObj) {
        loadFileData(selectedFileObj);
      } else {
        // If the file isn't in our cache, fetch it from the server
        const response = await classService.getExcelFile(fileId);
        if (response.data) {
          loadFileData(response.data);
        }
      }
    } catch (error) {
      console.error('Error switching file:', error);
      setError('Failed to switch file');
    } finally {
      setFileLoading(false);
    }
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

  const handleSheetChange = async (sheetName) => {
  try {
    setLoading(true);
    
    // Update active sheet on the server
    const response = await classService.setActiveSheet(excelData.fileId, sheetName);
    const updatedFile = response.data;
    const activeSheet = updatedFile.active_sheet;
    const sheetData = updatedFile.all_sheets[activeSheet];
    
    if (sheetData && sheetData.data && sheetData.data.length > 0) {
      const headers = sheetData.headers || Object.keys(sheetData.data[0] || {});
      const data = sheetData.data.map(row => 
        headers.map(header => row[header])
      );
      
      setExcelData({
        headers,
        data,
        fileId: updatedFile.id,
        activeSheet: activeSheet,
        availableSheets: updatedFile.sheet_names || []
      });
      console.log(`Switched to sheet ${activeSheet} with ${data.length} rows`);
    } else {
      console.log("No data in the selected sheet:", activeSheet);
    }
  } catch (error) {
    console.error('Error changing sheet:', error);
    setError(error.response?.data?.error || 'Failed to change sheet');
  } finally {
    setLoading(false);
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

      await classService.updateExcelData(
        excelData.fileId, 
        formattedData,
        excelData.activeSheet  // Include active sheet name
      );
      
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
      
      reader.onload = async (event) => {
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

              // Don't upload the file here automatically
              // We'll wait for the user to finish customizing columns
              // and then call processSelectedFile() which will handle the upload
              
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
  
  const processSelectedFile = async () => {
  if (!selectedFile) return;
  
  setFileLoading(true);
  setShowPreview(false);
  
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
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('class_id', id);
    
    // Include custom columns in the upload if there are any
    if (customColumns.length > 0) {
      formData.append('custom_columns', JSON.stringify(customColumns));
      console.log("Adding custom columns to upload:", customColumns);
    }
    
    // Upload the file directly with formData to ensure custom columns are included
    setImportStage('Uploading file with custom columns...');
    
    const response = await fetch(`http://127.0.0.1:8000/api/excel/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log("Upload response:", responseData);
    
    if (responseData) {
      const fileId = responseData.id;
      setAvailableFiles(prevFiles => [responseData, ...prevFiles]);
      
      // Get sheet data from the response
      const activeSheet = responseData.active_sheet || '';
      const sheetData = responseData.all_sheets?.[activeSheet];
      const sheetNames = responseData.sheet_names || [];
      
      if (sheetData && sheetData.data && sheetData.data.length > 0) {
        const headers = sheetData.headers || Object.keys(sheetData.data[0] || {});
        const data = sheetData.data.map(row => 
          headers.map(header => row[header])
        );
        
        setExcelData({
          headers,
          data,
          fileId,
          activeSheet,
          availableSheets: sheetNames
        });
        
        setSelectedFile({ 
          name: responseData.file_name,
          id: fileId
        });
      } else {
        console.log("No data in the active sheet or sheet data structure is incorrect");
      }
    }
    
    setImportStage('Finalizing import...');
    setImportProgress(100);
    
    setTimeout(() => {
      setFileLoading(false);
      setImportProgress(0);
      setImportStage('');
      setCustomColumns([]); 
    }, 500);
    
  } catch (error) {
    console.error("File upload error:", error);
    setError(error.message || 'Failed to upload file');
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
  
  const cancelExport = () => {
    setShowExportOptions(false);
  };

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

 useEffect(() => {
  if (excelData && !isFullScreen && !initialDataLoadRef.current) {
    initialDataLoadRef.current = true;
    setIsFullScreen(true);
  }
}, [excelData, isFullScreen]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#333D79]"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !classData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)]">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FiX className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Class Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error.includes("404") 
                ? "The class you're looking for doesn't exist or you don't have permission to view it."
                : error}
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => navigate("/dashboard/courses")}
                className="px-4 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!classData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)]">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <FiInfo className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Information</h2>
            
            {teamAccess && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-800">Team Access</h3>
                    <p className="text-blue-700">
                      You have {teamAccess.accessLevel} access through {teamAccess.teamName}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-gray-600 mb-6">
              This class may not exist or you may not have permission to access it. If you believe this is an error, please contact your team administrator.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => navigate("/dashboard/courses")}
                className="px-4 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Show the full screen Excel view when in full screen mode */}
      {isFullScreen && excelData ? (
         <ExcelViewer 
          isFullScreen={isFullScreen}
          setIsFullScreen={setIsFullScreen}
          classData={classData}
          teamAccess={teamAccess}
          excelData={excelData}
          selectedFile={selectedFile}
          fileStats={fileStats}
          handleSheetChange={handleSheetChange} 
          toggleFullScreen={toggleFullScreen}
          handleExport={handleExport}
          hotTableRef={hotTableRef}
          visibleData={visibleData}
          handleDataChange={handleDataChange}
  />
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
                    {(!teamAccess || teamAccess.accessLevel === 'edit' || teamAccess.accessLevel === 'full') && (
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
                    )}
                    <button
                      onClick={handleExport}
                      className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:bg-gray-50"
                    >
                      <FiDownload size={18} />
                      <span>Export Data</span>
                    </button>
                  </>
                ) : (
                  !teamAccess || teamAccess.accessLevel !== 'view' ? (
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
                  ) : null
                )}
              </div>
            </div>

             {/* Enhanced File Selection Dropdown */}
              {availableFiles.length > 1 && (
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <div className="w-8 h-8 rounded-md bg-[#EEF0F8] flex items-center justify-center mr-2 shadow-sm">
                        <BsFileEarmarkSpreadsheet className="text-[#333D79]" size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Current Spreadsheet</span>
                    </div>
                    
                    <div className="relative group">
                      <div className="relative">
                        <select
                          className="appearance-none w-full sm:w-72 border border-gray-300 rounded-lg text-gray-700 pl-4 pr-10 py-2.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] transition-all hover:border-gray-400"
                          value={selectedFile?.id}
                          onChange={(e) => handleSwitchFile(e.target.value)}
                        >
                          {availableFiles.map(file => {
                            // Get file extension to show appropriate icon
                            const fileExt = file.file_name?.split('.').pop()?.toLowerCase() || '';
                            
                            // Format the date properly using uploaded_at instead of created_at
                            const formattedDate = file.uploaded_at ? 
                              new Date(file.uploaded_at).toLocaleDateString() : 
                              'Unknown date';
                            
                            return (
                              <option key={file.id} value={file.id}>
                                {file.file_name} ({formattedDate})
                              </option>
                            );
                          })}
                        </select>
                        
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#333D79]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>
                      
                      {/* File details indicator for selected file */}
                      {selectedFile && (
                        <div className="hidden group-hover:block absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-3 animate-fadeIn">
                          <div className="flex items-start">
                            {/* Get the full file object from availableFiles using selectedFile.id */}
                            {(() => {
                              const currentFile = availableFiles.find(f => f.id === selectedFile.id);
                              const fileName = currentFile?.file_name || selectedFile.name;
                              
                              // Determine icon based on file extension
                              const isXlsx = fileName?.toLowerCase().endsWith('.xlsx');
                              const isCsv = fileName?.toLowerCase().endsWith('.csv');
                              
                              return (
                                <>
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${
                                    isXlsx ? 'bg-green-100' :
                                    isCsv ? 'bg-blue-100' : 'bg-purple-100'
                                  } flex items-center justify-center mr-3`}>
                                    {isXlsx ? (
                                      <BsFiletypeXlsx size={20} className="text-green-700" />
                                    ) : isCsv ? (
                                      <BsFiletypeCsv size={20} className="text-blue-700" />
                                    ) : (
                                      <BsFileEarmarkSpreadsheet size={20} className="text-purple-700" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800 text-sm mb-1">{fileName}</p>
                                    <div className="flex items-center text-xs text-gray-500">
                                      <span className="mr-2">
                                        Uploaded: {currentFile?.uploaded_at ? 
                                          new Date(currentFile.uploaded_at).toLocaleString() : 
                                          'Unknown date'
                                        }
                                      </span>
                                      <span className="flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        {currentFile?.active_sheet || 'Sheet1'}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
              </div>

             {fileLoading ? (
                <ImportProgress 
                  importProgress={importProgress}
                  importStage={importStage}
                />
              ) : !excelData ? (
                teamAccess && teamAccess.accessLevel === 'view' ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="bg-blue-50 rounded-full p-4 mb-4">
                      <FiEye className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">View-Only Access</h3>
                    <p className="text-gray-500 text-center max-w-md mb-2">
                      You have view-only access to this class through team {teamAccess.teamName}.
                    </p>
                    <p className="text-sm text-gray-400 text-center max-w-md">
                      When files are uploaded by a class manager, you'll be able to view them here.
                    </p>
                  </div>
                ) : (
                  <FileDropzone 
                    teamAccess={teamAccess}
                    isDragging={isDragging}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    handleFileInput={handleFileInput}
                  />
                )
              ) : (
                <div className="excel-data-container">
                  {/* Sheet tabs */}
                  {excelData && excelData.availableSheets && excelData.availableSheets.length > 1 && (
                    <div className="mb-4 border-b overflow-x-auto">
                      <div className="flex">
                        {excelData.availableSheets.map((sheetName, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSheetChange(sheetName)}
                            className={`px-4 py-2 flex items-center whitespace-nowrap ${
                              sheetName === excelData.activeSheet
                                ? 'border-b-2 border-[#333D79] text-[#333D79] font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {sheetName === excelData.activeSheet && <HiSwitchHorizontal className="mr-1.5" size={14} />}
                            {sheetName}
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
                  
                  <div className="excel-wrapper relative mb-4 border rounded-lg shadow-sm">
                    <div className="bg-white px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-2">
                          <BsFileEarmarkSpreadsheet className="h-4 w-4 text-[#333D79]" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{selectedFile ? selectedFile.name : 'Excel Data'}</span>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={handleExport}
                          className="text-gray-500 hover:text-[#333D79] p-1.5 rounded-md hover:bg-gray-50 mr-1"
                          title="Export Data"
                        >
                          <FiDownload size={16} />
                        </button>
                        <button
                          onClick={toggleFullScreen}
                          className="text-gray-500 hover:text-[#333D79] p-1.5 rounded-md hover:bg-gray-50"
                          title="Enter Full Screen"
                        >
                          <FiMaximize size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-hidden" style={{ maxHeight: 'calc(70vh - 45px)' }}>
                      <div className="overflow-auto excel-scroll-container" style={{ maxHeight: 'calc(70vh - 45px)', maxWidth: '100%' }}>
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
                          colWidths={100}
                          readOnly={teamAccess && teamAccess.accessLevel === 'view'}
                          manualColumnResize={!teamAccess || teamAccess.accessLevel !== 'view'}
                          manualRowResize={!teamAccess || teamAccess.accessLevel !== 'view'}
                          filters={true}
                          dropdownMenu={!teamAccess || teamAccess.accessLevel !== 'view'}
                          contextMenu={!teamAccess || teamAccess.accessLevel !== 'view'}
                          columnSorting={true}
                          sortIndicator={true}
                          afterChange={teamAccess && teamAccess.accessLevel === 'view' ? undefined : handleDataChange}
                          rowHeights={28}
                          fixedRowsTop={1}
                          fixedColumnsLeft={1}
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
                            viewportColumnRenderingOffset: 15,
                            viewportRowRenderingOffset: 15,
                            preventOverflow: false,
                            fixedRowsTop: 1,
                            fixedColumnsLeft: 1
                          }}
                          tableClassName="excel-table-container"
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

            {/* Recordings Section */}
            <RecordingsSection />
          </div>
          
          {/* Add Custom Column Modal */}
          <AddColumnModal 
            showAddColumnModal={showAddColumnModal}
            setShowAddColumnModal={setShowAddColumnModal}
            newColumnName={newColumnName}
            setNewColumnName={setNewColumnName}
            newColumnType={newColumnType}
            setNewColumnType={setNewColumnType}
            newColumnMaxScore={newColumnMaxScore}
            setNewColumnMaxScore={setNewColumnMaxScore}
            handleAddCustomColumn={handleAddCustomColumn}
          />
        </>
      )}
      
      {/* File Import Preview Modal */}
      <ImportPreviewModal
        showPreview={showPreview}
        previewInfo={previewInfo}
        previewData={previewData}
        previewError={previewError}
        previewTab={previewTab}
        setPreviewTab={setPreviewTab}
        previewRowsToShow={previewRowsToShow}
        cancelImport={cancelImport}
        handleShowMoreRows={handleShowMoreRows}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        handleFileInput={handleFileInput}
        teamAccess={teamAccess}
        isDragging={isDragging}
        detectedNameColumn={detectedNameColumn}
        customColumns={customColumns}
        setCustomColumns={setCustomColumns}
        setShowAddColumnModal={setShowAddColumnModal}
        handleAddColumnTemplate={handleAddColumnTemplate}
        processSelectedFile={processSelectedFile}
      />
      
      {/* File Export Options Modal */}
      <ExportOptionsModal
        showExportOptions={showExportOptions}
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        exportFileName={exportFileName}
        setExportFileName={setExportFileName}
        exportPreviewData={exportPreviewData}
        cancelExport={cancelExport}
        processExport={processExport}
      />

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
    
      {teamAccess && teamAccess.accessLevel === 'view' && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded-lg mt-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>You have view-only access to this data through team {teamAccess.teamName}</span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ClassDetails;