import React, { useState, useEffect } from 'react';
import { BsCheckCircle, BsExclamationTriangle, BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import { FiX, FiCheck, FiAlertCircle, FiArrowRight } from 'react-icons/fi';

const MergeExcelModal = ({ 
  isOpen, 
  onClose, 
  currentFile,
  newFile,
  onMerge,
  teamAccess
}) => {
  const [step, setStep] = useState('compare'); // compare, categorize, confirm
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

  useEffect(() => {
  if (currentFile && newFile) {
    console.log("Starting enhanced student matching...");
    console.log("Current file:", currentFile);
    console.log("New file:", newFile);
    
    const matches = [];
    const unmatched = [];
    
    // Get data
    const currentData = currentFile.all_sheets[currentFile.active_sheet].data;
    const newData = newFile.all_sheets[newFile.active_sheet].headers;

    // Debug data structure
    console.log("Current file headers:", currentFile.all_sheets[currentFile.active_sheet].headers);
    console.log("New file headers:", newFile.all_sheets[newFile.active_sheet].headers);
    console.log("First row of current data:", currentData[0]);
    console.log("First row of new data:", newFile.all_sheets[newFile.active_sheet].data[0]);
    
    // STEP 1: Create a comprehensive map of existing student names with multiple variations
    const studentMap = new Map();
    
    // Find name-related columns in both files
    const currentHeaders = currentFile.all_sheets[currentFile.active_sheet].headers;
    const newHeaders = newFile.all_sheets[newFile.active_sheet].headers;
    
    // Create indices for name columns
    const currentNameColumns = findNameColumns(currentHeaders);
    const newNameColumns = findNameColumns(newHeaders);
    
    console.log("Current file name columns:", currentNameColumns);
    console.log("New file name columns:", newNameColumns);
    
    // Function to normalize a name for comparison
    const normalizeName = (name) => {
      if (!name) return '';
      return String(name).toLowerCase().trim()
        .replace(/\s+/g, ' ')          // Replace multiple spaces with single
        .replace(/[^\w\s]/g, '');      // Remove punctuation
    };
    
    // Create comprehensive variations of each student's name
    currentFile.all_sheets[currentFile.active_sheet].data.forEach((row, index) => {
      // Extract name parts
      let fullName = '';
      let firstName = '';
      let lastName = '';
      let middleName = '';
      
      // Try to find name components
      if (row["NAME OF STUDENT"]) {
        fullName = row["NAME OF STUDENT"];
        
        // Try to split full name into parts
        const nameParts = fullName.split(/\s+/);
        if (nameParts.length >= 2) {
          lastName = nameParts[0];
          firstName = nameParts[nameParts.length - 1];
          if (nameParts.length > 2) {
            middleName = nameParts.slice(1, -1).join(' ');
          }
        }
      } else {
        // Check separate name fields
        lastName = row["LAST NAME"] || '';
        firstName = row["FIRST NAME"] || '';
        middleName = row["MIDDLE NAME"] || '';
        
        // Construct full name from parts
        fullName = [lastName, firstName].filter(Boolean).join(', ');
      }
      
      // Create name variations for matching
      const variations = [];
      
      if (fullName) variations.push(normalizeName(fullName));
      if (lastName && firstName) {
        variations.push(normalizeName(`${lastName} ${firstName}`));
        variations.push(normalizeName(`${firstName} ${lastName}`));
        variations.push(normalizeName(`${lastName}, ${firstName}`));
      }
      if (lastName) variations.push(normalizeName(lastName));
      if (firstName) variations.push(normalizeName(firstName));
      
      // Add each variation to lookup map
      const uniqueVariations = [...new Set(variations.filter(v => v))];
      uniqueVariations.forEach(variant => {
        studentMap.set(variant, {
          index,
          row,
          fullName: fullName || `${lastName}, ${firstName}`,
          firstName,
          lastName
        });
      });
    });
    
    console.log("Generated student map with variations:", Array.from(studentMap.keys()));
    
    // STEP 2: Match students from the new file against our comprehensive map
    newFile.all_sheets[newFile.active_sheet].data.forEach((row, idx) => {
      // Similar to above, extract name components
      let fullName = '';
      let firstName = '';
      let lastName = '';
      
      // Try to find name components
      if (row["NAME OF STUDENT"]) {
        fullName = row["NAME OF STUDENT"];
        
        // Try to split full name into parts
        const nameParts = fullName.split(/\s+/);
        if (nameParts.length >= 2) {
          lastName = nameParts[0];
          firstName = nameParts[nameParts.length - 1];
        }
      } else {
        // Check separate name fields
        lastName = row["LAST NAME"] || '';
        firstName = row["FIRST NAME"] || '';
        
        // Construct full name from parts
        fullName = [lastName, firstName].filter(Boolean).join(', ');
      }
      
      // Create name variations for matching
      const variations = [];
      
      if (fullName) variations.push(normalizeName(fullName));
      if (lastName && firstName) {
        variations.push(normalizeName(`${lastName} ${firstName}`));
        variations.push(normalizeName(`${firstName} ${lastName}`));
        variations.push(normalizeName(`${lastName}, ${firstName}`));
      }
      if (lastName) variations.push(normalizeName(lastName));
      if (firstName) variations.push(normalizeName(firstName));
      
      // Display name for the UI
      const displayName = fullName || `${lastName}, ${firstName}` || "Unknown";
      
      let matched = false;
      let matchedInfo = null;
      
      // Check if any of the variations match
      for (const variant of variations.filter(Boolean)) {
        if (studentMap.has(variant)) {
          matchedInfo = studentMap.get(variant);
          matched = true;
          console.log(`Match found: "${variant}" -> "${matchedInfo.fullName}"`);
          break;
        }
      }
      
      // Last resort: Try each word in the name separately
      if (!matched && (lastName || firstName)) {
        const words = [lastName, firstName].filter(Boolean).join(' ').split(/\s+/);
        for (const word of words) {
          const normalized = normalizeName(word);
          if (normalized.length > 2 && studentMap.has(normalized)) { // Avoid matching on very short names
            matchedInfo = studentMap.get(normalized);
            matched = true;
            console.log(`Partial match found on word "${word}" -> "${matchedInfo.fullName}"`);
            break;
          }
        }
      }
      
      if (matched && matchedInfo) {
        matches.push({ 
          index: idx, 
          name: displayName,
          currentName: matchedInfo.fullName,
          newData: row,
          matchType: 'name'
        });
      } else {
        console.log(`No match for: "${displayName}" with variations:`, variations);
        unmatched.push({ 
          index: idx, 
          name: displayName,
          newData: row 
        });
      }
    });
    
    console.log(`Matching complete: ${matches.length} matches, ${unmatched.length} unmatched`);
    
    setMatchedStudents(matches);
    setUnmatchedStudents(unmatched);
    
    // Pre-categorize columns from new file
    categorizeMissingColumns(newFile);
  }
}, [currentFile, newFile]);

const findNameColumns = (headers) => {
  const nameRelated = [];
  
  headers.forEach((header, index) => {
    const headerStr = String(header).toLowerCase();
    
    if (
      headerStr.includes('name') || 
      headerStr.includes('student') ||
      headerStr === 'no.' ||
      headerStr.includes('first') ||
      headerStr.includes('last') ||
      headerStr.includes('middle')
    ) {
      nameRelated.push({
        index,
        header,
        type: 
          headerStr.includes('first') ? 'first' :
          headerStr.includes('last') ? 'last' :
          headerStr.includes('middle') ? 'middle' :
          headerStr.includes('full') ? 'full' : 'name'
      });
    }
  });
  
  return nameRelated;
};
  
  
  // Categorize new columns
  const categorizeMissingColumns = (file) => {
  if (!file || !file.all_sheets || !currentFile || !currentFile.all_sheets) return;
  
  const activeSheet = file.active_sheet;
  const headers = file.all_sheets[activeSheet].headers;
  const currentHeaders = currentFile.all_sheets[currentFile.active_sheet].headers;
  const newColumns = headers.filter(header => !currentHeaders.includes(header));
  
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
        console.log(`Loaded ${existingColumns.length} columns for category ${category.name}`);
      }
    });
  }
  
  // STEP 2: Place new columns in 'other' category for manual organization
  console.log(`Added ${newColumns.length} new columns to 'other' category`);
  categorized.other = [...categorized.other, ...newColumns];
  
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
    e.preventDefault(); // This is essential to allow dropping
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    };

        const handleDrop = (e, categoryId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the column that was dragged
    const columnName = e.dataTransfer.getData('column');
    
    if (!columnName) return;
    
    console.log(`Dropping column "${columnName}" into category "${categoryId}"`);
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
  
  // Visual feedback that column was moved
  console.log(`Moved column "${column}" to category "${targetCategoryId}"`);
};
  
    const handleDragStart = (e, column) => {
    e.dataTransfer.setData('column', column);
    setIsDragging(true);
 };

    const handleDragEnd = () => {
      setIsDragging(false);
  };

    const handleMerge = () => {
    const headers = newFile.all_sheets[newFile.active_sheet].headers;
    
    // Create a direct name-to-category mapping that includes both:
    // 1. Existing categorizations for columns that were already in the file
    // 2. New categorizations from this merge operation
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
    
    // Then add new category mappings, which will override any existing ones
    categories.forEach(category => {
        category.columns.forEach(columnName => {
        columnCategories[columnName] = category.id;
        });
    });
    
    console.log("Sending combined category mappings:", columnCategories);
    
    onMerge({
        overrideNames,
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
              <span className={`text-xs ${step === 'compare' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Compare Students</span>
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
                <div className="bg-green-50 text-green-800 p-4 rounded-t-lg border-b border-green-100 flex items-center">
                  <BsCheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Matched Students ({matchedStudents.length})</span>
                </div>
                <div className="p-4 bg-white rounded-b-lg max-h-48 overflow-y-auto">
                  {matchedStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">No matched students found</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {matchedStudents.slice(0, 5).map((student, idx) => (
                        <li key={idx} className="py-2 flex items-center justify-between">
                          <span className="text-sm font-medium">{student.name}</span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Matched</span>
                        </li>
                      ))}
                      {matchedStudents.length > 5 && (
                        <li className="py-2 text-center text-sm text-gray-500">
                          + {matchedStudents.length - 5} more students
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              
              {/* Unmatched Students */}
              <div className="border rounded-lg shadow-sm">
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-t-lg border-b border-yellow-100 flex items-center">
                  <BsExclamationTriangle className="h-5 w-5 mr-2" />
                  <span className="font-medium">New Students ({unmatchedStudents.length})</span>
                </div>
                <div className="p-4 bg-white rounded-b-lg max-h-48 overflow-y-auto">
                  {unmatchedStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">No new students found</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {unmatchedStudents.slice(0, 5).map((student, idx) => (
                        <li key={idx} className="py-2 flex items-center justify-between">
                          <span className="text-sm font-medium">{student.name}</span>
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">New</span>
                        </li>
                      ))}
                      {unmatchedStudents.length > 5 && (
                        <li className="py-2 text-center text-sm text-gray-500">
                          + {unmatchedStudents.length - 5} more students
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
                  Organize the columns from your new file into categories. Drag columns between categories to organize them.
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
                                }}
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
                            .filter(header => !categories.some(cat => cat.columns.includes(header)))
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
                  <div className="grid grid-cols-2 gap-6">
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