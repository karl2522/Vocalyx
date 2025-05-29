import PropTypes from 'prop-types';
import React from 'react';
import { FiCheckCircle, FiFileText, FiUpload } from 'react-icons/fi';
import { MdOutlineClass } from 'react-icons/md';

const NewClassWelcome = ({ onFileUpload }) => {
  return (
    <div className="py-6 animate-fadeIn">
      <div className="mb-6 w-24 h-24 bg-gradient-to-br from-[#EEF0F8] to-[#DCE3F9] rounded-full flex items-center justify-center mx-auto shadow-sm animate-pulse-custom">
        <MdOutlineClass className="h-12 w-12 text-[#333D79]" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-3 animate-slideUp">Welcome to Your New Class!</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6 animate-slideUp">
        This class was just created. Start by adding student data or course materials to get the most out of Vocalyx.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 mx-auto">
            <FiUpload className="text-blue-600" size={20} />
          </div>
          <h4 className="font-medium text-gray-800 mb-1">Upload Data</h4>
          <p className="text-xs text-gray-500">Add your student records via Excel or CSV</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3 mx-auto">
            <FiFileText className="text-purple-600" size={20} />
          </div>
          <h4 className="font-medium text-gray-800 mb-1">Create Content</h4>
          <p className="text-xs text-gray-500">Develop learning materials for your students</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3 mx-auto">
            <FiCheckCircle className="text-green-600" size={20} />
          </div>
          <h4 className="font-medium text-gray-800 mb-1">Track Progress</h4>
          <p className="text-xs text-gray-500">Monitor student engagement and learning</p>
        </div>
      </div>
      
      <label htmlFor="file-upload-new-class" className="cursor-pointer inline-block">
        <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm mx-auto">
          <FiUpload size={18} />
          <span>Start by uploading student data</span>
        </div>
        <input 
          id="file-upload-new-class" 
          type="file" 
          accept=".xlsx,.xls,.csv" 
          className="hidden"
          onChange={onFileUpload}
        />
      </label>
    </div>
  );
};

NewClassWelcome.propTypes = {
  onFileUpload: PropTypes.func.isRequired
};

export default NewClassWelcome; 