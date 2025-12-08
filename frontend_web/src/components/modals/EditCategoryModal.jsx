import React, { useState, useEffect } from 'react';
import { Edit, X, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

const EditCategoryModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  categories = [] // Available categories to edit
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryWeight, setNewCategoryWeight] = useState(10);
  const [showPreview, setShowPreview] = useState(true);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!selectedCategory) {
      newErrors.selectedCategory = 'Please select a category to edit';
    }

    if (!newCategoryName.trim()) {
      newErrors.newCategoryName = 'New category name is required';
    } else if (newCategoryName.trim().length < 2) {
      newErrors.newCategoryName = 'Category name must be at least 2 characters';
    }

    if (newCategoryWeight < 0 || newCategoryWeight > 100) {
      newErrors.newCategoryWeight = 'Weight must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const editData = {
      oldCategoryName: selectedCategory,
      newCategoryName: newCategoryName.trim(),
      newPercentage: `${newCategoryWeight.toFixed(2)}%`
    };

    console.log('🔥 EDIT MODAL: Submitting edit data:', editData);
    onSubmit(editData);
  };

  const handleCategoryChange = (categoryName) => {
    setSelectedCategory(categoryName);
    setNewCategoryName(categoryName); // Pre-fill with current name
  };

  const handleReset = () => {
    setSelectedCategory('');
    setNewCategoryName('');
    setNewCategoryWeight(10);
    setErrors({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Edit className="w-6 h-6 text-blue-600" />
                <span>Edit Category</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Modify category name and weight percentage
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
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Category to Edit
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.selectedCategory
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                    } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                >
                  <option value="">Choose a category...</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.selectedCategory && (
                  <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{errors.selectedCategory}</span>
                  </p>
                )}
              </div>

              {/* New Category Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter new category name"
                  disabled={isLoading || !selectedCategory}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.newCategoryName
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                    } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                />
                {errors.newCategoryName && (
                  <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{errors.newCategoryName}</span>
                  </p>
                )}
              </div>

              {/* New Percentage Weight */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Category Weight (%)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newCategoryWeight}
                    onChange={(e) => setNewCategoryWeight(parseFloat(e.target.value) || 0)}
                    disabled={isLoading || !selectedCategory}
                    className={`w-24 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.newCategoryWeight
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-300'
                      } disabled:bg-slate-100`}
                    placeholder="10"
                  />
                  <span className="text-slate-600">%</span>
                  <div className="flex space-x-2">
                    {[5, 10, 15, 20, 25, 30].map(num => (
                      <button
                        key={num}
                        onClick={() => setNewCategoryWeight(num)}
                        disabled={isLoading || !selectedCategory}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors disabled:opacity-50 ${newCategoryWeight === num
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                      >
                        {num}%
                      </button>
                    ))}
                  </div>
                </div>
                {errors.newCategoryWeight && (
                  <p className="text-red-600 text-sm mt-1">{errors.newCategoryWeight}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Weight of this category in final grade calculation
                </p>
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
                  <span>Changes Preview</span>
                </h3>

                {selectedCategory && newCategoryName.trim() ? (
                  <div className="space-y-4">
                    {/* Before */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-600 mb-2">Before:</h4>
                      <div className="bg-slate-200 border border-slate-300 rounded-lg p-3">
                        <div className="text-center font-bold text-slate-700">
                          {selectedCategory}
                        </div>
                        <div className="text-xs text-slate-600 text-center mt-1">
                          Current category name
                        </div>
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-600 mb-2">After:</h4>
                      <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                        <div className="text-center font-bold text-blue-900">
                          {newCategoryName.trim()}
                        </div>
                        <div className="text-center font-medium text-blue-800 mt-1">
                          {newCategoryWeight.toFixed(2)}%
                        </div>
                        <div className="text-xs text-blue-700 text-center mt-1">
                          New category name and weight
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium">What will be updated:</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            <li>• Category header will be renamed</li>
                            <li>• Percentage weight will be updated</li>
                            <li>• All subcategories and data will be preserved</li>
                            <li>• Student scores will remain unchanged</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Edit className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Select a category and enter new details to see preview</p>
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
                disabled={isLoading || !selectedCategory || !newCategoryName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    <span>Update Category</span>
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

export default EditCategoryModal;