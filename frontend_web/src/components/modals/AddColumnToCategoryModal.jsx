import React, { useState } from 'react';
import { Plus, X, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

const AddColumnToCategoryModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isLoading = false,
  categories = [] // Available categories to add columns to
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedCategory) {
      newErrors.selectedCategory = 'Please select a category';
    }
    
    if (!autoGenerate && !newColumnName.trim()) {
      newErrors.newColumnName = 'Please enter a column name or enable auto-generation';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const columnData = {
      categoryName: selectedCategory,
      newColumnName: autoGenerate ? null : newColumnName.trim()
    };
    
    console.log('➕ MODAL: Submitting add column data:', columnData);
    onSubmit(columnData);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setNewColumnName('');
    setAutoGenerate(true);
    setErrors({});
  };

  // Generate preview of what the new column will look like
  const generatePreview = () => {
    if (!selectedCategory) return null;
    
    // Try to extract the base name from the category
    // e.g., "Quizzes" -> "Quiz 6"
    let previewName = newColumnName.trim();
    
    if (autoGenerate) {
      // Simulate auto-generation
      const baseName = selectedCategory.endsWith('s') 
        ? selectedCategory.slice(0, -1) 
        : selectedCategory;
      previewName = `${baseName} X`;
    }
    
    return previewName;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-6 h-6 text-green-600" />
                <span>Add Column to Category</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Add a new column to an existing category
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
                  Select Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
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
                <p className="text-xs text-slate-500 mt-1">
                  The category where you want to add a new column
                </p>
              </div>

              {/* Auto-generate Toggle */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerate}
                    onChange={(e) => setAutoGenerate(e.target.checked)}
                    disabled={isLoading}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      Auto-generate column name
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      Automatically creates the next column name based on existing pattern (e.g., Quiz 5 → Quiz 6)
                    </p>
                  </div>
                </label>
              </div>

              {/* Custom Column Name (if not auto-generating) */}
              {!autoGenerate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Column Name
                  </label>
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="e.g., Quiz 6, Lab Exercise 4"
                    disabled={isLoading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.newColumnName 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-300 hover:border-slate-400'
                    } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  />
                  {errors.newColumnName && (
                    <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{errors.newColumnName}</span>
                    </p>
                  )}
                </div>
              )}

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
                  <span>What Will Happen</span>
                </h3>
                
                {selectedCategory ? (
                  <div className="space-y-4">
                    {/* Category Info */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-center font-bold text-slate-900 text-lg">
                        {selectedCategory}
                      </div>
                      <div className="text-xs text-slate-600 text-center mt-1">
                        Selected Category
                      </div>
                    </div>

                    {/* New Column Preview */}
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <div className="text-center font-bold text-green-900">
                        {generatePreview()}
                      </div>
                      <div className="text-xs text-green-700 text-center mt-1">
                        New Column {autoGenerate && '(Auto-generated)'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">What will be created:</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            <li>• 1 new column will be added to "{selectedCategory}"</li>
                            <li>• Column will be inserted before the Total column</li>
                            <li>• Max score will be set to 100</li>
                            <li>• Total column formulas will be updated automatically</li>
                            <li>• Category header will expand to include the new column</li>
                            <li>• All student rows will be ready for new scores</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Visual Example */}
                    <div className="bg-slate-100 border border-slate-300 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-700 mb-2">Visual Example:</div>
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <div className="bg-white border border-slate-200 p-2 text-center font-medium">
                          Existing 1
                        </div>
                        <div className="bg-white border border-slate-200 p-2 text-center font-medium">
                          Existing 2
                        </div>
                        <div className="bg-green-200 border border-green-400 p-2 text-center font-bold">
                          NEW
                        </div>
                        <div className="bg-slate-200 border border-slate-400 p-2 text-center font-medium">
                          Total
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Plus className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Select a category to see preview</p>
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
                disabled={isLoading || !selectedCategory || (!autoGenerate && !newColumnName.trim())}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Column</span>
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

export default AddColumnToCategoryModal;
