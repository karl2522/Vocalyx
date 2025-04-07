import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUpload, FiFileText, FiDownload, FiFilter, FiX } from 'react-icons/fi';
import { MdOutlineClass, MdDragIndicator } from 'react-icons/md';
import { HiSwitchHorizontal } from 'react-icons/hi';
import DashboardLayout from './layouts/DashboardLayout';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.css';
import * as XLSX from 'xlsx';
import { classService } from '../services/api';
import { debounce } from 'lodash';

registerAllModules();

const MAX_VISIBLE_ROWS = 100; 
const LAZY_LOAD_THRESHOLD = 50; 

const ClassDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [visibleRowCount, setVisibleRowCount] = useState(MAX_VISIBLE_ROWS);
  const hotTableRef = useRef(null);
  const [excelFiles, setExcelFiles] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedData = useRef(null);
  
  const visibleData = useMemo(() => {
    if (!excelData) return null;
    
    if (excelData.data.length <= visibleRowCount) {
      return excelData.data;
    }
    
    return excelData.data.slice(0, visibleRowCount);
  }, [excelData, visibleRowCount]);


  useEffect(() => {
    const handleClickOutside = (event) => {
        if (isDropdownOpen && !event.target.closest('.relative')) {
            setIsDropdownOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isDropdownOpen]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            const [classResponse, excelResponse] = await Promise.all([
                classService.getClassById(id),
                classService.getClassExcelFiles(id)
            ]);
            
            setClassData(classResponse.data);
            
            // If there are excel files, load the most recent one
            if (excelResponse.data.length > 0) {
                setExcelFiles(excelResponse.data);
                const latestFile = excelResponse.data[0]; // Assuming they're sorted by date
                
                // Set the excel data
                const headers = Object.keys(latestFile.sheet_data[0] || {});
                const data = latestFile.sheet_data.map(row => 
                    headers.map(header => row[header])
                );
                
                setExcelData({
                    headers,
                    data,
                    fileId: latestFile.id
                });
                setSelectedFile({ name: latestFile.file_name });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.status === 404) {
                navigate('/dashboard', { replace: true });
            }
            setError(error.response?.data?.error || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, [id, navigate]);

  useEffect(() => {
    if (!excelData || excelData.data.length <= MAX_VISIBLE_ROWS) return;
    
    const handleScroll = (e) => {
      const container = e.target;
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
      if (scrollHeight - scrollPosition < LAZY_LOAD_THRESHOLD * 28) {
        if (visibleRowCount < excelData.data.length) {
          setVisibleRowCount(prev => Math.min(prev + LAZY_LOAD_THRESHOLD, excelData.data.length));
        }
      }
    };
    
    const tableContainer = document.querySelector('.excel-data-container .overflow-auto');
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
      return () => tableContainer.removeEventListener('scroll', handleScroll);
    }
  }, [excelData, visibleRowCount]);
  
  useEffect(() => {
    setVisibleRowCount(MAX_VISIBLE_ROWS);
  }, [activeSheet]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv'));
    
    if (validFiles.length > 0) {
      handleFileUpload(validFiles[0]);
    }
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      handleFileUpload(selectedFiles[0]);
    }
  };

  
  const handleDataChange = async (changes, source) => {
    // Ignore loadData events and null changes
    if (source === 'loadData' || !changes || changes.length === 0) return;
    
    // Only proceed if there are actual changes
    const hasChanges = changes.some(([row, prop, oldValue, newValue]) => oldValue !== newValue);
    if (!hasChanges) return;

    try {
        setIsSaving(true);
        const currentData = hotTableRef.current.hotInstance.getData();
        
        const formattedData = currentData.map(row => {
            const rowData = {};
            excelData.headers.forEach((header, index) => {
                let value = row[index];
                if (value === "") {
                    value = null;
                } else if (typeof value === "string" && !isNaN(value)) {
                    value = Number(value);
                }
                rowData[header] = value;
            });
            return rowData;
        });

        const currentDataString = JSON.stringify(formattedData);
        if (currentDataString === lastSavedData.current) {
            setIsSaving(false);
            return;
        }

        console.log('Sending data update:', formattedData);

        const response = await classService.updateExcelData(excelData.fileId, formattedData);
        
        lastSavedData.current = currentDataString;
        
        setExcelData(prev => ({
            ...prev,
            data: currentData
        }));

        setError(null);
    } catch (error) {
        console.error('Failed to update data:', error);
        console.error('Error details:', error.response?.data); 
        setError(error.response?.data?.error || 'Failed to save changes. Please try again.');
    } finally {
        setIsSaving(false);
    }
};
  const safeProcessWorksheet = (worksheet) => {
    if (!worksheet || !worksheet['!ref']) {
      return { headers: ['No data'], data: [] };
    }
    
    try {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const totalRows = range.e.r - range.s.r + 1;
      const totalCols = range.e.c - range.s.c + 1;
      
      setFileStats({ totalRows, totalCols });
      
      let headers = [];
      let data = [];
      
      // First, create default headers (in case header extraction fails)
      headers = Array(totalCols).fill().map((_, idx) => `Column ${idx + 1}`);
      
      // Now try to extract actual headers from first row
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v !== undefined) {
          // Make sure header is a string
          headers[c - range.s.c] = String(cell.v);
        }
      }
      
      // Extract data rows (starting from the second row)
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        let rowData = Array(totalCols).fill('');
        let hasData = false;
        
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined) {
            // Convert cell to appropriate string representation
            if (typeof cell.v === 'object') {
              try {
                rowData[c - range.s.c] = JSON.stringify(cell.v);
              } catch {
                rowData[c - range.s.c] = String(cell.v);
              }
            } else {
              rowData[c - range.s.c] = cell.v;
            }
            hasData = true;
          }
        }
        
        // Only add rows that have at least one non-empty cell
        if (hasData) {
          data.push(rowData);
        }
        
        // Stop if we've processed enough rows for initial display
        if (data.length >= MAX_VISIBLE_ROWS * 10) {
          break;
        }
      }
      
      return { headers, data };
    } catch (err) {
      console.error("Error processing worksheet:", err);
      return { headers: ['Error'], data: [] };
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setFileLoading(true);
    setError(null);

    try {
        const response = await classService.uploadExcel(file, id);
        
        const { id: fileId, sheet_data, file_name } = response.data;
        
        // Add new file to excelFiles list
        setExcelFiles(prev => [{
            id: fileId,
            file_name,
            sheet_data,
            uploaded_at: new Date().toISOString()
        }, ...prev]);
        
        const headers = Object.keys(sheet_data[0] || {});
        const data = sheet_data.map(row => 
            headers.map(header => row[header])
        );
        
        setSelectedFile({ name: file_name });
        setExcelData({
            headers,
            data,
            fileId
        });
    } catch (error) {
        console.error("File upload error:", error);
        setError(error.response?.data?.error || 'Failed to upload file');
    } finally {
        setFileLoading(false);
    }
};

