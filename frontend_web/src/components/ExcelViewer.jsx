import React from 'react';
import { FiMaximize, FiMinimize, FiDownload, FiX, FiUpload, FiFilter } from 'react-icons/fi';
import { MdOutlineClass } from 'react-icons/md';
import { BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import { HiSwitchHorizontal } from 'react-icons/hi';
import { HotTable } from '@handsontable/react';
import { useEffect } from 'react';


const headerStyles = `
  /* Target all header cells to remove borders */
  .htCustom .ht_master .htCore thead tr th {
    border: none !important;
    background-color: #f8fafc;
  }
  
  /* Style for the first row (category row) */
  .htCustom .ht_master .htCore thead tr:first-child th {
    background-color: #f0f4fa;
    border: none !important;
    text-align: center !important;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  
  /* Only add bottom border for the first row header cells */
  .htCustom .ht_master .htCore thead tr:first-child th {
    border-bottom: 1px solid #e2e8f0 !important;
  }
  
  /* Add outer left border only to the first cell of Laboratory section */
  .htCustom .ht_master .htCore thead tr:first-child th.firstCategoryCol {
    border-left: 1px solid #e2e8f0 !important;
  }
  
  /* Add outer right border only to the last cell of Laboratory section */
  .htCustom .ht_master .htCore thead tr:first-child th.lastCategoryCol {
    border-right: 1px solid #e2e8f0 !important;
  }
  
  /* Make the Laboratory text stand out */
  .htCustom .ht_master .htCore thead tr:first-child th span {
    font-weight: 600;
    color: #333D79;
    font-size: 14px;
  }
  
  /* Target dividers between merged cells to remove them */
  .htCustom .ht_master .htCore thead tr:first-child th:not(:first-child):not(:last-child) {
    border-left: none !important;
    border-right: none !important;
  }
  
  /* Enforce no vertical borders in the laboratory header row */
  .htCustom .ht_master .htCore thead tr:first-child th {
    border-left-width: 0 !important;
    border-right-width: 0 !important;
  }
`;

const ExcelViewer = ({
  classData,
  excelData,
  selectedFile,
  fileStats,
  hotTableRef,
  isFullScreen,
  setIsFullScreen,
  teamAccess,
  visibleData,
  handleExport,
  handleDataChange,
  handleFileInput,
  handleSheetChange
}) => {
  // Function to create nested headers structure for categories
const getNestedHeaders = () => {
  if (!excelData || !excelData.headers) return { nestedHeaders: [excelData.headers], mergedCells: [] };
  
  // Find the name/student column indices
  const nameColumnIndices = [];
  excelData.headers.forEach((header, index) => {
    if (header.toLowerCase().includes('name') || 
        header.toLowerCase().includes('student') ||
        header.toLowerCase().includes('no.') ||
        header.toLowerCase().includes('unnamed')) {
      nameColumnIndices.push(index);
    }
  });
  
  // If no student column found or no category, return normal headers
  if (nameColumnIndices.length === 0 || !selectedFile?.category) {
    return { nestedHeaders: [excelData.headers], mergedCells: [] };
  }
  
  // Create the top-level category headers array - all null initially
  const categoryHeader = Array(excelData.headers.length).fill(null);
  
  // Find the first non-student column index
  let firstNonStudentIndex = -1;
  for (let i = 0; i < excelData.headers.length; i++) {
    if (!nameColumnIndices.includes(i)) {
      firstNonStudentIndex = i;
      break;
    }
  }
  
  if (firstNonStudentIndex === -1) {
    return { nestedHeaders: [excelData.headers], mergedCells: [] };
  }
  
  // PUT THE TEXT IN THE MIDDLE of the Laboratory columns
  // Calculate the middle point of the Laboratory columns for better centering
  const labColumnsCount = excelData.headers.length - firstNonStudentIndex;
  const middleColumnIndex = firstNonStudentIndex + Math.floor(labColumnsCount / 2);
  categoryHeader[middleColumnIndex] = selectedFile.category;
  
  // Create merged cells array
  const mergedCells = [
    {
      row: 0,
      col: firstNonStudentIndex,
      rowspan: 1,
      colspan: labColumnsCount
    }
  ];
  
  return {
    nestedHeaders: [categoryHeader, excelData.headers],
    mergedCells: mergedCells,
    firstNonStudentIndex: firstNonStudentIndex,
    lastColumnIndex: excelData.headers.length - 1
  };
};

   useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = headerStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const afterGetColHeader = (col, TH) => {
  const headerLevel = TH.parentElement.rowIndex;
  
  if (headerLevel === 0) {
    // Apply consistent styling to all cells in the first row
    TH.className = 'htCenter htMiddle font-medium';
    TH.style.textAlign = 'center';
    
    // Remove all default borders
    TH.style.borderLeft = 'none';
    TH.style.borderRight = 'none';
    
    // Get configuration for headers
    const nestedConfig = getNestedHeaders();
    
    // Find if this is part of the merged Laboratory cell
    const mergedCell = nestedConfig.mergedCells.find(cell => 
      col >= cell.col && col < cell.col + cell.colspan
    );
    
    if (mergedCell) {
      // First column of Laboratory section
      if (col === mergedCell.col) {
        TH.classList.add('firstCategoryCol');
      }
      
      // Last column of Laboratory section
      if (col === mergedCell.col + mergedCell.colspan - 1) {
        TH.classList.add('lastCategoryCol');
      }
      
      // For all cells in the Laboratory header
      // Make sure all internal borders are completely gone
      if (col > mergedCell.col && col < mergedCell.col + mergedCell.colspan - 1) {
        TH.style.borderLeft = 'none !important';
        TH.style.borderRight = 'none !important';
      }
    }
    
    // Apply additional styling after render to ensure borders are gone
    setTimeout(() => {
      const allFirstRowCells = TH.parentElement.children;
      for (let i = 0; i < allFirstRowCells.length; i++) {
        const cell = allFirstRowCells[i];
        // Remove all vertical borders from the Laboratory header row
        if (cell && i >= nestedConfig.firstNonStudentIndex && 
            i < nestedConfig.firstNonStudentIndex + nestedConfig.mergedCells[0].colspan) {
          cell.style.borderLeft = 'none';
          cell.style.borderRight = 'none';
        }
      }
    }, 0);
    
  } else {
    // Regular header row
    TH.className = 'htCenter htMiddle font-medium text-gray-700';
  }
};


  useEffect(() => {
  if (!excelData || !hotTableRef.current) return;
  
  const fixBorders = () => {
    const tableElement = hotTableRef.current.hotInstance?.rootElement;
    if (!tableElement) return;
    
    const headerRow = tableElement.querySelector('.ht_master .htCore thead tr:first-child');
    if (!headerRow) return;
    
    // Get header config
    const nestedConfig = getNestedHeaders();
    if (!nestedConfig.mergedCells || !nestedConfig.mergedCells.length) return;
    
    // Get first and last cell of Laboratory section
    const startCol = nestedConfig.firstNonStudentIndex;
    const endCol = startCol + nestedConfig.mergedCells[0].colspan - 1;
    
    // Apply clean styling to all cells in Laboratory section
    for (let i = 0; i < headerRow.children.length; i++) {
      const cell = headerRow.children[i];
      if (i >= startCol && i <= endCol) {
        // Remove vertical borders for all Laboratory cells
        cell.style.borderLeft = 'none';
        cell.style.borderRight = 'none';
        
        // Only add outer borders to first and last cells
        if (i === startCol) {
          cell.style.borderLeft = '1px solid #e2e8f0';
        }
        if (i === endCol) {
          cell.style.borderRight = '1px solid #e2e8f0';
        }
      }
    }
  };
  
  // Clean up borders when component mounts and whenever data changes
  setTimeout(fixBorders, 100);
  
  // Clean up borders after any scroll or resize
  const cleanupInterval = setInterval(fixBorders, 500);
  
  return () => {
    clearInterval(cleanupInterval);
  };
}, [excelData, selectedFile]);

  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white excel-fullscreen-container' : ''}`}>
      <div className={`${isFullScreen ? 'h-screen flex flex-col' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFullScreen(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              <FiX size={24} />
            </button>
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
                <MdOutlineClass className="h-6 w-6 text-[#333D79]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{classData.name}</h1>
                {teamAccess && teamAccess.teamId && (
                  <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 mt-1 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-blue-700">
                      Team: {teamAccess.teamName} ({teamAccess.accessLevel === 'view' ? 'View Only' : 
                            teamAccess.accessLevel === 'edit' ? 'Can Edit' : 'Full Access'})
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  {excelData 
                    ? `Showing data from: ${selectedFile ? selectedFile.name : 'Imported file'}`
                    : `Last updated: ${classData.lastUpdated || 'Unknown'}`
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-3">
                <BsFileEarmarkSpreadsheet className="h-5 w-5 text-[#333D79]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedFile?.name || 'Excel Data'}
                </h2>
                <div className="flex flex-col">
                  {/* Show category tag if available */}
                  {selectedFile?.category && (
                    <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 rounded-md text-xs text-blue-700 font-medium mb-1">
                      Category: {selectedFile.category}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    {fileStats ? 
                      `${fileStats.totalRows.toLocaleString()} rows × ${fileStats.totalCols.toLocaleString()} columns` :
                      `${excelData.data.length.toLocaleString()} rows × ${excelData.headers.length} columns`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <FiDownload size={18} />
              <span>Export</span>
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="bg-[#333D79] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A5491] transition-colors"
            >
              {isFullScreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
              <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>
          </div>
        </div>

        {/* Sheet tabs */}
        {excelData && excelData.availableSheets && excelData.availableSheets.length > 1 && (
          <div className="border-b bg-white">
            <div className="flex overflow-x-auto">
              {excelData.availableSheets.map((sheetName, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSheetChange(sheetName)}
                  className={`px-4 py-2 flex items-center whitespace-nowrap ${
                    sheetName === excelData.activeSheet
                      ? 'border-b-2 border-[#333D79] text-[#333D79] font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {sheetName === excelData.activeSheet && <HiSwitchHorizontal className="mr-1.5" size={14} />}
                  {sheetName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Excel Content */}
        <div className={`flex-1 overflow-hidden ${isFullScreen ? 'h-full' : ''}`}>
          <div className="h-full flex flex-col">
            
            <div className="flex-1 overflow-hidden excel-wrapper">
              <HotTable
                ref={hotTableRef}
                data={visibleData || []}
                colHeaders={excelData.headers}
                nestedHeaders={getNestedHeaders().nestedHeaders}
                mergeCells={getNestedHeaders().mergedCells}
                rowHeaders={true}
                height="auto"
                width="100%"
                licenseKey="non-commercial-and-evaluation"
                className="htCustom"
                stretchH="none"
                autoColumnSize={false}
                colWidths={100}
                readOnly={teamAccess && teamAccess.accessLevel === 'view'}
                manualColumnResize={!teamAccess || teamAccess.accessLevel !== 'view'}
                manualRowResize={!teamAccess || teamAccess.accessLevel !== 'view'}
                filters={true}
                dropdownMenu={!teamAccess || teamAccess.accessLevel !== 'view'}
                contextMenu={!teamAccess || teamAccess.accessLevel !== 'view'}
                columnSorting={true}
                sortIndicator={true}
                afterChange={teamAccess && teamAccess.accessLevel === 'view' ? undefined : handleDataChange}
                rowHeights={28}
                fixedRowsTop={selectedFile?.category ? 2 : 1}
                fixedColumnsLeft={1}
                wordWrap={true}
                outsideClickDeselects={false}
                columnHeaderHeight={40}
                afterGetColHeader={afterGetColHeader}
                settings={{
                  minRows: 10,
                  minCols: excelData.headers.length,
                  minSpareRows: 0,
                  minSpareCols: 0,
                  renderAllRows: false,
                  viewportColumnRenderingOffset: 15,
                  viewportRowRenderingOffset: 15,
                  preventOverflow: false,
                  fixedRowsTop: selectedFile?.category ? 2 : 1,
                  fixedColumnsLeft: 1
                }}
                tableClassName="excel-table-container"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelViewer;