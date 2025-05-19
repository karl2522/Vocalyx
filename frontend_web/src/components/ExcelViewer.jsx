import React from 'react';
import { FiMaximize, FiMinimize, FiDownload, FiX, FiUpload, FiFilter } from 'react-icons/fi';
import { MdOutlineClass } from 'react-icons/md';
import { BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import { HiSwitchHorizontal } from 'react-icons/hi';
import { HotTable } from '@handsontable/react';

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
                <p className="text-sm text-gray-500">
                  {fileStats ? 
                    `${fileStats.totalRows.toLocaleString()} rows × ${fileStats.totalCols.toLocaleString()} columns` :
                    `${excelData.data.length.toLocaleString()} rows × ${excelData.headers.length} columns`
                  }
                </p>
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
                fixedRowsTop={1}
                fixedColumnsLeft={1}
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
                  viewportColumnRenderingOffset: 15,
                  viewportRowRenderingOffset: 15,
                  preventOverflow: false,
                  fixedRowsTop: 1,
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