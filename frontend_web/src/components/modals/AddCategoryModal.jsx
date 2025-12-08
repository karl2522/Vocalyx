import { AlertTriangle, CheckCircle, Eye, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

const AddCategoryModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isLoading = false,
  remainingAvailable = 100
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryCount, setSubCategoryCount] = useState(5);
  const [showPreview, setShowPreview] = useState(true);
  const [errors, setErrors] = useState({});
  const [categoryWeight, setCategoryWeight] = useState(10);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    
    if (!categoryName.trim()) {
      newErrors.categoryName = 'Category name is required';
    } else if (categoryName.trim().length < 2) {
      newErrors.categoryName = 'Category name must be at least 2 characters';
    }
    
    if (subCategoryCount < 1 || subCategoryCount > 5) {
      newErrors.subCategoryCount = 'Number of subcategories must be between 1 and 5';
    }
    
    if (remainingAvailable <= 0) {
      newErrors.categoryWeight = 'Cannot add more weight — current total is already 100%.';
    } else if (categoryWeight > remainingAvailable) {
      newErrors.categoryWeight = `Weight exceeds available ${remainingAvailable}%. Reduce the value.`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const weightInt = Math.max(0, parseInt(Number.isFinite(categoryWeight) ? categoryWeight : 0));

    const categoryData = {
        categoryName: categoryName.trim(),
        subCategoryCount: parseInt(subCategoryCount),
        subCategories: generateSubCategories(),
        percentage: `${weightInt}%`
    };
    
    console.log('🔥 MODAL: Submitting category data:', categoryData);  // Debug log
    
    onSubmit(categoryData);
};

  const generateSubCategories = () => {
    const baseNames = {
      'quiz': 'Quiz',
      'test': 'Test', 
      'exam': 'Exam',
      'lab': 'Lab',
      'assignment': 'Assignment',
      'project': 'Project',
      'activity': 'Activity',
      'homework': 'Homework',
      'exercise': 'Exercise'
    };
    
    // Try to match category name to common patterns
    const categoryLower = categoryName.toLowerCase();
    let baseName = categoryName;
    
    for (const [key, value] of Object.entries(baseNames)) {
      if (categoryLower.includes(key)) {
        baseName = value;
        break;
      }
    }
    
    // Remove plural 's' if present for individual items
    if (baseName.endsWith('s') && baseName.length > 3) {
      baseName = baseName.slice(0, -1);
    }
    
    return Array.from({ length: subCategoryCount }, (_, i) => `${baseName} ${i + 1}`);
  };

  const handleReset = () => {
    setCategoryName('');
    setSubCategoryCount(5);
    setCategoryWeight(10);
    setErrors({});
  };

  const isSubCategoryLimitExceeded = subCategoryCount > 5;
  const isWeightExceeded = categoryWeight > remainingAvailable;
  const isNoRemainingWeight = remainingAvailable <= 0;
  const isFormBlocked = 
    !categoryName.trim() || 
    subCategoryCount < 1 || 
    isSubCategoryLimitExceeded || 
    isWeightExceeded || 
    isNoRemainingWeight;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-6 h-6 text-blue-600" />
                <span>Add New Category</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Create a new grading category with multiple subcategories
              </p>
            </div>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-6">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Lab Exercises, Projects, Quizzes"
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.categoryName 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-slate-300 hover:border-slate-400'
                  } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                />
                {errors.categoryName && (
                  <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{errors.categoryName}</span>
                  </p>
                )}
              </div>

              {/* Number of Subcategories */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Subcategories
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={subCategoryCount}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value);
                      if (Number.isNaN(parsed)) {
                        setSubCategoryCount(1);
                        return;
                      }
                      setSubCategoryCount(Math.min(Math.max(parsed, 1), 5));
                    }}
                    disabled={isLoading}
                    className={`w-24 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.subCategoryCount 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-300'
                    } disabled:bg-slate-100`}
                  />
                  <div className="flex space-x-2">
                    {[1, 3, 5].map(num => (
                      <button
                        key={num}
                        onClick={() => setSubCategoryCount(num)}
                        disabled={isLoading}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                          subCategoryCount === num
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                {errors.subCategoryCount && (
                  <p className="text-red-600 text-sm mt-1">{errors.subCategoryCount}</p>
                )}
                {isSubCategoryLimitExceeded && !errors.subCategoryCount && (
                  <p className="text-red-600 text-sm mt-1">
                    Maximum of 5 subcategories allowed.
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  This will create {subCategoryCount} individual columns under this category
                </p>
              </div>

              {/* Percentage Weight Input */}
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                Category Weight (%)
            </label>
            <div className="flex items-center space-x-3">
                <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Number.isFinite(categoryWeight) ? parseInt(categoryWeight) : 0}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0');
                  if (Number.isNaN(v)) {
                    setCategoryWeight(0);
                    return;
                  }
                  setCategoryWeight(Math.max(0, v));
                }}
                disabled={isLoading}
                className={`w-24 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.categoryWeight 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-300'
                } disabled:bg-slate-100`}
                placeholder="10"
                />
                <span className="text-slate-600">%</span>
                <div className="flex space-x-2">
                {[5, 10, 15, 20].map(num => (
                    <button
                    key={num}
                    onClick={() => setCategoryWeight(num)}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                        categoryWeight === num
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    >
                    {num}%
                    </button>
                ))}
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
                Weight of this category in final grade calculation
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Remaining available: <span className="font-semibold">{remainingAvailable}%</span>
            </p>
            {(errors.categoryWeight || isNoRemainingWeight || isWeightExceeded) && (
              <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {errors.categoryWeight 
                    || (isNoRemainingWeight 
                        ? 'Current total is already 100%. Reduce other categories first.' 
                        : `Weight exceeds available ${remainingAvailable}%.`)}
                </span>
              </p>
            )}
            </div>

              {/* Preview Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column - Preview */}
            {showPreview && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Column Preview</span>
                </h3>
                
                {categoryName.trim() && subCategoryCount > 0 ? (
                  <div className="space-y-3">
                    {/* Category Header */}
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                      <div className="text-center font-bold text-blue-900 text-lg">
                        {categoryName.trim()}
                      </div>
                      <div className="text-xs text-blue-700 text-center mt-1">
                        Category Header (spans {subCategoryCount} columns)
                      </div>
                    </div>
                    
                    {/* Individual Columns */}
                    <div className="grid grid-cols-2 gap-2">
                      {generateSubCategories().map((subCat, index) => (
                        <div 
                          key={index}
                          className="bg-white border border-slate-200 rounded p-2 text-center text-sm font-medium text-slate-700"
                        >
                          {subCat}
                        </div>
                      ))}
                    </div>
                    
                    {/* Info */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium">What will be created:</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            <li>• {subCategoryCount} new columns will be added</li>
                            <li>• Category header will span across all columns</li>
                            <li>• Max scores row will be initialized to 100</li>
                            <li>• Existing data and formulas will be preserved</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Plus className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Enter category details to see preview</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Reset Form
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || isFormBlocked}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Category</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryModal;