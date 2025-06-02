import {
    AlertCircle,
    CheckCircle,
    Clock,
    Download,
    FileSpreadsheet,
    Filter,
    Info,
    Loader2,
    Minimize2,
    Save,
    Search,
    Users,
    X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatRelativeTime, getFullDateTime } from '../utils/dateUtils';

const ExcelGradeViewer = ({ fileData, classData, isFullScreen, setIsFullScreen, onExport, onSave }) => {
  const [isHandsontableLoaded, setIsHandsontableLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const hotTableRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const [categoryMapping, setCategoryMapping] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
  // 🆕 NEW: Track current headers state to sync with Handsontable
  const [currentHeaders, setCurrentHeaders] = useState([]);
  const [updatedFileData, setUpdatedFileData] = useState(null);

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
    console.log("=== ExcelGradeViewer useEffect triggered ===");
    console.log("fileData received:", fileData);
    
    if (fileData && fileData.all_sheets) {
      const activeSheet = fileData.active_sheet;
      const sheetData = fileData.all_sheets[activeSheet];
      
      // 🆕 NEW: Initialize current headers
      setCurrentHeaders(sheetData?.headers || []);
      setUpdatedFileData(fileData);
      
      const mappings = generateCategoryMappings(fileData);
      setCategoryMapping(mappings);
      setHasChanges(false);
      setSaveStatus(null);
    } else {
      setCurrentHeaders([]);
      setCategoryMapping({
        student: [0],
        laboratory: [],
        quiz: [],
        exams: [],
        other: []
      });
    }
  }, [fileData]);

  // 🆕 NEW: Auto-categorize new columns
  const autoCategorizeSingleColumn = (headerName, columnIndex) => {
    const headerLower = headerName.toString().toLowerCase();
    
    // Student info patterns
    if (headerLower.includes('name') || headerLower.includes('student') || headerLower.includes('no.')) {
      return 'student';
    }
    // Quiz patterns
    else if (headerLower.includes('quiz')) {
      return 'quiz';
    }
    // Lab patterns
    else if (headerLower.includes('lab') || headerLower.includes('laboratory')) {
      return 'laboratory';
    }
    // Exam patterns
    else if (headerLower.includes('exam') || headerLower.includes('prelim') || headerLower.includes('midterm') || headerLower.includes('final')) {
      return 'exams';
    }
    // Default to 'other'
    else {
      return 'other';
    }
  };

  // 🆕 NEW: Update category mappings when columns change
  const updateCategoryMappingsAfterColumnChange = (newHeaders, changeType, changeIndex) => {
    console.log("=== UPDATING CATEGORY MAPPINGS ===");
    console.log("Change type:", changeType, "at index:", changeIndex);
    console.log("New headers:", newHeaders);
    
    if (!categoryMapping) return;

    const newCategoryMapping = { ...categoryMapping };
    
    if (changeType === 'add') {
      // Shift all column indices after the insertion point
      Object.keys(newCategoryMapping).forEach(categoryId => {
        if (categoryId !== '_categoryNames' && Array.isArray(newCategoryMapping[categoryId])) {
          newCategoryMapping[categoryId] = newCategoryMapping[categoryId].map(colIndex => {
            return colIndex >= changeIndex ? colIndex + 1 : colIndex;
          });
        }
      });
      
      // Auto-categorize the new column
      const newColumnName = newHeaders[changeIndex] || `New Column ${changeIndex + 1}`;
      const autoCategory = autoCategorizeSingleColumn(newColumnName, changeIndex);
      
      console.log(`Auto-categorizing new column "${newColumnName}" as "${autoCategory}"`);
      
      if (!newCategoryMapping[autoCategory]) {
        newCategoryMapping[autoCategory] = [];
      }
      newCategoryMapping[autoCategory].push(changeIndex);
      newCategoryMapping[autoCategory].sort((a, b) => a - b);
      
    } else if (changeType === 'remove') {
      // Remove the deleted column from all categories and shift indices
      Object.keys(newCategoryMapping).forEach(categoryId => {
        if (categoryId !== '_categoryNames' && Array.isArray(newCategoryMapping[categoryId])) {
          newCategoryMapping[categoryId] = newCategoryMapping[categoryId]
            .filter(colIndex => colIndex !== changeIndex) // Remove the deleted column
            .map(colIndex => colIndex > changeIndex ? colIndex - 1 : colIndex); // Shift remaining columns
        }
      });
    }
    
    console.log("Updated category mappings:", newCategoryMapping);
    setCategoryMapping(newCategoryMapping);
  };

  // 🆕 NEW: Sync data structure after column/row changes
  const syncDataStructure = (newHeaders, newData) => {
    if (!updatedFileData) return;

    const activeSheet = updatedFileData.active_sheet;
    const newFileData = {
      ...updatedFileData,
      all_sheets: {
        ...updatedFileData.all_sheets,
        [activeSheet]: {
          ...updatedFileData.all_sheets[activeSheet],
          headers: newHeaders,
          data: newData
        }
      }
    };

    setUpdatedFileData(newFileData);
    setCurrentHeaders(newHeaders);
    setHasChanges(true);
    setSaveStatus(null);
    
    console.log("=== DATA STRUCTURE SYNCED ===");
    console.log("New headers:", newHeaders);
    console.log("New data rows:", newData.length);
  };

  // Enhanced save handler with better feedback
  const handleSave = useCallback(async () => {
    if (!hasChanges || !hotInstanceRef.current || !updatedFileData) return;
    
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // Use the already synced data structure
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
  }, [hasChanges, updatedFileData, onSave]);

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
    console.log("=== DEBUG: generateCategoryMappings ===");
    console.log("Looking for category mappings in fileData:", fileData);
    
    const activeSheet = fileData.active_sheet;
    const sheetData = fileData.all_sheets[activeSheet];
    
    if (!fileData || !fileData.all_sheets) {
      console.log("No file data or sheets, returning default mappings");
      return {
        student: [0],
        laboratory: [],
        quiz: [],
        exams: [],
        other: []
      };
    }
    
    if (!sheetData || !sheetData.headers) {
      console.log("No sheet data or headers, returning null");
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
    
    console.log("=== Processing headers ===");
    console.log("Headers array:", headers);
    console.log("Headers length:", headers.length);
    
    // PRIORITY 1: Check for stored category_mappings in the file data
    if (fileData.all_sheets.category_mappings) {
      console.log("=== USING STORED CATEGORY MAPPINGS ===");
      console.log("Stored category_mappings:", fileData.all_sheets.category_mappings);

      const assignedColumns = new Set();
      
      // Process stored category mappings
      fileData.all_sheets.category_mappings.forEach((category, categoryIndex) => {
      const categoryId = category.id;
      const categoryName = category.name;
      const categoryColumns = category.columns || [];

      console.log(`[${categoryIndex}] Processing stored category '${categoryName}' (${categoryId})`);
      console.log(`  Category columns:`, categoryColumns);
      
      if (categoryId in categories) {
          // Standard category - map column names to indices
          categoryColumns.forEach((columnName, colIndex) => {
            const columnIndex = headers.indexOf(columnName);
            console.log(`  [${colIndex}] Looking for column '${columnName}' in headers...`);
            if (columnIndex !== -1) {
              console.log(`    ✅ Found at index ${columnIndex} -> adding to '${categoryId}'`);
              categories[categoryId].push(columnIndex);
              assignedColumns.add(columnIndex); // Track this column as assigned
            } else {
              console.log(`    ❌ Column '${columnName}' not found in headers`);
            }
          });
        } else {
          console.log(`  Creating custom category '${categoryId}'`);
          // Custom category - store for later processing
          customCategories[categoryId] = {
            name: categoryName,
            columns: categoryColumns.map((columnName, colIndex) => {
              const columnIndex = headers.indexOf(columnName);
              console.log(`  [${colIndex}] Custom category: looking for '${columnName}'`);
              if (columnIndex !== -1) {
                console.log(`    ✅ Found at index ${columnIndex}`);
                assignedColumns.add(columnIndex); // Track this column as assigned
                return columnIndex;
              } else {
                console.log(`    ❌ Not found`);
                return null;
              }
            }).filter(idx => idx !== null)
          };
          console.log(`  Custom category '${categoryName}' mapped to indices:`, customCategories[categoryId].columns);
        }
      });
      
      // 🆕 HANDLE UNMAPPED COLUMNS (like "Quiz 6")
      console.log("=== PROCESSING UNMAPPED COLUMNS ===");
      headers.forEach((header, index) => {
        if (!assignedColumns.has(index)) {
          console.log(`🔍 Found unmapped column '${header}' at index ${index}`);
          
          // Try to auto-categorize unmapped columns based on name patterns
          const headerLower = header.toString().toLowerCase();
          
          let categorized = false;
          
          // Enhanced Quiz patterns
          if (headerLower.includes('quiz')) {
            console.log(`  📝 Auto-assigning '${header}' to quiz category`);
            categories.quiz.push(index);
            categorized = true;
          }
          // Enhanced Lab patterns
          else if (headerLower.includes('lab') || headerLower.includes('laboratory')) {
            console.log(`  🧪 Auto-assigning '${header}' to laboratory category`);
            categories.laboratory.push(index);
            categorized = true;
          }
          // Enhanced Exam patterns
          else if (headerLower.includes('exam') || headerLower.includes('prelim') || headerLower.includes('midterm') || headerLower.includes('final')) {
            console.log(`  📋 Auto-assigning '${header}' to exams category`);
            categories.exams.push(index);
            categorized = true;
          }
          // Student info patterns
          else if (headerLower.includes('name') || headerLower.includes('student') || headerLower.includes('no.')) {
            console.log(`  👤 Auto-assigning '${header}' to student category`);
            categories.student.push(index);
            categorized = true;
          }
          
          if (!categorized) {
            console.log(`  ❓ Auto-assigning '${header}' to other category`);
            categories.other.push(index);
          }
        }
      });
      
      console.log("=== FINAL CATEGORIES AFTER STORED MAPPINGS ===");
      console.log("Standard categories:", categories);
      console.log("Custom categories:", customCategories);
      
      // If we found stored mappings, use them and return early
      const result = { ...categories, ...customCategories };
      console.log("Final result:", result);
      return result;
    }
    
    console.log("=== NO STORED MAPPINGS - FALLING BACK TO AUTO-CATEGORIZATION ===");
    
    // PRIORITY 2: Check for direct column_categories mapping object (from frontend)
    if (fileData.column_categories) {
      console.log("Using column_categories from fileData:", fileData.column_categories);
      
      // First pass: Find all unique categories to identify custom ones
      const uniqueCategories = new Set();
      
      for (const header in fileData.column_categories) {
        const category = fileData.column_categories[header];
        if (category && !Object.prototype.hasOwnProperty.call(categories, category) && category !== 'student') {
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
          if (Object.prototype.hasOwnProperty.call(categories, category)) {
            console.log(`Mapping column ${header} to standard category ${category}`);
            categories[category].push(index);
          } 
          else if (Object.prototype.hasOwnProperty.call(customCategories, category)) {
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
    
    // PRIORITY 3: Fallback to auto-categorization with improved patterns
    console.log("No stored mappings found, generating automatic categories with improved patterns");
    
    headers.forEach((header, index) => {
      if (!header) {
        categories.student.push(index);
        return;
      }
      
      const headerLower = header.toString().toLowerCase();
      
      // Student information patterns
      if (
        headerLower.includes('name') || 
        headerLower.includes('student') ||
        headerLower.includes('no.') ||
        headerLower === 'unnamed'
      ) {
        categories.student.push(index);
      }
      // Enhanced Quiz patterns - match "Quiz 1", "Quiz 2", etc.
      else if (
        headerLower.includes('quiz') ||
        (headerLower.includes('html') && headerLower.includes('basic'))
      ) {
        console.log(`Auto-categorizing '${header}' as quiz`);
        categories.quiz.push(index);
      }
      // Enhanced Lab patterns - match "Lab 1", "Lab 2", "Laboratory Activities", etc.
      else if (
        headerLower.includes('lab') ||
        headerLower.includes('laboratory') ||
        headerLower.includes('activity') ||
        headerLower.includes('exercise') ||
        (headerLower.includes('html') && headerLower.includes('advanc'))
      ) {
        console.log(`Auto-categorizing '${header}' as laboratory`);
        categories.laboratory.push(index);
      }
      // Enhanced Exam patterns - match "PE - Prelim Exam", "ME - Midterm Exam", etc.
      else if (
        headerLower.includes('exam') || 
        headerLower === 'pe' || 
        headerLower === 'me' || 
        headerLower === 'fe' ||
        headerLower === 'pfe' ||
        headerLower.includes('prelim') ||
        headerLower.includes('midterm') ||
        headerLower.includes('final') ||
        headerLower.includes('pe -') ||
        headerLower.includes('me -') ||
        headerLower.includes('pfe -') ||
        headerLower.includes('fe -')
      ) {
        console.log(`Auto-categorizing '${header}' as exams`);
        categories.exams.push(index);
      }
      else {
        console.log(`Auto-categorizing '${header}' as other`);
        categories.other.push(index);
      }
    });

    console.log("Final auto-generated category mappings:", categories);
    return categories;
  };

  // Generate nested headers based on categories - FIXED VERSION
  const generateNestedHeaders = () => {
    if (!updatedFileData || !updatedFileData.all_sheets || !categoryMapping) {
      return [[], []];
    }

    const activeSheet = updatedFileData.active_sheet;
    const sheetData = updatedFileData.all_sheets[activeSheet];
    const headers = sheetData.headers || [];

    console.log("=== NESTED HEADERS GENERATION ===");
    console.log("Headers:", headers);
    console.log("Category mapping:", categoryMapping);

    // Create the column headers (second row)
    const columnHeaders = [...headers];

    // Create category headers (first row)
    const categoryRow = [];

    // Create a map of column index to category info
    const columnToCategory = {};

    // Map each column to its category
    Object.keys(categoryMapping).forEach(categoryId => {
      if (categoryId !== '_categoryNames' && Array.isArray(categoryMapping[categoryId])) {
        const categoryName = categoryMapping._categoryNames?.[categoryId] ||
            (categoryId === 'student' ? 'Student Info' :
                categoryId === 'quiz' ? 'Quiz' :
                    categoryId === 'laboratory' ? 'Laboratory Activities' :
                        categoryId === 'exams' ? 'Exams' :
                            categoryId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

        categoryMapping[categoryId].forEach(columnIndex => {
          columnToCategory[columnIndex] = {
            id: categoryId,
            name: categoryName
          };
        });
      }
    });

    console.log("Column to category mapping:", columnToCategory);

    // Build category row by processing columns in order
    let processedColumns = 0;

    while (processedColumns < headers.length) {
      const currentCategory = columnToCategory[processedColumns];

      if (currentCategory) {
        // Count consecutive columns for this category
        let colspan = 0;
        let checkIndex = processedColumns;

        while (checkIndex < headers.length &&
        columnToCategory[checkIndex] &&
        columnToCategory[checkIndex].id === currentCategory.id) {
          colspan++;
          checkIndex++;
        }

        console.log(`Adding category "${currentCategory.name}" at position ${processedColumns} with colspan ${colspan}`);

        // Add the category header object
        categoryRow.push({
          label: currentCategory.name,
          colspan: colspan
        });

        processedColumns = checkIndex;
      } else {
        // No category - add empty string
        console.log(`Adding empty header at position ${processedColumns}`);
        categoryRow.push('');
        processedColumns++;
      }
    }

    console.log("=== FINAL CATEGORY ROW STRUCTURE ===");
    console.log("Category row length:", categoryRow.length);
    console.log("Column headers length:", columnHeaders.length);

    return [categoryRow, columnHeaders];
  };

  // Process data for Handsontable (keeping original logic)
  const processData = () => {
    if (!updatedFileData || !updatedFileData.all_sheets) {
      return [];
    }

    const activeSheet = updatedFileData.active_sheet;
    const sheetData = updatedFileData.all_sheets[activeSheet];
    
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

  // 🆕 FIXED: Initialize Handsontable with proper event handlers
  useEffect(() => {
    if (isHandsontableLoaded && hotTableRef.current && window.Handsontable && updatedFileData && categoryMapping) {
      // Destroy existing instance safely
      if (hotInstanceRef.current) {
        try {
          if (!hotInstanceRef.current.isDestroyed) {
            hotInstanceRef.current.destroy();
          }
        } catch (error) {
          console.log('Instance already destroyed:', error);
        }
        hotInstanceRef.current = null;
      }

      if (!hotTableRef.current) {
        console.warn("Table ref not available, skipping initialization");
        return;
      }

      addCustomStyles();

      const tableData = processData();
      const nestedHeaders = generateNestedHeaders();

      console.log("=== HANDSONTABLE INITIALIZATION DEBUG ===");
      console.log("Table data rows:", tableData.length);
      console.log("Nested headers:", nestedHeaders);

      const fixedColumns = categoryMapping?.student?.length || 1;
      const activeSheet = updatedFileData?.active_sheet;
      const headers = updatedFileData?.all_sheets?.[activeSheet]?.headers;
      
      const colWidths = Array.isArray(headers)
          ? headers.map((_, idx) => {
            if (categoryMapping?.student?.includes(idx)) {
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
        contextMenu: [
          'row_above',
          'row_below', 
          'col_left', 
          'col_right',
          '---------',
          'remove_row',
          'remove_col',
          '---------',
          'copy', 
          'cut', 
          'paste', 
          '---------', 
          'undo', 
          'redo'
        ],
        filters: true,
        dropdownMenu: true,
        fixedColumnsLeft: fixedColumns,
        colWidths: colWidths.length ? colWidths : Array(tableData[0]?.length || 10).fill(90).map((w, i) => i < fixedColumns ? 180 : w),
        rowHeights: 30,
        nestedHeaders: nestedHeaders,
        search: {
          query: searchTerm
        },
        cells: function(row, col) {
          const cellProperties = {};
          if (categoryMapping?.student?.includes(col)) {
            cellProperties.className = 'name-cell';
          } else {
            cellProperties.className = 'grade-cell';
          }
          return cellProperties;
        },
        
        // 🆕 NEW: Hook into column creation events
        afterCreateCol: function(index, amount, source) {
          console.log("=== COLUMN ADDED ===");
          console.log("Index:", index, "Amount:", amount, "Source:", source);
          
          if (source === 'ContextMenu.columnLeft' || source === 'ContextMenu.columnRight') {
            setTimeout(() => {
              try {
                const hotData = this.getData();
                const hotHeaders = this.getColHeader();
                
                // Generate new headers for added columns
                const newHeaders = [...currentHeaders];
                for (let i = 0; i < amount; i++) {
                  const columnName = `New Column ${index + i + 1}`;
                  newHeaders.splice(index + i, 0, columnName);
                  
                  // Update the Handsontable column header
                  this.updateSettings({
                    colHeaders: function(col) {
                      return newHeaders[col] || `Column ${col + 1}`;
                    }
                  });
                }
                
                console.log("New headers after column addition:", newHeaders);
                
                // Convert data back to object format
                const newData = hotData.map(row => {
                  const recordObj = {};
                  newHeaders.forEach((header, headerIndex) => {
                    recordObj[header] = row[headerIndex] || null;
                  });
                  return recordObj;
                });
                
                // Update category mappings
                updateCategoryMappingsAfterColumnChange(newHeaders, 'add', index);
                
                // Sync data structure
                syncDataStructure(newHeaders, newData);
                
                console.log("✅ Column addition handled successfully");
              } catch (error) {
                console.error("Error handling column addition:", error);
              }
            }, 100);
          }
        },
        
        // 🆕 NEW: Hook into column removal events
        afterRemoveCol: function(index, amount, physicalColumns, source) {
          console.log("=== COLUMN REMOVED ===");
          console.log("Index:", index, "Amount:", amount, "Source:", source);
          
          setTimeout(() => {
            try {
              const hotData = this.getData();
              
              // Remove headers for deleted columns
              const newHeaders = [...currentHeaders];
              newHeaders.splice(index, amount);
              
              console.log("New headers after column removal:", newHeaders);
              
              // Convert data back to object format
              const newData = hotData.map(row => {
                const recordObj = {};
                newHeaders.forEach((header, headerIndex) => {
                  recordObj[header] = row[headerIndex] || null;
                });
                return recordObj;
              });
              
              // Update category mappings (for each removed column)
              for (let i = 0; i < amount; i++) {
                updateCategoryMappingsAfterColumnChange(newHeaders, 'remove', index);
              }
              
              // Sync data structure
              syncDataStructure(newHeaders, newData);
              
              console.log("✅ Column removal handled successfully");
            } catch (error) {
              console.error("Error handling column removal:", error);
            }
          }, 100);
        },
        
        // 🆕 NEW: Hook into row addition/removal
        afterCreateRow: function(index, amount, source) {
          console.log("=== ROW ADDED ===");
          setTimeout(() => {
            const hotData = this.getData();
            const newData = hotData.map(row => {
              const recordObj = {};
              currentHeaders.forEach((header, headerIndex) => {
                recordObj[header] = row[headerIndex] || null;
              });
              return recordObj;
            });
            
            syncDataStructure(currentHeaders, newData);
          }, 100);
        },
        
        afterRemoveRow: function(index, amount, physicalRows, source) {
          console.log("=== ROW REMOVED ===");
          setTimeout(() => {
            const hotData = this.getData();
            const newData = hotData.map(row => {
              const recordObj = {};
              currentHeaders.forEach((header, headerIndex) => {
                recordObj[header] = row[headerIndex] || null;
              });
              return recordObj;
            });
            
            syncDataStructure(currentHeaders, newData);
          }, 100);
        },
        
        afterInit: function() {
          console.log("=== HANDSONTABLE INITIALIZED SUCCESSFULLY ===");
        },
        
        afterChange: function(changes, source) {
          if (source !== 'loadData') {
            setHasChanges(true);
            setSaveStatus(null);
          }
        }
      };

      try {
        console.log("Creating Handsontable instance...");
        hotInstanceRef.current = new window.Handsontable(hotTableRef.current, settings);
        console.log("✅ Handsontable instance created successfully");
      } catch (error) {
        console.error('❌ Error initializing Handsontable:', error);
      }
    }

    return () => {
      if (hotInstanceRef.current) {
        try {
          if (!hotInstanceRef.current.isDestroyed) {
            hotInstanceRef.current.destroy();
          }
          hotInstanceRef.current = null;
        } catch (error) {
          console.error('Error destroying Handsontable:', error);
        }
      }
    };
  }, [isHandsontableLoaded, updatedFileData, categoryMapping, searchTerm, currentHeaders]);

  // Enhanced search functionality
  useEffect(() => {
    if (hotInstanceRef.current && searchTerm) {
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

  // Enhanced custom styles (keeping the same)
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
    if (!updatedFileData || !updatedFileData.all_sheets) {
      return { rows: 0, cols: 0, students: 0 };
    }
    
    const activeSheet = updatedFileData.active_sheet;
    const sheetData = updatedFileData.all_sheets[activeSheet];
    
    return {
      rows: sheetData?.data?.length || 0,
      cols: sheetData?.headers?.length || 0,
      students: sheetData?.data?.length || 0
    };
  }, [updatedFileData]);

  // Status message component (keeping the same)
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

  StatusMessage.propTypes = {
    status: PropTypes.string,
    type: PropTypes.oneOf(['success', 'error'])
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

ExcelGradeViewer.propTypes = {
  fileData: PropTypes.object.isRequired,
  classData: PropTypes.object.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
  setIsFullScreen: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default ExcelGradeViewer;