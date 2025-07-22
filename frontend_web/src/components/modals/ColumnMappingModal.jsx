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
  BarChart3,
  Clock,
  RefreshCw,
  Shield,      // 🔥 NEW
  Merge,       // 🔥 NEW  
  Plus,        // 🔥 NEW
  SkipForward  // 🔥 NEW
} from 'lucide-react';

const ColumnMappingModal = ({ 
  showMappingModal, 
  setShowMappingModal,
  importData,
  columnAnalysis,
  onConfirmMapping,
  setImportProgress,
  classRecordId
}) => {
  const [mappings, setMappings] = useState([]);
  const [selectedTab, setSelectedTab] = useState('mapping');
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
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header - Keep existing header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Shuffle className="w-6 h-6 text-purple-600" />
                <span>Column Mapping & Import</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Map your import columns to existing template columns with smart merge strategies
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <div className="bg-purple-100 px-3 py-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-800">{mappings.length}</div>
                  <div className="text-xs text-purple-600">Import Columns</div>
                </div>
                <div className="bg-green-100 px-3 py-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-800">{validMappings.length}</div>
                  <div className="text-xs text-green-600">Will Import</div>
                </div>
                {alreadyImported.length > 0 && (
                  <div className="bg-orange-100 px-3 py-2 rounded-lg text-center">
                    <div className="text-lg font-bold text-orange-800">{alreadyImported.length}</div>
                    <div className="text-xs text-orange-600">Already Imported</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keep existing already imported notification */}
          {alreadyImported.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">
                    {alreadyImported.length} column{alreadyImported.length > 1 ? 's' : ''} already imported
                  </h4>
                  <p className="text-sm text-orange-700 mt-1">
                    These columns have been previously imported and will be skipped:
                  </p>
                  <div className="mt-2 space-y-1">
                    {alreadyImported.map((col, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-orange-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-orange-800">"{col.columnName}"</span>
                          <span className="text-sm text-orange-600">
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

        {/* 🔥 ENHANCED: Content with better mapping interface */}
        <div className="flex-1 overflow-hidden">
          {selectedTab === 'mapping' ? (
            <div className="p-6 overflow-y-auto max-h-[65vh]">
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
          ) : (
            /* Enhanced Preview Tab */
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

                  {alreadyImported.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="text-lg font-bold text-orange-800">{alreadyImported.length}</div>
                      <div className="text-sm text-orange-700">Already Imported</div>
                    </div>
                  )}

                  {/* 🔥 NEW: Strategy breakdown */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-800 mb-2">Merge Strategies:</h4>
                    <div className="space-y-1 text-sm">
                      {['replace', 'merge_skip', 'merge_update', 'merge_add'].map(action => {
                        const count = validMappings.filter(m => m.action === action).length;
                        if (count === 0) return null;
                        const actionInfo = getActionInfo(action);
                        return (
                          <div key={action} className="flex items-center space-x-2">
                            {actionInfo.icon}
                            <span className="text-blue-700">{count} × {actionInfo.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Actions Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">What Will Happen:</h3>
                  <div className="space-y-2">
                    {validMappings.map((mapping, index) => {
                      const actionInfo = getActionInfo(mapping.action);
                      return (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-slate-50 rounded">
                          {actionInfo.icon}
                          <span className="text-sm">
                            <strong>"{mapping.targetColumn}"</strong> will be renamed to <strong>"{mapping.importColumn}"</strong>
                            <br />
                            <span className="text-xs text-slate-600">{actionInfo.description}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Enhanced Detailed Preview */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Import Details:</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• Column headers will be renamed to match your import data</li>
                  <li>• Student scores will be mapped by matching names</li>
                  <li>• Merge strategies will preserve or modify existing data as selected</li>
                  <li>• Template structure will be preserved</li>
                  <li>• Import history will be tracked to prevent future duplicates</li>
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