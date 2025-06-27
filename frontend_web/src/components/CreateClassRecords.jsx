import { useState, useEffect } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import CreateClassRecordModal from './modals/CreateClassRecordModal';
import { classRecordService } from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const CreateClassRecord = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classRecords, setClassRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch class records on component mount
  useEffect(() => {
    fetchClassRecords();
  }, []);

  const fetchClassRecords = async () => {
    try {
      setLoading(true);
      const response = await classRecordService.getClassRecords();
      setClassRecords(response.data);
    } catch (error) {
      console.error('Error fetching class records:', error);
      toast.error('Failed to fetch class records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (formData) => {
    try {
      const response = await classRecordService.createClassRecord(formData);
      setClassRecords(prev => [response.data, ...prev]);
      toast.success('Class record created successfully!');
    } catch (error) {
      console.error('Error creating class record:', error);
      if (error.response?.data) {
        // Handle specific API errors
        const errorData = error.response.data;
        if (errorData.name) {
          toast.error(`Name: ${errorData.name[0]}`);
        } else if (errorData.semester) {
          toast.error(`Semester: ${errorData.semester[0]}`);
        } else if (errorData.non_field_errors) {
          toast.error(errorData.non_field_errors[0]);
        } else {
          toast.error('Failed to create class record');
        }
      } else {
        toast.error('Failed to create class record');
      }
      throw error; // Re-throw to handle in modal
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to delete this class record?')) {
      try {
        await classRecordService.deleteClassRecord(recordId);
        setClassRecords(prev => prev.filter(record => record.id !== recordId));
        toast.success('Class record deleted successfully!');
      } catch (error) {
        console.error('Error deleting class record:', error);
        toast.error('Failed to delete class record');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Class Records</h1>
          <p className="text-gray-600 mt-1">Manage your class records and grading</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Create Class Record</span>
        </button>
      </div>

      {/* Class Records List */}
      {classRecords.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Class Records Yet</h3>
          <p className="text-gray-500 mb-4">Create your first class record to get started</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Class Record
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {record.semester}
                </span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{record.name}</h3>
              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>Teacher: {record.teacher_name || 'N/A'}</p>
                <p>Students: {record.student_count || 0}</p>
                <p>Created: {new Date(record.created_at).toLocaleDateString()}</p>
              </div>
              
              {/* Action Buttons */}
            <div className="flex space-x-2">
                <Link
                    to={`/dashboard/class-records/${record.id}/excel`}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors text-sm font-medium text-center block"
                >
                    Open Record
                </Link>
                <button 
                    onClick={() => handleDeleteRecord(record.id)}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                >
                    Delete
                </button>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Record Modal */}
      <CreateClassRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRecord}
      />
    </div>
  );
};

export default CreateClassRecord;