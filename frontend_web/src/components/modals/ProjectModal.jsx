import { useState } from 'react';
import PropTypes from 'prop-types';
import { MdClose, MdOutlineClass } from 'react-icons/md';
import { classService } from '../../services/api';
import { toast } from 'react-hot-toast';

const ProjectModal = ({ isOpen, onClose, onAddProject }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await classService.createClass({
        name: projectName,
        description,
        semester,
        student_count: studentCount ? parseInt(studentCount, 10) : 0,
        status: 'active'
      });

      if (onAddProject) {
        onAddProject(response.data);
      }

      toast.success('Class created successfully!');
      
      setProjectName('');
      setDescription('');
      setSemester('');
      setStudentCount('');
      onClose();
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error(error.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#EEF0F8] sm:mx-0 sm:h-10 sm:w-10">
                  <MdOutlineClass className="h-6 w-6 text-[#333D79]" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 ml-3" id="modal-title">
                  Create New Class
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <MdClose size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  id="projectName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                  placeholder="Enter class name (e.g. Introduction to Data Science)"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                  placeholder="Describe your class content and objectives"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    id="semester"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                    placeholder="e.g. Fall 2023"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="studentCount" className="block text-sm font-medium text-gray-700 mb-1">
                    Student Count
                  </label>
                  <input
                    type="number"
                    id="studentCount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                    placeholder="Number of students"
                    min="0"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4 -mx-6">
               <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#333D79] text-base font-medium text-white hover:bg-[#4A5491] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333D79] sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Class'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333D79] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

ProjectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddProject: PropTypes.func
};

export default ProjectModal; 