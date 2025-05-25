import React, { useState, useRef, useEffect } from 'react';
import { Download, Maximize2, Minimize2, FileSpreadsheet, Users, X } from 'lucide-react';

const ExcelGradeViewer = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isHandsontableLoaded, setIsHandsontableLoaded] = useState(false);
  const hotTableRef = useRef(null);
  const hotInstanceRef = useRef(null);

  // Sample data matching the Excel format
  const sampleData = [
    ['Jared Karl Omen', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Maria Santos', '85', '92', '78', '88', '90', '95', '87', '91', '89', '93', '88', '85', '90', '92'],
    ['John Doe', '78', '85', '82', '79', '84', '88', '86', '83', '87', '85', '82', '78', '85', '88'],
    ['Jane Smith', '92', '88', '94', '91', '89', '93', '95', '92', '90', '94', '91', '88', '92', '95'],
    ['Robert Johnson', '75', '79', '81', '77', '83', '85', '82', '84', '80', '86', '79', '75', '81', '84'],
    ['Lisa Wong', '95', '97', '93', '96', '94', '98', '96', '95', '97', '99', '95', '93', '96', '98'],
    ['Michael Brown', '82', '86', '84', '80', '87', '89', '85', '88', '86', '90', '84', '82', '87', '89']
  ];

  const classData = {
    name: 'Advanced Mathematics',
    instructor: 'Prof. Anderson',
    semester: 'Fall 2024'
  };

  const handleExport = () => {
    alert('Export functionality would be implemented here');
  };

  // Load Handsontable
  useEffect(() => {
    let mounted = true;

    const loadHandsontable = async () => {
      try {
        // Load CSS first
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/handsontable@13.1.0/dist/handsontable.full.min.css';

        if (!document.querySelector('link[href*="handsontable"]')) {
          document.head.appendChild(cssLink);
        }

        // Load JS
        if (!window.Handsontable) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/handsontable@13.1.0/dist/handsontable.full.min.js';

          script.onload = () => {
            if (mounted) {
              setIsHandsontableLoaded(true);
            }
          };

          script.onerror = () => {
            console.error('Failed to load Handsontable');
          };

          document.head.appendChild(script);
        } else {
          if (mounted) {
            setIsHandsontableLoaded(true);
          }
        }
      } catch (error) {
        console.error('Error loading Handsontable:', error);
      }
    };

    loadHandsontable();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Handsontable when loaded
  useEffect(() => {
    if (isHandsontableLoaded && hotTableRef.current && window.Handsontable) {
      // Clean up existing instance
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
      }

      // Add custom styles
      addCustomStyles();

      // Initialize Handsontable
      const settings = {
        data: sampleData,
        colHeaders: true,
        rowHeaders: false,
        width: '100%',
        height: '100%',
        licenseKey: 'non-commercial-and-evaluation',
        stretchH: 'none', // Important: keeps horizontal scrollbar
        autoColumnSize: false, // Prevent auto-resizing
        manualColumnResize: true,
        manualRowResize: false,
        contextMenu: true,
        filters: true,
        dropdownMenu: false,
        columnSorting: true,
        fixedColumnsLeft: 1,
        // Set column widths to force horizontal scrolling
        colWidths: [180, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90],
        rowHeights: 30,
        viewportColumnRenderingOffset: 15, // Render all columns
        nestedHeaders: [
          [
            { label: '', colspan: 1 },
            { label: 'QUIZ', colspan: 5 },
            { label: 'LABORATORY WORKS', colspan: 5 },
            { label: 'MAJOR EXAMS', colspan: 4 }
          ],
          [
            'Name',
            'Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4', 'Quiz 5',
            'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5',
            'PE', 'ME', 'PFE', 'FE'
          ]
        ],
        cells: function(row, col) {
          const cellProperties = {};

          if (col === 0) {
            cellProperties.className = 'name-cell';
          } else {
            cellProperties.className = 'grade-cell';
          }

          return cellProperties;
        },
        afterGetColHeader: function(col, TH) {
          // No need for manual header styling as we'll do it with CSS
        }
      };

      try {
        hotInstanceRef.current = new window.Handsontable(hotTableRef.current, settings);

        // Force render to ensure proper scrollbar calculation
        setTimeout(() => {
          if (hotInstanceRef.current) {
            hotInstanceRef.current.render();
            // Force the container to recognize overflow
            const holder = hotTableRef.current.querySelector('.ht_master .wtHolder');
            if (holder) {
              holder.style.overflow = 'auto';
            }
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing Handsontable:', error);
      }
    }

    return () => {
      if (hotInstanceRef.current) {
        try {
          hotInstanceRef.current.destroy();
        } catch (error) {
          console.error('Error destroying Handsontable:', error);
        }
      }
    };
  }, [isHandsontableLoaded]);

  const addCustomStyles = () => {
    if (!document.querySelector('#custom-excel-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-excel-styles';
      style.textContent = `
        /* Excel Table Container */
        .excel-table-container {
          position: relative;
          width: 100%;
          height: 100%;
          padding: 0;
          overflow: hidden;
        }

        .handsontable-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
        }

        /* Ensure Handsontable container fills space */
        .excel-table-container .handsontable {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          border: 1px solid #dee2e6 !important;
          width: auto !important; /* Prevent width from growing */
        }
        
        /* Force horizontal scroll on the main viewport */
        .excel-table-container .ht_master .wtHolder {
          overflow: auto !important;
          width: 100% !important;
        }
        
        .excel-table-container .ht_master {
          overflow: visible !important;
        }

        /* Cell Styles */
        .excel-table-container .name-cell {
          background-color: #f8f9fa !important;
          font-weight: 600 !important;
          color: #333D79 !important;
          text-align: left !important;
          padding-left: 12px !important;
          border-right: 2px solid #333D79 !important;
        }

        .excel-table-container .grade-cell {
          text-align: center !important;
          color: #495057 !important;
        }

        /* Header Styling */
        .excel-table-container .handsontable thead th {
          background-color: #333D79 !important;
          color: white !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #2a3168 !important;
        }

        /* Nested header first row */
        .excel-table-container .handsontable thead tr:first-child th {
          background-color: #1a1f3a !important;
          font-size: 13px !important;
        }

        /* Nested header second row */
        .excel-table-container .handsontable thead tr:nth-child(2) th {
          background-color: #333D79 !important;
          font-size: 12px !important;
        }

        .excel-table-container .handsontable td {
          border: 1px solid #dee2e6 !important;
          font-size: 13px !important;
        }

        /* Empty cells */
        .excel-table-container .handsontable td:empty:not(.name-cell):after {
          content: "—";
          color: #adb5bd;
          font-size: 11px;
        }

        /* Remove default margins */
        .excel-table-container .handsontable {
          margin: 0 !important;
        }

        /* Scrollbar styling */
        .excel-table-container .ht_master .wtHolder::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }

        .excel-table-container .ht_master .wtHolder::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .excel-table-container .ht_master .wtHolder::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 2px;
        }

        .excel-table-container .ht_master .wtHolder::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .excel-table-container .ht_master .wtHolder::-webkit-scrollbar-corner {
          background: #f1f1f1;
        }
      `;
      document.head.appendChild(style);
    }
  };

  return (
      <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white' : 'w-full'}`}>
        <div className={`${isFullScreen ? 'h-screen flex flex-col' : 'border border-gray-200 rounded-lg overflow-hidden'}`}>

          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {isFullScreen && (
                  <button
                      onClick={() => setIsFullScreen(false)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X size={20} />
                  </button>
              )}

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#333D79]" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{classData.name}</h1>
                  <p className="text-sm text-gray-500">{classData.instructor} • {classData.semester}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                <Users size={14} className="text-green-600" />
                <span className="text-sm text-green-700">7 Students</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                  onClick={handleExport}
                  className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-colors"
              >
                <Download size={16} />
                <span className="text-sm">Export</span>
              </button>

              <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="px-3 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#2a3168] flex items-center space-x-2 transition-colors"
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span className="text-sm">{isFullScreen ? 'Exit' : 'Full Screen'}</span>
              </button>
            </div>
          </div>

          {/* Handsontable Container - Fixed height calculation */}
          <div className={`excel-table-container ${isFullScreen ? 'flex-1' : ''}`}
               style={{
                 height: isFullScreen ? 'calc(100vh - 128px)' : '400px',
                 width: '100%',
                 position: 'relative',
                 overflow: 'hidden'
               }}>
            {!isHandsontableLoaded ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#333D79] mb-2"></div>
                    <div>Loading Excel Viewer...</div>
                  </div>
                </div>
            ) : (
                <div
                    ref={hotTableRef}
                    className="handsontable-wrapper"
                    style={{
                      width: '100%',
                      height: '100%',
                      maxWidth: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0
                    }}
                />
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Rows: {sampleData.length}</span>
              <span>Columns: 15</span>
              <span>Students: 7</span>
            </div>
            <div className="text-xs text-gray-500">
              Double-click cells to edit • Right-click for options
            </div>
          </div>
        </div>
      </div>
  );
};

export default ExcelGradeViewer;