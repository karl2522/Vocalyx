import React, { useState, useEffect } from 'react';
import { BsCheckCircle, BsExclamationTriangle, BsFileEarmarkSpreadsheet, BsArrowClockwise } from 'react-icons/bs';
import { FiX, FiCheck, FiAlertCircle, FiArrowRight, FiColumns } from 'react-icons/fi';

const MergeExcelModal = ({ 
  isOpen, 
  onClose, 
  currentFile,
  newFile,
  onMerge,
  teamAccess
}) => {
  const [step, setStep] = useState('compare'); 
  const [matchedStudents, setMatchedStudents] = useState([]);
  const [unmatchedStudents, setUnmatchedStudents] = useState([]);
  const [overrideNames, setOverrideNames] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [categoryMappings, setCategoryMappings] = useState({});
  const [categories, setCategories] = useState([
    { id: 'quiz', name: 'Quizzes', columns: [] },
    { id: 'laboratory', name: 'Laboratory', columns: [] },
    { id: 'exams', name: 'Major Exams', columns: [] },
    { id: 'other', name: 'Other Activities', columns: [] },
  ]);
  const [newCategory, setNewCategory] = useState('');
  
  // New states for duplicate column handling
  const [duplicateColumns, setDuplicateColumns] = useState([]);
  const [columnsToOverride, setColumnsToOverride] = useState([]);
  const [newColumns, setNewColumns] = useState([]);

  const [showAllMatched, setShowAllMatched] = useState(false);
  const [showAllUnmatched, setShowAllUnmatched] = useState(false);

  useEffect(() => {
  if (currentFile && newFile) {
    console.log("Starting format-aware student matching...");
    
    // Find duplicate columns
    const currentHeaders = currentFile.all_sheets[currentFile.active_sheet].headers;
    const newHeaders = newFile.all_sheets[newFile.active_sheet].headers;
    
    console.log("Current file headers:", currentHeaders);
    console.log("New file headers:", newHeaders);
    
    const duplicates = newHeaders.filter(header => 
      currentHeaders.includes(header) && 
      !isNameOrIdColumn(header)
    );
    
    const truly_new = newHeaders.filter(header => 
      !currentHeaders.includes(header) &&
      !isNameOrIdColumn(header)
    );
    
    setDuplicateColumns(duplicates);
    setNewColumns(truly_new);
    
    // Get data
    const currentData = currentFile.all_sheets[currentFile.active_sheet].data;
    const newData = newFile.all_sheets[newFile.active_sheet].data;
    
    console.log("Current file students:", currentData.length);
    console.log("New file students:", newData.length);
    
    // DETECT DATA FORMAT AND NORMALIZE
    
    // Check if data is in array format (indexed numerically) vs object format (with named properties)
    const isArrayFormat = (data) => {
      if (!data || data.length === 0) return false;
      return Array.isArray(data[0]);
    };
    
    const normalizeRow = (row, headers, isArray) => {
      if (!isArray) return row; // Already in object format
      
      // Convert array to object format
      const normalized = {};
      headers.forEach((header, index) => {
        normalized[header] = row[index];
      });
      return normalized;
    };
    
    const isNewFileArrayFormat = isArrayFormat(newData);
    console.log("New file is in array format:", isNewFileArrayFormat);
    
    // Find name columns in both datasets
    const namePatterns = ['name', 'student', 'learner', 'no.', 'id', 'first', 'last'];
    
    const findNameColumnIndices = (headers) => {
      const indices = [];
      headers.forEach((header, index) => {
        const headerLower = String(header).toLowerCase();
        if (namePatterns.some(pattern => headerLower.includes(pattern))) {
          indices.push(index);
        }
      });
      return indices;
    };
    
    const currentNameIndices = findNameColumnIndices(currentHeaders);
    const newNameIndices = findNameColumnIndices(newHeaders);
    
    console.log("Current name column indices:", currentNameIndices);
    console.log("New name column indices:", newNameIndices);
    
    // Extract student identifiers from any row format
    const getStudentId = (row, headers, nameIndices, isArray) => {
      let names = [];
      let displayName = "Unknown";
      
      if (isArray) {
        // For array format
        nameIndices.forEach(index => {
          const value = row[index];
          if (value) {
            names.push(String(value).toLowerCase().trim());
            if (displayName === "Unknown") displayName = String(value);
          }
        });
      } else {
        // For object format
        nameIndices.forEach(index => {
          const header = headers[index];
          const value = row[header];
          if (value) {
            names.push(String(value).toLowerCase().trim());
            if (displayName === "Unknown") displayName = String(value);
          }
        });
      }
      
      return { names, displayName };
    };
    
    // Build current students map
    const currentStudentMap = new Map();
    
    currentData.forEach((row, index) => {
      const { names, displayName } = getStudentId(row, currentHeaders, currentNameIndices, false);
      
      console.log(`Current student ${index}: ${displayName}, Names:`, names);
      
      // Create a unique ID combining all name values
      const composite = names.join('|');
      if (composite) {
        currentStudentMap.set(composite, { 
          row, 
          displayName,
          nameValues: names 
        });
      }
      
      // Also add individual names as keys
      names.forEach(name => {
        if (name && name.length > 1) {
          currentStudentMap.set(name, { 
            row, 
            displayName,
            nameValues: names 
          });
        }
      });
    });
    
    console.log("Current student map size:", currentStudentMap.size);
    
    // Process new students
    const matches = [];
    const unmatched = [];
    
    newData.forEach((row, index) => {
      // Extract name info from the new student
      const { names, displayName } = getStudentId(
        row, 
        newHeaders, 
        newNameIndices, 
        isNewFileArrayFormat
      );
      
      console.log(`New student ${index}: ${displayName}, Names:`, names);
      
      let matched = false;
      let matchInfo = null;
      
      // Try to match using composite ID
      const composite = names.join('|');
      if (composite && currentStudentMap.has(composite)) {
        matchInfo = currentStudentMap.get(composite);
        matched = true;
        console.log(`  MATCH FOUND with composite: ${composite}`);
      } 
      
      // Try individual names
      if (!matched) {
        for (const name of names) {
          if (name && currentStudentMap.has(name)) {
            matchInfo = currentStudentMap.get(name);
            matched = true;
            console.log(`  MATCH FOUND with name: ${name}`);
            break;
          }
        }
      }
      
      // Try partial matching as last resort
      if (!matched) {
        for (const name of names) {
          if (!name || name.length < 3) continue;
          
          for (const [key, info] of currentStudentMap.entries()) {
            if (key.includes(name) || info.nameValues.some(val => val.includes(name))) {
              matchInfo = info;
              matched = true;
              console.log(`  PARTIAL MATCH FOUND with: ${name}`);
              break;
            }
          }
          if (matched) break;
        }
      }
      
      // Handle the match result
      const normalizedRow = normalizeRow(row, newHeaders, isNewFileArrayFormat);
      
      if (matched && matchInfo) {
        matches.push({
          index,
          name: displayName,
          currentName: matchInfo.displayName,
          newData: normalizedRow,
          currentData: matchInfo.row,
          matchType: 'name'
        });
        console.log(`  Added to matches: ${displayName} -> ${matchInfo.displayName}`);
      } else {
        unmatched.push({
          index,
          name: displayName,
          newData: normalizedRow
        });
        console.log(`  Added to unmatched: ${displayName}`);
      }
    });
    
    console.log(`Final matches: ${matches.length}, Unmatched: ${unmatched.length}`);
    
    setMatchedStudents(matches);
    setUnmatchedStudents(unmatched);
    
    // Pre-categorize columns
    categorizeMissingColumns(newFile, truly_new);
  }
}, [currentFile, newFile]);

  // Helper function to check if a column is a name or ID column
  const isNameOrIdColumn = (header) => {
    if (!header) return false;
    const headerLower = String(header).toLowerCase();
    return headerLower.includes('name') || 
           headerLower.includes('student') || 
           headerLower === 'no.' ||
           headerLower.includes('first') ||
           headerLower.includes('last') ||
           headerLower.includes('middle');
  };

  const findNameColumns = (headers) => {
    const nameRelated = [];
    
    headers.forEach((header, index) => {
      if (isNameOrIdColumn(header)) {
        nameRelated.push({
          index,
          header,
          type: 
            header.toLowerCase().includes('first') ? 'first' :
            header.toLowerCase().includes('last') ? 'last' :
            header.toLowerCase().includes('middle') ? 'middle' :
            header.toLowerCase().includes('full') ? 'full' : 'name'
        });
      }
    });
    
    return nameRelated;
  };
  
  // Toggle a column's override status
  const toggleColumnOverride = (column) => {
    setColumnsToOverride(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        return [...prev, column];
      }
    });
  };
  
  // Updated to only categorize truly new columns
  const categorizeMissingColumns = (file, newColumnsList = null) => {
    if (!file || !file.all_sheets || !currentFile || !currentFile.all_sheets) return;
    
    const activeSheet = file.active_sheet;
    const headers = file.all_sheets[activeSheet].headers;
    const currentHeaders = currentFile.all_sheets[currentFile.active_sheet].headers;
    
    // Use provided new columns list or calculate it
    const columnsToCategories = newColumnsList || 
      headers.filter(header => !currentHeaders.includes(header));
    
    // Initialize with empty columns
    const categorized = { quiz: [], laboratory: [], exams: [], other: [] };
    
    // STEP 1: Load existing category mappings from current file
    if (currentFile.all_sheets.category_mappings) {
      console.log("Loading existing categories from current file");
      
      currentFile.all_sheets.category_mappings.forEach(category => {
        const categoryId = category.id;
        if (categorized.hasOwnProperty(categoryId)) {
          // Only include columns that exist in the current file
          const existingColumns = category.columns.filter(col => 
            currentHeaders.includes(col));
          
          categorized[categoryId] = existingColumns;
        }
      });
    }
    
    // STEP 2: Try to auto-categorize new columns based on names
    columnsToCategories.forEach(column => {
      const columnLower = String(column).toLowerCase();
      let placed = false;
      
      // Skip name/ID columns
      if (isNameOrIdColumn(column)) {
        return;
      }
      
      // Auto-categorize based on column names
      if (columnLower.includes('quiz') || columnLower.includes('test') || 
          (columnLower.includes('html') && columnLower.includes('basic'))) {
        categorized.quiz.push(column);
        placed = true;
      } else if (columnLower.includes('lab') || columnLower.includes('activity') || 
                columnLower.includes('exercise') || columnLower.includes('homework') ||
                (columnLower.includes('html') && columnLower.includes('advanc'))) {
        categorized.laboratory.push(column);
        placed = true;
      } else if (columnLower.includes('exam') || columnLower === 'fe' || 
                columnLower === 'me' || columnLower === 'pe' || columnLower === 'pfe') {
        categorized.exams.push(column);
        placed = true;
      }
      
      // If not auto-categorized, put in "other"
      if (!placed) {
        categorized.other.push(column);
      }
    });
    
    // STEP 3: Update the categories state
    setCategories(prevCategories => {
      return prevCategories.map(category => {
        return {
          ...category,
          columns: categorized[category.id] || []
        };
      });
    });
  };
  
  // Add a new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const categoryId = newCategory.toLowerCase().replace(/\s+/g, '_');
    setCategories([...categories, { id: categoryId, name: newCategory, columns: [] }]);
    setNewCategory('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, categoryId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the column that was dragged
    const columnName = e.dataTransfer.getData('column');
    
    if (!columnName) return;
    
    moveColumnToCategory(columnName, categoryId);
  };
  
  // Move a column to a category
  const moveColumnToCategory = (column, targetCategoryId) => {
    // First, remove column from its current category
    const updatedCategories = categories.map(category => ({
      ...category,
      columns: category.columns.filter(col => col !== column)
    }));
    
    // Then add to the target category
    const targetIndex = updatedCategories.findIndex(cat => cat.id === targetCategoryId);
    if (targetIndex !== -1) {
      updatedCategories[targetIndex].columns.push(column);
    }
    
    setCategories(updatedCategories);
  };
  
  const handleDragStart = (e, column) => {
    e.dataTransfer.setData('column', column);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Toggle all column overrides
  const toggleAllColumnOverrides = (shouldOverride) => {
    if (shouldOverride) {
      setColumnsToOverride([...duplicateColumns]);
    } else {
      setColumnsToOverride([]);
    }
  };

  const handleMerge = () => {
    const headers = newFile.all_sheets[newFile.active_sheet].headers;
    
    // Create a direct name-to-category mapping that combines existing and new
    const columnCategories = {};
    
    // First, add any existing category mappings from the current file
    if (currentFile && currentFile.all_sheets.category_mappings) {
      currentFile.all_sheets.category_mappings.forEach(category => {
        category.columns.forEach(columnName => {
          // Only include columns that still exist in the current file
          if (currentFile.all_sheets[currentFile.active_sheet].headers.includes(columnName)) {
            columnCategories[columnName] = category.id;
          }
        });
      });
    }
    
    // Then add new category mappings
    categories.forEach(category => {
      category.columns.forEach(columnName => {
        columnCategories[columnName] = category.id;
      });
    });
    
    console.log("Sending combined category mappings:", columnCategories);
    
    onMerge({
      overrideNames,
      columnsToOverride, // Send the list of columns to override
      categories,
      categoryMappings: columnCategories, 
      matchedStudents,
      unmatchedStudents
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full animate-fadeIn h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
              <BsFileEarmarkSpreadsheet className="h-5 w-5 text-[#333D79]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Update Class Record</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step === 'compare' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-500'} mb-2`}>
                <span className="font-medium">1</span>
              </div>
              <span className={`text-xs ${step === 'compare' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Compare Data</span>
            </div>
            
            <div className={`flex-1 h-1 mx-2 ${step === 'compare' ? 'bg-gray-200' : 'bg-[#333D79]'}`}></div>
            
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step === 'categorize' ? 'bg-[#333D79] text-white' : step === 'confirm' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'} mb-2`}>
                <span className="font-medium">2</span>
              </div>
              <span className={`text-xs ${step === 'categorize' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Categorize Columns</span>
            </div>
            
            <div className={`flex-1 h-1 mx-2 ${step === 'confirm' ? 'bg-[#333D79]' : 'bg-gray-200'}`}></div>
            
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-400'} mb-2`}>
                <span className="font-medium">3</span>
              </div>
              <span className={`text-xs ${step === 'confirm' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Confirm</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {step === 'compare' && (
            <div>
              {/* Duplicate Columns Section */}
              {duplicateColumns.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-2">Duplicate Columns</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    These columns already exist in your current file. Select which ones to override with new data.
                  </p>
                  
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-medium text-blue-800">Column Override Options</span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleAllColumnOverrides(true)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => toggleAllColumnOverrides(false)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {duplicateColumns.map((column, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between rounded-lg p-2 ${
                            columnsToOverride.includes(column) ? 'bg-blue-100' : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <FiColumns className="mr-2 text-blue-600" size={16} />
                            <span className="text-sm">{column}</span>
                          </div>
                          <button
                            onClick={() => toggleColumnOverride(column)}
                            className={`flex items-center text-xs px-2 py-1 rounded ${
                              columnsToOverride.includes(column) 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {columnsToOverride.includes(column) ? (
                              <>
                                <BsArrowClockwise className="mr-1" size={10} />
                                Override
                              </>
                            ) : (
                              <>Keep Existing</>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Student Comparison */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Student Comparison</h4>
                <p className="text-sm text-gray-600">
                  We found {matchedStudents.length} matching students between your files and {unmatchedStudents.length} new students.
                </p>
                
                <div className="flex items-center mt-4 mb-6">
                  <input 
                    type="checkbox"
                    id="override-names"
                    className="h-4 w-4 text-[#333D79] focus:ring-[#333D79] rounded"
                    checked={overrideNames}
                    onChange={e => setOverrideNames(e.target.checked)}
                  />
                  <label htmlFor="override-names" className="ml-2 text-sm text-gray-700">
                    Override existing student names with data from new file
                  </label>
                </div>
              </div>
              
              {/* Matched Students */}
              <div className="border rounded-lg shadow-sm mb-6">
                <div className="bg-green-50 text-green-800 p-4 rounded-t-lg border-b border-green-100 flex justify-between items-center">
                  <div className="flex items-center">
                    <BsCheckCircle className="h-5 w-5 mr-2" />
                    <span className="font-medium">Matched Students ({matchedStudents.length})</span>
                  </div>
                  {matchedStudents.length > 5 && (
                    <button 
                      onClick={() => setShowAllMatched(!showAllMatched)}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full transition-colors"
                    >
                      {showAllMatched ? 'Show Less' : 'Show All'}
                    </button>
                  )}
                </div>
                <div className="p-4 bg-white rounded-b-lg max-h-[300px] overflow-y-auto">
                  {matchedStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">No matched students found</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                     {(showAllMatched ? matchedStudents : matchedStudents.slice(0, 5)).map((student, idx) => {
                        // Improved name display - combine first and last name when possible
                        let displayName = student.name;
                        let currentName = student.currentName;
                        
                        // First approach: Check common name fields
                        const getFormattedName = (data) => {
                          if (!data) return null;
                          
                          // Try NAME OF STUDENT field first
                          if (data["NAME OF STUDENT"]) {
                            return data["NAME OF STUDENT"];
                          }
                          
                          // Try Last name, First name combination
                          const lastName = data["LAST NAME"] || '';
                          const firstName = data["FIRST NAME"] || data["Unnamed: 2"] || '';
                          
                          if (lastName || firstName) {
                            return [lastName, firstName].filter(Boolean).join(', ');
                          }
                          
                          // Try direct index access if the data might be array-format
                          if (data[1] && typeof data[1] === 'string') {
                            return data[1]; // Likely the NAME OF STUDENT column
                          }
                          
                          // Return original if no better option found
                          return null;
                        };
                        
                        // For new data (imported file)
                        const betterDisplayName = getFormattedName(student.newData);
                        if (betterDisplayName) displayName = betterDisplayName;
                        
                        // For current data (existing file)
                        const betterCurrentName = getFormattedName(student.currentData);
                        if (betterCurrentName) currentName = betterCurrentName;
                        
                        // Debug output to help diagnose issues
                        console.log(`Student ${idx}:`, { 
                          original: student.name,
                          displayName, 
                          currentName, 
                          newData: student.newData,
                          currentData: student.currentData
                        });
                        
                        return (
                          <li key={idx} className="py-3 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{displayName}</span>
                              {displayName !== currentName && (
                                <span className="text-xs text-gray-500">→ {currentName}</span>
                              )}
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Matched</span>
                          </li>
                        );
                      })}
                      {!showAllMatched && matchedStudents.length > 5 && (
                        <li className="py-3 text-center">
                          <button 
                            onClick={() => setShowAllMatched(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            + {matchedStudents.length - 5} more students
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              
             {/* Unmatched Students */}
              <div className="border rounded-lg shadow-sm">
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-t-lg border-b border-yellow-100 flex justify-between items-center">
                  <div className="flex items-center">
                    <BsExclamationTriangle className="h-5 w-5 mr-2" />
                    <span className="font-medium">New Students ({unmatchedStudents.length})</span>
                  </div>
                  {unmatchedStudents.length > 5 && (
                    <button 
                      onClick={() => setShowAllUnmatched(!showAllUnmatched)}
                      className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded-full transition-colors"
                    >
                      {showAllUnmatched ? 'Show Less' : 'Show All'}
                    </button>
                  )}
                </div>
                <div className="p-4 bg-white rounded-b-lg max-h-[300px] overflow-y-auto">
                  {unmatchedStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">No new students found</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {(showAllUnmatched ? unmatchedStudents : unmatchedStudents.slice(0, 5)).map((student, idx) => {
                        // Improved name display
                        let displayName = student.name;
                        
                        // If the name is just a number, try to build a better name
                        if (/^\d+$/.test(displayName)) {
                          const rowData = student.newData || {};
                          const firstName = rowData["FIRST NAME"] || rowData["First Name"] || '';
                          const lastName = rowData["LAST NAME"] || rowData["Last Name"] || '';
                          if (firstName || lastName) {
                            displayName = [lastName, firstName].filter(Boolean).join(', ');
                          }
                        }
                        
                        return (
                          <li key={idx} className="py-3 flex items-center justify-between">
                            <span className="text-sm font-medium">{displayName}</span>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">New</span>
                          </li>
                        );
                      })}
                      {!showAllUnmatched && unmatchedStudents.length > 5 && (
                        <li className="py-3 text-center">
                          <button 
                            onClick={() => setShowAllUnmatched(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            + {unmatchedStudents.length - 5} more students
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {step === 'categorize' && (
            <div>
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Categorize New Columns</h4>
                <p className="text-sm text-gray-600">
                  Organize the new columns from your file into categories. Drag columns between categories to organize them.
                </p>
                
                <div className="flex items-center space-x-3 mt-4">
                  <input
                    type="text"
                    placeholder="Add new category..."
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-grow focus:ring-[#333D79] focus:border-[#333D79]"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-[#333D79] text-white rounded-lg text-sm hover:bg-[#4A5491] transition-colors"
                    disabled={!newCategory.trim()}
                  >
                    Add Category
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {categories.map(category => (
                  <div 
                    key={category.id} 
                    className="border rounded-lg shadow-sm"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, category.id)}
                  >
                    <div className="bg-[#333D79] text-white p-3 rounded-t-lg flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                        {category.columns.length} columns
                      </span>
                    </div>
                    <div 
                      className={`p-4 bg-white rounded-b-lg min-h-[100px] ${
                        isDragging ? 'border-2 border-dashed border-blue-300 bg-blue-50' : ''
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, category.id)}
                    >
                      {category.columns.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Drag columns here</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {category.columns.map((column, idx) => (
                            <div key={idx} 
                              className="px-3 py-1.5 bg-[#EEF0F8] text-[#333D79] text-sm rounded-lg flex items-center gap-2"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('column', column);
                                setIsDragging(true);
                              }}
                              onDragEnd={handleDragEnd}
                            >
                              {column}
                              <button
                                onClick={() => moveColumnToCategory(column, 'other')}
                                className="text-[#333D79] hover:text-red-600"
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <h5 className="text-base font-medium text-gray-700 mb-2">Uncategorized Columns</h5>
                <div 
                  className="border rounded-lg shadow-sm"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'other')} // Default drop to "other" category
                >
                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {newFile && 
                        newFile.all_sheets[newFile.active_sheet].headers
                          .filter(header => 
                            !categories.some(cat => cat.columns.includes(header)) &&
                            !isNameOrIdColumn(header)
                          )
                          .map((column, idx) => (
                            <div key={idx} 
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg flex items-center gap-2 cursor-move"
                              draggable
                              onDragStart={(e) => handleDragStart(e, column)}
                              onDragEnd={handleDragEnd}
                            >
                              {column}
                            </div>
                          ))
                      }
                      {(!newFile || newFile.all_sheets[newFile.active_sheet].headers.filter(header => 
                        !categories.some(cat => cat.columns.includes(header)) &&
                        !isNameOrIdColumn(header)
                      ).length === 0) && (
                        <p className="text-sm text-gray-400 p-2">No uncategorized columns</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {step === 'confirm' && (
            <div>
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Ready to Merge</h4>
                <p className="text-sm text-gray-600">
                  Review your selections and confirm the class record update.
                </p>
              </div>
              
              <div className="border rounded-lg shadow-sm mb-6">
                <div className="bg-[#EEF0F8] p-4 rounded-t-lg border-b">
                  <h5 className="font-medium text-gray-800">Merge Summary</h5>
                </div>
                <div className="p-5 bg-white rounded-b-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-2">Students</h6>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                          <span>{matchedStudents.length} matched students</span>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                          <span>{unmatchedStudents.length} new students to add</span>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                          <span>{overrideNames ? 'Will override existing names' : 'Will keep existing names'}</span>
                        </li>
                      </ul>
                      
                      {/* New section for duplicate columns */}
                      {duplicateColumns.length > 0 && (
                        <>
                          <h6 className="text-sm font-medium text-gray-700 mt-4 mb-2">Column Updates</h6>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                              <span>{columnsToOverride.length} columns to override</span>
                            </li>
                            <li className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                              <span>{duplicateColumns.length - columnsToOverride.length} columns to keep unchanged</span>
                            </li>
                            <li className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                              <span>{newColumns.length} new columns to add</span>
                            </li>
                          </ul>
                        </>
                      )}
                    </div>
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-2">Columns by Category</h6>
                      <ul className="space-y-2 text-sm">
                        {categories.map((category, idx) => (
                          <li key={idx} className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                            <span>{category.name}: {category.columns.length} columns</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 flex items-start">
                <FiAlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Important Note</p>
                  <p className="text-sm">This action will update your class record with the new data. Any categorization changes will affect how your data is displayed and organized.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-between bg-gray-50">
          <div>
            {step !== 'compare' && (
              <button
                onClick={() => setStep(step === 'categorize' ? 'compare' : 'categorize')}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>
          <button
            onClick={() => step === 'confirm' ? handleMerge() : setStep(step === 'compare' ? 'categorize' : 'confirm')}
            className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center"
          >
            {step === 'confirm' ? (
              <>
                <FiCheck className="mr-2" />
                <span>Merge Files</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <FiArrowRight className="ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeExcelModal;