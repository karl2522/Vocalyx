import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AddCoursesModal = ({ 
  isOpen, 
  onClose, 
  onAddCourses, 
  isAddingCourses, 
  teamName, 
  allCourses,
  isLoadingCourses,
  selectedCoursesToAdd,
  setSelectedCoursesToAdd
}) => {
  const [coursesSearchTerm, setCoursesSearchTerm] = useState('');
  
  const filteredCourses = () => {
  if (!allCourses.length) return { userCourses: [], teamCourses: [] };
  
  let filtered = allCourses;
  
  if (coursesSearchTerm.trim()) {
    filtered = filtered.filter(course => 
      course.name.toLowerCase().includes(coursesSearchTerm.toLowerCase()) ||
      (course.subject && course.subject.toLowerCase().includes(coursesSearchTerm.toLowerCase())) ||
      (course.courseCode && course.courseCode.toLowerCase().includes(coursesSearchTerm.toLowerCase()))
    );
  }
  
  const userCourses = filtered.filter(course => course.isOwner || course.accessLevel === 'full');
  const teamCourses = filtered.filter(course => !course.isOwner && course.accessLevel !== 'full');
  
  // For debugging
  console.log("User courses:", userCourses);
  console.log("Team courses:", teamCourses);
  
  return { userCourses, teamCourses };
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" 
         onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-0 w-full max-w-4xl m-4 relative animate-fadeIn"
           onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Add Courses to Your Team</h3>
              <p className="text-sm text-gray-500">Select courses to add to {teamName}</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input 
              type="search" 
              className="block w-full p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Search courses..."
              value={coursesSearchTerm}
              onChange={(e) => setCoursesSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Your Courses</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedCoursesToAdd.length} selected
              </span>
            </div>
          </div>
          
          {isLoadingCourses ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-[#333D79]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filteredCourses().userCourses.length > 0 ? (
                filteredCourses().userCourses.map((course) => (
                  <div 
                    key={course.id}
                    className={`border rounded-lg overflow-hidden ${
                      selectedCoursesToAdd.includes(course.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    } transition-all cursor-pointer`}
                    onClick={() => {
                      if (selectedCoursesToAdd.includes(course.id)) {
                        setSelectedCoursesToAdd(selectedCoursesToAdd.filter(id => id !== course.id));
                      } else {
                        setSelectedCoursesToAdd([...selectedCoursesToAdd, course.id]);
                      }
                    }}
                  >
                    <div className="relative h-36 bg-gray-100">
                      <img 
                        src={course.thumbnail || 'https://via.placeholder.com/400x200?text=Course'} 
                        alt={course.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          selectedCoursesToAdd.includes(course.id)
                            ? 'bg-blue-500' 
                            : 'bg-white border border-gray-300'
                        }`}>
                          {selectedCoursesToAdd.includes(course.id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {course.subject}
                        </span>
                      </div>
                      <h5 className="text-gray-900 font-semibold mb-1">{course.name}</h5>
                      <p className="text-gray-500 text-sm">Owner: <span className="text-blue-600">You</span></p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">No courses found matching your search</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAddCourses}
            className={`px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md transition-all ${
              selectedCoursesToAdd.length === 0 || isAddingCourses
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:opacity-90'
            }`}
            disabled={selectedCoursesToAdd.length === 0 || isAddingCourses}
          >
            {isAddingCourses ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                Adding...
              </>
            ) : (
              'Add Selected Courses'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

AddCoursesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddCourses: PropTypes.func.isRequired,
  isAddingCourses: PropTypes.bool.isRequired,
  teamName: PropTypes.string,
  allCourses: PropTypes.array.isRequired,
  isLoadingCourses: PropTypes.bool.isRequired,
  selectedCoursesToAdd: PropTypes.array.isRequired,
  setSelectedCoursesToAdd: PropTypes.func.isRequired
};

export default AddCoursesModal;