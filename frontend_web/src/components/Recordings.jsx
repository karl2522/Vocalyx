import { useState } from 'react';
import { FiSearch, FiFilter, FiPlay, FiPause, FiDownload, FiShare2, FiTrash2, FiClock, FiCalendar, FiFileText } from 'react-icons/fi';
import { MdKeyboardVoice } from 'react-icons/md';
import DashboardLayout from "./layouts/DashboardLayout.jsx";

const Recordings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  // Mock data for recordings
  const recordings = [
    { 
      id: 1, 
      name: "Marketing team standup.mp3", 
      duration: "32:16",
      size: "15.8 MB", 
      projectName: "Meeting Transcripts", 
      date: "Today",
      transcribed: true
    },
    { 
      id: 2, 
      name: "Product demo v2.mp3", 
      duration: "18:45",
      size: "8.2 MB", 
      projectName: "Product Demo Voiceovers", 
      date: "Yesterday",
      transcribed: true
    },
    { 
      id: 3, 
      name: "Customer call - issue #4582.mp3", 
      duration: "12:03",
      size: "5.7 MB", 
      projectName: "Customer Service AI", 
      date: "2 days ago",
      transcribed: false
    },
    { 
      id: 4, 
      name: "New feature walkthrough.mp3", 
      duration: "24:30",
      size: "11.2 MB", 
      projectName: "Training Presentations", 
      date: "3 days ago",
      transcribed: true
    },
    { 
      id: 5, 
      name: "Weekly marketing podcast ep.42.mp3", 
      duration: "45:12",
      size: "21.5 MB", 
      projectName: "Marketing Podcasts", 
      date: "1 week ago",
      transcribed: true
    },
    { 
      id: 6, 
      name: "User feedback - Sarah Johnson.mp3", 
      duration: "28:45",
      size: "13.4 MB", 
      projectName: "User Research Interviews", 
      date: "1 week ago",
      transcribed: false
    },
    { 
      id: 7, 
      name: "Q3 Sales review meeting.mp3", 
      duration: "54:30",
      size: "25.8 MB", 
      projectName: "Meeting Transcripts", 
      date: "2 weeks ago",
      transcribed: true
    },
  ];

  // Filter recordings based on search term and filter selection
  const filteredRecordings = recordings.filter(recording => {
    // Apply search filter
    const matchesSearch = recording.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          recording.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply transcription filter
    if (filter === 'all') return matchesSearch;
    else if (filter === 'transcribed') return matchesSearch && recording.transcribed;
    else if (filter === 'not-transcribed') return matchesSearch && !recording.transcribed;
    
    return matchesSearch;
  });

  const togglePlayback = (id) => {
    if (currentlyPlaying === id) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="pb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Recordings</h1>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <MdKeyboardVoice size={20} />
            <span>New Recording</span>
          </button>
        </div>

        {/* Filters and search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FiFilter size={18} />
                <span>Filter: {filter === 'all' ? 'All Recordings' : filter === 'transcribed' ? 'Transcribed' : 'Not Transcribed'}</span>
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => { setFilter('all'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All Recordings
                  </button>
                  <button
                    onClick={() => { setFilter('transcribed'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Transcribed
                  </button>
                  <button
                    onClick={() => { setFilter('not-transcribed'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Not Transcribed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recordings List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredRecordings.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recording
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecordings.map((recording) => (
                  <tr key={recording.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button 
                          onClick={() => togglePlayback(recording.id)}
                          className={`flex-shrink-0 h-10 w-10 rounded-lg ${currentlyPlaying === recording.id ? 'bg-blue-600' : 'bg-purple-100'} flex items-center justify-center mr-3`}
                        >
                          {currentlyPlaying === recording.id ? 
                            <FiPause className="h-5 w-5 text-white" /> : 
                            <FiPlay className="h-5 w-5 text-purple-600" />
                          }
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{recording.name}</div>
                          <div className="text-xs text-gray-500">{recording.size}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{recording.projectName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <FiClock className="mr-1 text-gray-400" size={14} />
                        {recording.duration}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <FiCalendar className="mr-1 text-gray-400" size={14} />
                        {recording.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {recording.transcribed ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Transcribed
                        </span>
                      ) : (
                        <button className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200">
                          Transcribe Now
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {recording.transcribed && (
                          <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <FiFileText size={16} />
                          </button>
                        )}
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <FiDownload size={16} />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <FiShare2 size={16} />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MdKeyboardVoice className="text-gray-400" size={28} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No recordings found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filter to find your recordings.</p>
            </div>
          )}
        </div>

        {/* Audio Player - Would be implemented with actual functionality */}
        {currentlyPlaying && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4 flex items-center z-40">
            <div className="flex-1 flex items-center">
              <button 
                onClick={() => setCurrentlyPlaying(null)}
                className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center mr-4"
              >
                <FiPause className="h-5 w-5 text-white" />
              </button>
              <div>
                <p className="font-medium text-gray-800">{recordings.find(r => r.id === currentlyPlaying)?.name}</p>
                <p className="text-sm text-gray-500">{recordings.find(r => r.id === currentlyPlaying)?.projectName}</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                  <div style={{ width: "30%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0:58</span>
                <span>{recordings.find(r => r.id === currentlyPlaying)?.duration}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <FiDownload size={18} className="text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <FiFileText size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recordings; 