import PropTypes from 'prop-types';
import { useState } from 'react';
import { FiUpload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import GradeTable from './GradeTable';

const ExcelImporter = ({ onDataImported }) => {
  const [tableData, setTableData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert Excel data to array format
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Ensure we have data
        if (jsonData && jsonData.length > 0) {
          setTableData(jsonData);
          if (onDataImported) {
            onDataImported(jsonData);
          }
        } else {
          setError('The Excel file does not contain any data.');
        }
      } catch (err) {
        console.error('Error processing Excel file:', err);
        setError('Failed to process the Excel file. Please ensure it\'s a valid Excel format.');
      }
    };
    
    reader.onerror = () => {
      setError('Error reading the file. Please try again.');
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  const handleTableChange = (newData) => {
    setTableData(newData);
    if (onDataImported) {
      onDataImported(newData);
    }
  };

  return (
    <div className="excel-importer">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <label className="block text-sm font-medium text-gray-700">Import Grade Sheet</label>
          <div className="text-xs text-gray-500">(Excel format)</div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="cursor-pointer bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center">
            <FiUpload className="mr-2" />
            <span>Choose File</span>
            <input 
              type="file" 
              className="hidden"
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
            />
          </label>
          
          {fileName && (
            <div className="text-sm text-gray-600">
              {fileName}
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
      
      {tableData && (
        <div className="mt-6">
          <h3 className="font-medium text-lg text-gray-800 mb-3">Imported Grade Sheet</h3>
          <GradeTable 
            data={tableData}
            readOnly={false}
            onTableChange={handleTableChange}
          />
        </div>
      )}
    </div>
  );
};

ExcelImporter.propTypes = {
  onDataImported: PropTypes.func
};

export default ExcelImporter; 