import React, { useState, useEffect } from 'react';
import { BsCheckCircle, BsFileEarmarkSpreadsheet, BsPlus } from 'react-icons/bs';
import { FiX, FiCheck, FiAlertCircle, FiEdit, FiColumns, FiTrash2 } from 'react-icons/fi';

const ManualUpdateModal = ({ 
  isOpen, 
  onClose, 
  currentFile,
  onSave,
  teamAccess
}) => {
  const [step, setStep] = useState('edit'); // edit, confirm
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newColumnForm, setNewColumnForm] = useState({
    name: '',
    category: '',
    type: 'number',
    maxScore: ''
  });
  const [showNewColumnForm, setShowNewColumnForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const standardCategories = ['student', 'quiz', 'laboratory', 'exams', 'other'];
  const categoryDisplayNames = {
    student: 'Student Information',
    quiz: 'Quizzes',
    laboratory: 'Laboratory Works',
    exams: 'Major Exams',
    other: 'Other Activities'
  };

  // Load current file categories
 // Fix the useEffect that loads categories
useEffect(() => {
  if (currentFile && currentFile.all_sheets) {
    const currentHeaders = currentFile.all_sheets[currentFile.active_sheet].headers;
    
    // Get mappings from both possible sources
    const columnCategories = currentFile.column_categories || {};
    let categoryMappingsFromFile = [];
    
    if (currentFile.all_sheets.category_mappings) {
      categoryMappingsFromFile = currentFile.all_sheets.category_mappings;
    }
    
    console.log("Current headers:", currentHeaders);
    console.log("Column categories:", columnCategories);
    console.log("Category mappings from file:", categoryMappingsFromFile);
    
    // First, build a complete map of column-to-category
    const completeMapping = {...columnCategories};
    
    // Add mappings from category_mappings if they're not already in column_categories
    categoryMappingsFromFile.forEach(category => {
      category.columns.forEach(column => {
        if (!completeMapping[column]) {
          completeMapping[column] = category.id;
        }
      });
    });
    
    console.log("Complete mapping:", completeMapping);
    
    // Build a list of columns that are already mapped
    const mappedColumns = new Set(Object.keys(completeMapping));
    
    // Get all columns that should be auto-categorized (not explicitly mapped and not student columns)
    const columnsToAutoCategorize = currentHeaders.filter(header => 
      !mappedColumns.has(header) && !isStudentColumn(header)
    );
    
    console.log("Columns to auto-categorize:", columnsToAutoCategorize);
    
    // Auto-assign these to the "other" category
    columnsToAutoCategorize.forEach(column => {
      completeMapping[column] = 'other';
    });
    
    // Now build categories with their columns
    const initialCategories = standardCategories.map(catId => {
      // Get columns from the complete mapping
      const columns = currentHeaders.filter(header => 
        completeMapping[header] === catId ||
        (catId === 'student' && isStudentColumn(header) && !completeMapping[header])
      );
      
      return {
        id: catId,
        name: categoryDisplayNames[catId] || catId,
        columns: columns,
        isStandard: true
      };
    });
    
    // Add custom categories
    categoryMappingsFromFile.forEach(category => {
      if (!standardCategories.includes(category.id)) {
        // Get columns for this custom category too
        const columns = currentHeaders.filter(header => 
          completeMapping[header] === category.id
        );
        
        initialCategories.push({
          id: category.id,
          name: category.name,
          columns: columns,
          isStandard: false
        });
      }
    });
    
    console.log("Final categories:", initialCategories);
    setCategories(initialCategories);
  }
}, [currentFile]);

  const isStudentColumn = (header) => {
    if (!header) return false;
    const headerLower = String(header).toLowerCase();
    return headerLower.includes('name') || 
           headerLower.includes('student') || 
           headerLower === 'no.' ||
           headerLower.includes('first') ||
           headerLower.includes('last') ||
           headerLower.includes('middle');
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const categoryId = newCategory.toLowerCase().replace(/\s+/g, '_');
    
    // Check for duplicate category ID
    if (categories.some(cat => cat.id === categoryId)) {
      alert('A category with a similar name already exists.');
      return;
    }
    
    setCategories([...categories, { 
      id: categoryId, 
      name: newCategory, 
      columns: [],
      isStandard: false
    }]);
    
    setNewCategory('');
  };
  
  const handleDeleteCategory = (categoryId) => {
    // Only allow deleting custom categories
    if (standardCategories.includes(categoryId)) {
      alert('Standard categories cannot be deleted.');
      return;
    }
    
    // Move columns from this category to "Other"
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    const otherCategory = categories.find(cat => cat.id === 'other');
    
    if (categoryToDelete && otherCategory) {
      const updatedCategories = categories.map(cat => {
        if (cat.id === 'other') {
          return {
            ...cat,
            columns: [...cat.columns, ...categoryToDelete.columns]
          };
        }
        return cat;
      }).filter(cat => cat.id !== categoryId);
      
      setCategories(updatedCategories);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, categoryId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const columnName = e.dataTransfer.getData('column');
    if (!columnName) return;
    
    moveColumnToCategory(columnName, categoryId);
  };
  
  const moveColumnToCategory = (column, targetCategoryId) => {
    // For student columns, don't allow moving out of student category
    if (isStudentColumn(column) && targetCategoryId !== 'student') {
      return;
    }
    
    // Update categories
    const updatedCategories = categories.map(category => ({
      ...category,
      columns: category.columns.filter(col => col !== column)
    }));
    
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
  
  const handleAddColumn = () => {
  if (!newColumnForm.name.trim() || !newColumnForm.category) {
    alert('Please provide a column name and select a category');
    return;
  }
  
  // Validate max score is required for number type
  if (newColumnForm.type === 'number' && !newColumnForm.maxScore) {
    alert('Please provide a maximum score for this graded column');
    return;
  }
  
  // Format the column name based on type
  let columnName = newColumnForm.name.trim();
  if (newColumnForm.type === 'number') {
    columnName = `${columnName} (${newColumnForm.maxScore} pts)`;
  }
  
  // Find the target category
  const targetCategory = categories.find(cat => cat.id === newColumnForm.category);
  if (!targetCategory) return;
  
  // Add the column to the category
  const updatedCategories = categories.map(category => {
    if (category.id === targetCategory.id) {
      return {
        ...category,
        columns: [...category.columns, columnName]
      };
    }
    return category;
  });
  
  setCategories(updatedCategories);
  setShowNewColumnForm(false);
  setNewColumnForm({
    name: '',
    category: '',
    type: 'number',
    maxScore: ''
  });
};
  
  const handleDeleteColumn = (column, categoryId) => {
    // Prevent deleting student columns
    if (isStudentColumn(column)) {
      alert('Student information columns cannot be removed.');
      return;
    }
    
    const updatedCategories = categories.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          columns: category.columns.filter(col => col !== column)
        };
      }
      return category;
    });
    
    setCategories(updatedCategories);
  };
  
  const handleSave = () => {
    if (!currentFile) return;
    
    // Convert categories to column_categories mapping
    const columnCategories = {};
    categories.forEach(category => {
      category.columns.forEach(column => {
        columnCategories[column] = category.id;
      });
    });
    
    // Convert to category_mappings format for storage
    const categoryMappings = categories.map(category => ({
      id: category.id,
      name: category.name,
      columns: category.columns
    }));
    
    // Create updated file data
    const updatedFileData = {
      ...currentFile,
      column_categories: columnCategories,
      all_sheets: {
        ...currentFile.all_sheets,
        category_mappings: categoryMappings
      }
    };
    
    onSave(updatedFileData);
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
            <h3 className="text-xl font-semibold text-gray-800">Manual Update</h3>
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
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step === 'edit' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-500'} mb-2`}>
                <span className="font-medium">1</span>
              </div>
              <span className={`text-xs ${step === 'edit' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Edit Structure</span>
            </div>
            
            <div className={`flex-1 h-1 mx-2 ${step === 'edit' ? 'bg-gray-200' : 'bg-[#333D79]'}`}></div>
            
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-400'} mb-2`}>
                <span className="font-medium">2</span>
              </div>
              <span className={`text-xs ${step === 'confirm' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Confirm Changes</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {step === 'edit' && (
            <div>
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Manage Categories & Columns</h4>
                <p className="text-sm text-gray-600">
                  Organize your data by adding new columns and categories, or rearranging existing ones.
                </p>
                
                {/* Add New Column Button */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowNewColumnForm(true)}
                    className="px-4 py-2 bg-[#333D79] text-white rounded-lg text-sm hover:bg-[#4A5491] transition-colors flex items-center gap-2"
                  >
                    <BsPlus size={18} />
                    <span>Add New Column</span>
                  </button>
                  
                  {/* Add New Category */}
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      placeholder="New category name..."
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-grow focus:ring-[#333D79] focus:border-[#333D79]"
                    />
                    <button
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                      disabled={!newCategory.trim()}
                    >
                      Add Category
                    </button>
                  </div>
                </div>
                
                {/* New Column Form */}
                {showNewColumnForm && (
                  <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-blue-800">Add New Column</h5>
                      <button
                        onClick={() => setShowNewColumnForm(false)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        <FiX size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
                        <input
                          type="text"
                          value={newColumnForm.name}
                          onChange={e => setNewColumnForm({...newColumnForm, name: e.target.value})}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#333D79] focus:border-[#333D79]"
                          placeholder="e.g. Homework 1"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={newColumnForm.category}
                          onChange={e => setNewColumnForm({...newColumnForm, category: e.target.value})}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#333D79] focus:border-[#333D79]"
                        >
                          <option value="">Select a category</option>
                          {categories
                            .filter(cat => cat.id !== 'student') // Exclude student category
                            .map((category, idx) => (
                              <option key={idx} value={category.id}>{category.name}</option>
                            ))
                          }
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
                        <select
                          value={newColumnForm.type}
                          onChange={e => setNewColumnForm({...newColumnForm, type: e.target.value})}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#333D79] focus:border-[#333D79]"
                        >
                          <option value="number">Number (Grade)</option>
                          <option value="text">Text</option>
                        </select>
                      </div>
                      
                      {newColumnForm.type === 'number' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Score <span className="text-red-500">*</span>
                            </label>
                            <input
                            type="number"
                            value={newColumnForm.maxScore}
                            onChange={e => setNewColumnForm({...newColumnForm, maxScore: e.target.value})}
                            className={`w-full border ${!newColumnForm.maxScore ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#333D79]'} rounded px-3 py-2 text-sm focus:border-[#333D79]`}
                            placeholder="e.g. 100"
                            required
                            />
                            {!newColumnForm.maxScore && (
                            <p className="text-xs text-red-500 mt-1">Max score is required for graded columns</p>
                            )}
                        </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleAddColumn}
                        className={`px-3 py-1.5 ${
                            !newColumnForm.name.trim() || 
                            !newColumnForm.category || 
                            (newColumnForm.type === 'number' && !newColumnForm.maxScore) 
                            ? 'bg-gray-400' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white rounded-lg`}
                        disabled={
                            !newColumnForm.name.trim() || 
                            !newColumnForm.category || 
                            (newColumnForm.type === 'number' && !newColumnForm.maxScore)
                        }
                        >
                        Add Column
                        </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Categories and Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {categories.map((category, idx) => (
                  <div 
                    key={idx} 
                    className="border rounded-lg shadow-sm"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, category.id)}
                  >
                    <div className="bg-[#333D79] text-white p-3 rounded-t-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium">{category.name}</span>
                        <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                          {category.columns.length} columns
                        </span>
                      </div>
                      
                      {/* Only show delete button for custom categories */}
                      {!category.isStandard && (
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-white hover:text-red-200 p-1 rounded"
                          title="Delete category"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                    
                    <div 
                      className={`p-4 bg-white rounded-b-lg min-h-[120px] ${
                        isDragging ? 'border-2 border-dashed border-blue-300 bg-blue-50' : ''
                      }`}
                    >
                      {category.columns.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          {category.id === 'student' ? 'Student information columns' : 'Drag columns here'}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {category.columns.map((column, colIdx) => (
                            <div 
                              key={colIdx} 
                              draggable={!isStudentColumn(column)}
                              onDragStart={(e) => handleDragStart(e, column)}
                              onDragEnd={handleDragEnd}
                              className={`px-3 py-1.5 bg-[#EEF0F8] text-[#333D79] text-sm rounded-lg flex items-center gap-2 ${
                                isStudentColumn(column) ? 'opacity-75' : 'cursor-move'
                              }`}
                            >
                              <span>{column}</span>
                              
                              {/* Don't show delete button for student columns */}
                              {!isStudentColumn(column) && (
                                <button
                                  onClick={() => handleDeleteColumn(column, category.id)}
                                  className="text-[#333D79] hover:text-red-600"
                                >
                                  <FiX size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {step === 'confirm' && (
            <div>
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Review Your Changes</h4>
                <p className="text-sm text-gray-600">
                  Please review the changes to your class record structure before saving.
                </p>
              </div>
              
              <div className="border rounded-lg shadow-sm mb-6">
                <div className="bg-[#EEF0F8] p-4 rounded-t-lg border-b">
                  <h5 className="font-medium text-gray-800">Summary of Changes</h5>
                </div>
                <div className="p-5 bg-white rounded-b-lg">
                  <h6 className="text-sm font-medium text-gray-700 mb-2">Categories ({categories.length})</h6>
                  <ul className="space-y-2 mb-6">
                    {categories.map((category, idx) => (
                      <li key={idx} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${category.isStandard ? 'bg-blue-500' : 'bg-green-500'} mr-2`}></div>
                        <span className="text-sm">
                          {category.name} - {category.columns.length} columns
                          {!category.isStandard && ' (New)'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <h6 className="text-sm font-medium text-gray-700 mb-2">Column Distribution</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{category.name}</span>
                        <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {category.columns.map((column, colIdx) => (
                            <li key={colIdx} className="text-xs text-gray-600 flex items-center">
                              <span className="w-1 h-1 rounded-full bg-gray-400 mr-2"></span>
                              {column}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 flex items-start">
                <FiAlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Important Note</p>
                  <p className="text-sm">This action will update the structure of your class record. These changes may affect how your data is displayed and organized.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-between bg-gray-50">
          <div>
            {step === 'confirm' && (
              <button
                onClick={() => setStep('edit')}
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
            onClick={() => step === 'confirm' ? handleSave() : setStep('confirm')}
            className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center"
          >
            {step === 'confirm' ? (
              <>
                <FiCheck className="mr-2" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <span>Review Changes</span>
                <FiCheck className="ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualUpdateModal;