import React, { useState, useRef, useEffect } from 'react';
import { Download, Maximize2, Minimize2, FileSpreadsheet, Users, X, Save } from 'lucide-react';

const ExcelGradeViewer = ({ fileData, classData, isFullScreen, setIsFullScreen, onExport, onSave }) => {
   const [isHandsontableLoaded, setIsHandsontableLoaded] = useState(false);
  const hotTableRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const [categoryMapping, setCategoryMapping] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  // Process file data to extract information
  useEffect(() => {
    if (fileData && fileData.all_sheets) {
      // Set default category mappings based on column names
      const mappings = generateCategoryMappings(fileData);
      setCategoryMapping(mappings);
      setHasChanges(false); // Reset changes when new data is loaded
    } else {
      // Create default mappings for empty data
      setCategoryMapping({
        student: [0],
        laboratory: [],
        quiz: [],
        exams: [],
        other: []
      });
    }
  }, [fileData]);

  // Function to intelligently map columns to categories
  const generateCategoryMappings = (fileData) => {
  console.log("Looking for category mappings in fileData:", fileData);
  
  const activeSheet = fileData.active_sheet;
  const sheetData = fileData.all_sheets[activeSheet];
  
  if (!fileData || !fileData.all_sheets) {
    return {
      student: [0],
      laboratory: [],
      quiz: [],
      exams: [],
      other: []
    };
  }
  
  if (!sheetData || !sheetData.headers) {
    return null;
  }

  const categories = {
    student: [],
    quiz: [],
    laboratory: [],
    exams: [],
    other: []
  };

  const customCategories = {};
  
  const headers = sheetData.headers;
  
  // Check for direct column_categories mapping object (from frontend)
  if (fileData.column_categories) {
    console.log("Using column_categories from fileData:", fileData.column_categories);
    
    // First pass: Find all unique categories to identify custom ones
    const uniqueCategories = new Set();
    
    for (const header in fileData.column_categories) {
      const category = fileData.column_categories[header];
      if (category && !categories.hasOwnProperty(category) && category !== 'student') {
        uniqueCategories.add(category);
      }
    }
    
    // Create custom categories
    uniqueCategories.forEach(categoryId => {
      console.log(`Found custom category: ${categoryId}`);
      
      // Try to find category name from category_mappings if available
      let categoryName = categoryId.replace(/_/g, ' ');
      
      if (fileData.all_sheets.category_mappings) {
        const categoryInfo = fileData.all_sheets.category_mappings.find(c => c.id === categoryId);
        if (categoryInfo && categoryInfo.name) {
          categoryName = categoryInfo.name;
        }
      }
      
      customCategories[categoryId] = {
        name: categoryName,
        columns: []
      };
    });
    
    // Second pass: Map columns to categories
    headers.forEach((header, index) => {
      const category = fileData.column_categories[header];
      
      if (category) {
        // Standard categories
        if (categories.hasOwnProperty(category)) {
          console.log(`Mapping column ${header} to standard category ${category}`);
          categories[category].push(index);
        } 
        // Custom categories
        else if (customCategories.hasOwnProperty(category)) {
          console.log(`Mapping column ${header} to custom category ${category}`);
          customCategories[category].columns.push(index);
        }
        // Fallback
        else {
          console.log(`Unknown category ${category}, mapping ${header} to other`);
          categories.other.push(index);
        }
      } 
      // Handle student columns
      else if (
        header.toString().toLowerCase().includes('name') || 
        header.toString().toLowerCase().includes('student') ||
        header.toString().toLowerCase().includes('no.')
      ) {
        categories.student.push(index);
      } 
      // Default to other category
      else {
        categories.other.push(index);
      }
    });
    
    // Create the result with both standard and custom categories
    const result = { ...categories };
    Object.keys(customCategories).forEach(catId => {
      result[catId] = customCategories[catId].columns;
    });
    
    result._categoryNames = {};
    Object.keys(customCategories).forEach(catId => {
      result._categoryNames[catId] = customCategories[catId].name;
    });
    
    console.log("Final category mappings with custom categories:", result);
    return result;
  }
  
  // If no mappings found, fall back to auto-categorization
  console.log("No custom mappings found, generating automatic categories");
  
  headers.forEach((header, index) => {
    if (!header) {
      categories.student.push(index);
      return;
    }
    
    const headerLower = header.toString().toLowerCase();
    
    // Student-related columns
    if (
      headerLower.includes('name') || 
      headerLower.includes('student') ||
      headerLower.includes('no.') ||
      headerLower === 'unnamed'
    ) {
      categories.student.push(index);
    }
    // HTML-related activities - more careful handling
    else if (headerLower.includes('html')) {
      if (headerLower.includes('basic')) {
        // Explicitly put HTML Basics in Quizzes
        categories.quiz.push(index);
      } else if (headerLower.includes('advanc')) {
        // Put HTML Advanced in Laboratory
        categories.laboratory.push(index);
      } else {
        // Other HTML activities
        categories.laboratory.push(index);
      }
    }
    // Quiz related columns
    else if (headerLower.includes('quiz')) {
      categories.quiz.push(index);
    }
    // Exam related columns
    else if (
      headerLower.includes('exam') || 
      headerLower === 'pe' || 
      headerLower === 'me' || 
      headerLower === 'fe' ||
      headerLower === 'pfe'
    ) {
      categories.exams.push(index);
    }
    // Default category
    else {
      categories.other.push(index);
    }
  });

  return categories;
};

  // Generate nested headers based on categories
  const generateNestedHeaders = () => {
  if (!fileData || !fileData.all_sheets || !categoryMapping) {
    return [[], []];
  }

  const activeSheet = fileData.active_sheet;
  const sheetData = fileData.all_sheets[activeSheet];
  const headers = sheetData.headers || [];
  
  const topRow = [];
  const bottomRow = [];
  
  // Create a mapping from column index to actual header name
  const indexToHeader = {};
  headers.forEach((header, idx) => {
    indexToHeader[idx] = header;
  });
  
  // Add student info columns first (no category header)
  categoryMapping.student.forEach(idx => {
    topRow.push({ label: '', colspan: 1 });
    bottomRow.push(headers[idx] || '');
  });
  
  // Add standard categories with header verification
  const standardCategories = [
    { id: 'laboratory', label: 'LABORATORY WORKS' },
    { id: 'quiz', label: 'QUIZ' },
    { id: 'exams', label: 'MAJOR EXAMS' },
    { id: 'other', label: 'OTHER ACTIVITIES' }
  ];
  
  standardCategories.forEach(category => {
    if (categoryMapping[category.id] && categoryMapping[category.id].length > 0) {
      // Map indices to actual header names to ensure correct order
      const categoryHeaders = categoryMapping[category.id]
        .map(idx => ({
          index: idx,
          header: headers[idx] || ''
        }))
        .filter(item => item.header); // Filter out any empty headers
      
      if (categoryHeaders.length > 0) {
        topRow.push({ 
          label: category.label, 
          colspan: categoryHeaders.length 
        });
        
        categoryHeaders.forEach(item => {
          bottomRow.push(item.header);
        });
      }
    }
  });
  
  // Add custom categories with similar header verification
  const customCategoryIds = Object.keys(categoryMapping).filter(key => 
    !['student', 'laboratory', 'quiz', 'exams', 'other', '_categoryNames'].includes(key)
  );
  
  customCategoryIds.forEach(categoryId => {
    if (categoryMapping[categoryId] && categoryMapping[categoryId].length > 0) {
      // Map indices to actual header names to ensure correct order
      const categoryHeaders = categoryMapping[categoryId]
        .map(idx => ({
          index: idx,
          header: headers[idx] || ''
        }))
        .filter(item => item.header);
        
      if (categoryHeaders.length > 0) {
        // Get custom category name
        const categoryName = categoryMapping._categoryNames && categoryMapping._categoryNames[categoryId]
          ? categoryMapping._categoryNames[categoryId].toUpperCase()
          : categoryId.replace(/_/g, ' ').toUpperCase();
        
        topRow.push({ 
          label: categoryName, 
          colspan: categoryHeaders.length 
        });
        
        categoryHeaders.forEach(item => {
          bottomRow.push(item.header);
        });
      }
    }
  });
  
  return [topRow, bottomRow];
};


  // Process data for Handsontable
  const processData = () => {
  if (!fileData || !fileData.all_sheets) {
    return [];
  }

  const activeSheet = fileData.active_sheet;
  const sheetData = fileData.all_sheets[activeSheet];
  
  if (!sheetData || !sheetData.data) {
    return [];
  }

  const headers = sheetData.headers || [];
  
  // Handle array data differently from object data
  if (Array.isArray(sheetData.data[0])) {
    // Data is already in array format
    return sheetData.data;
  } else {
    // Convert object to array in the order of headers
    return sheetData.data.map(row => {
      // Explicitly map each header to ensure consistent ordering
      return headers.map(header => {
        // Ensure null values remain null
        return row[header] === undefined || row[header] === "" ? null : row[header];
      });
    });
  }
};

  const handleSave = async () => {
  if (!hasChanges || !hotInstanceRef.current || !fileData) return;
  
  setIsSaving(true);
  
  try {
    // Get the current data from Handsontable
    const currentData = hotInstanceRef.current.getData();
    const headers = fileData.all_sheets[fileData.active_sheet].headers;
    
    // Convert the 2D array back to the format expected by the server
    const updatedData = currentData.map(row => {
      const recordObj = {};
      headers.forEach((header, index) => {
        recordObj[header] = row[index];
      });
      return recordObj;
    });
    
    // Create a copy of the file data with updated values
    const updatedFileData = {
      ...fileData,
      all_sheets: {
        ...fileData.all_sheets,
        [fileData.active_sheet]: {
          ...fileData.all_sheets[fileData.active_sheet],
          data: updatedData
        }
      }
    };
    
    // Call the onSave callback with the updated data
    if (onSave) {
      await onSave(updatedFileData);
      setHasChanges(false);
      
      // Show a success message
      console.log('Changes saved successfully!');
    }
  } catch (error) {
    console.error('Error saving changes:', error);
    // Show error message
  } finally {
    setIsSaving(false);
  }
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

  // Initialize Handsontable when data is ready
  useEffect(() => {
    if (isHandsontableLoaded && hotTableRef.current && window.Handsontable && fileData && categoryMapping) {
      // Clean up existing instance
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
      }

      // Add custom styles
      addCustomStyles();

      // Get data and headers
      const tableData = processData();
      const nestedHeaders = generateNestedHeaders();
      
      // Determine fixed columns (student columns)
      const fixedColumns = categoryMapping.student.length || 1;
      
      // Calculate column widths - make name columns wider, grade columns narrower
      const colWidths = Array.isArray(fileData.all_sheets[fileData.active_sheet].headers) 
        ? fileData.all_sheets[fileData.active_sheet].headers.map((_, idx) => {
            // Name columns are wider
            if (categoryMapping.student.includes(idx)) {
              return 180;
            }
            // Regular grade columns
            return 90;
          })
        : [];

      // Initialize Handsontable with simplified settings
      const settings = {
        data: tableData,
        colHeaders: true,
        rowHeaders: false,
        width: '100%',
        height: '100%',
        licenseKey: 'non-commercial-and-evaluation',
        stretchH: 'none',
        autoColumnSize: false,
        manualColumnResize: true,
        manualRowResize: false,
        contextMenu: true,
        filters: true,
        fixedColumnsLeft: fixedColumns,
        colWidths: colWidths.length ? colWidths : [180, 90, 90, 90, 90, 90],
        rowHeights: 30,
        nestedHeaders: nestedHeaders,
        cells: function(row, col) {
          const cellProperties = {};

          if (categoryMapping.student.includes(col)) {
            cellProperties.className = 'name-cell';
          } else {
            cellProperties.className = 'grade-cell';
          }

          return cellProperties;
        },
        // Add event listeners for cell changes
        afterChange: function(changes, source) {
          if (source !== 'loadData') {
            // Changes were made by user, not during initial load
            setHasChanges(true);
          }
        }
      };

      try {
        hotInstanceRef.current = new window.Handsontable(hotTableRef.current, settings);

        // Simple render - don't manipulate DOM elements manually
        setTimeout(() => {
          if (hotInstanceRef.current) {
            hotInstanceRef.current.render();
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing Handsontable:', error);
      }
    }

   return () => {
      if (hotInstanceRef.current) {
        try {
          if (hotInstanceRef.current.isDestroyed !== true) {
            hotInstanceRef.current.destroy();
          }
          hotInstanceRef.current = null;
        } catch (error) {
          console.error('Error destroying Handsontable:', error);
        }
      }
    };
  }, [isHandsontableLoaded, fileData, categoryMapping]);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.render();
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Simplified custom styles
  const addCustomStyles = () => {
    if (!document.querySelector('#custom-excel-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-excel-styles';
      style.textContent = `
        /* Main Container */
        .excel-table-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* Cell Styles */
        .name-cell {
          background-color: #f8f9fa !important;
          font-weight: 600 !important;
          color: #333D79 !important;
          text-align: left !important;
          padding-left: 12px !important;
          border-right: 2px solid #333D79 !important;
        }

        .grade-cell {
          text-align: center !important;
          color: #495057 !important;
        }

        /* Header Styling */
        .handsontable thead th {
          background-color: #333D79 !important;
          color: white !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #2a3168 !important;
        }

        /* Nested header styling */
        .handsontable thead tr:first-child th {
          background-color: #1a1f3a !important;
          font-size: 13px !important;
        }

        .handsontable thead tr:nth-child(2) th {
          background-color: #333D79 !important;
          font-size: 12px !important;
        }

        /* Empty cells */
        .handsontable td:empty:not(.name-cell):after {
          content: "—";
          color: #adb5bd;
          font-size: 11px;
        }
        
        /* Scrollbar styling */
        .wtHolder::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .wtHolder::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .wtHolder::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 2px;
        }

        .wtHolder::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Extract student count and other stats
  const getStats = () => {
    if (!fileData || !fileData.all_sheets) {
      return { rows: 0, cols: 0, students: 0 };
    }
    
    const activeSheet = fileData.active_sheet;
    const sheetData = fileData.all_sheets[activeSheet];
    
    return {
      rows: sheetData?.data?.length || 0,
      cols: sheetData?.headers?.length || 0,
      students: sheetData?.data?.length || 0
    };
  };

  const stats = getStats();

   return (
    <div className="w-full h-full flex flex-col">
      {/* Header - Only show in fullscreen mode */}
      {isFullScreen && (
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFullScreen(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-[#333D79]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{classData?.name || 'Class Data'}</h1>
                <p className="text-sm text-gray-500">{fileData?.file_name || 'Spreadsheet'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-lg border border-green-200">
              <Users size={14} className="text-green-600" />
              <span className="text-sm text-green-700">{stats.students} Students</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-3 py-2 ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg flex items-center space-x-2 transition-colors`}
              >
                <Save size={16} />
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
            
            <button
              onClick={onExport}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-colors"
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="px-3 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#2a3168] flex items-center space-x-2 transition-colors"
            >
              <Minimize2 size={16} />
              <span className="text-sm">Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Simplified Excel Container */}
      <div 
        className="excel-table-container flex-1"
        style={{
          height: isFullScreen ? 'calc(100vh - 128px)' : '500px'
        }}
      >
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
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Rows: {stats.rows}</span>
          <span>Columns: {stats.cols}</span>
          <span>Students: {stats.students}</span>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-gray-500 mr-3">
            Double-click cells to edit • Right-click for options
          </span>
          
          {/* Save Button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-3 py-1 ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md text-xs flex items-center transition-colors`}
            >
              <Save size={12} className="mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelGradeViewer;