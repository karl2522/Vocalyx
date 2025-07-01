import { useEffect, useState } from 'react';
import { FaCopy, FaExternalLinkAlt, FaEye, FaFileExcel } from 'react-icons/fa';
import googleSheetsService from '../services/googleSheetsService';
import { showToast } from '../utils/toast';

// Your Class Record Template Sheet ID
const DEFAULT_TEMPLATE_ID = '1h-dR0ergnvgqxXsS6nLFb7lAthuoJ5MVKya4NbYHT2c';

function GoogleSheetsManager() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (googleSheetsService.hasGoogleAccess()) {
      loadUserSheets();
    }
  }, []);

  const loadUserSheets = async () => {
    try {
      setLoading(true);
      const result = await googleSheetsService.listUserSheets();
      
      if (result.success) {
        setSheets(result.sheets || []);
      } else {
        showToast.error(result.error || 'Failed to load sheets');
      }
    } catch (error) {
      showToast.error('Error loading sheets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = async () => {
    if (!newSheetName.trim()) {
      showToast.error('Please enter a sheet name');
      return;
    }

    try {
      setCreating(true);
      const result = await googleSheetsService.copyTemplate(
        DEFAULT_TEMPLATE_ID,
        newSheetName.trim()
      );
      
      if (result.success) {
        showToast.success(`Sheet "${newSheetName}" created successfully!`);
        setNewSheetName('');
        setShowCreateModal(false);
        loadUserSheets(); // Refresh list
        
        // Automatically select the new sheet
        setSelectedSheet(result.file);
      } else {
        showToast.error(result.error || 'Failed to create sheet');
      }
    } catch (error) {
      showToast.error('Error creating sheet: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleViewSheet = (sheet) => {
    setSelectedSheet(sheet);
  };

  const handleOpenInNewTab = (sheet) => {
    window.open(sheet.webViewLink || googleSheetsService.getViewUrl(sheet.id), '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!googleSheetsService.hasGoogleAccess()) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Google Access Required
        </h3>
        <p className="text-yellow-700">
          Please sign in with Google to manage your class record sheets.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Class Record Sheets</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaCopy className="mr-2" />
            Create New Sheet
          </button>
        </div>

        {/* Sheets List */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Your Sheets</h3>
            <p className="text-sm text-gray-600">
              Manage your class record spreadsheets
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading sheets...</p>
            </div>
          ) : sheets.length === 0 ? (
            <div className="p-8 text-center">
              <FaFileExcel className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No sheets found</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first class record sheet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sheets.map((sheet) => (
                <div key={sheet.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FaFileExcel className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{sheet.name}</p>
                      <p className="text-xs text-gray-500">
                        Modified {formatDate(sheet.modifiedTime)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewSheet(sheet)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <FaEye className="mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleOpenInNewTab(sheet)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <FaExternalLinkAlt className="mr-1" />
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sheet Viewer */}
        {selectedSheet && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">{selectedSheet.name}</h3>
              <button
                onClick={() => setSelectedSheet(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-0">
              <iframe
                src={selectedSheet.embedLink || googleSheetsService.getEmbedUrl(selectedSheet.id)}
                width="100%"
                height="600"
                frameBorder="0"
                className="w-full"
                title={`Google Sheet: ${selectedSheet.name}`}
              />
            </div>
          </div>
        )}

        {/* Create Sheet Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Class Record Sheet</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sheet Name
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="e.g., Math 101 - Fall 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleCopyTemplate()}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCopyTemplate}
                  disabled={creating || !newSheetName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Sheet'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSheetName('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleSheetsManager; 