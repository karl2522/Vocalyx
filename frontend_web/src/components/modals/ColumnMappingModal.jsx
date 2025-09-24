import { AlertTriangle, ArrowRight, CheckCircle, Clock, Database, Edit3, Merge, Plus, RefreshCw, Shield, SkipForward, Target, X, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const ColumnMappingModal = ({ 
  showMappingModal, 
  setShowMappingModal,
  importData,
  columnAnalysis,
  onConfirmMapping,
  setImportProgress,
  classRecordId,
  onBack
}) => {
  const [mappings, setMappings] = useState([]);
  const [forceReimportColumns, setForceReimportColumns] = useState([]);

  // 🔥 ENHANCED: Better initial action selection based on risk
  useEffect(() => {
    if (columnAnalysis?.mappingSuggestions) {
      const usedColumns = new Set(); // Track assigned columns
      
      const initialMappings = columnAnalysis.mappingSuggestions.map((suggestion, index) => {
        console.log(`🔍 Processing suggestion ${index}:`, suggestion.importColumn);
        
        // 🔥 SMART: Find the best available option that hasn't been used
        let bestOption = null;
        
        // Priority 1: Find an empty column (risk: none)
        for (const option of suggestion.suggestions) {
          if (!usedColumns.has(option.targetColumn) && option.risk === 'none') {
            bestOption = option;
            console.log(`✅ Found empty column for ${suggestion.importColumn}:`, option.targetColumn);
            break;
          }
        }
        
        // Priority 2: Find a low risk column
        if (!bestOption) {
          for (const option of suggestion.suggestions) {
            if (!usedColumns.has(option.targetColumn) && option.risk === 'low') {
              bestOption = option;
              console.log(`✅ Found low risk column for ${suggestion.importColumn}:`, option.targetColumn);
              break;
            }
          }
        }
        
        // Priority 3: Find any available column
        if (!bestOption) {
          for (const option of suggestion.suggestions) {
            if (!usedColumns.has(option.targetColumn)) {
              bestOption = option;
              console.log(`✅ Found available column for ${suggestion.importColumn}:`, option.targetColumn);
              break;
            }
          }
        }
        
        // Fallback: Use the first one (even if assigned)
        if (!bestOption) {
          bestOption = suggestion.suggestions[0];
          console.log(`⚠️ Using fallback for ${suggestion.importColumn}:`, bestOption?.targetColumn);
        }
        
        // Mark this column as used
        if (bestOption && bestOption.targetColumn) {
          usedColumns.add(bestOption.targetColumn);
          console.log(`🔒 Marked ${bestOption.targetColumn} as used`);
        }
        
        // 🔥 SMART: Default action based on risk
        let defaultAction = 'replace';
        if (bestOption) {
          if (bestOption.risk === 'none' || bestOption.risk === 'low') {
            defaultAction = 'replace'; // Safe to replace
          } else if (bestOption.risk === 'medium') {
            defaultAction = 'merge_skip'; // Safe default for partial data
          } else if (bestOption.risk === 'high') {
            defaultAction = 'merge_skip'; // Safest for full columns
          }
        }

        return {
          importColumn: suggestion.importColumn,
          targetColumn: bestOption?.targetColumn || '',
          action: defaultAction,
          confidence: bestOption?.recommendation || 'unknown'
        };
      });
      
      setMappings(initialMappings);
      console.log('🎯 Final mappings with unique columns:', initialMappings);
      console.log('🔒 Used columns:', Array.from(usedColumns));
    }
  }, [columnAnalysis]);

  useEffect(() => {
    if (columnAnalysis) {
      console.log('🔍 DEBUG - Column Analysis:', columnAnalysis);
      console.log('🔍 DEBUG - Mapping Suggestions:', columnAnalysis.mappingSuggestions);
      console.log('🔍 DEBUG - Available columns:', columnAnalysis.columnAnalysis);
    }
  }, [columnAnalysis]);

  if (!showMappingModal) return null;

  const handleMappingChange = (index, field, value) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const handleForceReimport = (columnName) => {
    setForceReimportColumns(prev => [...prev, columnName]);
    if (window.reAnalyzeWithForceReimport) {
      window.reAnalyzeWithForceReimport([columnName]);
    }
  };

  const getAvailableOptions = (currentIndex, allOptions) => {
    const selectedTargetColumns = mappings
      .map((mapping, index) => index !== currentIndex ? mapping.targetColumn : null)
      .filter(targetColumn => targetColumn && targetColumn !== '');

    // 🔥 FIX: Don't filter out columns, just mark them as assigned
    return allOptions.map(option => ({
      ...option,
      isAssigned: selectedTargetColumns.includes(option.targetColumn),
      isCurrentlySelected: mappings[currentIndex]?.targetColumn === option.targetColumn
    }));
  };

  const handleConfirm = () => {
    // 🔥 ENHANCED: Close modal immediately and show progress
    setShowMappingModal(false);
    setImportProgress({ 
      status: 'importing', 
      message: 'Importing columns and renaming headers... Please wait.' 
    });
    
    // Execute the column import
    onConfirmMapping(mappings, classRecordId);
  };

  const handleCancel = () => {
    setShowMappingModal(false);
    setImportProgress(null);
    if (typeof onBack === 'function') {
      onBack();
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'none': return 'text-green-700 bg-green-100 border-green-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';  // 🔥 NEW: Add low risk
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';  
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-slate-700 bg-slate-100 border-slate-200';
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

  // 🔥 NEW: Get action icon and description
  const getActionInfo = (action) => {
    switch (action) {
      case 'replace':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          label: 'Replace All',
          description: 'Overwrite all existing data',
          color: 'text-red-700 bg-red-50 border-red-200'
        };
      case 'merge_skip':
        return {
          icon: <Shield className="w-4 h-4 text-blue-600" />,
          label: 'Merge (Skip Existing)',
          description: 'Keep existing scores, only add new ones',
          color: 'text-blue-700 bg-blue-50 border-blue-200'
        };
      case 'merge_update':
        return {
          icon: <Merge className="w-4 h-4 text-green-600" />,
          label: 'Merge (Fill Empty)',
          description: 'Only update empty cells',
          color: 'text-green-700 bg-green-50 border-green-200'
        };
      case 'merge_add':
        return {
          icon: <Plus className="w-4 h-4 text-purple-600" />,
          label: 'Merge (Add Numbers)',
          description: 'Add import scores to existing scores',
          color: 'text-purple-700 bg-purple-50 border-purple-200'
        };
      case 'skip':
        return {
          icon: <SkipForward className="w-4 h-4 text-slate-600" />,
          label: 'Skip Column',
          description: 'Do not import this column',
          color: 'text-slate-700 bg-slate-50 border-slate-200'
        };
      default:
        return {
          icon: <Target className="w-4 h-4 text-slate-600" />,
          label: 'Unknown',
          description: '',
          color: 'text-slate-700 bg-slate-50 border-slate-200'
        };
    }
  };

  const validMappings = mappings.filter(m => m.targetColumn && m.action !== 'skip');
  const skippedMappings = mappings.filter(m => m.action === 'skip');
  const alreadyImported = columnAnalysis?.alreadyImported || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Consistent with Import Preview */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#E6E9F7] to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E6E9F7' }}>
                <Edit3 className="w-5 h-5" style={{ color: '#333D79' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Column Mapping</h2>
                <p className="text-gray-600">Review and adjust the automatic column mapping</p>
              </div>
            </div>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Already imported notification (compact) */}
          {alreadyImported.length > 0 && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-orange-800">
                    {alreadyImported.length} column{alreadyImported.length > 1 ? 's' : ''} already imported
                  </h4>
                  <p className="text-xs text-orange-700 mt-1">
                    These columns have been previously imported and will be skipped:
                  </p>
                  <div className="mt-1 space-y-1">
                    {alreadyImported.map((col, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-orange-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-orange-800">"{col.columnName}"</span>
                          <span className="text-xs text-orange-600">
                            → {col.targetColumn} (imported {col.importedDate})
                          </span>
                        </div>
                        <button
                          onClick={() => handleForceReimport(col.columnName)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Force Re-import</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </div>

        {/* Content - Consistent spacing */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="">
              <div className="space-y-4">
                {mappings.map((mapping, index) => {
                  const suggestion = columnAnalysis?.mappingSuggestions?.find(s => s.importColumn === mapping.importColumn);
                  const allOptions = suggestion?.suggestions || [];
                  const availableOptions = getAvailableOptions(index, allOptions);
                  const selectedOption = allOptions.find(opt => opt.targetColumn === mapping.targetColumn);
                  const actionInfo = getActionInfo(mapping.action);
                  
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
                          
                          <div className="flex items-center space-x-2">
                            {getConfidenceIcon(mapping.confidence)}
                            {actionInfo.icon}
                          </div>
                        </div>
                      </div>
                      
                      {/* 🔥 ENHANCED: Mapping Options */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                              
                              {allOptions.map((option, optIndex) => {
                                const isAssigned = mappings.some((m, i) => i !== index && m.targetColumn === option.targetColumn);
                                const isCurrentlySelected = mapping.targetColumn === option.targetColumn;
                                
                                // 🔥 BETTER: More descriptive labels
                                let riskLabel = '';
                                if (option.risk === 'none') {
                                  riskLabel = ' (Empty - Safe)';
                                } else if (option.risk === 'low') {
                                  riskLabel = ` (${option.dataCount} score${option.dataCount > 1 ? 's' : ''} - Low Risk)`;
                                } else if (option.risk === 'medium') {
                                  riskLabel = ` (${option.dataCount} existing - Caution)`;
                                } else if (option.risk === 'high') {
                                  riskLabel = ` (Full - ${option.dataCount} entries)`;
                                }
                                
                                return (
                                  <option 
                                    key={optIndex} 
                                    value={option.targetColumn}
                                    disabled={isAssigned && !isCurrentlySelected}
                                    className={isAssigned && !isCurrentlySelected ? 'text-slate-400' : ''}
                                  >
                                    {option.targetColumn}{riskLabel}
                                    {isAssigned && !isCurrentlySelected && ' (assigned to another column)'}
                                  </option>
                                );
                              })}
                            </select>
                            
                            {/* Show available options count */}
                            <p className="text-xs text-slate-500 mt-1">
                              {allOptions.filter(opt => !mappings.some((m, i) => i !== index && m.targetColumn === opt.targetColumn)).length} of {allOptions.length} columns available
                            </p>
                          </div>
                          
                          {/* 🔥 ENHANCED: Action Selection with detailed options */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Merge Strategy:
                            </label>
                            <select
                              value={mapping.action}
                              onChange={(e) => handleMappingChange(index, 'action', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="replace">🔄 Replace All (overwrite existing)</option>
                              <option value="merge_skip">🛡️ Merge - Skip Existing (safest)</option>
                              <option value="merge_update">📝 Merge - Fill Empty Only</option>
                              <option value="merge_add">➕ Merge - Add to Existing (sum numbers)</option>
                              <option value="skip">⏭️ Skip This Column</option>
                            </select>
                          </div>

                          {/* 🔥 NEW: Action Impact Preview */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Impact Preview:
                            </label>
                            <div className={`px-3 py-2 rounded-lg border text-sm ${actionInfo.color}`}>
                              <div className="flex items-center space-x-2 mb-1">
                                {actionInfo.icon}
                                <span className="font-medium">{actionInfo.label}</span>
                              </div>
                              <div className="text-xs">
                                {actionInfo.description}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 🔥 ENHANCED: Detailed mapping preview */}
                        {mapping.targetColumn && selectedOption && (
                          <div className="mt-4 space-y-3">
                            {/* Mapping Arrow */}
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <ArrowRight className="w-4 h-4 text-slate-600" />
                                  <span className="text-sm font-medium">
                                    "{mapping.importColumn}" → "{mapping.targetColumn}"
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(selectedOption.risk)}`}>
                                    {selectedOption.description}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 🔥 NEW: Existing data preview */}
                            {selectedOption.studentData && selectedOption.studentData.length > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-yellow-800 mb-2">
                                  Existing Data in "{mapping.targetColumn}":
                                </h5>
                                <div className="space-y-1">
                                  {selectedOption.studentData.slice(0, 3).map((student, idx) => (
                                    <div key={idx} className="text-xs text-yellow-700 flex justify-between">
                                      <span>{student.name}</span>
                                      <span className="font-medium">{student.score}</span>
                                    </div>
                                  ))}
                                  {selectedOption.studentData.length > 3 && (
                                    <div className="text-xs text-yellow-600">
                                      ... and {selectedOption.studentData.length - 3} more
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action-specific warning */}
                                <div className="mt-2 text-xs text-yellow-700 font-medium">
                                  {mapping.action === 'replace' && '⚠️ All existing data will be overwritten'}
                                  {mapping.action === 'merge_skip' && '✅ Existing data will be preserved'}
                                  {mapping.action === 'merge_update' && '✅ Only empty cells will be filled'}
                                  {mapping.action === 'merge_add' && '📊 Numbers will be added together'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
        
        <div className="border-t border-gray-200 p-4 bg-white sticky bottom-0">
          <div className="flex gap-3 items-center">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={validMappings.length === 0}
                className={`px-4 py-2 rounded-lg transition-colors text-white ${validMappings.length === 0 ? 'cursor-not-allowed' : 'hover:opacity-90'}`}
                style={{ backgroundColor: validMappings.length === 0 ? '#94A3B8' : '#333D79' }}
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