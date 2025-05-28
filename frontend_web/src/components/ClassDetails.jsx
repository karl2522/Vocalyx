import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import { FiDownload, FiEye, FiInfo, FiUpload, FiX } from 'react-icons/fi';
import { MdOutlineClass } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { classService } from '../services/api';
import { formatRelativeTime, getFullDateTime } from '../utils/dateUtils';
import { showToast } from '../utils/toast';
import ExcelViewer from './ExcelViewer';
import FileDropzone from './FileDropzone';
import ImportProgress from './ImportProgress';
import DashboardLayout from './layouts/DashboardLayout';
import AddColumnModal from './modals/AddColumnModal';
import ExportOptionsModal from './modals/ExportOptionsModal';
import ImportPreviewModal from './modals/ImportPreviewModal';
import UpdateFileModal from './modals/UpdateFileModal';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, fileName }) => {
  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-center justify-center p-4 animate-fadeIn">
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

  const [updateCount, setUpdateCount] = useState(0);

  // Import/Export state
  const [showPreview, setShowPreview] = useState(false);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewTab, setPreviewTab] = useState('info');
  const [previewRowsToShow, setPreviewRowsToShow] = useState(10);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');

  const [showUpdateMethodModal, setShowUpdateMethodModal] = useState(false);
  const [showManualUpdateModal, setShowManualUpdateModal] = useState(false);
  const [showUpdateFileModal, setShowUpdateFileModal] = useState(false);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportFileName, setExportFileName] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState(null);

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
        
        // Initialize update count from file or localStorage
        if (latestFile.update_count) {
          setUpdateCount(latestFile.update_count);
        } else {
          // Fallback to localStorage if the backend doesn't store this
          const storedCount = localStorage.getItem(`file_updates_${latestFile.id}`);
          setUpdateCount(storedCount ? parseInt(storedCount) : 0);
        }
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
      setIsDeleteModalOpen(false); // Close the modal immediately when deletion starts

      await classService.deleteExcelFile(currentFileData.id);
      setSelectedFile(null);
      setCurrentFileData(null);

      showToast.deleted('File');
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
    console.log("Saving Excel changes:", updatedFileData);
    
    // Get the active sheet data
    const activeSheet = updatedFileData.active_sheet;
    const sheetData = updatedFileData.all_sheets[activeSheet].data;
    
    // Debug logging to see data structure
    console.log("Sheet data type:", typeof sheetData);
    console.log("Is array:", Array.isArray(sheetData));
    console.log("First row sample:", sheetData[0]);

    // Call your API to save the updated file data
    await classService.updateExcelData(
      updatedFileData.id,
      sheetData,  // Just pass the actual data array
      activeSheet // Pass the sheet name separately
    );
    
    // Increment update counter
    const newCount = updateCount + 1;
    setUpdateCount(newCount);
    
    // Store in localStorage as fallback
    localStorage.setItem(`file_updates_${updatedFileData.id}`, newCount.toString());
    
    // Show success toast notification
    showToast.saved();
    
    // Update the local state with the new data
    setCurrentFileData({
      ...updatedFileData,
      update_count: newCount // Add the update count to the file data
    });
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
    setShowUpdateFileModal(true);
  };

  const handleSelectImportUpdate = () => {
    setShowUpdateMethodModal(false);
    setShowUpdateFileModal(true);
  };

  const handleSelectManualUpdate = () => {
    setShowUpdateMethodModal(false);
    setShowManualUpdateModal(true);
  };

  const handleFileUpdateSave = async (updateData) => {
    try {
      console.log("File update data received:", updateData);
      
      // This will be implemented to handle the category-based file merge
      // For now, just close the modal and show a placeholder message
      setShowUpdateFileModal(false);
      
      showToast.updated(`File uploaded to ${updateData.category} category`);
      
      // TODO: Implement actual file processing and merge logic
      // This should:
      // 1. Process the uploaded file
      // 2. Extract columns matching the selected category
      // 3. Merge with existing data
      // 4. Update the spreadsheet
      
    } catch (error) {
      console.error('Error updating with file:', error);
      showToast.error("Failed to update with file. Please try again.");
    }
  };

  const handleManualUpdateSave = async (updatedFileData) => {
    try {
      // Get the active sheet
      const activeSheet = updatedFileData.active_sheet;
      
      // Extract the category mappings and headers
      const categoryMappings = updatedFileData.all_sheets.category_mappings;
      const originalHeaders = [...updatedFileData.all_sheets[activeSheet].headers];
      const originalData = updatedFileData.all_sheets[activeSheet].data;
      
      // Find all new columns - columns in category mappings but not in headers
      const allExistingHeaders = new Set(originalHeaders);
      const newColumns = [];
      
      categoryMappings.forEach(category => {
        category.columns.forEach(column => {
          if (!allExistingHeaders.has(column)) {
            newColumns.push({
              name: column,
              categoryId: category.id
            });
          }
        });
      });
      
      console.log("Found new columns to add:", newColumns);
      
      if (newColumns.length === 0) {
        // No new columns to add, just update categories
        await classService.updateCategoryMappings(
          updatedFileData.id,
          {
            all_sheets: {
              category_mappings: categoryMappings
            }
          }
        );
        
        setCurrentFileData(updatedFileData);
        setShowManualUpdateModal(false);
        showToast.updated('Category assignments');
        return;
      }
      
      // Create a map of category -> columns 
      const categoryToColumns = {};
      categoryMappings.forEach(category => {
        categoryToColumns[category.id] = [...category.columns];
      });
      
      const orderedCategories = ['student', 'quiz', 'laboratory', 'exams', 'other'];
      const customCategories = categoryMappings
        .filter(category => !orderedCategories.includes(category.id))
        .map(category => category.id);
        
      const allCategoryIds = [...orderedCategories, ...customCategories];
      
      // Create new headers array in proper category order
      const newHeaders = [];
      allCategoryIds.forEach(categoryId => {
        if (categoryToColumns[categoryId]) {
          categoryToColumns[categoryId].forEach(columnName => {
            newHeaders.push(columnName);
          });
        }
      });
      
      console.log("New ordered headers:", newHeaders);
      
      // Create new data with null values for new columns
      const newData = originalData.map(row => {
        const newRow = {};
        
        // Copy existing values
        originalHeaders.forEach(header => {
          newRow[header] = row[header];
        });
        
        // Add null values for new columns
        newColumns.forEach(col => {
          newRow[col.name] = null;
        });
        
        return newRow;
      });
      
      // Update the file data with the new structure
      const finalFileData = {
        ...updatedFileData,
        all_sheets: {
          ...updatedFileData.all_sheets,
          [activeSheet]: {
            ...updatedFileData.all_sheets[activeSheet],
            headers: newHeaders,
            data: newData
          },
          category_mappings: categoryMappings
        }
      };
      
      // Save the data structure first
      await classService.updateExcelData(
        updatedFileData.id,
        newData,
        activeSheet,
        newHeaders  // Pass the new headers explicitly
      );
      
      // Then update the category mappings
      await classService.updateCategoryMappings(
        updatedFileData.id,
        {
          all_sheets: {
            category_mappings: categoryMappings
          }
        }
      );
      
      // Show success toast notification
      showToast.saved();
      
      // Update the local state with the new data
      setCurrentFileData(finalFileData);
      setShowManualUpdateModal(false);
      const newCount = updateCount + 1;
      setUpdateCount(newCount);

      localStorage.setItem(`file_updates_${updatedFileData.id}`, newCount.toString());

      setCurrentFileData({
        ...finalFileData,
        update_count: newCount
      });
      
      // Reload the page to ensure data is displayed correctly
      window.location.reload();
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast.error("Failed to save changes. Please try again.");
    }
  };

  React.useEffect(() => {
    if (currentFileData && currentFileData.all_sheets) {
      const activeSheet = currentFileData.active_sheet;
      const sheetData = currentFileData.all_sheets[activeSheet];
      
      if (sheetData && sheetData.data && sheetData.headers) {
        const previewData = {
          headers: sheetData.headers,
          rows: sheetData.data.slice(0, 5).map(row => 
            sheetData.headers.map(header => row[header] || '')
          ),
          totalRows: sheetData.data.length,
          totalColumns: sheetData.headers.length,
          defaultFileName: currentFileData.file_name?.split('.')[0] || 'Export'
        };
        
        setExportPreviewData(previewData);
      }
    }
  }, [currentFileData]);

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

      setImportStage('Analyzing columns and creating categories...');

      // Create category mappings for the imported data
      let categoryMappings = [];
      
      // If we have preview data, automatically categorize the imported columns
      if (previewData && previewData.headers) {
        const importedHeaders = previewData.headers;
        
        // Enhanced Auto-detect name column - specifically look for "No. Last Name, First Name" pattern
        const specificNamePatterns = [
          'no. last name, first name',
          'no. lastname, firstname', 
          'number last name first name',
          'no lastname firstname',
          'student no. last name, first name',
          'student number last name first name'
        ];
        
        const generalNamePatterns = ['name', 'student', 'learner', 'pupil', 'full name', 'first name', 'last name', 'no.'];
        
        // Find columns that should be categorized as "Student Info"
        const studentInfoColumns = [];
        
        importedHeaders.forEach(header => {
          const headerLower = String(header).toLowerCase().trim();
          
          // Check for specific patterns first
          const isSpecificMatch = specificNamePatterns.some(pattern => 
            headerLower.includes(pattern.toLowerCase())
          );
          
          // Check for general patterns
          const isGeneralMatch = generalNamePatterns.some(pattern => 
            headerLower.includes(pattern.toLowerCase())
          );
          
          // Add to student info if it matches any pattern
          if (isSpecificMatch || isGeneralMatch) {
            studentInfoColumns.push(header);
            console.log(`Detected student info column: "${header}" (${isSpecificMatch ? 'specific' : 'general'} match)`);
          }
        });
        
        // If no specific student columns found, use first few columns as student info
        if (studentInfoColumns.length === 0 && importedHeaders.length > 0) {
          // Take first 3 columns as student info by default
          const defaultStudentColumns = importedHeaders.slice(0, Math.min(3, importedHeaders.length));
          studentInfoColumns.push(...defaultStudentColumns);
          console.log(`No student columns detected, using first columns as Student Info: ${defaultStudentColumns}`);
        }
        
        // Create "Student Info" category for detected columns
        if (studentInfoColumns.length > 0) {
          categoryMappings.push({
            id: 'student',
            name: 'Student Info',
            columns: [...studentInfoColumns] // All detected student columns
          });
          console.log(`Created Student Info category with ${studentInfoColumns.length} columns:`, studentInfoColumns);
        }
        
        // Add remaining imported columns to "Other Activities" category if any
        const remainingColumns = importedHeaders.filter(header => 
          !studentInfoColumns.includes(header)
        );
        
        if (remainingColumns.length > 0) {
          categoryMappings.push({
            id: 'other',
            name: 'Other Activities',
            columns: [...remainingColumns]
          });
          console.log(`Created Other Activities category with ${remainingColumns.length} columns:`, remainingColumns);
        }
      }
      
      // Add categories for the default quiz/lab/exam columns
      if (validatedColumns.length > 0) {
        // Group custom columns by category
        const quizColumns = validatedColumns
          .filter(col => col.name.toLowerCase().includes('quiz') && col.type !== 'header')
          .map(col => col.name);
          
        const labColumns = validatedColumns
          .filter(col => col.name.toLowerCase().includes('lab') && col.type !== 'header')
          .map(col => col.name);
          
        const examColumns = validatedColumns
          .filter(col => (col.name.toLowerCase().includes('exam') || col.name.includes('PE -') || col.name.includes('ME -') || col.name.includes('PFE -') || col.name.includes('FE -')) && col.type !== 'header')
          .map(col => col.name);
        
        // Add quiz category if we have quiz columns
        if (quizColumns.length > 0) {
          categoryMappings.push({
            id: 'quiz',
            name: 'Quiz',
            columns: quizColumns
          });
        }
        
        // Add laboratory category if we have lab columns
        if (labColumns.length > 0) {
          categoryMappings.push({
            id: 'laboratory',
            name: 'Laboratory Activities',
            columns: labColumns
          });
        }
        
        // Add exam category if we have exam columns
        if (examColumns.length > 0) {
          categoryMappings.push({
            id: 'exams',
            name: 'Exams',
            columns: examColumns
          });
        }
      }
      
      console.log("Auto-generated category mappings:", categoryMappings);

      setImportStage('Uploading file...');

      // Make the API call with the real implementation, including category mappings
      const response = await classService.uploadExcel(
          selectedFile,
          id,
          validatedColumns.length > 0 ? validatedColumns : null,
          categoryMappings.length > 0 ? categoryMappings : null // Pass category mappings
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
      showToast.imported();

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

const exportDirectlyFromData = () => {
  if (!currentFileData || !currentFileData.all_sheets) {
    showToast.error('No file data available to export');
    return;
  }

  console.log('Current File Data:', currentFileData);
  
  setExportLoading(true);
  
  try {
    // Get the active sheet
    const activeSheet = currentFileData.active_sheet;
    const sheetData = currentFileData.all_sheets[activeSheet];
    
    if (!sheetData || !sheetData.data || !sheetData.headers) {
      showToast.error('Sheet data is missing');
      return;
    }
    
    // For PDF export - SIMPLE, NO CATEGORIES
    if (exportFormat === 'pdf') {
        try {
          // Create a new PDF document
          const doc = new jsPDF({
            orientation: sheetData.headers.length > 10 ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4'
          });
          
          // Add title and info
          doc.setFontSize(16);
          doc.text(exportFileName || 'Export', 14, 15);
          
          doc.setFontSize(11);
          doc.text(`Class: ${classData?.name || 'N/A'}`, 14, 22);
          
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          const today = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
          doc.text(`Generated on: ${today}`, 14, 28);
          doc.setTextColor(0, 0, 0);
          
          // Prepare data for the table - SIMPLE VERSION
          const headers = sheetData.headers;
          
          // Format data rows
          const tableData = sheetData.data.map(row => {
            return headers.map(header => {
              const value = row[header];
              return value !== null && value !== undefined ? String(value) : '';
            });
          });
          
          // Generate the table - SIMPLE VERSION, NO CATEGORIES
          autoTable(doc, {
            head: [headers], // Only column headers, no category row
            body: tableData,
            startY: 35,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2,
            },
            headStyles: {
              fillColor: [51, 61, 121],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center',
            },
            alternateRowStyles: {
              fillColor: [245, 247, 250]
            },
            didDrawPage: function(data) {
              // Add page number at the bottom
              const pageCount = doc.internal.getNumberOfPages();
              doc.setFontSize(8);
              doc.setTextColor(150);
              doc.text(
                `Page ${data.pageNumber} of ${pageCount}`,
                data.settings.margin.left, 
                doc.internal.pageSize.height - 10
              );
            }
          });
          
          // Save the PDF file
          doc.save(`${exportFileName || 'export'}.pdf`);
          
          showToast.exported(`${exportFileName || 'export'}.pdf`);
          setExportLoading(false);
          setShowExportOptions(false);
          
          return; // Return early to avoid executing the rest of the function
        } catch (error) {
          console.error('Error generating PDF:', error);
          showToast.error('Failed to generate PDF. Please try again.');
          setExportLoading(false);
          setShowExportOptions(false);
          return;
        }
    }
    
    // For EXCEL/CSV export - WITH CATEGORIES (your existing code)
    const headers = sheetData.headers;
    const data = sheetData.data;
    
    // Get category mappings if they exist
    const categoryMappings = currentFileData.all_sheets.category_mappings || [];
    const columnToCategory = {};
    
    // Define colors for categories
    const categoryColors = {
      'quiz': { bg: '283593', font: 'FFFFFF' },         // Deep blue
      'exams': { bg: '1B5E20', font: 'FFFFFF' },         // Deep green
      'laboratory': { bg: '4A148C', font: 'FFFFFF' },    // Deep purple
      'other': { bg: '3E2723', font: 'FFFFFF' },         // Deep brown
      'default': { bg: '263238', font: 'FFFFFF' }        // Dark blue-grey
    };
    
    // Create a mapping of columns to their categories
    categoryMappings.forEach(category => {
      category.columns.forEach(column => {
        columnToCategory[column] = {
          id: category.id,
          name: category.name
        };
      });
    });
    
    // Find category spans (which columns belong to which categories)
    const categories = [];
    let currentCategory = null;
    let startIdx = -1;
    
    headers.forEach((header, idx) => {
      const headerCategory = columnToCategory[header];
      
      // If this header has a category and it's different from the current one
      if (headerCategory && (!currentCategory || headerCategory.id !== currentCategory.id)) {
        // If we were tracking a previous category, close it out
        if (currentCategory) {
          categories.push({
            name: currentCategory.name,
            id: currentCategory.id,
            startIdx,
            endIdx: idx - 1
          });
        }
        
        // Start tracking the new category
        currentCategory = headerCategory;
        startIdx = idx;
      } 
      // If this header has no category, close out any current category
      else if (!headerCategory && currentCategory) {
        categories.push({
          name: currentCategory.name,
          id: currentCategory.id,
          startIdx,
          endIdx: idx - 1
        });
        currentCategory = null;
      }
    });
    
    // Don't forget to add the final category if there is one
    if (currentCategory) {
      categories.push({
        name: currentCategory.name,
        id: currentCategory.id,
        startIdx,
        endIdx: headers.length - 1
      });
    }
    
    // Check if any column doesn't have a category, create a "Student Information" category
    let hasCategorylessColumns = false;
    for (let i = 0; i < headers.length; i++) {
      if (!columnToCategory[headers[i]]) {
        hasCategorylessColumns = true;
        break;
      }
    }
    
    // Create an array of arrays format that preserves column order
    const aoa = [];
    
    // Add category row if categories exist (ONLY FOR EXCEL/CSV)
    if (categories.length > 0 || hasCategorylessColumns) {
      const categoryRow = Array(headers.length).fill(''); // Empty row initially
      
      // Add "Student Information" category for columns without a category
      let studentInfoEndIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        if (!columnToCategory[headers[i]]) {
          categoryRow[i] = i === 0 ? 'Student Information' : '';
          studentInfoEndIdx = i;
        }
      }
      
      // If we found uncategorized columns, add them as a category
      if (studentInfoEndIdx >= 0) {
        categories.unshift({
          name: 'Student Information',
          id: 'student_info',
          startIdx: 0,
          endIdx: studentInfoEndIdx
        });
      }
      
      // Fill in the categories
      categories.forEach(cat => {
        categoryRow[cat.startIdx] = cat.name;
      });
      
      aoa.push(categoryRow); // First row is categories
    }
    
    // Add header row
    aoa.push(headers); // Next row is headers
    
    // Add all data rows in the correct order
    data.forEach(row => {
      const orderedRow = headers.map(header => row[header] ?? '');
      aoa.push(orderedRow);
    });
    
    // Convert array of arrays to worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Only apply styling for XLSX format
    if (exportFormat !== 'csv') {
      // Add cell styles
      if (!worksheet['!cols']) worksheet['!cols'] = [];
      
      // Set column widths
      headers.forEach((_, idx) => {
        worksheet['!cols'][idx] = { width: 15 }; // Adjust width as needed
      });
      
      // Apply cell merges and styling for categories
      if (categories.length > 0) {
        worksheet['!merges'] = worksheet['!merges'] || [];
        
        // Add merges for category headers
        categories.forEach(cat => {
          if (cat.endIdx > cat.startIdx) {
            worksheet['!merges'].push({
              s: { r: 0, c: cat.startIdx },
              e: { r: 0, c: cat.endIdx }
            });
          }
          
          // Get the appropriate color for this category
          const colorKey = cat.id || 'default';
          const color = categoryColors[colorKey] || categoryColors.default;
          
          // Style category headers
          const catCell = XLSX.utils.encode_cell({r: 0, c: cat.startIdx});
          if (!worksheet[catCell]) worksheet[catCell] = { v: cat.name };
          
          worksheet[catCell].s = {
            font: { bold: true, color: { rgb: color.font } },
            fill: { fgColor: { rgb: color.bg } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        });
        
        // Style regular headers (row 1)
        headers.forEach((_, idx) => {
          const headerCell = XLSX.utils.encode_cell({r: 1, c: idx});
          if (worksheet[headerCell]) {
            worksheet[headerCell].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'E0E0E0' } }, // Light grey
              alignment: { horizontal: 'center' }
            };
          }
        });
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, activeSheet);
    
    // Generate the file based on format
    const fileType = exportFormat === 'csv' ? 'csv' : 'xlsx';
    const fileName = `${exportFileName || 'export'}.${fileType}`;
    
    if (fileType === 'csv') {
      // Export CSV (note: CSV won't preserve merged cells and styling)
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For proper styling in Excel
      const wbout = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        bookSST: false, 
        type: 'binary',
      });
      
      // Convert binary string to ArrayBuffer
      function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      }
      
      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
    }
    
    showToast.exported(fileName);
  } catch (error) {
    console.error('Export error:', error);
    showToast.error('Failed to export file');
  } finally {
    setExportLoading(false);
    setShowExportOptions(false);
  }
};

  // Export functions
 const handleExport = async () => {
  if (!currentFileData?.id) return;

  console.log('Export data:', { classData, currentFileData });

  // Set default file name based on class & course with course code
  let defaultFileName = currentFileData.file_name?.split('.')[0] || 'Export';
  
  // Try to get course code and class name
  if (classData) {
    // Access course data - consider multiple possible locations
    const course = classData.course || classData.class_ref?.course;
    const courseCode = course?.courseCode || '';
    const courseName = course?.name || 'Course';
    const className = classData.name || 'Class';
    
    // Format: Course {CourseCode} - ClassName
    if (courseCode) {
      defaultFileName = `Course ${courseCode} - ${className}`;
    } else {
      // Fallback if no course code
      defaultFileName = `${courseName} - ${className}`;
    }
  }
  
  setExportFileName(defaultFileName);
  setShowExportOptions(true);
};

  const processExport = () => {
  exportDirectlyFromData();
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

  // Add back the handleFileUpload function
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
            
            // Enhanced Auto-detect name column - specifically look for "No. Last Name, First Name" pattern
            // This pattern is commonly used in educational institutions where student records
            // include both student numbers and formatted names in a single column
            const specificNamePatterns = [
              'no. last name, first name',
              'no. lastname, firstname', 
              'number last name first name',
              'no lastname firstname',
              'student no. last name, first name',
              'student number last name first name'
            ];
            
            const generalNamePatterns = ['name', 'student', 'learner', 'pupil', 'full name', 'first name', 'last name', 'no.'];
            
            // First try to find the specific pattern
            let nameColumnIndex = headers.findIndex(header => 
              specificNamePatterns.some(pattern => 
                String(header).toLowerCase().includes(pattern.toLowerCase())
              )
            );
            
            // If not found, try general patterns
            if (nameColumnIndex === -1) {
              nameColumnIndex = headers.findIndex(header => 
                generalNamePatterns.some(pattern => 
                  String(header).toLowerCase().includes(pattern.toLowerCase())
                )
              );
            }
            
            if (nameColumnIndex !== -1) {
              setDetectedNameColumn(nameColumnIndex);
            }
            
            // Automatically add default category columns for imported data
            const defaultColumns = [
              // Quiz category
              { id: `quiz_category_${Date.now()}`, name: 'Quiz', type: 'header' },
              { id: `quiz_1_${Date.now()}`, name: 'Quiz 1', type: 'number', maxScore: 10 },
              { id: `quiz_2_${Date.now()}`, name: 'Quiz 2', type: 'number', maxScore: 10 },
              { id: `quiz_3_${Date.now()}`, name: 'Quiz 3', type: 'number', maxScore: 10 },
              { id: `quiz_4_${Date.now()}`, name: 'Quiz 4', type: 'number', maxScore: 10 },
              { id: `quiz_5_${Date.now()}`, name: 'Quiz 5', type: 'number', maxScore: 10 },
              
              // Lab category
              { id: `lab_category_${Date.now()}`, name: 'Laboratory Activities', type: 'header' },
              { id: `lab_1_${Date.now()}`, name: 'Lab 1', type: 'number', maxScore: 20 },
              { id: `lab_2_${Date.now()}`, name: 'Lab 2', type: 'number', maxScore: 20 },
              { id: `lab_3_${Date.now()}`, name: 'Lab 3', type: 'number', maxScore: 20 },
              { id: `lab_4_${Date.now()}`, name: 'Lab 4', type: 'number', maxScore: 20 },
              { id: `lab_5_${Date.now()}`, name: 'Lab 5', type: 'number', maxScore: 20 },
              
              // Exam category
              { id: `exam_category_${Date.now()}`, name: 'Exams', type: 'header' },
              { id: `pe_${Date.now()}`, name: 'PE - Prelim Exam', type: 'number', maxScore: 50 },
              { id: `me_${Date.now()}`, name: 'ME - Midterm Exam', type: 'number', maxScore: 50 },
              { id: `pfe_${Date.now()}`, name: 'PFE - PreFinal Exam', type: 'number', maxScore: 50 },
              { id: `fe_${Date.now()}`, name: 'FE - Final Exam', type: 'number', maxScore: 100 },
            ];
            
            console.log("Auto-adding default category columns:", defaultColumns);
            setCustomColumns(defaultColumns);
            
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
                <div className="flex flex-col gap-3 sm:gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-3 sm:mr-4">
                        <MdOutlineClass className="h-5 w-5 sm:h-6 sm:w-6 text-[#333D79]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">{classData.name}</h1>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {currentFileData
                              ? `Showing data from: ${selectedFile ? selectedFile.name : 'Imported file'}`
                              : `Last updated: ${classData.lastUpdated}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {currentFileData ? (
                          <>
                            {(!teamAccess || teamAccess.accessLevel === 'edit' || teamAccess.accessLevel === 'full') && (
                              <>
                                 <button
                                    onClick={handleUpdateClassRecord}
                                    className="bg-[#EEF0F8] text-[#333D79] hover:bg-[#DCE3F9] px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
                                  >
                                    <BsFileEarmarkSpreadsheet size={16} />
                                    <span className="whitespace-nowrap">Update Class Record</span>
                                  </button>
                              </>
                            )}
                            <button
                                onClick={handleExport}
                                className="bg-[#333D79] text-white hover:bg-[#4A5491] px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
                            >
                              <FiDownload size={16} />
                              <span className="whitespace-nowrap">Export Data</span>
                            </button>
                          </> 
                      ) : (
                          !teamAccess || teamAccess.accessLevel !== 'view' ? (
                              <label htmlFor="file-upload" className="cursor-pointer w-full sm:w-auto">
                                <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm w-full">
                                  <FiUpload size={16} />
                                  <span className="whitespace-nowrap">Import Files</span>
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
                </div>

                {/* Breadcrumb navigation */}
                <div className="flex items-center text-xs sm:text-sm text-gray-500 mb-2 pl-1">
                  <a
                      href="/dashboard/courses"
                      className="hover:text-[#333D79] transition-colors"
                  >
                    Courses
                  </a>
                  <span className="mx-2">/</span>
                  <span className="text-[#333D79] truncate">{classData?.name}</span>
                </div>

                {/* File Info Bar - Modified to show update counter */}
                  {currentFileData && (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 gap-3 sm:gap-0">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-md bg-[#EEF0F8] flex items-center justify-center mr-3 shadow-sm">
                          <BsFileEarmarkSpreadsheet className="text-[#333D79]" size={16} />
                        </div>
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-sm font-medium text-gray-700">{selectedFile?.name}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">
                              Updates: {currentFileData?.update_count || 0}
                            </span>
                          </div>
                         <p className="text-xs text-gray-500" title={currentFileData?.uploaded_at ? getFullDateTime(currentFileData.uploaded_at) : 'No upload date available'}>
                          {currentFileData?.uploaded_at ? formatRelativeTime(currentFileData.uploaded_at) : 'Recently uploaded'}
                        </p>
                        </div>
                      </div>

                      {/* Delete button */}
                      {(!teamAccess || teamAccess.accessLevel === 'edit' || teamAccess.accessLevel === 'full') && (
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="p-2 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-200 self-start sm:self-auto"
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
                          <div className="bg-white px-3 py-2 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 sticky top-0 z-10">
                            <div className="flex items-center">
                              <div className="h-6 w-6 text-blue-600 flex items-center justify-center mr-2">
                                <BsFileEarmarkSpreadsheet className="h-5 w-5" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">{selectedFile ? selectedFile.name : 'Sample Grades.xlsx'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                  onClick={handleExport}
                                  className="text-gray-500 hover:text-[#333D79] p-1.5 rounded-md hover:bg-gray-50"
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
          setShowExportOptions={setShowExportOptions}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          exportFileName={exportFileName}
          setExportFileName={setExportFileName}
          exportPreviewData={exportPreviewData}
          cancelExport={cancelExport}
          processExport={processExport}
        />

        <UpdateFileModal
          isOpen={showUpdateFileModal}
          onClose={() => setShowUpdateFileModal(false)}
          currentFile={currentFileData}
          onSave={handleFileUpdateSave}
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

        {/* Loading Indicator for Delete Operation - Centered on screen */}
        {isDeleting && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-fadeIn">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 border-4 border-red-100 border-t-red-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Deleting File</h3>
                  <p className="text-gray-500 text-center mb-2">Please wait while we delete the file...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
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