import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Download, 
  Maximize2, 
  Minimize2, 
  FileSpreadsheet, 
  Users, 
  X, 
  Save, 
  RotateCcw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Clock
} from 'lucide-react';
import { formatRelativeTime, getFullDateTime } from '../utils/dateUtils';

const ExcelGradeViewer = ({ fileData, classData, isFullScreen, setIsFullScreen, onExport, onSave }) => {
  const [isHandsontableLoaded, setIsHandsontableLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const hotTableRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const [categoryMapping, setCategoryMapping] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [undoStack, setUndoStack] = useState([]);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // ... (keeping all the existing useEffect hooks and functions exactly the same)
  // Enhanced loading with progress
  useEffect(() => {
    let mounted = true;
    let progressInterval;

    const loadHandsontable = async () => {
      try {
        setLoadingProgress(10);
        
        // Load CSS first
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/handsontable@13.1.0/dist/handsontable.full.min.css';

        if (!document.querySelector('link[href*="handsontable"]')) {
          document.head.appendChild(cssLink);
          setLoadingProgress(30);
        }

        // Simulate progress for better UX
        progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev < 60) return prev + 5;
            return prev;
          });
        }, 100);

        // Load JS
        if (!window.Handsontable) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/handsontable@13.1.0/dist/handsontable.full.min.js';

          script.onload = () => {
            setLoadingProgress(100);
            setTimeout(() => {
              if (mounted) {
                setIsHandsontableLoaded(true);
                clearInterval(progressInterval);
              }
            }, 200);
          };

          script.onerror = () => {
            console.error('Failed to load Handsontable');
            clearInterval(progressInterval);
          };

          document.head.appendChild(script);
        } else {
          setLoadingProgress(100);
          setTimeout(() => {
            if (mounted) {
              setIsHandsontableLoaded(true);
              clearInterval(progressInterval);
            }
          }, 200);
        }
      } catch (error) {
        console.error('Error loading Handsontable:', error);
        clearInterval(progressInterval);
      }
    };

    loadHandsontable();

    return () => {
      mounted = false;
      if (progressInterval) clearInterval(progressInterval);
    };
  }, []);

  // Process file data to extract information
  useEffect(() => {
    if (fileData && fileData.all_sheets) {
      const mappings = generateCategoryMappings(fileData);
      setCategoryMapping(mappings);
      setHasChanges(false);
      setSaveStatus(null);
    } else {
      setCategoryMapping({
        student: [0],
        laboratory: [],
        quiz: [],
        exams: [],
        other: []
      });
    }
  }, [fileData]);

  // Enhanced save handler with better feedback
  const handleSave = useCallback(async () => {
    if (!hasChanges || !hotInstanceRef.current || !fileData) return;
    
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      const currentData = hotInstanceRef.current.getData();
      const headers = fileData.all_sheets[fileData.active_sheet].headers;
      
      const updatedData = currentData.map(row => {
        const recordObj = {};
        headers.forEach((header, index) => {
          recordObj[header] = row[index];
        });
        return recordObj;
      });
      
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
      
      if (onSave) {
        await onSave(updatedFileData);
        setHasChanges(false);
        setSaveStatus('success');
        setLastSaveTime(new Date());
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, fileData, onSave]);

  // Auto-save functionality
  useEffect(() => {
    if (hasChanges && !isSaving) {
      const autoSaveTimer = setTimeout(() => {
        if (hasChanges) {
          handleSave();
        }
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasChanges, isSaving, handleSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            if (hasChanges) handleSave();
            break;
          case 'f':
            e.preventDefault();
            setShowFilters(!showFilters);
            break;
          case 'z':
            e.preventDefault();
            // Implement undo if available
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setSearchTerm('');
        setShowFilters(false);
      }
    };

    if (isFullScreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullScreen, hasChanges, showFilters, handleSave]);

  // Function to intelligently map columns to categories (keeping original logic)
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
          if (categories.hasOwnProperty(category)) {
            console.log(`Mapping column ${header} to standard category ${category}`);
            categories[category].push(index);
          } 
          else if (customCategories.hasOwnProperty(category)) {
            console.log(`Mapping column ${header} to custom category ${category}`);
            customCategories[category].columns.push(index);
          }
          else {
            console.log(`Unknown category ${category}, mapping ${header} to other`);
            categories.other.push(index);
          }
        } 
        else if (
          header.toString().toLowerCase().includes('name') || 
          header.toString().toLowerCase().includes('student') ||
          header.toString().toLowerCase().includes('no.')
        ) {
          categories.student.push(index);
        } 
        else {
          categories.other.push(index);
        }
      });
      
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
    
    // Fallback to auto-categorization (keeping original logic)
    console.log("No custom mappings found, generating automatic categories");
    
    headers.forEach((header, index) => {
      if (!header) {
        categories.student.push(index);
        return;
      }
      
      const headerLower = header.toString().toLowerCase();
      
      if (
        headerLower.includes('name') || 
        headerLower.includes('student') ||
        headerLower.includes('no.') ||
        headerLower === 'unnamed'
      ) {
        categories.student.push(index);
      }
      else if (headerLower.includes('html')) {
        if (headerLower.includes('basic')) {
          categories.quiz.push(index);
        } else if (headerLower.includes('advanc')) {
          categories.laboratory.push(index);
        } else {
          categories.laboratory.push(index);
        }
      }
      else if (headerLower.includes('quiz')) {
        categories.quiz.push(index);
      }
      else if (
        headerLower.includes('exam') || 
        headerLower === 'pe' || 
        headerLower === 'me' || 
        headerLower === 'fe' ||
        headerLower === 'pfe'
      ) {
        categories.exams.push(index);
      }
      else {
        categories.other.push(index);
      }
    });

    return categories;
  };

  // Generate nested headers based on categories (keeping original logic)
  const generateNestedHeaders = () => {
    if (!fileData || !fileData.all_sheets || !categoryMapping) {
      return [[], []];
    }

    const activeSheet = fileData.active_sheet;
    const sheetData = fileData.all_sheets[activeSheet];
    const headers = sheetData.headers || [];
    
    const topRow = [];
    const bottomRow = [];
    
    const indexToHeader = {};
    headers.forEach((header, idx) => {
      indexToHeader[idx] = header;
    });
    
    // Add student info columns first
    categoryMapping.student.forEach(idx => {
      topRow.push({ label: '', colspan: 1 });
      bottomRow.push(headers[idx] || '');
    });
    
    // Add standard categories
    const standardCategories = [
      { id: 'laboratory', label: 'LABORATORY WORKS' },
      { id: 'quiz', label: 'QUIZ' },
      { id: 'exams', label: 'MAJOR EXAMS' },
      { id: 'other', label: 'OTHER ACTIVITIES' }
    ];
    
    standardCategories.forEach(category => {
      if (categoryMapping[category.id] && categoryMapping[category.id].length > 0) {
        const categoryHeaders = categoryMapping[category.id]
          .map(idx => ({
            index: idx,
            header: headers[idx] || ''
          }))
          .filter(item => item.header);
        
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
    
    // Add custom categories
    const customCategoryIds = Object.keys(categoryMapping).filter(key => 
      !['student', 'laboratory', 'quiz', 'exams', 'other', '_categoryNames'].includes(key)
    );
    
    customCategoryIds.forEach(categoryId => {
      if (categoryMapping[categoryId] && categoryMapping[categoryId].length > 0) {
        const categoryHeaders = categoryMapping[categoryId]
          .map(idx => ({
            index: idx,
            header: headers[idx] || ''
          }))
          .filter(item => item.header);
          
        if (categoryHeaders.length > 0) {
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

  // Process data for Handsontable (keeping original logic)
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
    
    if (Array.isArray(sheetData.data[0])) {
      return sheetData.data;
    } else {
      return sheetData.data.map(row => {
        return headers.map(header => {
          return row[header] === undefined || row[header] === "" ? null : row[header];
        });
      });
    }
  };

  // Initialize Handsontable when data is ready (enhanced with search)
  useEffect(() => {
    if (isHandsontableLoaded && hotTableRef.current && window.Handsontable && fileData && categoryMapping) {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
      }

      addCustomStyles();

      const tableData = processData();
      const nestedHeaders = generateNestedHeaders();
      const fixedColumns = categoryMapping.student.length || 1;
      
      const colWidths = Array.isArray(fileData.all_sheets[fileData.active_sheet].headers) 
        ? fileData.all_sheets[fileData.active_sheet].headers.map((_, idx) => {
            if (categoryMapping.student.includes(idx)) {
              return 180;
            }
            return 90;
          })
        : [];

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
        contextMenu: ['copy', 'cut', 'paste', '---------', 'undo', 'redo'],
        filters: true,
        dropdownMenu: true,
        fixedColumnsLeft: fixedColumns,
        colWidths: colWidths.length ? colWidths : [180, 90, 90, 90, 90, 90],
        rowHeights: 30,
        nestedHeaders: nestedHeaders,
        search: {
          query: searchTerm,
          callback: function(instance, row, col, data, testResult) {
            // Custom search highlighting
          }
        },
        cells: function(row, col) {
          const cellProperties = {};

          if (categoryMapping.student.includes(col)) {
            cellProperties.className = 'name-cell';
          } else {
            cellProperties.className = 'grade-cell';
          }

          return cellProperties;
        },
        afterChange: function(changes, source) {
          if (source !== 'loadData') {
            setHasChanges(true);
            setSaveStatus(null);
          }
        },
        beforeChange: function(changes, source) {
          // Store undo data
          if (source !== 'loadData') {
            setUndoStack(prev => [...prev.slice(-9), changes]);
          }
        }
      };

      try {
        hotInstanceRef.current = new window.Handsontable(hotTableRef.current, settings);

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
  }, [isHandsontableLoaded, fileData, categoryMapping, searchTerm]);

  // Enhanced search functionality
  useEffect(() => {
    if (hotInstanceRef.current && searchTerm) {
      const searchPlugin = hotInstanceRef.current.getPlugin('search');
      searchPlugin.query(searchTerm);
      hotInstanceRef.current.render();
    }
  }, [searchTerm]);

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

  // Enhanced custom styles
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
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        /* Cell Styles with improved contrast */
        .name-cell {
          background-color: #f8f9fa !important;
          font-weight: 600 !important;
          color: #333D79 !important;
          text-align: left !important;
          padding-left: 12px !important;
          border-right: 2px solid #333D79 !important;
          transition: background-color 0.2s ease;
        }

        .name-cell:hover {
          background-color: #e9ecef !important;
        }

        .grade-cell {
          text-align: center !important;
          color: #495057 !important;
          transition: background-color 0.2s ease;
        }

        .grade-cell:hover {
          background-color: #f8f9fa !important;
        }

        /* Enhanced Header Styling */
        .handsontable thead th {
          background: linear-gradient(135deg, #333D79 0%, #2a3168 100%) !important;
          color: white !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #2a3168 !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        /* Nested header styling with gradients */
        .handsontable thead tr:first-child th {
          background: linear-gradient(135deg, #1a1f3a 0%, #0d1025 100%) !important;
          font-size: 13px !important;
          letter-spacing: 0.5px;
        }

        .handsontable thead tr:nth-child(2) th {
          background: linear-gradient(135deg, #333D79 0%, #2a3168 100%) !important;
          font-size: 12px !important;
        }

        /* Enhanced empty cells */
        .handsontable td:empty:not(.name-cell):after {
          content: "—";
          color: #adb5bd;
          font-size: 11px;
          opacity: 0.6;
        }
        
        /* Modern scrollbar styling */
        .wtHolder::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .wtHolder::-webkit-scrollbar-track {
          background: #f1f3f4;
          border-radius: 6px;
        }

        .wtHolder::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #333D79, #2a3168);
          border-radius: 6px;
          border: 2px solid #f1f3f4;
        }

        .wtHolder::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2a3168, #1a1f3a);
        }

        /* Search highlighting */
        .htSearchResult {
          background-color: #fff3cd !important;
          color: #856404 !important;
          font-weight: bold !important;
        }

        /* Loading animation */
        .loading-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Extract stats with memoization
  const stats = useMemo(() => {
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
  }, [fileData]);

  // Status message component
  const StatusMessage = ({ status, type }) => {
    if (!status) return null;

    const config = {
      success: {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200'
      }
    };

    const { icon: Icon, color, bg, border } = config[type] || config.success;

    return (
      <div className={`flex items-center space-x-2 px-3 py-2 ${bg} ${border} border rounded-lg`}>
        <Icon size={16} className={color} />
        <span className={`text-sm ${color}`}>{status}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Enhanced Header - Only show in fullscreen mode */}
      {isFullScreen && (
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFullScreen(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              title="Exit fullscreen (Esc)"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center shadow-sm">
                <FileSpreadsheet className="w-5 h-5 text-[#333D79]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{classData?.name || 'Class Data'}</h1>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-500">{fileData?.file_name || 'Spreadsheet'}</p>
                  {fileData?.uploaded_at && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center space-x-1" title={getFullDateTime(fileData.uploaded_at)}>
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(fileData.uploaded_at)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <Users size={14} className="text-green-600" />
              <span className="text-sm text-green-700 font-medium">{stats.students} Students</span>
            </div>

            {/* Last saved indicator */}
            {lastSaveTime && (
              <div className="flex items-center space-x-1 text-xs text-gray-500" title={getFullDateTime(lastSaveTime)}>
                <CheckCircle size={12} className="text-green-500" />
                <span>Last saved: {formatRelativeTime(lastSaveTime)}</span>
              </div>
            )}
          </div>

          {/* Enhanced toolbar */}
          <div className="flex items-center space-x-2">
            {/* Search bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search in spreadsheet... (Ctrl+F)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-transparent w-64"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 ${showFilters ? 'bg-[#333D79] text-white' : 'text-gray-700 border border-gray-300'} rounded-lg hover:bg-[#2a3168] hover:text-white flex items-center space-x-2 transition-all`}
              title="Toggle filters (Ctrl+F)"
            >
              <Filter size={16} />
              <span className="text-sm">Filters</span>
            </button>

            {/* Status messages */}
            <StatusMessage 
              status={saveStatus === 'success' ? 'Changes saved successfully!' : saveStatus === 'error' ? 'Error saving changes' : null}
              type={saveStatus}
            />

            {/* Save button with enhanced states */}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg flex items-center space-x-2 transition-all shadow-sm`}
                title="Save changes (Ctrl+S)"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
            
            <button
              onClick={onExport}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-all shadow-sm"
              title="Export spreadsheet"
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="px-3 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#2a3168] flex items-center space-x-2 transition-all shadow-sm"
              title="Exit fullscreen"
            >
              <Minimize2 size={16} />
              <span className="text-sm">Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Excel Container */}
      <div 
        className="excel-table-container flex-1 bg-white"
        style={{
          height: isFullScreen ? 'calc(100vh - 140px)' : '500px'
        }}
      >
        {!isHandsontableLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#333D79] rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 bg-[#333D79] rounded-full opacity-10"></div>
              </div>
              <div className="text-lg font-medium text-gray-900 mb-2">Loading Excel Viewer</div>
              <div className="text-sm text-gray-500 mb-4">Preparing your spreadsheet...</div>
              <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
                <div 
                  className="bg-gradient-to-r from-[#333D79] to-[#2a3168] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-2">{loadingProgress}%</div>
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

      {/* Enhanced Footer Stats */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between text-sm text-gray-600 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Rows: <span className="font-medium">{stats.rows}</span></span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Columns: <span className="font-medium">{stats.cols}</span></span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Students: <span className="font-medium">{stats.students}</span></span>
          </div>
          {hasChanges && (
            <div className="flex items-center space-x-2 text-orange-600">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Unsaved changes</span>
            </div>
          )}
          {/* File uploaded time in footer */}
          {fileData?.uploaded_at && (
            <div className="flex items-center space-x-1 text-gray-500" title={getFullDateTime(fileData.uploaded_at)}>
              <Clock size={12} />
              <span className="text-xs">
                Uploaded {formatRelativeTime(fileData.uploaded_at)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Info size={12} />
            <span>Double-click to edit • Right-click for options • Ctrl+S to save</span>
          </div>
          
          {/* Compact Save Button for footer */}
          {hasChanges && !isFullScreen && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-3 py-1 ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md text-xs flex items-center transition-all shadow-sm`}
              title="Save changes (Ctrl+S)"
            >
              {isSaving ? (
                <Loader2 size={12} className="mr-1 animate-spin" />
              ) : (
                <Save size={12} className="mr-1" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelGradeViewer;