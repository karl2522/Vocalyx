import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { BsCheckCircle, BsFileEarmarkSpreadsheet, BsUpload, BsExclamationTriangle, BsPerson, BsPersonPlus } from 'react-icons/bs';
import { FiAlertCircle, FiArrowLeft, FiCheck, FiChevronRight, FiUpload, FiX, FiUsers, FiUserPlus, FiRefreshCw, FiEye, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { MdQuiz, MdSchool, MdScience } from 'react-icons/md';
import { classService } from '../../services/api';

const UpdateFileModal = ({ 
  isOpen, 
  onClose, 
  currentFile,
  onSave,
  teamAccess,
  classId
}) => {
  const [step, setStep] = useState('selectCategory');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // New states for conflict detection
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [conflictResolutions, setConflictResolutions] = useState({});
  const [bulkActions, setBulkActions] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [availableColumns, setAvailableColumns] = useState([]);
  const [categoryColumnMapping, setCategoryColumnMapping] = useState({});
  const [draggedColumn, setDraggedColumn] = useState(null);
  
  // 🆕 New states for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    exactMatches: false,
    newStudents: false,
    fuzzyMatches: false
  });

  const categoryOptions = [
    {
      id: 'quiz',
      name: 'Quiz',
      description: 'Upload quiz scores and add new quiz columns',
      icon: MdQuiz,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'laboratory',
      name: 'Laboratory Activities', 
      description: 'Upload lab work scores and add new lab columns',
      icon: MdScience,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'exams',
      name: 'Exams',
      description: 'Upload exam scores and add new exam columns',
      icon: MdSchool,
      color: 'bg-green-100 text-green-600'
    },
    // 🆕 Add custom categories dynamically
    ...customCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: `Custom category: ${cat.name}`,
      icon: MdSchool, // Default icon for custom categories
      color: 'bg-gray-100 text-gray-600',
      isCustom: true
    })),
    // 🆕 Create new category option
    {
      id: 'create_new',
      name: '+ Create Custom Category',
      description: 'Create a new category for your specific needs',
      icon: FiUpload, // or any appropriate icon
      color: 'bg-orange-100 text-orange-600',
      isCreateNew: true
    }
  ];

  if (!isOpen) return null;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 🔍 Helper function to extract student name from record
  const getStudentName = (record, columnMapping) => {
    if (!record || !columnMapping) return 'Unknown';
    
    const firstName = record[columnMapping.first_name] || '';
    const lastName = record[columnMapping.last_name] || '';
    const fullName = record[columnMapping.full_name] || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return fullName || record.name || 'Unknown';
  };

  const extractAvailableColumns = (conflictData) => {
    console.log("=== EXTRACTING AVAILABLE COLUMNS ===");
    console.log("conflictData:", conflictData);
    
    // Try to get headers from different sources
    let allHeaders = [];
    
    // Option 1: From imported_headers (if available)
    if (conflictData?.imported_headers) {
      allHeaders = conflictData.imported_headers;
      console.log("Got headers from imported_headers:", allHeaders);
    }
    // Option 2: From first imported record keys
    else if (conflictData?.imported_records && conflictData.imported_records.length > 0) {
      allHeaders = Object.keys(conflictData.imported_records[0]);
      console.log("Got headers from first imported record:", allHeaders);
    }
    // Option 3: From any example data in conflicts/matches
    else if (conflictData?.exact_matches && conflictData.exact_matches.length > 0) {
      allHeaders = Object.keys(conflictData.exact_matches[0].imported_record || {});
      console.log("Got headers from exact match imported record:", allHeaders);
    }
    else if (conflictData?.new_students && conflictData.new_students.length > 0) {
      allHeaders = Object.keys(conflictData.new_students[0].imported_record || {});
      console.log("Got headers from new student imported record:", allHeaders);
    }
    
    console.log("All headers found:", allHeaders);
    
    if (allHeaders.length === 0) {
      console.log("❌ No headers found in conflictData");
      return [];
    }
    
    const studentColumns = new Set();
    
    // Get student info columns to exclude
    if (conflictData.column_mapping?.imported) {
      Object.values(conflictData.column_mapping.imported).forEach(col => {
        if (col) studentColumns.add(col);
      });
    }
    
    // Also exclude common student column patterns
    const studentPatterns = ['no.', 'id', 'first name', 'last name', 'name', 'student'];
    
    // 🆕 NEW: Get existing columns from current file's category mappings
    const existingCategorizedColumns = new Set();
    const existingImportedColumns = new Set(); // 🆕 Track original imported names
    const existingCategories = currentFile?.all_sheets?.category_mappings || [];
    console.log("🔍 Existing categories:", existingCategories);
    
    existingCategories.forEach(category => {
      const columns = category.columns || [];
      columns.forEach(col => {
        if (col) existingCategorizedColumns.add(col);
      });
      
      // 🆕 NEW: Also check imported_column_mapping
      const importedMapping = category.imported_column_mapping || {};
      Object.values(importedMapping).forEach(originalName => {
        if (originalName) existingImportedColumns.add(originalName);
      });
    });
    
    console.log("🚫 Columns already in categories:", Array.from(existingCategorizedColumns));
    console.log("🚫 Original imported column names:", Array.from(existingImportedColumns));
    
    // Filter out student info columns AND existing categorized columns
   const availableCols = allHeaders.filter(col => {
      if (!col) return false;
      
      // Skip if already identified as student column
      if (studentColumns.has(col)) return false;
      
      // 🆕 NEW: Skip if already exists in current file's categories
      if (existingCategorizedColumns.has(col)) {
        console.log(`🚫 Skipping '${col}' - already exists in categories`);
        return false;
      }
      
      // 🆕 NEW: Skip if this was an original imported column name
      if (existingImportedColumns.has(col)) {
        console.log(`🚫 Skipping '${col}' - was previously imported`);
        return false;
      }
      
      // Skip if matches student patterns
      const colLower = col.toLowerCase().trim();
      const isStudentColumn = studentPatterns.some(pattern => 
        colLower.includes(pattern) || 
        colLower === pattern ||
        colLower.startsWith(pattern)
      );
      
      return !isStudentColumn;
    });
    
    console.log("Available columns for mapping:", availableCols);
    console.log("Excluded student columns:", Array.from(studentColumns));
    console.log("Excluded existing categorized columns:", Array.from(existingCategorizedColumns));
    console.log("Student patterns excluded:", studentPatterns);
    
    return availableCols;
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: `custom_${Date.now()}`,
        name: newCategoryName.trim(),
        columns: []
      };
      
      setCustomCategories(prev => [...prev, newCategory]);
      setNewCategoryName('');
      setShowCreateCategory(false);
      
      // Auto-select the new category and proceed
      setSelectedCategory(newCategory.id);
      setStep('uploadFile');
    }
  };

 const handleCategorySelect = (categoryId) => {
    if (categoryId === 'create_new') {
      setShowCreateCategory(true);
      return;
    }
    
    setSelectedCategory(categoryId);
    setStep('uploadFile');
  };

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setUploadError('');
    setIsAnalyzing(true);
    
    try {
      if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        setPreviewData({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          lastModified: new Date(file.lastModified).toLocaleString()
        });

        // Call preview_merge API to detect conflicts
        await analyzeFileConflicts(file);
        
      } else {
        setUploadError('Please select a valid spreadsheet file (.xlsx, .xls, or .csv)');
      }
    } catch (error) {
      setUploadError('Error analyzing file. Please try again.');
      console.error('File analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeFileConflicts = async (file) => {
      try {
          const response = await classService.previewMerge(
              file,
              currentFile?.class_id || 1,
              0.85,
              columnMapping
          );
          
          const data = response.data;
          setConflictData(data);
          setColumnMapping(data.column_mapping?.imported || {});
          
          // 🆕 Extract available columns for mapping
          const availableCols = extractAvailableColumns(data);
          setAvailableColumns(availableCols);
          
          // 🆕 Initialize category column mapping
          const initialMapping = {};
          [selectedCategory].forEach(catId => {
              initialMapping[catId] = [];
          });
          setCategoryColumnMapping(initialMapping);
          
          // 🆕 Always go to column mapping step if we have columns to map
          if (availableCols.length > 0) {
              setStep('columnMapping');
          } else {
              // Determine next step based on conflicts
              if (data.conflicts && data.conflicts.length > 0) {
                  setStep('conflictResolution');
              } else {
                  setStep('confirm');
              }
          }
          
      } catch (error) {
          console.error('Conflict analysis failed:', error);
          setUploadError(`Analysis failed: ${error.response?.data?.error || error.message}`);
          setStep('confirm');
      }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragStart = (e, column) => {
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e, targetCategoryId) => {
    e.preventDefault();
    
    if (!draggedColumn) return;
    
    // Remove column from any existing category
    const newMapping = { ...categoryColumnMapping };
    Object.keys(newMapping).forEach(catId => {
      newMapping[catId] = newMapping[catId].filter(col => col !== draggedColumn);
    });
    
    // Add to target category
    if (!newMapping[targetCategoryId]) {
      newMapping[targetCategoryId] = [];
    }
    newMapping[targetCategoryId].push(draggedColumn);
    
    setCategoryColumnMapping(newMapping);
    setDraggedColumn(null);
    
    console.log("Updated column mapping:", newMapping);
  };

  const handleRemoveColumnFromCategory = (categoryId, column) => {
    const newMapping = { ...categoryColumnMapping };
    newMapping[categoryId] = newMapping[categoryId].filter(col => col !== column);
    setCategoryColumnMapping(newMapping);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleConflictResolution = (conflictIndex, action, data = {}) => {
    setConflictResolutions(prev => ({
      ...prev,
      [conflictIndex]: { action, ...data }
    }));
  };

  const handleBulkAction = (actionType, apply = true) => {
    setBulkActions(prev => ({
      ...prev,
      [actionType]: apply
    }));
  };

  const handleConfirmUpload = async () => {
      try {
          console.log("🚀 ALWAYS CALLING EXECUTE MERGE FOR TESTING");
          
          // 🎯 FIX: Set default bulk actions if there are new students
          let finalBulkActions = { ...bulkActions };
          
          // If we have new students detected and no bulk action set, auto-enable add_all_new
          if (conflictData?.statistics?.new_students > 0 && !finalBulkActions.add_all_new) {
              console.log(`🚨 Found ${conflictData.statistics.new_students} new students, enabling add_all_new`);
              finalBulkActions.add_all_new = true;
          }
          
          // If we have exact matches and no bulk action set, auto-enable accept_all_exact
          if (conflictData?.statistics?.exact_matches > 0 && !finalBulkActions.accept_all_exact) {
              console.log(`🚨 Found ${conflictData.statistics.exact_matches} exact matches, enabling accept_all_exact`);
              finalBulkActions.accept_all_exact = true;
          }
          
          console.log("Final bulk actions being sent:", finalBulkActions);
          
          // 🆕 BUILD UPDATED CATEGORY MAPPINGS
          const updatedCategoryMappings = [];
          
          // Get existing category mappings from current file
          const existingCategories = currentFile?.all_sheets?.category_mappings || [];
          console.log("🔍 Existing categories:", existingCategories);
          
          // Update the mappings with new columns
          existingCategories.forEach(category => {
              const updatedCategory = { ...category };
              
              // If this category has new columns from drag & drop, add them
              if (categoryColumnMapping[category.id]) {
                  const newColumns = categoryColumnMapping[category.id];
                  console.log(`🆕 Adding ${newColumns.length} new columns to ${category.name}:`, newColumns);
                  
                  // Add new columns to existing ones (avoid duplicates)
                  const existingColumns = category.columns || [];
                  const allColumns = [...existingColumns];
                  
                  newColumns.forEach(newCol => {
                      if (!allColumns.includes(newCol)) {
                          allColumns.push(newCol);
                      }
                  });
                  
                  updatedCategory.columns = allColumns;
                  console.log(`✅ ${category.name} now has ${allColumns.length} columns:`, allColumns);
              }
              
              updatedCategoryMappings.push(updatedCategory);
          });
          
          console.log("📤 Final category mappings being sent:", updatedCategoryMappings);

          console.log("=== DETAILED CATEGORY MAPPINGS BEING SENT ===");
          updatedCategoryMappings.forEach((cat, index) => {
              console.log(`[${index}] ${cat.name} (${cat.id}): ${cat.columns.length} columns`);
              console.log(`    Columns: ${JSON.stringify(cat.columns)}`);
          });
          
          const response = await classService.executeMerge(
              selectedFile,
              classId,
              conflictResolutions || {},
              finalBulkActions,
              columnMapping || {},
              updatedCategoryMappings  // ✅ Send updated category mappings!
          );
          
          console.log("Execute merge response:", response.data);
          
          if (onSave) {
              onSave(response.data);
          }
      } catch (error) {
          console.error('Upload failed:', error);
          setUploadError(`Upload failed: ${error.response?.data?.error || error.message}`);
          return;
      }
      
      handleClose();
  };

  const handleClose = () => {
    setStep('selectCategory');
    setSelectedCategory('');
    setSelectedFile(null);
    setPreviewData(null);
    setUploadError('');
    setIsDragging(false);
    setConflictData(null);
    setConflictResolutions({});
    setBulkActions({});
    setAvailableColumns([]);
    setCategoryColumnMapping({});
    setDraggedColumn(null);
    setExpandedSections({
      exactMatches: false,
      newStudents: false,
      fuzzyMatches: false
    });
    onClose();
  };

  const renderCreateCategoryModal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
      onClick={() => {
        setShowCreateCategory(false);
        setNewCategoryName('');
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Create Custom Category</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Projects, Assignments, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              autoFocus 
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCreateCategory(false);
                setNewCategoryName('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] disabled:bg-gray-300 transition-colors"
            >
              Create Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategorySelection = () => (
    <>
      <div className="text-center mb-3 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">Select Category</h4>
        <p className="text-xs sm:text-base text-gray-600">Choose which category you want to update with your file</p>
      </div>

      <div className="space-y-2 sm:space-y-4 mb-3 sm:mb-6">
        {categoryOptions.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className="w-full p-2.5 sm:p-4 border border-gray-200 rounded-lg hover:border-[#333D79] hover:bg-[#EEF0F8] transition-all text-left group"
            >
              <div className="flex items-start">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg ${category.color} group-hover:bg-white flex items-center justify-center mr-2.5 sm:mr-4 transition-colors flex-shrink-0`}>
                  <IconComponent size={16} className="sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm sm:text-lg font-medium text-gray-800 mb-0.5 sm:mb-1">{category.name}</h5>
                  <p className="text-xs sm:text-sm text-gray-500 leading-tight">{category.description}</p>
                </div>
                <FiChevronRight className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-400 group-hover:text-[#333D79] transition-colors flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderFileUpload = () => (
    <>
      <div className="text-center mb-3 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">Upload File</h4>
        <p className="text-xs sm:text-base text-gray-600">
          Upload a file to add to the <span className="font-medium text-[#333D79]">
            {categoryOptions.find(cat => cat.id === selectedCategory)?.name}
          </span> category
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-3 sm:p-8 text-center transition-all ${
          isDragging 
            ? 'border-[#333D79] bg-[#EEF0F8]' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto flex justify-center">
          {isAnalyzing ? (
            <FiRefreshCw className="h-6 w-6 sm:h-12 sm:w-12 text-[#333D79] animate-spin" />
          ) : (
            <BsUpload className="h-6 w-6 sm:h-12 sm:w-12 text-gray-400" />
          )}
        </div>
        <div className="mt-2 sm:mt-4">
          {isAnalyzing ? (
            <p className="text-sm sm:text-lg text-[#333D79] font-medium">Analyzing file for conflicts...</p>
          ) : (
            <>
              <p className="text-sm sm:text-lg text-gray-700">Drag and drop your file here</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">or</p>
              <label htmlFor="file-upload" className="mt-1.5 sm:mt-2 cursor-pointer">
                <span className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors text-xs sm:text-base">
                  <FiUpload className="mr-1 sm:mr-2" size={12} />
                  Browse Files
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={isAnalyzing}
                />
              </label>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 sm:mt-2">
          Supported formats: Excel (.xlsx, .xls) and CSV files
        </p>
      </div>

      {uploadError && (
        <div className="mt-2.5 sm:mt-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <FiAlertCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-red-500 mr-1.5 sm:mr-2 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-700">{uploadError}</p>
        </div>
      )}
    </>
  );

  const renderColumnMapping = () => {
    const allCategories = [
      ...categoryOptions.filter(cat => cat.id !== 'create_new'),
      ...customCategories
    ];
    
    const selectedCategoryData = allCategories.find(cat => cat.id === selectedCategory);
    
    return (
      <>
        <div className="text-center mb-4">
          <h4 className="text-lg font-medium text-gray-800 mb-2">Map Your Columns</h4>
          <p className="text-sm text-gray-600">
            Drag columns from your file to the <span className="font-semibold text-[#333D79]">
              {selectedCategoryData?.name}
            </span> category
          </p>
        </div>

        {/* File Info */}
        {previewData && (
          <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <BsFileEarmarkSpreadsheet className="h-5 w-5 text-[#333D79] mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-800">{previewData.name}</p>
                <p className="text-xs text-gray-600">{availableColumns.length} columns available for mapping</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Columns */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-gray-800 flex items-center">
              <FiUpload className="h-4 w-4 mr-2" />
              Available Columns ({availableColumns.length})
            </h5>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px]">
              {availableColumns.length > 0 ? (
                <div className="space-y-2">
                  {availableColumns.map((column, index) => {
                    const isAssigned = Object.values(categoryColumnMapping).some(cols => cols.includes(column));
                    
                    return (
                      <div
                        key={index}
                        draggable={!isAssigned}
                        onDragStart={(e) => handleDragStart(e, column)}
                        className={`p-3 rounded-lg border transition-all cursor-move ${
                          isAssigned 
                            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed opacity-50' 
                            : draggedColumn === column
                              ? 'bg-blue-100 border-blue-300 shadow-md'
                              : 'bg-white border-gray-200 hover:border-[#333D79] hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{column}</span>
                          {isAssigned && (
                            <span className="text-xs text-gray-500">✓ Assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FiAlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No columns available for mapping</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Category */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-gray-800 flex items-center">
              {selectedCategoryData && React.createElement(selectedCategoryData.icon, {
                className: "h-4 w-4 mr-2"
              })}
              {selectedCategoryData?.name} Category
            </h5>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-all ${
                draggedColumn 
                  ? 'border-[#333D79] bg-[#EEF0F8]' 
                  : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, selectedCategory)}
            >
              <div className="space-y-2">
                {categoryColumnMapping[selectedCategory]?.length > 0 ? (
                  categoryColumnMapping[selectedCategory].map((column, index) => (
                    <div
                      key={index}
                      className="p-3 bg-[#333D79] text-white rounded-lg flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">{column}</span>
                      <button
                        onClick={() => handleRemoveColumnFromCategory(selectedCategory, column)}
                        className="text-white hover:text-red-200 transition-colors"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <FiChevronDown className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">
                        {draggedColumn 
                          ? 'Drop column here' 
                          : 'Drag columns here to assign to this category'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Student Data Preview (existing code) */}
        {conflictData && (
          <div className="mt-6 space-y-4">
            <h5 className="text-sm font-medium text-gray-800">Student Data Preview</h5>
            
            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="text-lg font-bold text-green-600">{conflictData.statistics?.exact_matches || 0}</div>
                <div className="text-xs text-green-700">Exact Matches</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <div className="text-lg font-bold text-yellow-600">{conflictData.statistics?.fuzzy_matches || 0}</div>
                <div className="text-xs text-yellow-700">Similar Names</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <div className="text-lg font-bold text-red-600">{conflictData.statistics?.conflicts || 0}</div>
                <div className="text-xs text-red-700">Conflicts</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-600">{conflictData.statistics?.new_students || 0}</div>
                <div className="text-xs text-blue-700">New Students</div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderConflictResolution = () => (
    <>
      <div className="text-center mb-4">
        <h4 className="text-lg font-medium text-gray-800 mb-2">Resolve Conflicts</h4>
        <p className="text-sm text-gray-600">Review and resolve the detected conflicts</p>
      </div>

      {/* Statistics */}
      {conflictData?.statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-lg font-bold text-green-600">{conflictData.statistics.exact_matches}</div>
            <div className="text-xs text-green-700">Exact Matches</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center">
            <div className="text-lg font-bold text-yellow-600">{conflictData.statistics.fuzzy_matches}</div>
            <div className="text-xs text-yellow-700">Similar Names</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <div className="text-lg font-bold text-red-600">{conflictData.statistics.conflicts}</div>
            <div className="text-xs text-red-700">Conflicts</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600">{conflictData.statistics.new_students}</div>
            <div className="text-xs text-blue-700">New Students</div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {conflictData?.bulk_actions_available && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-800 mb-3">Bulk Actions</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleBulkAction('accept_all_exact', !bulkActions.accept_all_exact)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                bulkActions.accept_all_exact 
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {bulkActions.accept_all_exact ? '✓ ' : ''}Accept All Exact Matches
            </button>
            <button
              onClick={() => handleBulkAction('add_all_new', !bulkActions.add_all_new)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                bulkActions.add_all_new 
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {bulkActions.add_all_new ? '✓ ' : ''}Add All New Students
            </button>
          </div>
        </div>
      )}

      {/* Conflicts List */}
      {conflictData?.conflicts && conflictData.conflicts.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          <h5 className="text-sm font-medium text-gray-800 sticky top-0 bg-white pb-2">
            Conflicts Requiring Attention ({conflictData.conflicts.length})
          </h5>
          {conflictData.conflicts.map((conflict, index) => (
            <div key={index} className="p-3 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <BsExclamationTriangle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-red-700">
                    {conflict.conflict_type === 'DUPLICATE_ID_DIFFERENT_NAME' ? 'Same ID, Different Names' : 'Same Name, Different IDs'}
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mb-3">
                <div><strong>Existing:</strong> {conflict.details?.existing_name || 'N/A'}</div>
                <div><strong>Importing:</strong> {conflict.details?.imported_name || 'N/A'}</div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleConflictResolution(index, 'override')}
                  className={`px-2 py-1 text-xs rounded ${
                    conflictResolutions[index]?.action === 'override'
                      ? 'bg-orange-200 text-orange-800'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Override Existing
                </button>
                <button
                  onClick={() => handleConflictResolution(index, 'keep_existing')}
                  className={`px-2 py-1 text-xs rounded ${
                    conflictResolutions[index]?.action === 'keep_existing'
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Keep Existing
                </button>
                <button
                  onClick={() => handleConflictResolution(index, 'add_new')}
                  className={`px-2 py-1 text-xs rounded ${
                    conflictResolutions[index]?.action === 'add_new'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Add as New
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* High confidence fuzzy matches */}
      {conflictData?.high_confidence_matches && conflictData.high_confidence_matches.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="text-sm font-medium text-yellow-800 mb-2">High Confidence Matches</h5>
          <p className="text-xs text-yellow-700 mb-2">These names are very similar. Auto-accept?</p>
          {conflictData.high_confidence_matches.slice(0, 3).map((match, index) => (
            <div key={index} className="text-xs text-yellow-600 mb-1">
              "{getStudentName(match.imported_record, conflictData.column_mapping?.imported)}" → "{getStudentName(match.existing_record, conflictData.column_mapping?.existing)}" ({Math.round(match.confidence * 100)}%)
            </div>
          ))}
          <button
            onClick={() => handleBulkAction('accept_high_confidence', !bulkActions.accept_high_confidence)}
            className={`mt-2 px-2 py-1 text-xs rounded ${
              bulkActions.accept_high_confidence 
                ? 'bg-yellow-200 text-yellow-800'
                : 'bg-white border border-yellow-300 text-yellow-700 hover:bg-yellow-50'
            }`}
          >
            {bulkActions.accept_high_confidence ? '✓ ' : ''}Accept All High Confidence
          </button>
        </div>
      )}
    </>
  );

  const renderConfirmation = () => (
    <>
      <div className="text-center mb-3 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">Confirm Upload</h4>
        <p className="text-xs sm:text-base text-gray-600">Review your selections before proceeding</p>
      </div>

      {/* Enhanced conflict summary */}
      {conflictData && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="text-sm font-medium text-blue-800 mb-3">📊 Merge Summary</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">✓ Exact matches:</span>
                <span className="font-semibold text-green-600">{conflictData.statistics?.exact_matches || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">➕ New students:</span>
                <span className="font-semibold text-blue-600">{conflictData.statistics?.new_students || 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">⚠ Conflicts:</span>
                <span className="font-semibold text-red-600">{conflictData.statistics?.conflicts || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">🔍 Similar names:</span>
                <span className="font-semibold text-yellow-600">{conflictData.statistics?.fuzzy_matches || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Action summary */}
          {(Object.keys(conflictResolutions).length > 0 || Object.keys(bulkActions).length > 0) && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700 font-medium mb-1">Selected Actions:</p>
              <div className="text-xs text-blue-600 space-y-1">
                {Object.entries(bulkActions).map(([action, enabled]) => 
                  enabled && (
                    <div key={action}>• {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                  )
                )}
                {Object.keys(conflictResolutions).length > 0 && (
                  <div>• {Object.keys(conflictResolutions).length} individual conflict resolutions</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5 sm:space-y-4 mb-3 sm:mb-6">
        {/* Category Info */}
        <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-2.5 sm:mr-3 flex-shrink-0">
              {React.createElement(categoryOptions.find(cat => cat.id === selectedCategory)?.icon, {
                size: 16,
                className: 'text-[#333D79] sm:w-5 sm:h-5'
              })}
            </div>
            <div className="min-w-0">
              <h5 className="text-xs sm:text-base font-medium text-gray-800">Target Category</h5>
              <p className="text-xs sm:text-sm text-gray-600">
                {categoryOptions.find(cat => cat.id === selectedCategory)?.name}
              </p>
            </div>
          </div>
        </div>

        {/* File Info */}
        {previewData && (
          <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-2.5 sm:mr-3 flex-shrink-0">
                <BsFileEarmarkSpreadsheet className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-[#333D79]" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs sm:text-base font-medium text-gray-800 truncate">{previewData.name}</h5>
                <p className="text-xs sm:text-sm text-gray-600">{previewData.size}</p>
              </div>
              <BsCheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <FiAlertCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-blue-500 mr-1.5 sm:mr-2 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-blue-700 font-medium">What will happen:</p>
            <ul className="text-xs sm:text-sm text-blue-600 mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
              <li>• Student data will be intelligently matched</li>
              <li>• New columns will be added to {categoryOptions.find(cat => cat.id === selectedCategory)?.name}</li>
              <li>• Conflicts will be resolved as specified</li>
              <li>• Existing data will be preserved</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  // Enhanced step logic
  const getStepNumber = () => {
    switch (step) {
      case 'selectCategory': return 1;
      case 'uploadFile': return 2;
      case 'columnMapping': return 3;
      case 'conflictResolution': return 4;
      case 'confirm': return 5;
      default: return 1;
    }
  };

  const getTotalSteps = () => {
    if (conflictData?.conflicts?.length > 0) return 5;
    if (conflictData && Object.keys(conflictData.column_mapping?.imported || {}).length > 0) return 4;
    return 3;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-1 sm:p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-screen sm:h-auto sm:max-h-[96vh] flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0 rounded-t-lg">
          <div className="flex items-center">
            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-2 sm:mr-3">
              <FiUpload className="h-3 w-3 sm:h-5 sm:w-5 text-[#333D79]" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold text-gray-800">Smart File Merge</h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1.5 sm:p-2 hover:bg-gray-100"
          >
            <FiX size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-6">
            {/* Enhanced Step Indicator */}
            <div className="flex items-center justify-center mb-3 sm:mb-6">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((stepNum, index) => (
                  <React.Fragment key={stepNum}>
                    <div className={`flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium ${
                      stepNum === getStepNumber() ? 'bg-[#333D79] text-white' : 
                      stepNum < getStepNumber() ? 'bg-green-500 text-white' : 
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {stepNum < getStepNumber() ? <FiCheck size={12} /> : stepNum}
                    </div>
                    {index < getTotalSteps() - 1 && (
                      <div className={`h-0.5 sm:h-1 w-4 sm:w-8 rounded-full ${
                        stepNum < getStepNumber() ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {step === 'selectCategory' && renderCategorySelection()}
            {step === 'uploadFile' && renderFileUpload()}
            {step === 'columnMapping' && renderColumnMapping()}
            {step === 'conflictResolution' && renderConflictResolution()}
            {step === 'confirm' && renderConfirmation()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-between flex-shrink-0 rounded-b-lg">
          <div>
            {step !== 'selectCategory' && (
              <button
                onClick={() => {
                  if (step === 'uploadFile') setStep('selectCategory');
                  else if (step === 'columnMapping') setStep('uploadFile');
                  else if (step === 'conflictResolution') setStep('columnMapping');
                  else if (step === 'confirm') {
                    if (conflictData?.conflicts?.length > 0) setStep('conflictResolution');
                    else if (conflictData) setStep('columnMapping');
                    else setStep('uploadFile');
                  }
                }}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center text-xs sm:text-base rounded-lg hover:bg-gray-200"
              >
                <FiArrowLeft className="mr-1 sm:mr-2" size={14} />
                Back
              </button>
            )}
          </div>

          <div className="flex space-x-1.5 sm:space-x-3">
            <button
              onClick={handleClose}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors text-xs sm:text-base rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            
            {step === 'columnMapping' && (
              <button
                onClick={() => setStep(conflictData?.conflicts?.length > 0 ? 'conflictResolution' : 'confirm')}
                className="px-3 sm:px-6 py-1.5 sm:py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors flex items-center text-xs sm:text-base"
              >
                <FiChevronRight className="mr-1 sm:mr-2" size={14} />
                Continue
              </button>
            )}
            
            {step === 'conflictResolution' && (
              <button
                onClick={() => setStep('confirm')}
                className="px-3 sm:px-6 py-1.5 sm:py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors flex items-center text-xs sm:text-base"
              >
                <FiCheck className="mr-1 sm:mr-2" size={14} />
                Resolve & Continue
              </button>
            )}
            
            {step === 'confirm' && (
              <button
                onClick={handleConfirmUpload}
                className="px-3 sm:px-6 py-1.5 sm:py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors flex items-center text-xs sm:text-base"
              >
                <FiCheck className="mr-1 sm:mr-2" size={14} />
                <span className="hidden sm:inline">Execute Merge</span>
                <span className="sm:hidden">Merge</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showCreateCategory && renderCreateCategoryModal()}
    </div>
  );
};

UpdateFileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentFile: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  teamAccess: PropTypes.object
};

export default UpdateFileModal;