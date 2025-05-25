import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle } from 'react-icons/fi';

const CategorySelectionTab = ({ 
  existingCategories = [], 
  selectedCategory = null, 
  onSelectCategory, 
  onCreateCategory
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryDescription, setCategoryDescription] = useState('');
  const [error, setError] = useState('');
  
  // Common category types examples
  const commonCategories = [
    { id: 'laboratory', name: 'Laboratory', color: '#4CAF50', description: 'Lab activities and practical work' },
    { id: 'seatwork', name: 'Seatwork', color: '#2196F3', description: 'In-class assignments and activities' },
    { id: 'quizzes', name: 'Quizzes', color: '#FF9800', description: 'Short assessments and tests' },
    { id: 'exams', name: 'Exams', color: '#F44336', description: 'Major examinations and assessments' },
    { id: 'projects', name: 'Projects', color: '#9C27B0', description: 'Long-term assignments and group work' },
  ];

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }
    
    setIsCreating(true);
    
    // Create the new category
    const newCategory = {
      id: `category-${Date.now()}`,
      name: newCategoryName,
      description: categoryDescription,
      color: getRandomColor(),
      isNew: true
    };
    
    // Call the parent handler
    onCreateCategory(newCategory);
    
    // Reset form
    setNewCategoryName('');
    setCategoryDescription('');
    setShowCreateForm(false);
    setIsCreating(false);
  };
  
  // Generate a random color for new categories
  const getRandomColor = () => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#009688'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h4 className="text-base font-medium text-gray-800 mb-2">Select a Category</h4>
        <p className="text-sm text-gray-600">
          Choose which category your data belongs to. This will determine how your columns are organized in the master spreadsheet.
        </p>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
          <div className="flex items-start">
            <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 mr-3">
              <FiAlertCircle className="h-3 w-3 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium mb-1">Why Categories Matter</p>
              <p className="text-xs text-blue-700">
                Organizing your data into categories like "Laboratory", "Quizzes", or "Seatwork" helps keep your gradebook organized. 
                Each category will appear as a section in your master spreadsheet.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Existing Categories */}
      {existingCategories.length > 0 && (
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Existing Categories</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {existingCategories.map(category => (
              <div 
                key={category.id}
                onClick={() => onSelectCategory(category)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedCategory?.id === category.id 
                    ? 'border-[#333D79] bg-[#F8F9FF] shadow-sm' 
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                    style={{ backgroundColor: `${category.color}25` }}
                  >
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-800">{category.name}</h6>
                    {category.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Common Categories */}
      <div className="mb-6">
        <h5 className="text-sm font-medium text-gray-700 mb-3">Common Categories</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commonCategories.map(category => (
            <div 
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedCategory?.id === category.id 
                  ? 'border-[#333D79] bg-[#F8F9FF] shadow-sm' 
                  : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: `${category.color}25` }}
                >
                  <div 
                    className="h-4 w-4 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                </div>
                <div>
                  <h6 className="font-medium text-gray-800">{category.name}</h6>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Create New Category */}
      {showCreateForm ? (
        <div className="border rounded-lg p-4 mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Create New Category</h5>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Category Name *</label>
              <input 
                type="text" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Laboratory, Assignments, etc."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79]"
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Description (Optional)</label>
              <input 
                type="text" 
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this category"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79]"
              />
            </div>
            <div className="flex justify-end pt-2 space-x-3">
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCategoryName('');
                  setCategoryDescription('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCategory}
                disabled={isCreating || !newCategoryName.trim()}
                className="px-4 py-2 bg-[#333D79] text-white rounded-md hover:bg-[#4A5491] transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-[#333D79] hover:border-[#333D79] transition-colors w-full justify-center"
          >
            <FiPlus className="mr-2" />
            Create Custom Category
          </button>
        </div>
      )}
    </div>
  );
};

export default CategorySelectionTab;