const handleFileSwitch = (file) => {
  const headers = Object.keys(file.sheet_data[0] || {});
  const data = file.sheet_data.map(row => 
      headers.map(header => row[header])
  );
  
  setSelectedFile({ name: file.file_name });
  setExcelData({
      headers,
      data,
      fileId: file.id
  });
};

  const handleChangeSheet = (sheetIndex) => {
    if (!selectedFile || sheetIndex === activeSheet || sheetIndex >= sheets.length) {
      return;
    }
    
    setFileLoading(true);
    setActiveSheet(sheetIndex);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (!event.target || !event.target.result) {
            throw new Error("Failed to read file");
          }
          
          // Parse the Excel file
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            raw: true,
            cellDates: true,
            cellNF: false,
            cellStyles: false
          });
          
          // Get the selected sheet
          const selectedSheetName = sheets[sheetIndex];
          const selectedSheet = workbook.Sheets[selectedSheetName];
          
          if (!selectedSheet) {
            throw new Error(`Sheet "${selectedSheetName}" not found`);
          }
          
          // Process the sheet data
          const parsedData = safeProcessWorksheet(selectedSheet);
          setExcelData(parsedData);
          setFileLoading(false);
        } catch (error) {
          console.error("Error processing sheet:", error);
          setError(`Failed to process sheet: ${error.message}`);
          setFileLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError("Error reading file");
        setFileLoading(false);
      };
      
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("Sheet change error:", error);
      setError(`Failed to change sheet: ${error.message}`);
      setFileLoading(false);
    }
  };

  const handleExport = async () => {
    if (!excelData?.fileId) return;
    
    try {
        setFileLoading(true);
        
        const response = await classService.downloadExcel(excelData.fileId);
        
        const blob = new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedFile.name.split('.')[0]}_exported.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setFileLoading(false);
    } catch (error) {
        console.error("Export error:", error);
        setError(error.response?.data?.error || 'Failed to export file');
        setFileLoading(false);
    }
};

  const handleClearData = () => {
    setExcelData(null);
    setSelectedFile(null);
    setFileStats(null);
    setSheets([]);
    setActiveSheet(0);
    setVisibleRowCount(MAX_VISIBLE_ROWS);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#333D79]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="pb-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
              <MdOutlineClass className="h-6 w-6 text-[#333D79]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{classData.name}</h1>
              <p className="text-sm text-gray-500">
                {excelData 
                  ? `Showing data from: ${selectedFile ? selectedFile.name : 'Imported file'}`
                  : `Last updated: ${classData.lastUpdated}`
                }
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {excelData ? (
                <>
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <FiFileText size={18} />
                            <span>Switch File ({excelFiles.length})</span>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1 max-h-60 overflow-auto">
                                    {excelFiles.map(file => (
                                        <button
                                            key={file.id}
                                            onClick={() => {
                                                handleFileSwitch(file);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                                file.id === excelData.fileId ? 'bg-[#EEF0F8] text-[#333D79]' : 'text-gray-700'
                                            }`}
                                        >
                                            {file.file_name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <label htmlFor="add-file" className="cursor-pointer">
                        <div className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:bg-gray-50">
                            <FiUpload size={18} />
                            <span>Add File</span>
                        </div>
                        <input 
                            id="add-file" 
                            type="file" 
                            accept=".xlsx,.xls,.csv" 
                            className="hidden"
                            onChange={handleFileInput}
                        />
                    </label>
                    <button
                        onClick={handleExport}
                        className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <FiDownload size={18} />
                        <span>Export Data</span>
                    </button>
                </>
            ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                        <FiUpload size={18} />
                        <span>Import Files</span>
                    </div>
                    <input 
                        id="file-upload" 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        className="hidden"
                        onChange={handleFileInput}
                    />
                </label>
            )}
        </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <div>{error}</div>
            <button 
              onClick={() => setError(null)}
              className="text-red-800 hover:text-red-900"
            >
              <FiX size={18} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {excelData ? 'Excel Data' : 'Class Data'}
            </h2>
            {selectedFile && (
              <div className="text-sm text-gray-500 flex items-center">
                <FiFileText className="mr-2 text-[#333D79]" />
                {selectedFile.name}
              </div>
            )}
          </div>

          {fileLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#333D79] mb-4"></div>
              <p className="text-gray-500">Processing your file...</p>
            </div>
          ) : !excelData ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-[#333D79] bg-[#EEF0F8]' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <MdDragIndicator className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No data available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Drag and drop Excel or CSV files here to import
                </p>
                <label htmlFor="file-upload-placeholder" className="cursor-pointer">
                  <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <FiUpload size={18} />
                    <span>Browse Files</span>
                  </div>
                  <input 
                    id="file-upload-placeholder" 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">
                  Supported file types: .xlsx, .xls, .csv
                </p>
              </div>
            </div>
          ) : (
            <div className="excel-data-container">
              {/* Sheet tabs */}
              {sheets.length > 1 && (
                <div className="mb-4 border-b overflow-x-auto">
                  <div className="flex">
                    {sheets.map((sheet, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChangeSheet(idx)}
                        className={`px-4 py-2 flex items-center whitespace-nowrap ${
                          idx === activeSheet
                            ? 'border-b-2 border-[#333D79] text-[#333D79] font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {idx === activeSheet && <HiSwitchHorizontal className="mr-1.5" size={14} />}
                        {sheet}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center text-sm text-gray-500">
                  <FiFilter className="mr-2" />
                  <span>Use filters and context menu for advanced operations</span>
                </div>
                <div className="bg-[#F5F7FB] px-3 py-1.5 rounded-md text-sm text-gray-600 font-medium">
                  {fileStats ? 
                    `${fileStats.totalRows.toLocaleString()} rows × ${fileStats.totalCols.toLocaleString()} columns` :
                    `${excelData.data.length.toLocaleString()} rows × ${excelData.headers.length} columns`
                  }
                  {excelData.data.length > visibleRowCount && 
                    ` (showing ${visibleRowCount.toLocaleString()} rows)`}
                </div>
              </div>
              
              <div className="relative mb-4">
                <div className="overflow-auto border rounded-lg shadow-sm" style={{ maxHeight: '70vh', maxWidth: '100%' }}>
                  <div style={{ minWidth: '100%', width: Math.max(excelData.headers.length * 120, 800) + 'px' }}>
                    <HotTable
                      ref={hotTableRef}
                      data={visibleData || []}
                      colHeaders={excelData.headers}
                      rowHeaders={true}
                      height="auto"
                      width="100%"
                      licenseKey="non-commercial-and-evaluation"
                      className="htCustom"
                      stretchH="none"
                      autoColumnSize={false}
                      colWidths={120}
                      readOnly={false}
                      manualColumnResize={true}
                      manualRowResize={true}
                      filters={true}
                      dropdownMenu={true}
                      contextMenu={true}
                      columnSorting={true}
                      sortIndicator={true}
                      afterChange={handleDataChange}
                      rowHeights={28}
                      fixedRowsTop={0}
                      fixedColumnsLeft={0}
                      wordWrap={true}
                      outsideClickDeselects={false}
                      columnHeaderHeight={40}
                      afterGetColHeader={(col, TH) => {
                        TH.className = 'htCenter htMiddle font-medium text-gray-700';
                      }}
                      settings={{
                        minRows: 10,
                        minCols: excelData.headers.length,
                        minSpareRows: 0,
                        minSpareCols: 0,
                        renderAllRows: false,
                        viewportColumnRenderingOffset: 10,
                        viewportRowRenderingOffset: 10,
                        preventOverflow: 'horizontal'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {excelData.data.length > visibleRowCount && (
                <div className="text-center text-sm text-gray-500 mt-2">
                  <p>Showing {visibleRowCount.toLocaleString()} of {excelData.data.length.toLocaleString()} rows. Scroll down to load more rows.</p>
                </div>
              )}
            </div>
          )}
        </div>


        {isSaving && (
            <div className="fixed bottom-4 right-4 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-lg z-50">
                <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#333D79] border-t-transparent"></div>
                    <span>Saving changes...</span>
                </div>
            </div>
        )}

        {!excelData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Class Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F5F7FB] p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    classData.status === 'Active' ? 'bg-[#DCE3F9] text-[#333D79]' : 
                    classData.status === 'Completed' ? 'bg-[#E0F2ED] text-[#0F766E]' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {classData.status}
                  </span>
                </div>
              </div>
              <div className="bg-[#F5F7FB] p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Recordings</div>
                <div className="text-lg font-medium">{classData.recordings}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClassDetails; 