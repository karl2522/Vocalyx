import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { enhancedClassRecordService as classRecordService } from '../services/api';
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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [classStandingRemaining, setClassStandingRemaining] = useState(0);
  const [currentSheetName, setCurrentSheetName] = useState('');
  const [problematicSheets, setProblematicSheets] = useState([]);

  const loadPreviewData = useCallback(async () => {
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
  }, [sheetId, classRecord.id]);

  const loadClassStandingPercentage = useCallback(async () => {
    try {
      // Use backend mirror (DB) for instant per-sheet remaining without Google calls
      const res = await classRecordService.getCategoryPercentages(classRecord.id);
      const sheets = Array.isArray(res?.data?.sheets) ? res.data.sheets : [];
      const total = Number.isFinite(res?.data?.remaining) ? Number(res.data.remaining) : (
        sheets.reduce((sum, s) => sum + (Number(s.remaining) || 0), 0)
      );

      setProblematicSheets(sheets);
      setClassStandingRemaining(Math.max(0, total));

      if (sheets.length > 0) {
        setCurrentSheetName(sheets[0].sheetName);
      } else {
        setCurrentSheetName('');
      }
    } catch (error) {
      console.warn('Failed to load class standing percentage:', error);
    }
  }, [classRecord.id]);

  useEffect(() => {
    if (isOpen && classRecord?.id && sheetId) {
      loadPreviewData();
      loadClassStandingPercentage();
    }
  }, [isOpen, classRecord?.id, sheetId, loadPreviewData, loadClassStandingPercentage]);

  const getFilteredStudents = () => {
    if (!previewData?.students) return [];
    return previewData.students;11
  };

  const getMissingForStudent = (student) => {
    const studentKey = `${student.studentId}_${student.lastName}_${student.firstName}`;
    return previewData.missing_by_student[studentKey] || [];
  };

  const handleMarkMissing = async (student, column, value) => {
    try {
      setMarkingLoading(true);
      
      // Persist override in backend (DB), not in Sheets
      await classRecordService.setFinalGradeOverride(
        classRecord.id,
        student.studentId,
        value,
        {
          student_key: `${student.studentId}_${student.lastName}_${student.firstName}`,
          first_name: student.firstName,
          last_name: student.lastName,
        }
      );

      showToast.success(`Marked Final Grade as ${value} for ${student.fullName}`);

      // Optimistically update UI immediately
      setPreviewData(prev => {
        if (!prev?.students) return prev;
        const updated = { ...prev, students: prev.students.map(s => (
          s.studentId === student.studentId ? { ...s, FG: value } : s
        )) };
        return updated;
      });

      // Reload data to confirm
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

      // Apply FG override to Final Term Grade column
      await classRecordService.setFinalGradeOverride(
        classRecord.id,
        student.studentId,
        value,
        {
          student_key: `${student.studentId}_${student.lastName}_${student.firstName}`,
          first_name: student.firstName,
          last_name: student.lastName,
        }
      );
      
      showToast.success(`Marked Final Grade as ${value} for ${student.fullName}`);

      setPreviewData(prev => {
        if (!prev?.students) return prev;
        const updated = { ...prev, students: prev.students.map(s => (
          s.studentId === student.studentId ? { ...s, FG: value } : s
        )) };
        return updated;
      });

      await loadPreviewData();
    } catch (error) {
      showToast.error('Failed to mark missing scores: ' + error.message);
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleClearFinalGradeOverride = async (student) => {
    try {
      setMarkingLoading(true);
      await classRecordService.setFinalGradeOverride(
        classRecord.id,
        student.studentId,
        '',
        {
          student_key: `${student.studentId}_${student.lastName}_${student.firstName}`,
          first_name: student.firstName,
          last_name: student.lastName,
        }
      );

      // Optimistically restore computed FG from term grades
      setPreviewData(prev => {
        if (!prev?.students) return prev;
        const updated = { ...prev, students: prev.students.map(s => {
          if (s.studentId !== student.studentId || s.lastName !== student.lastName || s.firstName !== student.firstName) return s;
          const mid = parseFloat(s.midtermGrade);
          const fin = parseFloat(s.finalTermGrade);
          const computed = (Number.isFinite(mid) && Number.isFinite(fin)) ? Math.round(((mid + fin) / 2) * 100) / 100 : '';
          return { ...s, FG: computed };
        }) };
        return updated;
      });

      await loadPreviewData();
      showToast.success(`Removed final grade mark for ${student.fullName}`);
    } catch (error) {
      showToast.error('Failed to remove mark: ' + (error?.message || 'Unknown error'));
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleExport = async () => {
    // Check if class standing percentage is complete
    if (classStandingRemaining > 0) {
      showToast.error(`Cannot export final grades. Class standing percentage is incomplete (${classStandingRemaining}% unallocated).`);
      return;
    }

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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
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
              disabled={exportLoading || classStandingRemaining > 0}
              className={`px-4 py-2 text-white rounded-lg flex items-center space-x-2 transition-colors ${
                classStandingRemaining > 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'hover:opacity-90 disabled:opacity-50'
              }`}
              style={classStandingRemaining === 0 ? { backgroundColor: '#333D79' } : {}}
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

        {/* Class Standing Warning */}
        {classStandingRemaining > 0 && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Class Standing Percentage Incomplete
                </p>
                <div className="text-sm text-yellow-700 mt-1">
                  {problematicSheets.length === 1 ? (
                    <p>
                      You still have {classStandingRemaining}% unallocated in the <span className="font-semibold">{currentSheetName}</span> sheet. Final grades cannot be exported until class standing totals 100%.
                    </p>
                  ) : (
                    <div>
                      <p className="mb-2">You have unallocated percentages in multiple sheets:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        {problematicSheets.map((sheet, index) => (
                          <li key={index}>
                            <span className="font-semibold">{sheet.sheetName}</span>: {sheet.remaining}% unallocated
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2">Final grades cannot be exported until all sheets have 100% class standing.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


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
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                          {(['INC','N/A'].includes(String(student.FG).toUpperCase())) ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              {String(student.FG).toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-gray-900">{(student.FG !== '' && student.FG !== undefined) ? student.FG : '-'}</span>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                          <div className="flex items-center justify-center gap-3">
                            {(['INC','N/A'].includes(String(student.FG).toUpperCase())) ? (
                              <button
                                onClick={() => handleClearFinalGradeOverride(student)}
                                disabled={markingLoading}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Remove Mark
                              </button>
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4"
          onClick={(e) => {
            // Close only the inner popup, not the parent modal
            e.stopPropagation();
            setSelectedStudent(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Missing Scores
              </h3>
            </div>
            
            <div className="p-6">
              {/* Info note */}
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                <p className="text-xs text-amber-800">
                  Assigning INC or N/A to this student will be reflected in the final grade.
                </p>
              </div>

              {/* Single action card */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{selectedStudent.fullName}</div>
                  <div className="text-xs text-gray-500">Student ID: {selectedStudent.studentId}</div>
                  <div className="mt-2">
                    <span className="text-sm font-medium text-gray-600">Missing:</span>
                    <div className="mt-1">
                      {(() => {
                        const missing = getMissingForStudent(selectedStudent);
                        const groupedBySheet = {};
                        
                        // Group missing items by sheet
                        missing.forEach(item => {
                          const sheetName = item.sheetName || 'Unknown';
                          if (!groupedBySheet[sheetName]) {
                            groupedBySheet[sheetName] = [];
                          }
                          groupedBySheet[sheetName].push(item.displayHeader || item.column);
                        });
                        
                        return Object.entries(groupedBySheet).map(([sheet, items], index) => (
                          <div key={sheet} className="flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                              {sheet}
                            </span>
                            <span className="text-sm text-gray-500">-</span>
                            <div className="flex flex-wrap gap-1">
                              {items.map((item, itemIndex) => (
                                <span key={itemIndex} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
                                  {item}
                                </span>
                              ))}
                            </div>
                            {index < Object.entries(groupedBySheet).length - 1 && (
                              <span className="mx-2"></span>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMarkMissing(selectedStudent, 'Final Grade', e.target.value);
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

FinalGradeOverview.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  classRecord: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    google_sheet_id: PropTypes.string.isRequired,
  }).isRequired,
  sheetId: PropTypes.string.isRequired,
};

export default FinalGradeOverview;

