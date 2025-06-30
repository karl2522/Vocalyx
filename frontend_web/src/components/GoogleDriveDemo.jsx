import { useEffect, useState } from 'react';
import { FaCloudUploadAlt, FaDownload, FaFile, FaFolder, FaPlus } from 'react-icons/fa';
import googleDriveService from '../services/googleDriveService';
import { showToast } from '../utils/toast';

function GoogleDriveDemo() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (!googleDriveService.hasGoogleAccess()) {
        setConnectionStatus({ success: false, error: 'No Google access token found' });
        return;
      }

      const result = await googleDriveService.testConnection();
      setConnectionStatus(result);
      
      if (result.success) {
        loadFiles();
      }
    } catch (error) {
      setConnectionStatus({ success: false, error: error.message });
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await googleDriveService.listFiles({ pageSize: 20 });
      
      if (result.success) {
        setFiles(result.files || []);
      } else {
        showToast.error(result.error || 'Failed to load files');
      }
    } catch (error) {
      showToast.error('Error loading files: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      const result = await googleDriveService.uploadFile(file);
      
      if (result.success) {
        showToast.success(`File "${file.name}" uploaded successfully!`);
        loadFiles(); // Refresh file list
      } else {
        showToast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      showToast.error('Upload error: ' + error.message);
    } finally {
      setUploadLoading(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const result = await googleDriveService.createFolder(newFolderName.trim());
      
      if (result.success) {
        showToast.success(`Folder "${newFolderName}" created successfully!`);
        setNewFolderName('');
        setShowCreateFolder(false);
        loadFiles(); // Refresh file list
      } else {
        showToast.error(result.error || 'Failed to create folder');
      }
    } catch (error) {
      showToast.error('Error creating folder: ' + error.message);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      await googleDriveService.downloadFile(fileId, fileName);
      showToast.success(`Downloading "${fileName}"`);
    } catch (error) {
      showToast.error('Download error: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!googleDriveService.hasGoogleAccess()) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Google Drive Access Required
        </h3>
        <p className="text-yellow-700">
          Please sign in with Google to access Drive features. The Google Drive integration 
          allows you to upload, download, and manage files directly from your Drive.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Google Drive Integration</h2>
        
        {/* Connection Status */}
        <div className={`p-4 rounded-lg mb-4 ${
          connectionStatus?.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              connectionStatus?.success ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`font-medium ${
              connectionStatus?.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {connectionStatus?.success ? 'Connected to Google Drive' : 'Connection Failed'}
            </span>
          </div>
          {connectionStatus?.error && (
            <p className="text-red-700 text-sm mt-2">{connectionStatus.error}</p>
          )}
          {connectionStatus?.user_info && (
            <p className="text-green-700 text-sm mt-2">
              Logged in as: {connectionStatus.user_info.user?.emailAddress}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {connectionStatus?.success && (
          <div className="flex flex-wrap gap-3 mb-6">
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <FaCloudUploadAlt className="mr-2" />
              {uploadLoading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaPlus className="mr-2" />
              Create Folder
            </button>

            <button
              onClick={loadFiles}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        )}

        {/* Create Folder Input */}
        {showCreateFolder && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Files List */}
      {connectionStatus?.success && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Your Files</h3>
            <p className="text-sm text-gray-600">
              Showing files created by Vocalyx app (limited scope for security)
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center">
              <FaFile className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No files found</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload a file to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {file.mimeType === 'application/vnd.google-apps.folder' ? (
                      <FaFolder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FaFile className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {file.size ? formatFileSize(parseInt(file.size)) : 'Folder'} • 
                        Modified {formatDate(file.modifiedTime)}
                      </p>
                    </div>
                  </div>
                  
                  {file.mimeType !== 'application/vnd.google-apps.folder' && (
                    <button
                      onClick={() => handleDownload(file.id, file.name)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <FaDownload className="mr-1" />
                      Download
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GoogleDriveDemo; 