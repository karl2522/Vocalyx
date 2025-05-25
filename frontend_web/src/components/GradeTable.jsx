import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.min.css';
import { registerAllModules } from 'handsontable/registry';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

// Register all Handsontable modules
registerAllModules();

const GradeTable = ({ data, readOnly = false, onTableChange }) => {
  const hotRef = useRef(null);
  const [tableData, setTableData] = useState(data || generateDefaultData());

  // Generate default data structure if none provided
  function generateDefaultData() {
    return [
      ['', '4', '5', '1', '2', '3', '4', '5', '', '', '', '', ''],
      ['', 'SW 4', 'SW 5', 'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5', 'PE', 'ME', 'PFE', 'FE', 'Remarks'],
      ['1', '93', '89', '85', '87', '90', '93', '89', '100', '100', '100', '100', ''],
      ['2', '93', '89', '85', '87', '90', '93', '89', '100', '100', '100', '100', ''],
    ];
  }

  useEffect(() => {
    if (data && data.length > 0) {
      setTableData(data);
    }
  }, [data]);

  const handleTableChange = (changes) => {
    if (changes) {
      const changedData = [...tableData];
      
      changes.forEach((change) => {
        const row = change[0];
        const column = change[1];
        // Skip change[2] which is the old value
        const newValue = change[3];
        changedData[row][column] = newValue;
      });
      
      setTableData(changedData);
      
      if (onTableChange) {
        onTableChange(changedData);
      }
    }
  };

  // Define column headers and spans
  const mergedCells = [
    { row: 0, col: 3, rowspan: 1, colspan: 5 }, // Laboratory Works header
  ];

  // Custom cell renderer for styling
  const cellRenderer = (instance, td, row, col, prop, value) => {
    // Header rows
    if (row === 0 || row === 1) {
      td.style.fontWeight = 'bold';
      td.style.textAlign = 'center';
      
      if (row === 0) {
        // First header row
        if (col >= 3 && col <= 7) {
          // Laboratory Works column
          td.style.backgroundColor = '#333D79'; // Dark blue matching your site theme
          td.style.color = '#ffffff';
        } else {
          // Other header cells in first row
          td.style.backgroundColor = '#4A5491'; // Medium blue from your site
          td.style.color = '#ffffff';
        }
      } else if (row === 1) {
        // Second header row
        td.style.backgroundColor = '#4A5491'; // Use your site's blue
        td.style.color = '#ffffff';
      }
    } 
    // Student data rows
    else if (col === 0) {
      // Student number column
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = '#EEF0F8'; // Light blue background from your site
    }
    
    // Add cell value
    td.innerHTML = value === null ? '' : value;

    return td;
  };

  return (
    <div className="grade-table-container">
      <HotTable
        ref={hotRef}
        data={tableData}
        height="auto"
        width="100%"
        rowHeaders={false}
        colHeaders={false}
        contextMenu={!readOnly}
        manualColumnResize={!readOnly}
        manualRowResize={!readOnly}
        readOnly={readOnly}
        licenseKey="non-commercial-and-evaluation"
        afterChange={handleTableChange}
        mergeCells={mergedCells}
        className="htCenter"
        cells={cellRenderer}
        stretchH="all"
        settings={{
          // Table settings
          className: 'htCenter',
          // Allow specific operations even in readOnly mode
          allowInvalid: false,
        }}
      />

      <style>{`
        .grade-table-container {
          margin: 20px 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        /* Override Handsontable default styles */
        .handsontable {
          font-family: inherit;
        }
        
        .handsontable .htCenter {
          text-align: center;
        }
        
        .handsontable td {
          vertical-align: middle;
        }

        .handsontable th {
          background-color: #333D79;
          color: white;
        }
        
        /* Headers */
        .handsontable .ht_master .wtHolder {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

// Add prop validations
GradeTable.propTypes = {
  data: PropTypes.array,
  readOnly: PropTypes.bool,
  onTableChange: PropTypes.func
};

export default GradeTable; 