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
import { classService } from '../services/api';

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
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [isDeletingRow, setIsDeletingRow] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingColumn, setIsDeletingColumn] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showAdvancedRowOptions, setShowAdvancedRowOptions] = useState(false);
  const [specificRowIndex, setSpecificRowIndex] = useState('');
  const [insertAtIndex, setInsertAtIndex] = useState('');
  const [duplicateRowIndex, setDuplicateRowIndex] = useState('');

  
  // NEW STATE FOR COLUMN MANAGEMENT
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const [showRowManager, setShowRowManager] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);

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
      console.log("=== FILE DATA STRUCTURE ANALYSIS ===");
      console.log("all_sheets keys:", Object.keys(fileData.all_sheets));
      
      const activeSheet = fileData.active_sheet;
      console.log("active_sheet:", activeSheet);
      
      if (fileData.all_sheets[activeSheet]) {
        console.log(`Sheet '${activeSheet}' data:`, fileData.all_sheets[activeSheet]);
        console.log(`Headers in '${activeSheet}':`, fileData.all_sheets[activeSheet].headers);
        console.log(`Data rows in '${activeSheet}':`, fileData.all_sheets[activeSheet].data?.length || 0);
      }
      
      if (fileData.all_sheets.category_mappings) {
        console.log("=== STORED CATEGORY MAPPINGS ===");
        console.log("Category mappings found:", fileData.all_sheets.category_mappings);
        fileData.all_sheets.category_mappings.forEach((category, index) => {
          console.log(`[${index}] Category: ${category.name} (${category.id})`);
          console.log(`  Columns (${category.columns?.length || 0}):`, category.columns);
        });
      } else {
        console.log("❌ No category_mappings found in all_sheets");
      }
      
      console.log("=== GENERATING CATEGORY MAPPINGS ===");
      const mappings = generateCategoryMappings(fileData);
      console.log("Generated mappings result:", mappings);
      setCategoryMapping(mappings);
      setHasChanges(false);
      setSaveStatus(null);
    } else {
      console.log("=== NO FILE DATA - USING DEFAULT MAPPINGS ===");
      setCategoryMapping({
        student: [0],
        laboratory: [],
        quiz: [],
        exams: [],
        other: []
      });
    }
  }, [fileData]);

  // NEW FUNCTION: Save category mappings to backend using your API service
  const saveCategoryMappings = useCallback(async (updatedCategoryMapping, newHeaders) => {
  if (!fileData || !fileData.id) return false;
  
  try {
    // Convert category mapping to the format your backend expects
    const categoryMappingsArray = [];
    
    Object.keys(updatedCategoryMapping).forEach(categoryId => {
      if (categoryId !== '_categoryNames' && Array.isArray(updatedCategoryMapping[categoryId])) {
        const categoryName = updatedCategoryMapping._categoryNames?.[categoryId] ||
          (categoryId === 'student' ? 'Student Info' :
           categoryId === 'quiz' ? 'Quiz' :
           categoryId === 'laboratory' ? 'Laboratory Activities' :
           categoryId === 'exams' ? 'Exams' :
           categoryId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        
        // 🚨 FIX: Use the newHeaders parameter instead of fileData headers
        const headers = newHeaders || fileData.all_sheets[fileData.active_sheet].headers;
        const columnNames = updatedCategoryMapping[categoryId].map(index => headers[index]).filter(name => name);
        
        categoryMappingsArray.push({
          id: categoryId,
          name: categoryName,
          columns: columnNames
        });
      }
    });
    
    console.log("=== SAVING CATEGORY MAPPINGS TO BACKEND ===");
    console.log("Using headers:", newHeaders || fileData.all_sheets[fileData.active_sheet].headers);
    console.log("Category mappings array:", categoryMappingsArray);
    
    // Use your existing classService.updateCategoryMappings function
    const response = await classService.updateCategoryMappings(fileData.id, {
      all_sheets: {
        category_mappings: categoryMappingsArray
      }
    });
    
    // 🚨 FIX: Update the local fileData.all_sheets.category_mappings immediately
    fileData.all_sheets.category_mappings = categoryMappingsArray;
    
    console.log("Category mappings saved successfully:", response.data);
    return true;
  } catch (error) {
    console.error('Error saving category mappings:', error);
    return false;
  }
}, [fileData]);

  const addRowToSpreadsheet = useCallback(async (position = 'end') => {
  if (!hotInstanceRef.current || !fileData || isAddingRow) return;
  
  setIsAddingRow(true);
  
  try {
    const headers = fileData.all_sheets[fileData.active_sheet].headers;
    const currentData = fileData.all_sheets[fileData.active_sheet].data;
    
    // Create new empty row with proper structure
    const newRow = {};
    headers.forEach(header => {
      newRow[header] = null; // Initialize all columns as empty
    });
    
    // Determine insert position
    let insertIndex;
    if (position === 'end') {
      insertIndex = currentData.length;
    } else if (position === 'start') {
      insertIndex = 0;
    } else if (typeof position === 'number') {
      insertIndex = Math.max(0, Math.min(position, currentData.length));
    } else {
      insertIndex = currentData.length; // Default to end
    }
    
    // Update the data array
    const updatedData = [...currentData];
    updatedData.splice(insertIndex, 0, newRow);
    
    console.log(`Adding new row at position ${insertIndex}`);
    console.log("New row structure:", newRow);
    
    // Update fileData structure
    fileData.all_sheets[fileData.active_sheet].data = updatedData;
    
    // Save the updated data
    if (onSave) {
      const updatedFileData = {
        ...fileData,
        all_sheets: {
          ...fileData.all_sheets,
          [fileData.active_sheet]: {
            headers: headers,
            data: updatedData
          }
        }
      };
      
      await onSave(updatedFileData);
      console.log("✅ New row saved successfully");
    }
    
    // Destroy and recreate the table to reflect changes
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }
    
    console.log(`Successfully added new row at position ${insertIndex}`);
    
    // Close the row manager
    setShowRowManager(false);
    
  } catch (error) {
    console.error('Error adding row:', error);
    alert('Failed to add row. Please try again.');
  } finally {
    setIsAddingRow(false);
  }
}, [fileData, isAddingRow, onSave]);

  const deleteRowFromSpreadsheet = useCallback(async (rowIndex) => {
  if (!hotInstanceRef.current || !fileData || isDeletingRow) return;
  
  setIsDeletingRow(true);
  
  try {
    const headers = fileData.all_sheets[fileData.active_sheet].headers;
    const currentData = fileData.all_sheets[fileData.active_sheet].data;
    
    // Validate row index
    if (rowIndex < 0 || rowIndex >= currentData.length) {
      throw new Error('Invalid row index');
    }
    
    // Remove the row
    const updatedData = [...currentData];
    const deletedRow = updatedData.splice(rowIndex, 1)[0];
    
    console.log(`Deleting row at index ${rowIndex}`);
    console.log("Deleted row data:", deletedRow);
    
    // Update fileData structure
    fileData.all_sheets[fileData.active_sheet].data = updatedData;
    
    // Save the updated data
    if (onSave) {
      const updatedFileData = {
        ...fileData,
        all_sheets: {
          ...fileData.all_sheets,
          [fileData.active_sheet]: {
            headers: headers,
            data: updatedData
          }
        }
      };
      
      await onSave(updatedFileData);
      console.log("✅ Row deleted and saved successfully");
    }
    
    // Destroy and recreate the table to reflect changes
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }
    
    console.log(`Successfully deleted row at index ${rowIndex}`);
    
    // Close any open modals
    setShowDeleteConfirm(false);
    setSelectedRowIndex(null);
    
  } catch (error) {
    console.error('Error deleting row:', error);
    alert('Failed to delete row. Please try again.');
  } finally {
    setIsDeletingRow(false);
  }
}, [fileData, isDeletingRow, onSave]);

  const deleteLastRow = useCallback(async () => {
  if (!fileData) return;
  
  const currentData = fileData.all_sheets[fileData.active_sheet].data;
  if (currentData.length === 0) {
    alert('No rows to delete!');
    return;
  }
  
  const lastRowIndex = currentData.length - 1;
  await deleteRowFromSpreadsheet(lastRowIndex);
}, [fileData, deleteRowFromSpreadsheet]);

  const deleteEmptyRows = useCallback(async () => {
  if (!fileData || isDeletingRow) return;
  
  setIsDeletingRow(true);
  
  try {
    const headers = fileData.all_sheets[fileData.active_sheet].headers;
    const currentData = fileData.all_sheets[fileData.active_sheet].data;
    
    // Find empty rows (all values are null, undefined, or empty string)
    const nonEmptyRows = currentData.filter(row => {
      return headers.some(header => {
        const value = row[header];
        return value !== null && value !== undefined && value !== '';
      });
    });
    
    const deletedCount = currentData.length - nonEmptyRows.length;
    
    if (deletedCount === 0) {
      alert('No empty rows found!');
      setIsDeletingRow(false);
      return;
    }
    
    console.log(`Deleting ${deletedCount} empty rows`);
    
    // Update fileData structure
    fileData.all_sheets[fileData.active_sheet].data = nonEmptyRows;
    
    // Save the updated data
    if (onSave) {
      const updatedFileData = {
        ...fileData,
        all_sheets: {
          ...fileData.all_sheets,
          [fileData.active_sheet]: {
            headers: headers,
            data: nonEmptyRows
          }
        }
      };
      
      await onSave(updatedFileData);
      console.log(`✅ ${deletedCount} empty rows deleted successfully`);
    }
    
    // Destroy and recreate the table
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }
    
    alert(`Successfully deleted ${deletedCount} empty rows!`);
    
  } catch (error) {
    console.error('Error deleting empty rows:', error);
    alert('Failed to delete empty rows. Please try again.');
  } finally {
    setIsDeletingRow(false);
  }
}, [fileData, isDeletingRow, onSave]);

  const deleteColumnFromCategory = useCallback(async (categoryId, columnIndex = 'last') => {
  if (!hotInstanceRef.current || !categoryMapping || !fileData || isDeletingColumn) return;
  
  setIsDeletingColumn(true);
  
  try {
    const categoryColumns = categoryMapping[categoryId] || [];
    const headers = [...fileData.all_sheets[fileData.active_sheet].headers];
    
    if (categoryColumns.length === 0) {
      alert(`No columns in ${categoryId} category to delete!`);
      setIsDeletingColumn(false);
      return;
    }
    
    // Determine which column to delete
    let targetColumnIndex;
    if (columnIndex === 'last') {
      targetColumnIndex = Math.max(...categoryColumns);
    } else if (columnIndex === 'first') {
      targetColumnIndex = Math.min(...categoryColumns);
    } else if (typeof columnIndex === 'number') {
      targetColumnIndex = columnIndex;
    } else {
      targetColumnIndex = Math.max(...categoryColumns); // Default to last
    }
    
    // Validate the column index
    if (!categoryColumns.includes(targetColumnIndex)) {
      alert('Invalid column selection!');
      setIsDeletingColumn(false);
      return;
    }
    
    const columnName = headers[targetColumnIndex];
    console.log(`Deleting column "${columnName}" at index ${targetColumnIndex} from ${categoryId} category`);
    
    // Remove column from headers
    const newHeaders = [...headers];
    newHeaders.splice(targetColumnIndex, 1);
    
    // Remove column from data
    const updatedData = fileData.all_sheets[fileData.active_sheet].data.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
    
    // 🚨 CRITICAL: Update category mapping with proper index adjustments
    const updatedCategoryMapping = { ...categoryMapping };
    
    // STEP 1: Remove the deleted column from its category
    updatedCategoryMapping[categoryId] = updatedCategoryMapping[categoryId].filter(
      colIndex => colIndex !== targetColumnIndex
    );
    
    // STEP 2: Adjust all column indices after the deletion point for ALL categories
    Object.keys(updatedCategoryMapping).forEach(catId => {
      if (Array.isArray(updatedCategoryMapping[catId])) {
        updatedCategoryMapping[catId] = updatedCategoryMapping[catId].map(colIndex => 
          colIndex > targetColumnIndex ? colIndex - 1 : colIndex
        );
      }
    });
    
    console.log("=== DEBUGGING COLUMN DELETION ===");
    console.log("Original category mapping:", categoryMapping);
    console.log("Deleted column index:", targetColumnIndex);
    console.log("Updated category mapping:", updatedCategoryMapping);
    console.log("New headers:", newHeaders);
    
    // Save category mappings to backend
    const saveSuccess = await saveCategoryMappings(updatedCategoryMapping, newHeaders);
    if (!saveSuccess) {
      throw new Error('Failed to save category mappings to backend');
    }
    
    // Update local state
    setCategoryMapping(updatedCategoryMapping);
    
    // Update fileData structure
    fileData.all_sheets[fileData.active_sheet].headers = newHeaders;
    fileData.all_sheets[fileData.active_sheet].data = updatedData;

    if (onSave) {
      const updatedFileData = {
        ...fileData,
        all_sheets: {
          ...fileData.all_sheets,
          [fileData.active_sheet]: {
            headers: newHeaders,
            data: updatedData
          }
        }
      };
      
      await onSave(updatedFileData);
      console.log("✅ Data saved after column deletion");
    }
    
    // Destroy and recreate the table
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }
    
    console.log(`Successfully deleted column "${columnName}" from ${categoryId} category`);
    
  } catch (error) {
    console.error('Error deleting column:', error);
    alert('Failed to delete column. Please try again.');
  } finally {
    setIsDeletingColumn(false);
  }
}, [categoryMapping, fileData, saveCategoryMappings, isDeletingColumn, onSave]);

  const deleteEmptyColumnsFromCategory = useCallback(async (categoryId) => {
  if (!hotInstanceRef.current || !categoryMapping || !fileData || isDeletingColumn) return;
  
  setIsDeletingColumn(true);
  
  try {
    const categoryColumns = categoryMapping[categoryId] || [];
    const headers = fileData.all_sheets[fileData.active_sheet].headers;
    const currentData = fileData.all_sheets[fileData.active_sheet].data;
    
    if (categoryColumns.length === 0) {
      alert(`No columns in ${categoryId} category!`);
      setIsDeletingColumn(false);
      return;
    }
    
    // Find empty columns in this category
    const emptyColumns = [];
    
    categoryColumns.forEach(columnIndex => {
      const columnName = headers[columnIndex];
      
      // Check if column is empty (all values are null, undefined, or empty)
      const isEmpty = currentData.every(row => {
        const value = row[columnName];
        return value === null || value === undefined || value === '' || value === 0;
      });
      
      if (isEmpty) {
        emptyColumns.push(columnIndex);
      }
    });
    
    if (emptyColumns.length === 0) {
      alert(`No empty columns found in ${categoryId} category!`);
      setIsDeletingColumn(false);
      return;
    }
    
    console.log(`Found ${emptyColumns.length} empty columns in ${categoryId}:`, emptyColumns);
    
    // Sort in descending order to delete from right to left (prevents index shifting issues)
    emptyColumns.sort((a, b) => b - a);
    
    // Delete each empty column
    for (const columnIndex of emptyColumns) {
      await deleteColumnFromCategory(categoryId, columnIndex);
    }
    
    alert(`Successfully deleted ${emptyColumns.length} empty columns from ${categoryId} category!`);
    
  } catch (error) {
    console.error('Error deleting empty columns:', error);
    alert('Failed to delete empty columns. Please try again.');
  } finally {
    setIsDeletingColumn(false);
  }
}, [categoryMapping, fileData, isDeletingColumn, deleteColumnFromCategory]);

  const deleteSpecificRow = useCallback(async () => {
  if (!specificRowIndex || isDeletingRow) return;
  
  const rowIndex = parseInt(specificRowIndex) - 1; // Convert to 0-based index
  const currentData = fileData.all_sheets[fileData.active_sheet].data;
  
  if (rowIndex < 0 || rowIndex >= currentData.length) {
    alert(`Invalid row number! Please enter a number between 1 and ${currentData.length}`);
    return;
  }
  
  const studentName = getStudentNameFromRow(currentData[rowIndex]);
  const confirmDelete = window.confirm(
    `Are you sure you want to delete Row ${parseInt(specificRowIndex)}?\n\nStudent: ${studentName}\n\nThis action cannot be undone.`
  );
  
  if (confirmDelete) {
    await deleteRowFromSpreadsheet(rowIndex);
    setSpecificRowIndex('');
    alert(`Row ${parseInt(specificRowIndex)} (${studentName}) has been deleted successfully!`);
  }
}, [specificRowIndex, fileData, isDeletingRow, deleteRowFromSpreadsheet]);

  const getStudentNameFromRow = useCallback((row) => {
  if (!categoryMapping || !fileData) return 'Unknown Student';
  
  const headers = fileData.all_sheets[fileData.active_sheet].headers;
  const studentColumns = categoryMapping.student || [];
  
  // Try to find name in student columns
  for (const colIndex of studentColumns) {
    const header = headers[colIndex];
    const value = row[header];
    if (value && typeof value === 'string' && value.trim()) {
      // If it looks like a name (contains letters)
      if (/[a-zA-Z]/.test(value)) {
        return value.trim();
      }
    }
  }
  
  // Fallback: return first non-empty student column value
  for (const colIndex of studentColumns) {
    const header = headers[colIndex];
    const value = row[header];
    if (value && value.toString().trim()) {
      return value.toString().trim();
    }
  }
  
  return 'Unnamed Student';
}, [categoryMapping, fileData]);

  const deleteSelectedRows = useCallback(async () => {
  if (selectedRows.size === 0 || isDeletingRow) return;
  
  const currentData = fileData.all_sheets[fileData.active_sheet].data;
  const rowsToDelete = Array.from(selectedRows).sort((a, b) => a - b);
  
  // Show confirmation with student names
  const studentNames = rowsToDelete.map(rowIndex => {
    const studentName = getStudentNameFromRow(currentData[rowIndex]);
    return `Row ${rowIndex + 1}: ${studentName}`;
  }).join('\n');
  
  const confirmDelete = window.confirm(
    `Are you sure you want to delete ${rowsToDelete.length} selected rows?\n\n${studentNames}\n\nThis action cannot be undone.`
  );
  
  if (!confirmDelete) return;
  
  setIsDeletingRow(true);
  
  try {
    // Delete rows from highest index to lowest to avoid index shifting
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      const rowIndex = rowsToDelete[i];
      await deleteRowFromSpreadsheet(rowIndex);
    }
    
    setSelectedRows(new Set());
    alert(`Successfully deleted ${rowsToDelete.length} student rows!`);
    
  } catch (error) {
    console.error('Error deleting selected rows:', error);
    alert('Failed to delete some rows. Please try again.');
  } finally {
    setIsDeletingRow(false);
  }
}, [selectedRows, fileData, isDeletingRow, deleteRowFromSpreadsheet, getStudentNameFromRow]);

  const duplicateRow = useCallback(async () => {
  if (!duplicateRowIndex || isAddingRow) return;
  
  const rowIndex = parseInt(duplicateRowIndex) - 1; // Convert to 0-based index
  const currentData = fileData.all_sheets[fileData.active_sheet].data;
  
  if (rowIndex < 0 || rowIndex >= currentData.length) {
    alert(`Invalid row number! Please enter a number between 1 and ${currentData.length}`);
    return;
  }
  
  setIsAddingRow(true);
  
  try {
    const headers = fileData.all_sheets[fileData.active_sheet].headers;
    const sourceRow = currentData[rowIndex];
    const studentName = getStudentNameFromRow(sourceRow);
    
    // Create duplicate row
    const duplicatedRow = { ...sourceRow };
    
    // Clear grade columns but keep student info
    const studentColumns = categoryMapping?.student || [];
    headers.forEach((header, index) => {
      if (!studentColumns.includes(index)) {
        duplicatedRow[header] = null; // Clear non-student columns
      }
    });
    
    // Insert duplicate right after the original row
    const insertIndex = rowIndex + 1;
    const updatedData = [...currentData];
    updatedData.splice(insertIndex, 0, duplicatedRow);
    
    console.log(`Duplicating row ${rowIndex + 1} (${studentName}) at position ${insertIndex + 1}`);
    
    // Update fileData structure
    fileData.all_sheets[fileData.active_sheet].data = updatedData;
    
    // Save the updated data
    if (onSave) {
      const updatedFileData = {
        ...fileData,
        all_sheets: {
          ...fileData.all_sheets,
          [fileData.active_sheet]: {
            headers: headers,
            data: updatedData
          }
        }
      };
      
      await onSave(updatedFileData);
      console.log("✅ Row duplicated and saved successfully");
    }
    
    // Destroy and recreate the table
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }
    
    setDuplicateRowIndex('');
    alert(`Row ${parseInt(duplicateRowIndex)} (${studentName}) has been duplicated successfully!\n\nStudent info copied, grades cleared for new entry.`);
    
  } catch (error) {
    console.error('Error duplicating row:', error);
    alert('Failed to duplicate row. Please try again.');
  } finally {
    setIsAddingRow(false);
  }
}, [duplicateRowIndex, fileData, isAddingRow, onSave, categoryMapping, getStudentNameFromRow]);

  const insertRowAtPosition = useCallback(async () => {
  if (!insertAtIndex || isAddingRow) return;
  
  const insertPosition = parseInt(insertAtIndex) - 1; // Convert to 0-based index
  const currentData = fileData.all_sheets[fileData.active_sheet].data;
  
  if (insertPosition < 0 || insertPosition > currentData.length) {
    alert(`Invalid position! Please enter a number between 1 and ${currentData.length + 1}`);
    return;
  }
  
  await addRowToSpreadsheet(insertPosition);
  setInsertAtIndex('');
  
  const positionText = insertPosition === 0 ? 'at the beginning' : 
                     insertPosition === currentData.length ? 'at the end' : 
                     `at position ${parseInt(insertAtIndex)}`;
  
  alert(`New row inserted ${positionText} successfully!`);
}, [insertAtIndex, isAddingRow, addRowToSpreadsheet]);

  const toggleRowSelection = useCallback((rowIndex) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowIndex)) {
      newSelectedRows.delete(rowIndex);
    } else {
      newSelectedRows.add(rowIndex);
    }
    setSelectedRows(newSelectedRows);
  }, [selectedRows]);

  const selectAllRows = useCallback(() => {
    const currentData = fileData.all_sheets[fileData.active_sheet].data;
    const allRowIndices = Array.from({ length: currentData.length }, (_, i) => i);
    setSelectedRows(new Set(allRowIndices));
  }, [fileData]);

  const clearRowSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  // NEW FUNCTION: Add column to specific category
  const addColumnToCategory = useCallback(async (categoryId, position = 'end') => {
  if (!hotInstanceRef.current || !categoryMapping || !fileData || isAddingColumn) return;
  
  setIsAddingColumn(true);
  
  try {
    const categoryColumns = categoryMapping[categoryId] || [];
    const headers = [...fileData.all_sheets[fileData.active_sheet].headers];
    
    // Determine where to insert the new column - FIXED LOGIC
    let insertIndex;
    if (position === 'end' && categoryColumns.length > 0) {
      // Insert right after the last column of this category
      insertIndex = Math.max(...categoryColumns) + 1;
    } else if (position === 'start' && categoryColumns.length > 0) {
      // Insert at the beginning of this category
      insertIndex = Math.min(...categoryColumns);
    } else {
      // If no columns in category, add at the END of the category's expected position
      if (categoryId === 'quiz') {
        const studentCols = categoryMapping.student || [];
        // Add at the end of existing quiz columns, or after student columns
        const existingQuizCols = categoryMapping.quiz || [];
        if (existingQuizCols.length > 0) {
          insertIndex = Math.max(...existingQuizCols) + 1;
        } else {
          insertIndex = studentCols.length > 0 ? Math.max(...studentCols) + 1 : 3; // Default after 3 student columns
        }
      } else if (categoryId === 'laboratory') {
        const existingLabCols = categoryMapping.laboratory || [];
        if (existingLabCols.length > 0) {
          insertIndex = Math.max(...existingLabCols) + 1;
        } else {
          const quizCols = categoryMapping.quiz || [];
          const studentCols = categoryMapping.student || [];
          const allPrevious = [...studentCols, ...quizCols];
          insertIndex = allPrevious.length > 0 ? Math.max(...allPrevious) + 1 : headers.length;
        }
      } else if (categoryId === 'exams') {
        const existingExamCols = categoryMapping.exams || [];
        if (existingExamCols.length > 0) {
          insertIndex = Math.max(...existingExamCols) + 1;
        } else {
          const labCols = categoryMapping.laboratory || [];
          const quizCols = categoryMapping.quiz || [];
          const studentCols = categoryMapping.student || [];
          const allPrevious = [...studentCols, ...quizCols, ...labCols];
          insertIndex = allPrevious.length > 0 ? Math.max(...allPrevious) + 1 : headers.length;
        }
      } else {
        insertIndex = headers.length;
      }
    }
    
    // Create new column name
    const categoryName = categoryId === 'quiz' ? 'Quiz' : 
                        categoryId === 'laboratory' ? 'Lab' :
                        categoryId === 'exams' ? 'Exam' : 'Column';
    
    const existingCount = categoryColumns.length;
    const newColumnName = `${categoryName} ${existingCount + 1}`;
    
    // Update headers array
    const newHeaders = [...headers];
    newHeaders.splice(insertIndex, 0, newColumnName);
    
    // Update the data to include the new column
    const updatedData = fileData.all_sheets[fileData.active_sheet].data.map(row => {
      const newRow = { ...row };
      newRow[newColumnName] = null; // Add empty value for new column
      return newRow;
    });
    
    // 🚨 FIXED: Create updated category mapping with proper index adjustments
    const updatedCategoryMapping = { ...categoryMapping };
    
    // STEP 1: Adjust all column indices after the insertion point for ALL categories
    Object.keys(updatedCategoryMapping).forEach(catId => {
      if (Array.isArray(updatedCategoryMapping[catId])) {
        updatedCategoryMapping[catId] = updatedCategoryMapping[catId].map(colIndex => 
          colIndex >= insertIndex ? colIndex + 1 : colIndex
        );
      }
    });
    
    // STEP 2: Add the new column to the target category at the original insertIndex
    if (!updatedCategoryMapping[categoryId]) {
      updatedCategoryMapping[categoryId] = [];
    }
    
    // Insert the new column at the correct position in the target category
    updatedCategoryMapping[categoryId].push(insertIndex);
    updatedCategoryMapping[categoryId].sort((a, b) => a - b);
    
    console.log("=== DEBUGGING CATEGORY MAPPING UPDATE ===");
    console.log("Original category mapping:", categoryMapping);
    console.log("Insert index:", insertIndex);
    console.log("Updated category mapping:", updatedCategoryMapping);
    console.log("New headers:", newHeaders);
    
    // Save category mappings to backend
    const saveSuccess = await saveCategoryMappings(updatedCategoryMapping, newHeaders);
    if (!saveSuccess) {
      throw new Error('Failed to save category mappings to backend');
    }
    
    // Update local state
    setCategoryMapping(updatedCategoryMapping);
    
    // Update fileData structure
    fileData.all_sheets[fileData.active_sheet].headers = newHeaders;
    fileData.all_sheets[fileData.active_sheet].data = updatedData;

    if (onSave) {
      const updatedFileData = {
        ...fileData,
        all_sheets: {
          ...fileData.all_sheets,
          [fileData.active_sheet]: {
            headers: newHeaders,
            data: updatedData
          }
        }
      };
      
      await onSave(updatedFileData);
      console.log("✅ Data saved with new column");
    }
    
    // Destroy and recreate the table
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }
    
    console.log(`Successfully added column "${newColumnName}" to ${categoryId} category`);
    
    // Close the column manager
    setShowColumnManager(false);
    
  } catch (error) {
    console.error('Error adding column:', error);
    alert('Failed to add column. Please try again.');
  } finally {
    setIsAddingColumn(false);
  }
}, [categoryMapping, fileData, saveCategoryMappings, isAddingColumn]);

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
        setShowColumnManager(false); // NEW: Close column manager on Escape
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
    if (!fileData || !fileData.all_sheets || !categoryMapping) {
      return [[], []];
    }

    const activeSheet = fileData.active_sheet;
    const sheetData = fileData.all_sheets[activeSheet];
    const headers = sheetData.headers || [];

    console.log("=== FIXED NESTED HEADERS GENERATION ===");
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
    categoryRow.forEach((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        console.log(`[${idx}] Category: "${item.label}" (colspan: ${item.colspan})`);
      } else {
        console.log(`[${idx}] Empty: "${item}"`);
      }
    });

    console.log("Category row length:", categoryRow.length);
    console.log("Column headers length:", columnHeaders.length);

    return [categoryRow, columnHeaders];
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

  // Initialize Handsontable when data is ready - FIXED VERSION
    useEffect(() => {
    if (isHandsontableLoaded && hotTableRef.current && window.Handsontable && fileData && categoryMapping) {
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

      // Add safety check for DOM element
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

      // Safety checks
      const fixedColumns = categoryMapping?.student?.length || 1;
      const activeSheet = fileData?.active_sheet;
      const headers = fileData?.all_sheets?.[activeSheet]?.headers;
      
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
        // MODIFIED: Updated context menu to discourage manual column insertion
        contextMenu: {
          items: {
            'copy': { name: 'Copy' },
            'cut': { name: 'Cut' },
            'paste': { name: 'Paste' },
            'sp1': '---------',
            'undo': { name: 'Undo' },
            'redo': { name: 'Redo' },
            'sp2': '---------',
            'custom_add_column': {
              name: '⚠️ Use "Manage Columns" button above',
              disabled: true,
              disableSelection: true
            }
          }
        },
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
        afterInit: function() {
          console.log("=== HANDSONTABLE INITIALIZED SUCCESSFULLY ===");
          console.log("Headers should now be properly aligned");

          // Safe DOM inspection with proper checks
          setTimeout(() => {
            try {
              // Check if rootElement exists and is still valid
              if (!this.rootElement) {
                console.warn("Root element not available yet");
                return;
              }

              const headerTable = this.rootElement.querySelector('.handsontable thead');
              if (!headerTable) {
                console.warn("Header table not found in DOM");
                return;
              }

              const rows = headerTable.querySelectorAll('tr');
              if (!rows || rows.length === 0) {
                console.warn("No header rows found");
                return;
              }

              console.log(`Final header structure: ${rows.length} rows`);

              // Safely check first row (categories)
              if (rows[0]) {
                const categoryHeaders = rows[0].querySelectorAll('th');
                console.log(`=== FINAL CATEGORY HEADERS (${categoryHeaders.length}) ===`);
                categoryHeaders.forEach((th, index) => {
                  if (th) {
                    const colspan = th.getAttribute('colspan') || '1';
                    const text = th.textContent ? th.textContent.trim() : '';
                    console.log(`[${index}] "${text}" (colspan: ${colspan})`);
                  }
                });
              }

              // Safely check second row (column headers)
              if (rows[1]) {
                const columnHeaders = rows[1].querySelectorAll('th');
                console.log(`=== FINAL COLUMN HEADERS (${columnHeaders.length}) ===`);
                columnHeaders.forEach((th, index) => {
                  if (th) {
                    const text = th.textContent ? th.textContent.trim() : '';
                    console.log(`[${index}] "${text}"`);
                  }
                });
              }
            } catch (error) {
              console.error("Error during DOM inspection:", error);
            }
          }, 250);
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
  }, [isHandsontableLoaded, fileData, categoryMapping, searchTerm]);

  // Enhanced search functionality
  useEffect(() => {
    if (hotInstanceRef.current && searchTerm) {
      // Temporarily disabled to avoid getPlugin errors
      // const searchPlugin = hotInstanceRef.current.getPlugin('search');
      // searchPlugin.query(searchTerm);
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

  StatusMessage.propTypes = {
    status: PropTypes.string,
    type: PropTypes.oneOf(['success', 'error'])
  };

  const RowManager = () => {
  if (!showRowManager || !fileData) return null;
  
  const currentRowCount = fileData.all_sheets[fileData.active_sheet]?.data?.length || 0;
  
  return (
    <div 
      className="fixed top-20 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-96 max-h-[80vh] overflow-y-auto"
      style={{ zIndex: 9999 }} // 🔧 FORCE HIGH Z-INDEX
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <span>👥</span>
          <span>Advanced Row Management</span>
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              console.log("Toggle clicked, current state:", showAdvancedRowOptions); // 🔍 DEBUG
              setShowAdvancedRowOptions(!showAdvancedRowOptions);
            }}
            className={`px-3 py-1 text-xs rounded font-medium transition-all ${
              showAdvancedRowOptions 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showAdvancedRowOptions ? '🔽 Hide Advanced' : '🔼 Show Advanced'}
          </button>
          <button
            onClick={() => setShowRowManager(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Quick Add/Delete Section */}
        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <span className="text-lg">⚡</span>
              <div>
                <div className="text-sm font-medium text-gray-900">Quick Actions</div>
                <div className="text-xs text-gray-500">
                  {currentRowCount} students • {selectedRows.size} selected
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addRowToSpreadsheet('end')}
              disabled={isAddingRow}
              className={`px-2 py-1 ${isAddingRow ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white text-xs rounded transition-all flex items-center justify-center space-x-1`}
            >
              {isAddingRow ? <Loader2 size={10} className="animate-spin" /> : <span>➕</span>}
              <span>Add Last</span>
            </button>
            
            <button
              onClick={deleteLastRow}
              disabled={isDeletingRow || currentRowCount === 0}
              className={`px-2 py-1 ${isDeletingRow || currentRowCount === 0 ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white text-xs rounded transition-all flex items-center justify-center space-x-1`}
            >
              {isDeletingRow ? <Loader2 size={10} className="animate-spin" /> : <span>🗑️</span>}
              <span>Delete Last</span>
            </button>
            
            <button
              onClick={deleteEmptyRows}
              disabled={isDeletingRow || currentRowCount === 0}
              className={`px-2 py-1 ${isDeletingRow || currentRowCount === 0 ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'} text-white text-xs rounded transition-all flex items-center justify-center space-x-1 col-span-2`}
            >
              {isDeletingRow ? <Loader2 size={10} className="animate-spin" /> : <span>🧹</span>}
              <span>Clear Empty Rows</span>
            </button>
          </div>
        </div>

        {/* 🔧 DEBUG: Show current state */}
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          Debug: Advanced options {showAdvancedRowOptions ? 'SHOWN' : 'HIDDEN'}
        </div>

        {/* Advanced Options - 🔧 FORCED VISIBILITY FOR TESTING */}
        {showAdvancedRowOptions && (
          <div className="space-y-4 border-t pt-4">
            {/* Multi-Select Section */}
            <div className="p-3 rounded-lg border bg-purple-50 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Multi-Select Actions</div>
                    <div className="text-xs text-gray-500">{selectedRows.size} rows selected</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      console.log("Select All clicked"); // 🔍 DEBUG
                      selectAllRows();
                    }}
                    disabled={currentRowCount === 0}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-all flex-1"
                  >
                    Select All ({currentRowCount})
                  </button>
                  <button
                    onClick={() => {
                      console.log("Clear Selection clicked"); // 🔍 DEBUG
                      clearRowSelection();
                    }}
                    disabled={selectedRows.size === 0}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-all flex-1"
                  >
                    Clear Selection
                  </button>
                </div>
                
                {selectedRows.size > 0 && (
                  <button
                    onClick={deleteSelectedRows}
                    disabled={isDeletingRow}
                    className={`w-full px-2 py-1 ${isDeletingRow ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white text-xs rounded transition-all flex items-center justify-center space-x-1`}
                  >
                    {isDeletingRow ? <Loader2 size={10} className="animate-spin" /> : <span>🗑️</span>}
                    <span>Delete Selected ({selectedRows.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Specific Row Actions */}
            <div className="p-3 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">🔧</span>
                <div className="text-sm font-medium text-gray-900">Specific Row Actions</div>
              </div>
              
              <div className="space-y-3">
                {/* Delete Specific Row */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-600 font-medium">Delete Specific Row:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={currentRowCount}
                      value={specificRowIndex}
                      onChange={(e) => {
                        console.log("Specific row input:", e.target.value); // 🔍 DEBUG
                        setSpecificRowIndex(e.target.value);
                      }}
                      placeholder={`1-${currentRowCount}`}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        console.log("Delete specific row clicked:", specificRowIndex); // 🔍 DEBUG
                        deleteSpecificRow();
                      }}
                      disabled={!specificRowIndex || isDeletingRow || currentRowCount === 0}
                      className={`px-3 py-1 ${!specificRowIndex || isDeletingRow || currentRowCount === 0 ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white text-xs rounded transition-all flex items-center space-x-1 flex-1`}
                    >
                      <span>🗑️</span>
                      <span>Delete Row #{specificRowIndex || '?'}</span>
                    </button>
                  </div>
                </div>
                
                {/* Duplicate Row */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-600 font-medium">Duplicate Row:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={currentRowCount}
                      value={duplicateRowIndex}
                      onChange={(e) => {
                        console.log("Duplicate row input:", e.target.value); // 🔍 DEBUG
                        setDuplicateRowIndex(e.target.value);
                      }}
                      placeholder={`1-${currentRowCount}`}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        console.log("Duplicate row clicked:", duplicateRowIndex); // 🔍 DEBUG
                        duplicateRow();
                      }}
                      disabled={!duplicateRowIndex || isAddingRow || currentRowCount === 0}
                      className={`px-3 py-1 ${!duplicateRowIndex || isAddingRow || currentRowCount === 0 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs rounded transition-all flex items-center space-x-1 flex-1`}
                    >
                      <span>📋</span>
                      <span>Copy Row #{duplicateRowIndex || '?'}</span>
                    </button>
                  </div>
                </div>
                
                {/* Insert at Position */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-600 font-medium">Insert New Row at Position:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={currentRowCount + 1}
                      value={insertAtIndex}
                      onChange={(e) => {
                        console.log("Insert position input:", e.target.value); // 🔍 DEBUG
                        setInsertAtIndex(e.target.value);
                      }}
                      placeholder={`1-${currentRowCount + 1}`}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        console.log("Insert at position clicked:", insertAtIndex); // 🔍 DEBUG
                        insertRowAtPosition();
                      }}
                      disabled={!insertAtIndex || isAddingRow}
                      className={`px-3 py-1 ${!insertAtIndex || isAddingRow ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white text-xs rounded transition-all flex items-center space-x-1 flex-1`}
                    >
                      <span>📍</span>
                      <span>Insert at #{insertAtIndex || '?'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info size={14} className="text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-700">
            <strong>Row Management Guide:</strong>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Quick Actions:</strong> Fast add/delete operations</li>
              <li>• <strong>Advanced:</strong> Click "Show Advanced" for precise controls</li>
              <li>• <strong>Multi-Select:</strong> Select multiple rows for batch operations</li>
              <li>• <strong>Specific Actions:</strong> Target exact rows by number</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

  // NEW COMPONENT: Category Column Manager
  const CategoryColumnManager = () => {
  if (!showColumnManager || !categoryMapping) return null;
  
  const categories = [
    { id: 'quiz', name: 'Quiz', icon: '📝', color: 'bg-blue-50 border-blue-200' },
    { id: 'laboratory', name: 'Laboratory Activities', icon: '🧪', color: 'bg-green-50 border-green-200' },
    { id: 'exams', name: 'Exams', icon: '📋', color: 'bg-purple-50 border-purple-200' }
  ];
  
  return (
    <div 
      className="fixed top-20 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-96 max-h-[80vh] overflow-y-auto"
      style={{ zIndex: 9999 }} // 🔧 FORCE HIGH Z-INDEX
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <span>📊</span>
          <span>Manage Columns by Category</span>
        </h3>
        <button
          onClick={() => setShowColumnManager(false)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        {categories.map(category => {
          const columnCount = categoryMapping[category.id]?.length || 0;
          return (
            <div key={category.id} className={`p-3 rounded-lg border ${category.color}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{category.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    <div className="text-xs text-gray-500">{columnCount} columns currently</div>
                  </div>
                </div>
              </div>
              
              {/* Add Column Section */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                  <span>➕</span>
                  <span>Add Column</span>
                </div>
                <button
                  onClick={() => {
                    console.log(`Adding column to ${category.id} category`); // 🔍 DEBUG
                    addColumnToCategory(category.id);
                  }}
                  disabled={isAddingColumn}
                  className={`px-3 py-1 ${isAddingColumn ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white text-xs rounded transition-all flex items-center space-x-1 shadow-sm`}
                >
                  {isAddingColumn ? <Loader2 size={12} className="animate-spin" /> : <span>+</span>}
                  <span>{isAddingColumn ? 'Adding...' : 'Add'}</span>
                </button>
              </div>
              
              {/* Delete Column Section */}
              {columnCount > 0 && (
                <div className="border-t pt-2 mt-2">
                  <div className="text-xs font-medium text-gray-700 flex items-center space-x-1 mb-2">
                    <span>🗑️</span>
                    <span>Delete Columns</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        console.log(`Deleting last column from ${category.id} category`); // 🔍 DEBUG
                        deleteColumnFromCategory(category.id, 'last');
                      }}
                      disabled={isDeletingColumn || columnCount === 0}
                      className={`px-2 py-1 ${isDeletingColumn || columnCount === 0 ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white text-xs rounded transition-all flex items-center space-x-1 shadow-sm`}
                      title="Delete the last column in this category"
                    >
                      {isDeletingColumn ? <Loader2 size={10} className="animate-spin" /> : <span>🔻</span>}
                      <span>Delete Last</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log(`Clearing empty columns from ${category.id} category`); // 🔍 DEBUG
                        deleteEmptyColumnsFromCategory(category.id);
                      }}
                      disabled={isDeletingColumn || columnCount === 0}
                      className={`px-2 py-1 ${isDeletingColumn || columnCount === 0 ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'} text-white text-xs rounded transition-all flex items-center space-x-1 shadow-sm`}
                      title="Delete all empty columns in this category"
                    >
                      {isDeletingColumn ? <Loader2 size={10} className="animate-spin" /> : <span>🧹</span>}
                      <span>Clear Empty</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-700">
            <strong>Column Management Tips:</strong>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Add:</strong> Creates new column at the end of category</li>
              <li>• <strong>Delete Last:</strong> Removes the rightmost column in category</li>
              <li>• <strong>Clear Empty:</strong> Removes columns with no data</li>
              <li>• Categories stay properly aligned and headers update automatically</li>
              <li>• Student info columns are protected from deletion</li>
            </ul>
          </div>
        </div>
      </div>
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

            {/* NEW: Manage Rows button */}
            <button
              onClick={() => setShowRowManager(!showRowManager)}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-all shadow-sm"
              title="Add student rows"
            >
              <span>👥</span>
              <span className="text-sm">Manage Rows</span>
            </button>

            {/* NEW: Manage Columns button */}
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-all shadow-sm"
              title="Add columns to categories"
            >
              <span>📊</span>
              <span className="text-sm">Manage Columns</span>
            </button>

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

      {/* NEW: Row Manager Component */}
      {showRowManager && <RowManager />}
      
      {/* NEW: Column Manager Component */}
      {showColumnManager && <CategoryColumnManager />}

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
            <span>Double-click to edit • Use "Manage Columns" for adding columns • Ctrl+S to save</span>
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