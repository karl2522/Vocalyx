import {
    AlertTriangle,
    ArrowRight,
    CheckCircle,
    Edit3,
    Eye,
    Merge,
    Plus,
    Shield,
    SkipForward,
    Target,
    X,
    XCircle
} from 'lucide-react';
import React from 'react';

const ImportReviewModal = ({ 
  showModal, 
  setShowModal, 
  autoMappingResult, 
  onConfirmImport,
  onEditMapping 
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // Early return if modal is not shown or autoMappingResult is null
  if (!showModal || !autoMappingResult) return null;
  
  const { decisions, overallConfidence, confidenceLevel, warnings, summary } = autoMappingResult;
  
  const getConfidenceColor = () => {
    switch (confidenceLevel) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  const getConfidenceIcon = () => {
    switch (confidenceLevel) {
      case 'high': return <CheckCircle className="w-5 h-5" />;
      case 'medium': return <AlertTriangle className="w-5 h-5" />;
      case 'low': return <XCircle className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };
  
  const getActionIcon = (action) => {
    switch (action) {
      case 'replace': return <Shield className="w-4 h-4 text-orange-600" />;
      case 'merge': return <Merge className="w-4 h-4 text-blue-600" />;
      case 'new': return <Plus className="w-4 h-4 text-green-600" />;
      case 'skip': return <SkipForward className="w-4 h-4 text-gray-600" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };
  
  const getActionColor = (action) => {
    switch (action) {
      case 'replace': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'merge': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'new': return 'text-green-700 bg-green-100 border-green-200';
      case 'skip': return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };
  
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'none': return 'text-green-700 bg-green-100 border-green-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };
  
  const getConfidenceIndicator = (confidence) => {
    if (confidence >= 0.9) return <div className="w-3 h-3 bg-green-500 rounded-full" title="Very High" />;
    if (confidence >= 0.8) return <div className="w-3 h-3 bg-green-400 rounded-full" title="High" />;
    if (confidence >= 0.7) return <div className="w-3 h-3 bg-yellow-400 rounded-full" title="Medium" />;
    if (confidence >= 0.6) return <div className="w-3 h-3 bg-orange-400 rounded-full" title="Low" />;
    return <div className="w-3 h-3 bg-red-400 rounded-full" title="Very Low" />;
  };
  
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#E6E9F7] to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E6E9F7' }}>
                <Eye className="w-5 h-5" style={{ color: '#333D79' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Import Preview</h2>
                <p className="text-gray-600">Review the automatic column mapping</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Confidence Banner */}
          <div className={`p-4 rounded-lg mb-6 border ${getConfidenceColor()}`}>
            <div className="flex items-center gap-2">
              {getConfidenceIcon()}
              <span className="font-medium capitalize">
                {confidenceLevel} Confidence ({Math.round(overallConfidence * 100)}%)
              </span>
            </div>
            {warnings.length > 0 && (
              <div className="mt-2 text-sm space-y-1">
                {warnings.map((warning, index) => (
                  <div key={index}>• {warning}</div>
                ))}
              </div>
            )}
          </div>
          
          {/* Column Mappings */}
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-900">Column Mappings</h3>
            {decisions.map((decision, index) => {
              const exceedIndexed = autoMappingResult?.exceedsMaxPreview?.indexed?.[index];
              const exceedLegacy = autoMappingResult?.exceedsMaxPreview?.[decision.importColumn];
              const exceedInfo = exceedIndexed || exceedLegacy;
              const showExceed = exceedInfo && exceedInfo.exceeds > 0;
              return (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{decision.importColumn}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-blue-600 font-medium">
                        {decision.targetColumn || `New: ${decision.newColumnTitle}`}
                      </span>
                      {showExceed && (
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                          Exceeds max: {exceedInfo.exceeds} value(s) — will skip
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {decision.reason} • {Math.round(decision.confidence * 100)}% confidence
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Method:</span>
                      <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                        {decision.method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getActionColor(decision.action)}`}>
                      {getActionIcon(decision.action)}
                      <span className="capitalize">{decision.action}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getRiskColor(decision.risk)}`}>
                      <span className="capitalize">{decision.risk} risk</span>
                    </div>
                    {getConfidenceIndicator(decision.confidence)}
                  </div>
                </div>
              </div>
            );})}
          </div>
          
          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Import Summary</h4>
            <div className="text-sm text-blue-800 space-y-1">
              {summary.map((item, index) => (
                <div key={index}>• {item}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Buttons */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={onEditMapping}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit Mapping
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    await onConfirmImport(decisions);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg transition-colors text-white ${isSubmitting ? 'cursor-not-allowed' : 'hover:opacity-90'}`}
                style={{ backgroundColor: isSubmitting ? '#94A3B8' : '#333D79' }}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></span>
                    Importing…
                  </span>
                ) : (
                  'Import with Auto-Mapping'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportReviewModal;
