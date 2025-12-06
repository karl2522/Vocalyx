import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

const DeleteCategoryModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isLoading = false,
  categories = [] // Available categories to delete
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [errors, setErrors] = useState({}); 

  React.useEffect(() => {
    if (isOpen) {
      console.log('🔥 DELETE MODAL: Modal opened with categories:', categories);
      console.log('🔥 DELETE MODAL: Categories length:', categories.length);
      console.log('🔥 DELETE MODAL: Categories type:', typeof categories);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedCategory) {
      newErrors.selectedCategory = 'Please select a category to delete';
    }
    
    if (confirmText.toLowerCase() !== 'delete') {
      newErrors.confirmText = 'Please type "delete" to confirm';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const deleteData = {
      categoryName: selectedCategory
    };
    
    console.log('🔥 DELETE MODAL: Submitting delete data:', deleteData);
    onSubmit(deleteData);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setConfirmText('');
    setErrors({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                <span className="truncate">Delete Category</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Permanently remove a category and all its data
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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Warning: This action cannot be undone!</h3>
                <ul className="text-xs sm:text-sm text-red-800 space-y-1">
                  <li>• All columns in this category will be permanently deleted</li>
                  <li>• Student scores and data in these columns will be lost</li>
                  <li>• Category headers and formulas will be removed</li>
                  <li>• This will affect all students in the sheet</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Category to Delete
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={isLoading}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm sm:text-base ${
                  errors.selectedCategory 
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

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type "delete" to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                disabled={isLoading}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm sm:text-base ${
                  errors.confirmText 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-300 hover:border-slate-400'
                } disabled:bg-slate-100 disabled:cursor-not-allowed`}
              />
              {errors.confirmText && (
                <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errors.confirmText}</span>
                </p>
              )}
            </div>

            {/* Preview of what will be deleted */}
            {selectedCategory && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center space-x-2 text-sm sm:text-base">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>What will be deleted:</span>
                </h3>
                <div className="bg-red-100 border border-red-200 rounded p-2 sm:p-3">
                  <div className="text-center font-bold text-red-900 text-base sm:text-lg mb-2 break-words">
                    {selectedCategory}
                  </div>
                  <p className="text-xs sm:text-sm text-red-800 text-center">
                    All subcategories, scores, and formulas in this category
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors disabled:opacity-50 order-2 sm:order-1"
            >
              Reset Form
            </button>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 order-1 sm:order-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !selectedCategory || confirmText.toLowerCase() !== 'delete'}
                className="px-4 sm:px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Category</span>
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

export default DeleteCategoryModal;