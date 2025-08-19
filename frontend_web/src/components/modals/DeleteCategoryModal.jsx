import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Info } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Trash2 className="w-6 h-6 text-red-600" />
                <span>Delete Category</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
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
        <div className="p-6">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">⚠️ Warning: This action cannot be undone!</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• All columns in this category will be permanently deleted</li>
                  <li>• Student scores and data in these columns will be lost</li>
                  <li>• Category headers and formulas will be removed</li>
                  <li>• This will affect all students in the sheet</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Category to Delete
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${
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
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center space-x-2">
                  <Info className="w-4 h-4" />
                  <span>What will be deleted:</span>
                </h3>
                <div className="bg-red-100 border border-red-200 rounded p-3">
                  <div className="text-center font-bold text-red-900 text-lg mb-2">
                    {selectedCategory}
                  </div>
                  <p className="text-sm text-red-800 text-center">
                    All subcategories, scores, and formulas in this category
                  </p>
                </div>
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
                disabled={isLoading || !selectedCategory || confirmText.toLowerCase() !== 'delete'}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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