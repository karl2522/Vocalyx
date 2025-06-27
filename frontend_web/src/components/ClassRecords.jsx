import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCalendar,
    FiEye,
    FiFileText,
    FiFilter,
    FiGrid,
    FiList,
    FiPlus,
    FiSearch,
    FiUpload,
    FiUser
} from 'react-icons/fi';
import { RiSoundModuleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { classRecordService } from '../services/api';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';
import CreateClassRecordModal from './modals/CreateClassRecordModal';

// Skeleton Loader Component
const Skeleton = ({ className }) => (
  <div className={`bg-gray-200 rounded-md ${className}`}></div>
);

const StatsCardSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex items-center justify-between">
    <div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-7 w-16" />
    </div>
    <Skeleton className="w-10 h-10 rounded-lg" />
  </div>
);

const SearchFilterSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
    <div className="flex flex-col lg:flex-row gap-4">
      <Skeleton className="h-12 w-full mb-2" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  </div>
);

const RecordCardSkeleton = ({ viewMode }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${viewMode === 'list' ? 'flex items-center gap-6' : ''}`}> 
    {/* Icon & Badge */}
    <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-4'}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        {viewMode === 'grid' && <Skeleton className="h-5 w-16 rounded-full" />}
      </div>
    </div>
    {/* Content */}
    <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}> 
      <div className={`${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}> 
        <div className={`${viewMode === 'list' ? 'flex-1' : 'mb-4'}`}> 
          <Skeleton className={`h-5 ${viewMode === 'list' ? 'w-32' : 'w-40'} mb-2`} />
          {viewMode === 'list' ? (
            <div className="flex items-center gap-6 text-sm">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          ) : (
            <div className="space-y-2 text-sm mb-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
          )}
        </div>
        {/* Actions */}
        <div className={`${viewMode === 'list' ? 'flex gap-2 flex-shrink-0' : 'space-y-2'}`}> 
          <Skeleton className={`h-9 ${viewMode === 'list' ? 'w-20' : 'w-full'}`} />
          <Skeleton className={`h-9 ${viewMode === 'list' ? 'w-20' : 'w-full'}`} />
        </div>
      </div>
    </div>
  </div>
);

const ClassRecords = () => {
  const [classRecords, setClassRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      showToast.error('Failed to fetch class records');
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

  const filteredRecords = classRecords.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = selectedSemester === '' || record.semester === selectedSemester;
    return matchesSearch && matchesSemester;
  });

  const semesterCounts = classRecords.reduce((acc, record) => {
    acc[record.semester] = (acc[record.semester] || 0) + 1;
    return acc;
  }, {});

  const totalStudents = classRecords.reduce((acc, record) => acc + (record.student_count || 0), 0);

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header (no skeleton for title/subtitle) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Records</h1>
              <p className="text-gray-600">Manage and explore your academic records</p>
            </div>
            <div className="flex items-center gap-4 mt-4 lg:mt-0">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-[#333D79] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FiGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-[#333D79] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FiList size={18} />
                </button>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-4 py-2 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all shadow-md hover:shadow-lg"
              >
                <FiPlus size={18} />
                <span>New Record</span>
              </button>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>

          {/* Search & Filters Skeleton */}
          <SearchFilterSkeleton />

          {/* Records List/Grid Skeleton */}
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[...Array(viewMode === 'grid' ? 6 : 3)].map((_, i) => (
              <RecordCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- END SKELETON LOADING ---

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Records</h1>
            <p className="text-gray-600">Manage and explore your academic records</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-[#333D79] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FiGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-[#333D79] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FiList size={18} />
              </button>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-4 py-2 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all shadow-md hover:shadow-lg"
            >
              <FiPlus size={18} />
              <span>New Record</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{classRecords.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiFileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FiUser className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Semesters</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(semesterCounts).length}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiCalendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Showing</p>
                <p className="text-2xl font-bold text-gray-900">{filteredRecords.length}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiEye className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by class name, teacher, or semester..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Semester Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FiFilter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Semester:</span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedSemester('')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedSemester === '' 
                      ? 'bg-[#333D79] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({classRecords.length})
                </button>
                {Object.entries(semesterCounts).map(([semester, count]) => (
                  <button
                    key={semester}
                    onClick={() => setSelectedSemester(semester)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedSemester === semester 
                        ? 'bg-[#333D79] text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {semester} ({count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedSemester) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSemester('');
                }}
                className="px-4 py-2 text-[#333D79] bg-[#333D79]/5 border border-[#333D79]/20 rounded-lg hover:bg-[#333D79]/10 transition-colors font-medium"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Records List/Grid */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg flex items-center justify-center mx-auto mb-4">
              <FiFileText className="h-8 w-8 text-white" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || selectedSemester ? 'No records found' : 'No class records yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedSemester 
                ? 'Try adjusting your search criteria or clear the filters.' 
                : 'Create your first class record to get started.'
              }
            </p>
            
            {!searchTerm && !selectedSemester && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-6 py-3 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all font-medium"
              >
                <FiPlus size={18} />
                <span>Create First Record</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 ${
                  viewMode === 'list' ? 'flex items-center gap-6' : ''
                }`}
              >
                {/* Icon & Badge */}
                <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-4'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg flex items-center justify-center">
                      <FiFileText className="h-6 w-6 text-white" />
                    </div>
                    {viewMode === 'grid' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {record.semester}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className={`${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'flex-1' : 'mb-4'}`}>
                      <h3 className={`font-semibold text-gray-900 mb-2 ${viewMode === 'list' ? 'text-lg' : ''}`}>
                        {record.name}
                      </h3>
                      
                      {viewMode === 'list' && (
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <FiUser className="h-4 w-4" />
                            {record.teacher_name || 'Teacher'}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiCalendar className="h-4 w-4" />
                            {new Date(record.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <RiSoundModuleLine className="h-4 w-4" />
                            {record.student_count || 0} Students
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                            {record.semester}
                          </span>
                        </div>
                      )}
                      
                      {viewMode === 'grid' && (
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <FiUser className="h-4 w-4" />
                            <span>Teacher: {record.teacher_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiCalendar className="h-4 w-4" />
                            <span>Created: {new Date(record.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <RiSoundModuleLine className="h-4 w-4" />
                            <span>Students: {record.student_count || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={`${viewMode === 'list' ? 'flex gap-2 flex-shrink-0' : 'space-y-2'}`}>
                      <Link
                        to={`/dashboard/class-records/${record.id}/excel`}
                        className={`flex items-center justify-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-4 py-2 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all text-sm font-medium ${
                          viewMode === 'list' ? '' : 'w-full'
                        }`}
                      >
                        <FiEye className="h-4 w-4" />
                        <span>{viewMode === 'list' ? 'View' : 'Open Record'}</span>
                      </Link>

                      <Link
                        to={`/dashboard/class-records/${record.id}/import`}
                        className={`flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium ${
                          viewMode === 'list' ? '' : 'w-full'
                        }`}
                      >
                        <FiUpload className="h-4 w-4" />
                        <span>{viewMode === 'list' ? 'Import' : 'Import Data'}</span>
                      </Link>
                    </div>
                  </div>
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
    </DashboardLayout>
  );
};

export default ClassRecords;