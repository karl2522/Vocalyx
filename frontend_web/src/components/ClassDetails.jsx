import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import { FiDownload, FiEye, FiInfo, FiUpload, FiX } from 'react-icons/fi';
import { MdOutlineClass } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { classService } from '../services/api';
import { showToast } from '../utils/toast';
import ExcelViewer from './ExcelViewer';
import FileDropzone from './FileDropzone';
import ImportProgress from './ImportProgress';
import DashboardLayout from './layouts/DashboardLayout';
import AddColumnModal from './modals/AddColumnModal';
import ExportOptionsModal from './modals/ExportOptionsModal';
import ImportPreviewModal from './modals/ImportPreviewModal';
import MergeExcelModal from './MergeExcelModal';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, fileName }) => {
  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="mb-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Delete Excel File</h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-medium text-gray-900">{fileName}</span>? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
  );
};

const ClassDetails = ({ accessInfo }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Basic state
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamAccess, setTeamAccess] = useState(null);

  // File management state - simplified to single file
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);

  // UI state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Import/Export state
  const [showPreview, setShowPreview] = useState(false);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewTab, setPreviewTab] = useState('info');
  const [previewRowsToShow, setPreviewRowsToShow] = useState(10);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportFileName, setExportFileName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState(null);

  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeFile, setMergeFile] = useState(null);
  const [mergeFileData, setMergeFileData] = useState(null);

  // Column management state
  const [customColumns, setCustomColumns] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [newColumnMaxScore, setNewColumnMaxScore] = useState('');
  const [detectedNameColumn, setDetectedNameColumn] = useState(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize team access
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

  // Fetch class data and files
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

        // Only use the latest file (first in the response)
        if (excelResponse.data.length > 0) {
          const latestFile = excelResponse.data[0];
          setSelectedFile({
            name: latestFile.file_name,
            id: latestFile.id
          });
          setCurrentFileData(latestFile);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.error || 'Failed to load class data');
      } finally {
        setLoading(false);
      }
    };

    if (teamAccess !== null) {
      fetchData();
    }
  }, [id, navigate, teamAccess]);

  const handleDeleteFile = async () => {
    if (!currentFileData) return;

    try {
      setIsDeleting(true);

      await classService.deleteExcelFile(currentFileData.id);
      setIsDeleteModalOpen(false);
      setSelectedFile(null);
      setCurrentFileData(null);

      showToast.success(`File deleted successfully`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError('Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag and drop handlers
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
    const validFiles = droppedFiles.filter(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv'].includes(fileExtension);
    });

    if (validFiles.length > 0) {
      handleFileUpload(validFiles[0]);
    }
  };

  const handleSaveExcelChanges = async (updatedFileData) => {
    try {
      // Call your API to save the updated file data
      await classService.updateExcelData(updatedFileData.id, {
        sheet_data: updatedFileData.all_sheets
      });
      
      // Show success toast notification
      showToast.success("Changes saved successfully!");
      
      // Update the local state with the new data
      setCurrentFileData(updatedFileData);
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast.error("Failed to save changes. Please try again.");
    }
  };

  const handleFileInput = (e) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      console.log("File selected from input:", {
        name: file.name,
        type: file.type,
        size: file.size,
        isFile: file instanceof File
      });

      e.target.value = '';
      handleFileUpload(file);
    }
  };

  const handleUpdateClassRecord = () => {
    // Create a hidden file input and trigger it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls,.csv';
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        processFileForMerge(file);
      }
    };
    fileInput.click();
  };

  const processFileForMerge = async (file) => {
    try {
      // Process the file data
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            const headers = jsonData[0] || [];
            const rows = jsonData.slice(1);
            
            // Format the file data similar to how API returns it
            const formattedData = {
              file_name: file.name,
              active_sheet: firstSheetName,
              all_sheets: {
                [firstSheetName]: {
                  headers: headers,
                  data: rows
                }
              }
            };
            
            setMergeFile(file);
            setMergeFileData(formattedData);
            setShowMergeModal(true);
          }
        } catch (error) {
          console.error("Error processing file for merge:", error);
          showToast.error(`Error reading file: ${error.message}`);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error preparing file for merge:", error);
      showToast.error(`Error preparing file: ${error.message}`);
    }
  };

  const handleMergeFiles = async (mergeOptions) => {
  if (!mergeFile || !currentFileData) return;
  
  setFileLoading(true);
  setImportStage('Merging files...');
  setImportProgress(0);
  
  // Animation for progress
  const animateProgress = () => {
    setImportProgress(prev => {
      if (prev < 90) return prev + Math.random() * 10;
      return prev;
    });
    
    if (importProgress < 90) {
      setTimeout(animateProgress, 200);
    }
  };
  
  setTimeout(animateProgress, 200);
  
  try {
    // Create form data for API call
    const formData = new FormData();
    formData.append('file', mergeFile);
    formData.append('class_id', id);
    formData.append('merge', 'true');
    formData.append('override_names', mergeOptions.overrideNames.toString());
    
    // Add category mappings
    formData.append('category_mappings', JSON.stringify(mergeOptions.categories));
    
    // Call API to merge files
    const response = await classService.mergeExcel(formData);
    
    // Update state with new data
     if (response.data) {
      // Add the mappings directly to the returned data
      response.data.column_categories = mergeOptions.categoryMappings;
      
      setCurrentFileData(response.data);
      setSelectedFile({
        name: response.data.file_name,
        id: response.data.id
      });
      
      showToast.success("Files merged successfully!");
    }
    
    setImportProgress(100);
    
    setTimeout(() => {
      setFileLoading(false);
      setImportProgress(0);
      setImportStage('');
    }, 500);
    
  } catch (error) {
    console.error("Error merging files:", error);
    showToast.error("Failed to merge files. Please try again.");
    setFileLoading(false);
    setImportProgress(0);
    setImportStage('');
  }
};

  // File upload and preview functions
  const handleFileUpload = async (file) => {
    if (!file) return;

    console.log("handleFileUpload called with file:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      isFile: file instanceof File
    });

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
    setSelectedFile(file);
    
    // Generate preview data from file
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Parse the file
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true
          });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            const headers = jsonData[0] || [];
            const rows = jsonData.slice(1);
            
            // Set preview data
            setPreviewData({
              headers: headers,
              data: rows,
              totalRows: rows.length,
              totalColumns: headers.length,
              sheetName: firstSheetName
            });
            
            // Auto-detect name column
            const namePatterns = ['name', 'student', 'learner', 'pupil', 'full name', 'first name', 'last name'];
            const nameColumnIndex = headers.findIndex(header => 
              namePatterns.some(pattern => 
                String(header).toLowerCase().includes(pattern.toLowerCase())
              )
            );
            
            if (nameColumnIndex !== -1) {
              setDetectedNameColumn(nameColumnIndex);
            }
          } else {
            setPreviewError("No data found in the file");
          }
        } catch (error) {
          console.error("Error processing file for preview:", error);
          setPreviewError(`Error reading file: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        setPreviewError("Error reading file");
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error during file preview:", error);
      setPreviewError(`Error preparing file preview: ${error.message}`);
    }
    
    setShowPreview(true);
  };

  const processSelectedFile = async () => {
    if (!selectedFile) return;

    setFileLoading(true);
    setShowPreview(false);

    // Initialize progress tracking
    setImportProgress(0);
    setImportStage('Reading file...');
    
    // Set up progress animation
    const progressStages = [
      { stage: 'Reading file...', targetProgress: 20 },
      { stage: 'Processing data...', targetProgress: 40 },
      { stage: 'Analyzing columns...', targetProgress: 60 },
      { stage: 'Preparing spreadsheet...', targetProgress: 80 },
      { stage: 'Finalizing import...', targetProgress: 95 }
    ];

    let currentStageIndex = 0;
    const animateProgress = () => {
      const currentStage = progressStages[currentStageIndex];
      const nextProgress = Math.min(
          currentStage.targetProgress,
          importProgress + Math.random() * 2
      );

      setImportProgress(nextProgress);

      if (nextProgress >= currentStage.targetProgress && currentStageIndex < progressStages.length - 1) {
        currentStageIndex++;
        setImportStage(progressStages[currentStageIndex].stage);
      }

      if (nextProgress < 100) {
        setTimeout(animateProgress, 100);
      }
    };

    animateProgress();

    try {
      console.log("processSelectedFile - File details:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        lastModified: selectedFile.lastModified,
        isFile: selectedFile instanceof File
      });

      if (!(selectedFile instanceof File)) {
        console.error("Selected file is not a File object:", selectedFile);
        throw new Error("Invalid file selected. Please try selecting the file again.");
      }

      // File size validation
      const maxFileSizeMB = 10;
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

      if (selectedFile.size > maxFileSizeBytes) {
        throw new Error(`File size exceeds ${maxFileSizeMB}MB limit. Please select a smaller file.`);
      }

      // File type validation
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      const validExtensions = ['xlsx', 'xls', 'csv'];

      if (!validExtensions.includes(fileExtension)) {
        throw new Error(`File type not supported. Please select an Excel (.xlsx, .xls) or CSV file.`);
      }

      setImportStage('Processing custom columns...');

      // Process custom columns
      let validatedColumns = [];
      if (customColumns && customColumns.length > 0) {
        validatedColumns = customColumns.filter(col => {
          return col && col.name && typeof col.name === 'string' &&
              (col.type === 'text' || col.type === 'number' || col.type === 'header');
        }).map(col => {
          return {
            id: col.id || `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: col.name.trim(),
            type: col.type,
            ...(col.maxScore && col.type === 'number' ? { maxScore: Number(col.maxScore) } : {})
          };
        });

        console.log("Sanitized custom columns for upload:", validatedColumns);
      }

      setImportStage('Uploading file...');

      // Make the API call with the real implementation
      const response = await classService.uploadExcel(
          selectedFile,
          id,
          validatedColumns.length > 0 ? validatedColumns : null
      );

      const responseData = response.data;
      console.log("Upload response:", responseData);

      if (responseData) {
        setSelectedFile({
          name: responseData.file_name,
          id: responseData.id,
        });
        setCurrentFileData(responseData);
      }

      setImportStage('Finalizing import...');
      setImportProgress(100);

      // Show success notification
      showToast.success("File imported successfully!");

      setTimeout(() => {
        setFileLoading(false);
        setImportProgress(0);
        setImportStage('');
        setCustomColumns([]);
      }, 500);

    } catch (error) {
      console.error("File upload error:", error);

      // Handle different error scenarios
      let errorMessage = 'Failed to upload file';
      if (error.response) {
        if (error.response.data) {
          console.log("Server error details:", error.response.data);
          if (typeof error.response.data === 'object') {
            errorMessage = error.response.data.message || error.response.data.error || error.response.data.detail || `Server error: ${error.response.status}`;
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          }
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'An error occurred during file upload';
      }

      setError(errorMessage);
      showToast.error(errorMessage);
      
      setFileLoading(false);
      setImportProgress(0);
      setImportStage('');
    }
  };

  const cancelImport = () => {
    setSelectedFile(null);
    setShowPreview(false);
    setPreviewInfo(null);
    setImportProgress(0);
  };

  // Export functions
  const handleExport = async () => {
    if (!currentFileData?.id) return;

    // Let ExcelViewer handle the export logic
    setExportFileName(selectedFile.name.split('.')[0] || 'export');
    setShowExportOptions(true);
  };

  const processExport = () => {
    // Export logic will be handled by ExcelViewer
    setExportLoading(true);
    setShowExportOptions(false);

    // Simulate export process
    setTimeout(() => {
      setExportLoading(false);
    }, 2000);
  };

  const cancelExport = () => {
    setShowExportOptions(false);
  };

  // Column management functions
  const handleAddColumnTemplate = (templateType) => {
    let newColumns = [];

    switch(templateType) {
      case 'quizzes':
        newColumns = [
          { id: `quiz_category_${Date.now()}`, name: 'Quiz', type: 'header' },
          { id: `quiz_1_${Date.now()}`, name: 'Quiz 1', type: 'number', maxScore: 10 },
          { id: `quiz_2_${Date.now()}`, name: 'Quiz 2', type: 'number', maxScore: 10 },
          { id: `quiz_3_${Date.now()}`, name: 'Quiz 3', type: 'number', maxScore: 10 },
          { id: `quiz_4_${Date.now()}`, name: 'Quiz 4', type: 'number', maxScore: 10 },
          { id: `quiz_5_${Date.now()}`, name: 'Quiz 5', type: 'number', maxScore: 10 },
        ];
        break;
      case 'labs':
        newColumns = [
          { id: `lab_category_${Date.now()}`, name: 'Laboratory Activities', type: 'header' },
          { id: `lab_1_${Date.now()}`, name: 'Lab 1', type: 'number', maxScore: 20 },
          { id: `lab_2_${Date.now()}`, name: 'Lab 2', type: 'number', maxScore: 20 },
          { id: `lab_3_${Date.now()}`, name: 'Lab 3', type: 'number', maxScore: 20 },
          { id: `lab_4_${Date.now()}`, name: 'Lab 4', type: 'number', maxScore: 20 },
          { id: `lab_5_${Date.now()}`, name: 'Lab 5', type: 'number', maxScore: 20 },
        ];
        break;
      case 'exams':
        newColumns = [
          { id: `exam_category_${Date.now()}`, name: 'Exams', type: 'header' },
          { id: `pe_${Date.now()}`, name: 'PE - Prelim Exam', type: 'number', maxScore: 50 },
          { id: `me_${Date.now()}`, name: 'ME - Midterm Exam', type: 'number', maxScore: 50 },
          { id: `pfe_${Date.now()}`, name: 'PFE - PreFinal Exam', type: 'number', maxScore: 50 },
          { id: `fe_${Date.now()}`, name: 'FE - Final Exam', type: 'number', maxScore: 100 },
        ];
        break;
      case 'remarks':
        newColumns = [
          { id: `remarks_${Date.now()}`, name: 'Remarks', type: 'text' }
        ];
        break;
      default:
        return;
    }

    setCustomColumns(prev => [...prev, ...newColumns]);
  };

  const handleAddCustomColumn = () => {
    if (newColumnName.trim()) {
      let columnName = newColumnName.trim();

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

  // Auto-detect name columns
  useEffect(() => {
    if (previewData && previewData.headers && previewData.headers.length > 0) {
      const namePatterns = ['name', 'student', 'learner', 'pupil', 'full name', 'first name', 'last name'];

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

  // Utility functions
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

  // Loading states
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
        {/* Full screen Excel view */}
        {isFullScreen && currentFileData ? (
            <ExcelViewer
              isFullScreen={isFullScreen}
              setIsFullScreen={setIsFullScreen}
              classData={classData}
              teamAccess={teamAccess}
              fileData={currentFileData}
              selectedFile={selectedFile}
              onExport={handleExport}
              onSave={handleSaveExcelChanges} // Add this
              classId={id}
            />
        ) : (
            <>
              {/* Header section */}
              <div className="top-0 z-30 pt-4 pb-2 px-4 -mx-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
                      <MdOutlineClass className="h-6 w-6 text-[#333D79]" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">{classData.name}</h1>
                      <p className="text-sm text-gray-500">
                        {currentFileData
                            ? `Showing data from: ${selectedFile ? selectedFile.name : 'Imported file'}`
                            : `Last updated: ${classData.lastUpdated}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {currentFileData ? (
                        <>
                          {(!teamAccess || teamAccess.accessLevel === 'edit' || teamAccess.accessLevel === 'full') && (
                            <>
                               <button
                                  onClick={handleUpdateClassRecord}
                                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:bg-gray-50"
                                >
                                  <BsFileEarmarkSpreadsheet size={18} />
                                  <span>Update Class Record</span>
                                </button>

                              <label htmlFor="add-file" className="cursor-pointer">
                                <div className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:bg-gray-50">
                                  <FiUpload size={18} />
                                  <span>Replace File</span>
                                </div>
                                <input
                                    id="add-file"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={handleFileInput}
                                />
                              </label>
                            </>
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

                {/* Breadcrumb navigation */}
                <div className="flex items-center text-sm text-gray-500 mb-2 pl-1">
                  <a
                      href="/dashboard/courses"
                      className="hover:text-[#333D79] transition-colors"
                  >
                    Courses
                  </a>
                  <span className="mx-2">/</span>
                  <span className="text-[#333D79]">{classData?.name}</span>
                </div>

                {/* File Info Bar - Simplified to show current file only */}
                {currentFileData && (
                  <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-md bg-[#EEF0F8] flex items-center justify-center mr-3 shadow-sm">
                        <BsFileEarmarkSpreadsheet className="text-[#333D79]" size={16} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">{selectedFile?.name}</span>
                        <p className="text-xs text-gray-500">
                          {currentFileData?.uploaded_at ? new Date(currentFileData.uploaded_at).toLocaleString() : 'Recently uploaded'}
                        </p>
                      </div>
                    </div>

                    {/* Delete button */}
                    {(!teamAccess || teamAccess.accessLevel === 'edit' || teamAccess.accessLevel === 'full') && (
                      <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="p-2 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-200"
                          title="Delete spreadsheet"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 flex justify-between items-center">
                      <div>{error}</div>
                      <button
                          onClick={() => setError(null)}
                          className="text-red-800 hover:text-red-900"
                      >
                        <FiX size={18} />
                      </button>
                    </div>
                )}
              </div>

              <div className="pb-6 pt-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-50 rounded-full opacity-20 blur-3xl"></div>
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-50 rounded-full opacity-20 blur-3xl"></div>

                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#EEF0F8] to-[#DCE3F9] flex items-center justify-center mr-3 shadow-sm">
                        {currentFileData ? (
                            <BsFileEarmarkSpreadsheet className="h-5 w-5 text-[#333D79]" />
                        ) : (
                            <MdOutlineClass className="h-5 w-5 text-[#333D79]" />
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-gray-800 relative">
                        {currentFileData ? 'Excel Data' : 'Class Data'}
                        <div className="absolute -top-1 -right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      </h2>
                    </div>
                  </div>

                  {fileLoading ? (
                      <ImportProgress
                          importProgress={importProgress}
                          importStage={importStage}
                      />
                  ) : !currentFileData ? (
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
                              When files are uploaded by a class manager, you&apos;ll be able to view them here.
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
                        <div className="border rounded-lg shadow-sm overflow-hidden mb-4" style={{ height: 'calc(70vh - 90px)' }}>
                          <div className="bg-white px-3 py-2 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center">
                              <div className="h-6 w-6 text-blue-600 flex items-center justify-center mr-2">
                                <BsFileEarmarkSpreadsheet className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-medium text-gray-700">{selectedFile ? selectedFile.name : 'Sample Grades.xlsx'}</span>
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
                                  onClick={() => setIsFullScreen(true)}
                                  className="text-gray-500 hover:text-[#333D79] p-1.5 rounded-md hover:bg-gray-50"
                                  title="Enter Full Screen"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Container with fixed height for ExcelViewer */}
                          <div className="h-[calc(70vh-130px)]">
                            <ExcelViewer
                              isFullScreen={false}
                              setIsFullScreen={setIsFullScreen}
                              classData={classData}
                              teamAccess={teamAccess}
                              fileData={currentFileData}
                              selectedFile={selectedFile}
                              onExport={handleExport}
                              onSave={handleSaveExcelChanges} // Add this
                              classId={id}
                            />
                          </div>
                        </div>
                      </div>
                  )}
                </div>
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
            handleShowMoreRows={() => setPreviewRowsToShow(prev => Math.min(prev + 10, previewData?.data?.length || prev))}
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

        <MergeExcelModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          currentFile={currentFileData}
          newFile={mergeFileData}
          onMerge={handleMergeFiles}
          teamAccess={teamAccess}
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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteFile}
            fileName={currentFileData?.file_name || ''}
        />

        {/* Loading Indicator for Delete Operation */}
        {isDeleting && (
            <div className="fixed bottom-4 right-4 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-lg z-50">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                <span>Deleting file...</span>
              </div>
            </div>
        )}
      </DashboardLayout>
  );
};

export default ClassDetails;

// PropTypes validation
ClassDetails.propTypes = {
  accessInfo: PropTypes.shape({
    teamId: PropTypes.string,
    teamName: PropTypes.string,
    courseId: PropTypes.string,
    courseName: PropTypes.string,
    accessLevel: PropTypes.string
  })
};

DeleteConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  fileName: PropTypes.string
};