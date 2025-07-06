import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Target, 
  Database,
  Shuffle,
  Eye,
  BarChart3
} from 'lucide-react';

const ColumnMappingModal = ({ 
  showMappingModal, 
  setShowMappingModal,
  importData,
  columnAnalysis,
  onConfirmMapping,
  setImportProgress
}) => {
  const [mappings, setMappings] = useState([]);
  const [selectedTab, setSelectedTab] = useState('mapping'); // 'mapping' or 'preview'

  useEffect(() => {
    if (columnAnalysis?.mappingSuggestions) {
      // Initialize mappings with recommendations
      const initialMappings = columnAnalysis.mappingSuggestions.map(suggestion => ({
        importColumn: suggestion.importColumn,
        targetColumn: suggestion.suggestions[0]?.targetColumn || '',
        action: 'replace',
        confidence: suggestion.suggestions[0]?.recommendation || 'unknown'
      }));
      setMappings(initialMappings);
    }
  }, [columnAnalysis]);

  if (!showMappingModal) return null;

  const handleMappingChange = (index, field, value) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  // 🔥 NEW: Function to get available options for a specific mapping (excluding already selected columns)
  const getAvailableOptions = (currentIndex, allOptions) => {
    // Get all currently selected target columns (except for the current mapping)
    const selectedTargetColumns = mappings
      .map((mapping, index) => index !== currentIndex ? mapping.targetColumn : null)
      .filter(targetColumn => targetColumn && targetColumn !== ''); // Remove empty selections

    // Filter out already selected columns from the options
    return allOptions.filter(option => 
      !selectedTargetColumns.includes(option.targetColumn)
    );
  };

  const handleConfirm = () => {
    onConfirmMapping(mappings);
  };

  const handleCancel = () => {
    setShowMappingModal(false);
    setImportProgress(null);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'none': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';  
      case 'high': return 'text-red-700 bg-red-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const getConfidenceIcon = (confidence) => {
    switch (confidence) {
      case 'perfect': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'caution': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'risky': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-slate-600" />;
    }
  };

  const validMappings = mappings.filter(m => m.targetColumn && m.action !== 'skip');
  const skippedMappings = mappings.filter(m => m.action === 'skip');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Shuffle className="w-6 h-6 text-purple-600" />
                <span>Column Mapping & Import</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Map your import columns to existing template columns and assign data
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Stats */}
              <div className="flex space-x-2">
                <div className="bg-purple-100 px-3 py-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-800">{mappings.length}</div>
                  <div className="text-xs text-purple-600">Import Columns</div>
                </div>
                <div className="bg-green-100 px-3 py-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-800">{validMappings.length}</div>
                  <div className="text-xs text-green-600">Will Import</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setSelectedTab('mapping')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'mapping'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Column Mapping ({mappings.length})
            </button>
            <button
              onClick={() => setSelectedTab('preview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'preview'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Import Preview
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedTab === 'mapping' ? (
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              <div className="space-y-4">
                {mappings.map((mapping, index) => {
                  const suggestion = columnAnalysis?.mappingSuggestions?.find(s => s.importColumn === mapping.importColumn);
                  const allOptions = suggestion?.suggestions || [];
                  
                  // 🔥 FIXED: Get only available options (excluding already selected columns)
                  const availableOptions = getAvailableOptions(index, allOptions);
                  
                  // 🔥 NEW: Check if current selection is still valid (might have been taken by another mapping)
                  const isCurrentSelectionValid = mapping.targetColumn === '' || 
                    availableOptions.some(opt => opt.targetColumn === mapping.targetColumn) ||
                    allOptions.some(opt => opt.targetColumn === mapping.targetColumn); // Allow current selection even if taken
                  
                  return (
                    <div key={index} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      {/* Mapping Header */}
                      <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Database className="w-5 h-5 text-slate-600" />
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                Import Column: "{mapping.importColumn}"
                              </h3>
                              <p className="text-sm text-slate-600">
                                {importData?.columnData?.[mapping.importColumn] ? 
                                  `${Object.keys(importData.columnData[mapping.importColumn]).length} student scores` : 
                                  'No data'
                                }
                              </p>
                            </div>
                          </div>
                          
                          {getConfidenceIcon(mapping.confidence)}
                        </div>
                      </div>
                      
                      {/* Mapping Options */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Target Column Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Map to Template Column:
                            </label>
                            <select
                              value={mapping.targetColumn}
                              onChange={(e) => handleMappingChange(index, 'targetColumn', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="">Select target column...</option>
                              
                              {/* 🔥 FIXED: Show current selection even if it would normally be filtered out */}
                              {mapping.targetColumn && !availableOptions.some(opt => opt.targetColumn === mapping.targetColumn) && (
                                <option value={mapping.targetColumn} className="text-orange-600">
                                  {mapping.targetColumn} (currently selected)
                                </option>
                              )}
                              
                              {/* 🔥 FIXED: Show only available options */}
                              {availableOptions.map((option, optIndex) => (
                                <option key={optIndex} value={option.targetColumn}>
                                  {option.targetColumn} ({option.recommendation} - {option.dataCount} existing entries)
                                </option>
                              ))}
                              
                              {/* 🔥 NEW: Show unavailable options as disabled for reference */}
                              {allOptions
                                .filter(option => !availableOptions.some(avail => avail.targetColumn === option.targetColumn))
                                .filter(option => option.targetColumn !== mapping.targetColumn) // Don't duplicate current selection
                                .map((option, optIndex) => (
                                <option key={`unavailable-${optIndex}`} value={option.targetColumn} disabled className="text-slate-400">
                                  {option.targetColumn} (already assigned)
                                </option>
                              ))}
                            </select>
                            
                            {/* 🔥 NEW: Show warning if no available options */}
                            {availableOptions.length === 0 && mapping.targetColumn === '' && (
                              <p className="text-sm text-orange-600 mt-1">
                                ⚠️ All suitable columns have been assigned to other imports
                              </p>
                            )}
                          </div>
                          
                          {/* Action Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Action:
                            </label>
                            <select
                              value={mapping.action}
                              onChange={(e) => handleMappingChange(index, 'action', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="replace">Replace & Rename Column</option>
                              <option value="merge">Merge Data (keep existing)</option>
                              <option value="skip">Skip This Column</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Show selected option details */}
                        {mapping.targetColumn && (
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                            {(() => {
                              const selectedOption = allOptions.find(opt => opt.targetColumn === mapping.targetColumn);
                              if (!selectedOption) return null;
                              
                              return (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <ArrowRight className="w-4 h-4 text-slate-600" />
                                    <span className="text-sm font-medium">
                                      "{mapping.importColumn}" → "{mapping.targetColumn}"
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(selectedOption.risk)}`}>
                                      {selectedOption.description}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Preview Tab */
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Import Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <span>Import Summary</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-lg font-bold text-green-800">{validMappings.length}</div>
                      <div className="text-sm text-green-700">Columns to Import</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-lg font-bold text-red-800">{skippedMappings.length}</div>
                      <div className="text-sm text-red-700">Columns to Skip</div>
                    </div>
                  </div>
                </div>
                
                {/* Actions Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">What Will Happen:</h3>
                  <div className="space-y-2">
                    {validMappings.map((mapping, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-slate-50 rounded">
                        <ArrowRight className="w-4 h-4 text-slate-600" />
                        <span className="text-sm">
                          <strong>"{mapping.targetColumn}"</strong> will be renamed to <strong>"{mapping.importColumn}"</strong> and data imported
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Detailed Preview */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Import Details:</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• Column headers will be renamed to match your import data</li>
                  <li>• Student scores will be mapped by matching names</li>
                  <li>• Existing data in target columns may be overwritten</li>
                  <li>• Template structure will be preserved</li>
                  {validMappings.length > 0 && (
                    <li>• Total data points to import: {validMappings.reduce((sum, mapping) => {
                      const columnData = importData?.columnData?.[mapping.importColumn] || {};
                      return sum + Object.keys(columnData).length;
                    }, 0)}</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel Import
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
                {validMappings.length} columns ready to import
              </div>
              
              <button
                onClick={handleConfirm}
                disabled={validMappings.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Columns & Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMappingModal;