import React, { useEffect, useState } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { showToast } from '../utils/toast';

const FinalGradeOverview = ({ 
  isOpen, 
  onClose, 
  classRecord, 
  sheetId 
}) => {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, missing, complete
  const [sheetFilter, setSheetFilter] = useState('both'); // both, midterm, final
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [markingLoading, setMarkingLoading] = useState(false);

  useEffect(() => {
    if (isOpen && classRecord?.id && sheetId) {
      loadPreviewData();
    }
  }, [isOpen, classRecord?.id, sheetId]);

  const loadPreviewData = async () => {
    try {
      setLoading(true);
      const result = await googleSheetsService.getFinalGradePreview(sheetId, {
        classRecordId: classRecord.id,
        force: true
      });

      if (result.success) {
        setPreviewData(result);
      } else {
        const message = typeof result.error === 'string' ? result.error : JSON.stringify(result);
        showToast.error(message || 'Failed to load preview data');
      }
    } catch (error) {
      showToast.error('Error loading preview: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = () => {
    if (!previewData?.students) return [];
    
    return previewData.students.filter(student => {
      const studentKey = `${student.studentId}_${student.lastName}_${student.firstName}`;
      const hasMissing = previewData.missing_by_student[studentKey]?.length > 0;
      
      if (filter === 'missing') return hasMissing;
      if (filter === 'complete') return !hasMissing;
      return true;
    });
  };

  const getMissingForStudent = (student) => {
    const studentKey = `${student.studentId}_${student.lastName}_${student.firstName}`;
    return previewData.missing_by_student[studentKey] || [];
  };

  const handleMarkMissing = async (student, column, value) => {
    try {
      setMarkingLoading(true);
      
      // Determine which sheet this column belongs to
      const midtermColumns = ['QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5', 'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5', 'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5', 'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5', 'PRELIM', 'MIDTERM'];
      const finalColumns = ['QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5', 'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5', 'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5', 'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5', 'PREFINAL', 'FINALS'];
      
      const sheetName = midtermColumns.includes(column) ? 'Midterm' : 'Final';
      
      await googleSheetsService.markMissingScores(sheetId, {
        sheetName,
        studentId: student.studentId,
        column,
        value
      });

      showToast.success(`Marked ${column} as ${value} for ${student.fullName}`);
      
      // Reload data to reflect changes
      await loadPreviewData();
    } catch (error) {
      showToast.error('Failed to mark missing score: ' + error.message);
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleMarkAllMissing = async (student, value) => {
    try {
      setMarkingLoading(true);
      
      const missing = getMissingForStudent(student);
      const updates = missing.map(missingItem => {
        const midtermColumns = ['QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5', 'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5', 'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5', 'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5', 'PRELIM', 'MIDTERM'];
        const sheetName = midtermColumns.includes(missingItem.column) ? 'Midterm' : 'Final';
        
        return {
          sheet_name: sheetName,
          student_id: student.studentId,
          column: missingItem.column,
          value: value
        };
      });

      await googleSheetsService.markMissingScoresBatch(sheetId, updates);
      
      showToast.success(`Marked all missing scores as ${value} for ${student.fullName}`);
      
      // Reload data to reflect changes
      await loadPreviewData();
    } catch (error) {
      showToast.error('Failed to mark missing scores: ' + error.message);
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await googleSheetsService.exportFinalGrades(sheetId, {
        classRecordId: classRecord.id
      });
      showToast.success('Final grades exported successfully!');
    } catch (error) {
      showToast.error('Failed to export: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredStudents = getFilteredStudents();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Final Grade Overview - {classRecord?.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and manage missing scores before generating final grades
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              style={{ backgroundColor: '#333D79' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{exportLoading ? 'Exporting...' : 'Export Excel'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="ml-2 px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Students</option>
                <option value="missing">With Missing Scores</option>
                <option value="complete">Complete Only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Sheet:</label>
              <select
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                className="ml-2 px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="both">Both Sheets</option>
                <option value="midterm">Midterm Only</option>
                <option value="final">Final Only</option>
              </select>
            </div>
            {previewData && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{previewData.summary?.total_students || 0}</span> total, 
                <span className="font-medium text-red-600 ml-1">{previewData.summary?.with_missing || 0}</span> with missing, 
                <span className="font-medium text-green-600 ml-1">{previewData.summary?.complete || 0}</span> complete
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading preview data...</p>
              </div>
            </div>
          ) : exportLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#333D79' }}></div>
                <p className="mt-4 text-gray-600">Exporting Excel file...</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CS1
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PE
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ME
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Midterm Grade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CS2
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PFE
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FE
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Final Grade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const missing = getMissingForStudent(student);
                    const hasMissing = missing.length > 0;
                    
                    return (
                      <tr 
                        key={`${student.studentId}_${student.lastName}_${student.firstName}`}
                        className={`hover:bg-gray-50 ${hasMissing ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.fullName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.studentId}
                              </div>
                            </div>
                            {hasMissing && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {missing.length} missing
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Grade columns */}
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.CS1 || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.PE || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.ME || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.midtermGrade || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.CS2 || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.PFE || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.FE || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.FG !== '' && student.FG !== undefined ? student.FG : '-'}
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                          {hasMissing ? (
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Manage Missing
                            </button>
                          ) : (
                            <span className="text-green-600 font-medium">✓ Complete</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Missing Scores Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Missing Scores - {selectedStudent.fullName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Student ID: {selectedStudent.studentId}
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {getMissingForStudent(selectedStudent).map((missing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{missing.displayHeader || missing.column}</span>
                      <span className="text-sm text-gray-500 ml-2">(Row {missing.rowIndex})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMarkMissing(selectedStudent, missing.column, e.target.value);
                          }
                        }}
                        disabled={markingLoading}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        defaultValue=""
                      >
                        <option value="">Select action...</option>
                        <option value="N/A">Mark as N/A</option>
                        <option value="INC">Mark as INC</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Quick actions for all missing scores:
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleMarkAllMissing(selectedStudent, 'N/A')}
                      disabled={markingLoading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                    >
                      Mark All as N/A
                    </button>
                    <button
                      onClick={() => handleMarkAllMissing(selectedStudent, 'INC')}
                      disabled={markingLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      Mark All as INC
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalGradeOverview;

