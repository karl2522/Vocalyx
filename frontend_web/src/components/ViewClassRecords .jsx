import { useState, useEffect } from 'react';
import { BookOpen, Calendar, User, Search, Plus, FileSpreadsheet, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { classRecordService } from '../services/api';
import toast from 'react-hot-toast';

const ViewClassRecords = () => {
  const [classRecords, setClassRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

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

  // Filter class records based on search term and semester
  const filteredRecords = classRecords.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = selectedSemester === '' || record.semester === selectedSemester;
    return matchesSearch && matchesSemester;
  });

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
          <h1 className="text-2xl font-bold text-gray-800">View Class Records</h1>
          <p className="text-gray-600 mt-1">Browse and manage your existing class records</p>
        </div>
        <Link
          to="/dashboard/class-records/create"
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Record</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search class records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Semester Filter */}
          <div className="relative">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
            >
              <option value="">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
            <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Class Records List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {searchTerm || selectedSemester ? 'No matching records found' : 'No Class Records Yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedSemester 
              ? 'Try adjusting your search criteria' 
              : 'Create your first class record to get started'
            }
          </p>
          {!searchTerm && !selectedSemester && (
            <Link
              to="/dashboard/class-records/create"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create Class Record
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-200"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                  {record.semester}
                </span>
              </div>

              {/* Card Content */}
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">{record.name}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>{record.teacher_name || 'Teacher'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Created: {new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                {record.student_count !== undefined && (
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <span>{record.student_count} Students</span>
                  </div>
                )}
              </div>

              {/* Card Actions - Updated with TWO buttons */}
              <div className="space-y-2">
                {/* Template Mode Button */}
                <Link
                  to={`/dashboard/class-records/${record.id}/excel`}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors text-sm font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Open Record (Template)</span>
                </Link>

                {/* Import Mode Button */}
                <Link
                  to={`/dashboard/class-records/${record.id}/import`}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  <span>Open with Excel Import</span>
                </Link>

                {/* Edit Button */}
                <button className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  Edit Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {filteredRecords.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {filteredRecords.length} of {classRecords.length} class records
        </div>
      )}
    </div>
  );
};

export default ViewClassRecords;