import { AlertCircle, Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import googleDriveService from '../../services/googleDriveService';

const DriveFilePickerModal = ({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  importType = 'students' // 'students' or 'scores'
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDriveFiles();
    }
  }, [isOpen]);

  const loadDriveFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading Drive files...');
      
      // List more files to find Excel/CSV files
      const result = await googleDriveService.listFiles({
        pageSize: 200
      });

      console.log('📁 Drive API result:', result);

      if (result.success) {
        const allFiles = result.files || [];
        
        // Debug: Log all file names and types
        console.log('📋 All files from Drive:', allFiles.map(f => ({ name: f.name, mimeType: f.mimeType })));
        
        // Filter for Excel/CSV files on the frontend - only .xlsx and .csv
        const excelFiles = allFiles.filter(file => {
          const name = file.name?.toLowerCase() || '';
          const mimeType = file.mimeType || '';
          const isExcelCsv = name.endsWith('.xlsx') || name.endsWith('.csv') ||
                 mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 mimeType === 'text/csv';
          
          if (isExcelCsv) {
            console.log('✅ Found Excel/CSV file:', { name: file.name, mimeType: file.mimeType });
          }
          
          return isExcelCsv;
        });
        setFiles(excelFiles);
        console.log(`✅ Found ${excelFiles.length} Excel/CSV files (.xlsx/.csv) out of ${allFiles.length} total files`);
      } else {
        console.error('❌ Drive API error:', result.error);
        setError(result.error || 'Failed to load files from Drive');
      }
    } catch (error) {
      console.error('❌ Error loading Drive files:', error);
      setError('Error connecting to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    onFileSelect(file);
    onClose();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadDriveFiles();
  };

  // Filter files based on search query (files are already filtered for Excel/CSV)
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Select File from Google Drive
            </h3>
            <p className="text-sm text-gray-600">
              Choose an Excel (.xlsx) or CSV (.csv) file to {importType === 'students' ? 'import students' : 'import scores'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading files from Google Drive...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadDriveFiles}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No Excel (.xlsx) or CSV (.csv) files found</p>
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'Try a different search term' : 'Upload some .xlsx or .csv files to your Google Drive first'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <div className="divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <FileSpreadsheet className="w-8 h-8 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{formatFileSize(parseInt(file.size))}</span>
                          <span>•</span>
                          <span>Modified {formatDate(file.modifiedTime)}</span>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriveFilePickerModal;
