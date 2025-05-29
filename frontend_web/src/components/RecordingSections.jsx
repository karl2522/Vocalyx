import React, { useState, useEffect } from 'react';
import { FiPlayCircle, FiDownload, FiInfo, FiClock, FiCalendar, FiUser, FiMic } from 'react-icons/fi';
import { useParams } from 'react-router-dom';
import { classService } from '../services/api';

const RecordingsSection = () => {
  const { id } = useParams();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRecording, setExpandedRecording] = useState(null);

  
  const handlePlayRecording = (recordingId) => {
    console.log("Playing recording:", recordingId);
    // Implement playback functionality
    if (expandedRecording === recordingId) {
      setExpandedRecording(null);
    } else {
      setExpandedRecording(recordingId);
    }
  };
  
  const handleDownloadRecording = async (recordingId, fileName) => {
    try {
      console.log("Downloading recording:", recordingId);
      // Implement download functionality
      // This is a placeholder - replace with actual download logic
      const response = await classService.downloadRecording(recordingId);
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `recording-${recordingId}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading recording:", err);
      setError("Failed to download recording");
    }
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Use sample data if no recordings or in development
  const sampleRecordings = [
    {
      id: 'sample-1',
      title: 'Lecture on Introduction to Data Structures',
      date: '2023-04-15T14:30:00',
      duration: 3245,
      fileSize: '28.5 MB',
      speaker: 'Prof. Smith',
      transcriptionAvailable: true,
      transcription: 'This is a sample transcription...'
    },
    {
      id: 'sample-2',
      title: 'Algorithm Analysis Discussion',
      date: '2023-04-12T10:15:00',
      duration: 2130,
      fileSize: '19.2 MB',
      speaker: 'Prof. Johnson',
      transcriptionAvailable: false
    }
  ];
  
  const displayRecordings = recordings.length > 0 ? recordings : sampleRecordings;
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-50 rounded-full opacity-20 blur-3xl"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FiMic className="mr-2 text-[#333D79]" /> Class Recordings
        </h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-slate-200 h-10 w-10 mb-2"></div>
            <div className="h-2 bg-slate-200 rounded w-24 mb-4"></div>
            <div className="h-2 bg-slate-200 rounded w-64 mb-2"></div>
            <div className="h-2 bg-slate-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FiMic className="mr-2 text-[#333D79]" /> Class Recordings
        </h3>
        <div className="bg-red-50 rounded-lg p-4 text-red-800">
          <div className="flex items-center">
            <FiInfo className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-50 rounded-full opacity-20 blur-3xl"></div>
      
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <FiMic className="mr-2 text-[#333D79]" /> Class Recordings
      </h3>
      
      {displayRecordings.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <FiMic className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No recordings yet</h3>
          <p className="text-gray-500">Recordings will appear here once they're available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayRecordings.map(recording => (
            <div 
              key={recording.id} 
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <div 
                    className="p-2 rounded-full bg-[#EEF0F8] text-[#333D79] cursor-pointer hover:bg-[#DCE3F9] transition-colors"
                    onClick={() => handlePlayRecording(recording.id)}
                  >
                    <FiPlayCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{recording.title}</h4>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <FiCalendar className="h-3.5 w-3.5 mr-1" />
                      <span className="mr-3">{formatDate(recording.date)}</span>
                      <FiClock className="h-3.5 w-3.5 mr-1" />
                      <span className="mr-3">{formatDuration(recording.duration)}</span>
                      {recording.speaker && (
                        <>
                          <FiUser className="h-3.5 w-3.5 mr-1" />
                          <span>{recording.speaker}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadRecording(recording.id, `${recording.title}.mp3`)}
                  className="p-2 rounded-full text-gray-500 hover:text-[#333D79] hover:bg-[#EEF0F8] transition-colors"
                  title="Download recording"
                >
                  <FiDownload className="h-5 w-5" />
                </button>
              </div>
              
              {expandedRecording === recording.id && recording.transcriptionAvailable && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  <div className="flex items-center mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs font-medium text-gray-500">TRANSCRIPTION</span>
                  </div>
                  <p className="pl-3.5 border-l border-gray-200">{recording.transcription || 'Transcription is being processed...'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 flex justify-center">
        <button className="px-4 py-2 text-sm text-[#333D79] hover:bg-[#EEF0F8] rounded-md transition-colors">
          See all recordings
        </button>
      </div>
    </div>
  );
};

export default RecordingsSection;