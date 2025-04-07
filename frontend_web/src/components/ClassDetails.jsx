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

// Register all Handsontable modules
registerAllModules();

// Configuration for large files
const MAX_VISIBLE_ROWS = 100; // Maximum rows to show initially
const LAZY_LOAD_THRESHOLD = 50; // Load more rows when user scrolls to this many rows from the bottom

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
  
  // Memoize visible data for large datasets with lazy loading support
  const visibleData = useMemo(() => {
    if (!excelData) return null;
    
    // If dataset is small enough, show everything
    if (excelData.data.length <= visibleRowCount) {
      return excelData.data;
    }
    
    // Otherwise, show the first visibleRowCount rows
    return excelData.data.slice(0, visibleRowCount);
  }, [excelData, visibleRowCount]);

  // Simulate fetching class data
  useEffect(() => {
    // Mock API call
    const fetchClassData = async () => {
      try {
        // In a real app, this would be an API call
        // For demo purposes, we'll just use timeout to simulate network request
        setTimeout(() => {
          const mockClasses = [
            { id: "1", name: "Customer Service AI", recordings: 32, lastUpdated: "2 hours ago", status: "Active" },
            { id: "2", name: "Meeting Transcripts", recordings: 56, lastUpdated: "Yesterday", status: "Active" },
            { id: "3", name: "Product Demo Voiceovers", recordings: 12, lastUpdated: "3 days ago", status: "Completed" },
            { id: "4", name: "Training Presentations", recordings: 28, lastUpdated: "1 week ago", status: "Archived" },
          ];

          const classData = mockClasses.find(c => c.id === id);
          if (classData) {
            setClassData(classData);
          } else {
            // Handle case where class is not found
            navigate('/dashboard', { replace: true });
          }
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching class data:', error);
        setLoading(false);
      }
    };

    fetchClassData();
  }, [id, navigate]);

  // Setup scroll listener for lazy loading
  useEffect(() => {
    if (!excelData || excelData.data.length <= MAX_VISIBLE_ROWS) return;
    
    const handleScroll = (e) => {
      const container = e.target;
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
      // If we're near the bottom, load more rows
      if (scrollHeight - scrollPosition < LAZY_LOAD_THRESHOLD * 28) { // 28px is our row height
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
  
  // Reset visible row count when changing sheets
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
    
    // Handle dropped files
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

  // Safely extract data from a worksheet
  const safeProcessWorksheet = (worksheet) => {
    // If no worksheet or no reference, return empty data
    if (!worksheet || !worksheet['!ref']) {
      return { headers: ['No data'], data: [] };
    }
    
    try {
      // Get the range
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const totalRows = range.e.r - range.s.r + 1;
      const totalCols = range.e.c - range.s.c + 1;
      
      // Store file statistics
      setFileStats({ totalRows, totalCols });
      
      // Prepare headers and data arrays
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
    setSelectedFile(file);
    setExcelData(null);
    setSheets([]);
    setActiveSheet(0);

    try {
      // Create a FileReader to read the file data
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (!event.target || !event.target.result) {
            throw new Error("Failed to read file");
          }
          
          // Parse the Excel file using a safe approach with minimal options
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            raw: true,
            cellDates: true,
            cellNF: false,
            cellStyles: false
          });
          
          // Get sheet names and validate
          const sheetNames = workbook.SheetNames || [];
          if (!sheetNames.length) {
            throw new Error("No sheets found in Excel file");
          }
          
          setSheets(sheetNames);
          
          // Process the first sheet
          const firstSheet = workbook.Sheets[sheetNames[0]];
          const parsedData = safeProcessWorksheet(firstSheet);
          
          if (!parsedData.data.length) {
            throw new Error("No data found in Excel sheet");
          }
          
          setExcelData(parsedData);
          setFileLoading(false);
        } catch (error) {
          console.error("Excel processing error:", error);
          setError(`Failed to process Excel file: ${error.message}`);
          setFileLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError("Error reading file");
        setFileLoading(false);
      };
      
      // Read the file as an array buffer
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("File upload error:", error);
      setError(`File upload error: ${error.message}`);
      setFileLoading(false);
    }
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

  const handleExport = () => {
    if (!excelData || !excelData.data.length || !selectedFile) {
      return;
    }
    
    try {
      setFileLoading(true);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Get current data from the HotTable instance if available
      let dataToExport = excelData.data;
      if (hotTableRef.current && hotTableRef.current.hotInstance) {
        const hotData = hotTableRef.current.hotInstance.getData();
        if (Array.isArray(hotData) && hotData.length) {
          dataToExport = hotData;
        }
      }
      
      // Convert data to worksheet format
      const ws = XLSX.utils.aoa_to_sheet([excelData.headers, ...dataToExport]);
      
      // Add worksheet to workbook
      const sheetName = sheets[activeSheet] || "Data";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate file name
      const fileName = `${selectedFile.name.split('.')[0]}_${sheetName}.xlsx`;
      
      // Write file and trigger download
      XLSX.writeFile(wb, fileName);
      
      setFileLoading(false);
    } catch (error) {
      console.error("Export error:", error);
      setError(`Failed to export data: ${error.message}`);
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
                <button
                  onClick={handleClearData}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <FiX size={18} />
                  <span>Clear</span>
                </button>
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