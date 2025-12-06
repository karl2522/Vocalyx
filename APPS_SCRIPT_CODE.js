/**
 * Google Apps Script Code for Category Settings Management
 * 
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this code into the editor
 * 4. Save the project
 * 5. Deploy as Web App (see PHASE_2_GUIDE.md)
 */

/**
 * Determines which SETTINGS tab to use based on sheet type.
 * 
 * @param {string} sheetType - Sheet type: 'midterm' or 'final'
 * @returns {string} Name of the settings tab to use
 */
function getSettingsTabName(sheetType) {
  if (sheetType && typeof sheetType === 'string') {
    const normalizedType = sheetType.toLowerCase().trim();
    if (normalizedType === 'midterm') {
      return 'SETTINGS_MIDTERM';
    }
    if (normalizedType === 'final') {
      return 'SETTINGS_FINAL';
    }
  }
  // Default to midterm if not specified
  return 'SETTINGS_MIDTERM';
}

/**
 * REGISTERS a new category in the SETTINGS sheet.
 * 
 * CRITICAL: Uses provided internalId if available (from backend).
 * Only generates ID as fallback if not provided.
 * 
 * @param {string} displayName - Display name (e.g., "Quiz")
 * @param {number} weightDecimal - Weight as decimal (e.g., 0.40)
 * @param {string} internalId - OPTIONAL: Pre-generated ID from backend (RECOMMENDED)
 * @param {string} sheetType - OPTIONAL: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to use
 * @param {string} formulaReference - OPTIONAL: Formula reference (e.g., "=Midterm!O2") to auto-sync with sheet
 * @returns {Object} Status object with message and internalId
 */
function registerCategoryInSettings(displayName, weightDecimal, internalId = null, sheetType = null, formulaReference = null, spreadsheetId = null) {
  // DEBUG: Log spreadsheet ID parameter
  Logger.log("=== registerCategoryInSettings START ===");
  Logger.log(`DEBUG: registerCategoryInSettings called with spreadsheetId: ${spreadsheetId || 'NULL/UNDEFINED'}`);
  Logger.log(`DEBUG: spreadsheetId type: ${typeof spreadsheetId}`);
  
  // FIX: Use provided spreadsheet ID to write to user's sheet, not template
  let ss;
  if (spreadsheetId) {
    Logger.log(`DEBUG: Opening spreadsheet by ID: '${spreadsheetId}'`);
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
      Logger.log(`SUCCESS: Opened user's spreadsheet: '${ss.getName()}' (ID: ${ss.getId()})`);
    } catch (e) {
      Logger.log(`ERROR: Failed to open spreadsheet by ID '${spreadsheetId}': ${e.toString()}`);
      Logger.log(`Falling back to active spreadsheet (TEMPLATE)`);
      ss = SpreadsheetApp.getActiveSpreadsheet();
      Logger.log(`WARNING: Using template spreadsheet: '${ss.getName()}' (ID: ${ss.getId()})`);
    }
  } else {
    Logger.log(`CRITICAL: No spreadsheetId provided - using active spreadsheet (TEMPLATE)`);
    ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`WARNING: Using template spreadsheet: '${ss.getName()}' (ID: ${ss.getId()})`);
  }
  
  const settingsTabName = getSettingsTabName(sheetType);
  Logger.log(`DEBUG: Looking for settings tab: '${settingsTabName}' in spreadsheet '${ss.getName()}'`);
  const settingsSheet = ss.getSheetByName(settingsTabName);
  
  // Check if settings sheet exists
  if (!settingsSheet) {
    return {
      status: "error",
      message: `Settings tab '${settingsTabName}' not found`,
      internalId: null
    };
  }
  
  return registerCategoryInSettingsWithSheet(displayName, weightDecimal, internalId, settingsSheet, formulaReference);
}

/**
 * Internal helper function to register category in a specific sheet.
 * 
 * @param {string} displayName - Display name
 * @param {number} weightDecimal - Weight as decimal
 * @param {string} internalId - Internal ID (optional)
 * @param {Sheet} settingsSheet - The settings sheet to write to
 * @param {string} formulaReference - OPTIONAL: Formula reference (e.g., "=Midterm!O2") to auto-sync with sheet
 * @returns {Object} Status object
 */
function registerCategoryInSettingsWithSheet(displayName, weightDecimal, internalId, settingsSheet, formulaReference = null) {

  // 🔥 STEP 1: Use provided ID or generate as fallback
  let finalInternalId;
  
  if (internalId && internalId.trim()) {
    // ✅ USE PROVIDED ID (from backend) - This ensures consistency!
    finalInternalId = internalId.toUpperCase().trim();
    
    // Validate format (must match backend validation)
    if (!/^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(finalInternalId)) {
      return {
        status: "error",
        message: "Invalid internal ID format",
        internalId: finalInternalId
      };
    }
  } else {
    // ⚠️ FALLBACK: Generate ID (should rarely happen if backend works correctly)
    // This logic MUST match backend generate_category_id() exactly
    finalInternalId = displayName.toUpperCase().trim();
    finalInternalId = finalInternalId.replace(/[^A-Z0-9]/g, "_");  // Replace non-alphanumeric
    finalInternalId = finalInternalId.replace(/_+/g, "_");  // Remove consecutive underscores
    finalInternalId = finalInternalId.replace(/^_|_$/g, "");  // Remove leading/trailing underscores
  }

  // 🔥 STEP 2: CHECK FOR DUPLICATES
  // Note: INTERNAL_ID is in Column B (not A)
  const existingIds = settingsSheet.getRange("B2:B" + settingsSheet.getLastRow()).getValues().flat();
  const normalizedExistingIds = existingIds.map(id => String(id).toUpperCase().trim()).filter(id => id);
  
  if (normalizedExistingIds.includes(finalInternalId)) {
    return {
      status: "error",
      message: "Category already exists",
      internalId: finalInternalId
    };
  }

  // 🔥 STEP 3: APPEND TO SETTINGS SHEET
  // Note: Data structure starts from Column B (not A)
  // Column A is empty, Column B = INTERNAL_ID, Column C = DISPLAY_NAME, Column D = WEIGHT
  const lastRow = settingsSheet.getLastRow() + 1;
  
  // DEBUG: Log which spreadsheet we're writing to
  const parentSpreadsheet = settingsSheet.getParent();
  Logger.log(`DEBUG: Writing metadata to spreadsheet: '${parentSpreadsheet.getName()}' (ID: ${parentSpreadsheet.getId()})`);
  Logger.log(`DEBUG: Writing to tab: '${settingsSheet.getName()}', row: ${lastRow}`);
  Logger.log(`DEBUG: Metadata: ID='${finalInternalId}', Name='${displayName}', Formula='${formulaReference || 'N/A'}'`);
  
  // Write to columns B, C, D (not A, B, C)
  settingsSheet.getRange(lastRow, 2).setValue(finalInternalId);  // Column B: INTERNAL_ID
  settingsSheet.getRange(lastRow, 3).setValue(displayName);   // Column C: DISPLAY_NAME
  
  // 🔥 PHASE 2: Write formula if provided, otherwise write value
  if (formulaReference && formulaReference.trim()) {
    // Write formula: =Midterm!O2 (auto-syncs with sheet)
    settingsSheet.getRange(lastRow, 4).setFormula(formulaReference);
    Logger.log(`✅ Wrote formula '${formulaReference}' for ${displayName}`);
  } else {
    // Fallback: Write value (for backward compatibility)
    settingsSheet.getRange(lastRow, 4).setValue(weightDecimal);
    Logger.log(`✅ Wrote value ${weightDecimal} for ${displayName}`);
  }
  
  // 🔥 STEP 4: VERIFY the write was successful
  const writtenId = settingsSheet.getRange(lastRow, 2).getValue();  // Read from Column B
  
  if (String(writtenId).toUpperCase().trim() !== finalInternalId) {
    // This should never happen, but log if it does
    Logger.log("WARNING: ID mismatch after write!");
    Logger.log("Expected: " + finalInternalId);
    Logger.log("Written: " + writtenId);
  }
  
  return {
    status: "success",
    message: "Success",
    internalId: finalInternalId,
    writtenId: String(writtenId).toUpperCase().trim()  // Return what was actually written
  };
}

/**
 * DELETES a category from the SETTINGS sheet.
 * 
 * @param {string} internalId - Internal ID of the category (e.g., "QUIZ")
 * @param {string} sheetType - OPTIONAL: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to use
 * @returns {Object} Status object with message
 */
function deleteCategoryFromSettings(internalId, sheetType = null, spreadsheetId = null) {
  // FIX: Use provided spreadsheet ID to delete from user's sheet, not template
  const ss = spreadsheetId 
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  const settingsTabName = getSettingsTabName(sheetType);
  const settingsSheet = ss.getSheetByName(settingsTabName);
  
  // Check if settings sheet exists
  if (!settingsSheet) {
    return {
      status: "error",
      message: `Settings tab '${settingsTabName}' not found`
    };
  }
  
  return deleteCategoryFromSettingsWithSheet(internalId, settingsSheet);
}

/**
 * Internal helper function to delete category from a specific sheet.
 * 
 * @param {string} internalId - Internal ID of the category
 * @param {Sheet} settingsSheet - The settings sheet to delete from
 * @returns {Object} Status object
 */
function deleteCategoryFromSettingsWithSheet(internalId, settingsSheet) {
  
  // Note: INTERNAL_ID is in Column B (not A)
  const dataRange = settingsSheet.getRange("B2:B" + settingsSheet.getLastRow());
  const ids = dataRange.getValues().flat();
  const normalizedIds = ids.map(id => String(id).toUpperCase().trim());
  const rowIndex = normalizedIds.indexOf(internalId.toUpperCase().trim());
  
  if (rowIndex === -1) {
    return {
      status: "error",
      message: "Category not found"
    };
  }
  
  // Delete row (rowIndex + 2 because data starts at row 2, and getRange is 1-based)
  settingsSheet.deleteRow(rowIndex + 2);
  
  return {
    status: "success",
    message: "Success"
  };
}

/**
 * UPDATES the weight of an existing category.
 * 
 * @param {string} internalId - Internal ID of the category
 * @param {number} newWeight - New weight as decimal
 * @param {string} sheetType - OPTIONAL: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to use
 * @returns {Object} Status object with message
 */
function updateCategoryWeight(internalId, newWeight, sheetType = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsTabName = getSettingsTabName(sheetType);
  const settingsSheet = ss.getSheetByName(settingsTabName);
  
  // Check if settings sheet exists
  if (!settingsSheet) {
    return {
      status: "error",
      message: `Settings tab '${settingsTabName}' not found`
    };
  }
  
  return updateCategoryWeightWithSheet(internalId, newWeight, settingsSheet);
}

/**
 * Internal helper function to update category weight in a specific sheet.
 * 
 * @param {string} internalId - Internal ID of the category
 * @param {number} newWeight - New weight as decimal
 * @param {Sheet} settingsSheet - The settings sheet to update
 * @returns {Object} Status object
 */
function updateCategoryWeightWithSheet(internalId, newWeight, settingsSheet) {
  
  // Note: Data structure: Column B = INTERNAL_ID, Column C = DISPLAY_NAME, Column D = WEIGHT
  const dataRange = settingsSheet.getRange("B2:D" + settingsSheet.getLastRow());
  const values = dataRange.getValues();
  
  for (let i = 0; i < values.length; i++) {
    // values[i][0] is Column B (INTERNAL_ID), values[i][2] is Column D (WEIGHT)
    if (String(values[i][0]).toUpperCase().trim() === internalId.toUpperCase().trim()) {
      settingsSheet.getRange(i + 2, 4).setValue(newWeight);  // Column D (4) = WEIGHT
      return {
        status: "success",
        message: "Success"
      };
    }
  }
  
  return {
    status: "error",
    message: "Category not found"
  };
}

/**
 * HTTP POST handler for Web App
 * Handles requests from backend
 */
function doPost(e) {
  try {
    Logger.log("=== doPost START ===");
    Logger.log(`DEBUG: e.postData exists: ${!!e.postData}`);
    Logger.log(`DEBUG: e.postData.contents exists: ${!!(e.postData && e.postData.contents)}`);
    
    if (!e.postData || !e.postData.contents) {
      Logger.log("ERROR: No postData or contents in request");
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // DEBUG: Log received data
    Logger.log("=== doPost START ===");
    Logger.log("DEBUG: doPost received data:");
    Logger.log(`  - action: ${data.action}`);
    if (data.action === "registerCategory") {
      Logger.log(`  - displayName: ${data.displayName}`);
    }
    if (data.action === "deleteCategory") {
      Logger.log(`  - internalId: ${data.internalId || 'UNDEFINED/NULL'}`);
    }
    Logger.log(`  - spreadsheetId: ${data.spreadsheetId || 'UNDEFINED/NULL'}`);
    Logger.log(`  - spreadsheetId type: ${typeof data.spreadsheetId}`);
    Logger.log(`  - All data keys: ${Object.keys(data).join(', ')}`);
    
    if (data.action === "registerCategory") {
      // DEBUG: Check if spreadsheetId is provided
      if (!data.spreadsheetId) {
        Logger.log("CRITICAL: spreadsheetId is missing/undefined! Will write to TEMPLATE (active spreadsheet)");
        Logger.log("This means metadata will be written to template instead of user's sheet!");
      } else {
        Logger.log(`DEBUG: spreadsheetId received: '${data.spreadsheetId}'`);
      }
      
      const result = registerCategoryInSettings(
        data.displayName, 
        data.weight,
        data.internalId,  // CRITICAL: Accept pre-generated ID from backend
        data.sheetType,   // NEW: Accept sheet type ('midterm' or 'final')
        data.formulaReference,  // PHASE 2: Accept formula reference (e.g., "=Midterm!O2")
        data.spreadsheetId  // FIX: Accept spreadsheet ID to write to user's sheet, not template
      );
      
      Logger.log(`=== doPost END - Result status: ${result.status} ===`);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === "deleteCategory") {
      // DEBUG: Check if spreadsheetId is provided
      if (!data.spreadsheetId) {
        Logger.log("CRITICAL: spreadsheetId is missing/undefined! Will delete from TEMPLATE (active spreadsheet)");
        Logger.log("This means metadata will be deleted from template instead of user's sheet!");
      } else {
        Logger.log(`DEBUG: spreadsheetId received: '${data.spreadsheetId}'`);
      }
      
      const result = deleteCategoryFromSettings(
        data.internalId,
        data.sheetType,  // NEW: Accept sheet type
        data.spreadsheetId  // FIX: Accept spreadsheet ID to delete from user's sheet, not template
      );
      
      Logger.log(`=== doPost END (deleteCategory) - Result status: ${result.status} ===`);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === "updateCategoryWeight") {
      const result = updateCategoryWeight(
        data.internalId, 
        data.weight,
        data.sheetType  // 🔥 NEW: Accept sheet type
      );
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Unknown action"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log("=== doPost ERROR ===");
    Logger.log("Error in doPost: " + error.toString());
    Logger.log("Error stack: " + (error.stack || 'No stack trace'));
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", 
      message: error.toString(),
      stack: error.stack || 'No stack trace'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * TEST FUNCTION: Test writing metadata to a specific sheet ID
 * Run this from Apps Script editor to test if Apps Script can access and write to user's sheet
 * 
 * @param {string} testSpreadsheetId - The spreadsheet ID to test (e.g., "166IeSP-KsC0s1c9Crl8udyGvWXfHEpxgfpLMo62oPOI")
 * @returns {Object} Test result with success status and details
 */
function testWriteMetadataToSheet(testSpreadsheetId) {
  try {
    // Use default sheet ID if not provided
    if (!testSpreadsheetId) {
      testSpreadsheetId = "166IeSP-KsC0s1c9Crl8udyGvWXfHEpxgfpLMo62oPOI";
      Logger.log("⚠️ TEST: No spreadsheet ID provided, using default test sheet ID");
    }
    
    Logger.log("🧪 TEST: Starting metadata write test...");
    Logger.log(`🧪 TEST: Spreadsheet ID: ${testSpreadsheetId}`);
    
    // Step 1: Try to open the spreadsheet
    let ss;
    try {
      ss = SpreadsheetApp.openById(testSpreadsheetId);
      Logger.log("✅ TEST: Successfully opened spreadsheet");
    } catch (e) {
      Logger.log(`❌ TEST: Failed to open spreadsheet: ${e.toString()}`);
      return {
        success: false,
        error: `Cannot open spreadsheet: ${e.toString()}`,
        step: "openById"
      };
    }
    
    // Step 2: Check if SETTINGS_MIDTERM tab exists
    const settingsMidtermSheet = ss.getSheetByName("SETTINGS_MIDTERM");
    if (!settingsMidtermSheet) {
      Logger.log("❌ TEST: SETTINGS_MIDTERM tab not found");
      return {
        success: false,
        error: "SETTINGS_MIDTERM tab not found",
        step: "checkSettingsTab",
        availableSheets: ss.getSheets().map(s => s.getName())
      };
    }
    Logger.log("✅ TEST: SETTINGS_MIDTERM tab exists");
    
    // Step 3: Try to write test metadata
    const lastRow = settingsMidtermSheet.getLastRow() + 1;
    const testInternalId = "TEST_CATEGORY_" + new Date().getTime();
    const testDisplayName = "Test Category";
    const testFormula = "=Midterm!A2";
    
    try {
      settingsMidtermSheet.getRange(lastRow, 2).setValue(testInternalId);  // Column B: INTERNAL_ID
      settingsMidtermSheet.getRange(lastRow, 3).setValue(testDisplayName);  // Column C: DISPLAY_NAME
      settingsMidtermSheet.getRange(lastRow, 4).setFormula(testFormula);     // Column D: WEIGHT (formula)
      Logger.log(`✅ TEST: Successfully wrote test metadata to row ${lastRow}`);
      
      // Step 4: Verify the write
      const writtenId = settingsMidtermSheet.getRange(lastRow, 2).getValue();
      const writtenName = settingsMidtermSheet.getRange(lastRow, 3).getValue();
      const writtenFormula = settingsMidtermSheet.getRange(lastRow, 4).getFormula();
      
      Logger.log(`✅ TEST: Verification - Written ID: ${writtenId}, Name: ${writtenName}, Formula: ${writtenFormula}`);
      
      return {
        success: true,
        message: "Test metadata written successfully",
        testRow: lastRow,
        writtenData: {
          internalId: writtenId,
          displayName: writtenName,
          formula: writtenFormula
        },
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl()
      };
    } catch (e) {
      Logger.log(`❌ TEST: Failed to write metadata: ${e.toString()}`);
      return {
        success: false,
        error: `Cannot write to SETTINGS_MIDTERM: ${e.toString()}`,
        step: "writeMetadata"
      };
    }
    
  } catch (e) {
    Logger.log(`❌ TEST: Unexpected error: ${e.toString()}`);
    return {
      success: false,
      error: `Unexpected error: ${e.toString()}`,
      step: "unexpected"
    };
  }
}

/**
 * Quick test function - run this from Apps Script editor
 * Tests the specific sheet ID provided by user
 */
function runTestForUserSheet() {
  const testSheetId = "166IeSP-KsC0s1c9Crl8udyGvWXfHEpxgfpLMo62oPOI";
  Logger.log(`🧪 TEST: Running test for sheet ID: ${testSheetId}`);
  const result = testWriteMetadataToSheet(testSheetId);
  Logger.log("🧪 TEST RESULT:");
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Alternative: Test with default sheet ID if no parameter provided
 * You can also call: testWriteMetadataToSheet("166IeSP-KsC0s1c9Crl8udyGvWXfHEpxgfpLMo62oPOI")
 */
function testWriteMetadataToSheetWithDefault() {
  return testWriteMetadataToSheet("166IeSP-KsC0s1c9Crl8udyGvWXfHEpxgfpLMo62oPOI");
}

/**
 * Test function to verify registerCategoryInSettings works locally
 * Run this from Apps Script editor to test
 */
function testRegisterCategory() {
  Logger.log("Testing registerCategoryInSettings...");
  
  // Test with pre-generated ID (recommended) - Midterm
  const result1 = registerCategoryInSettings(
    "Test Category Midterm",
    0.25,
    "TEST_CATEGORY_MID",  // Pre-generated ID
    "midterm"  // Sheet type
  );
  
  Logger.log("Test 1 (Midterm with pre-generated ID):");
  Logger.log(JSON.stringify(result1, null, 2));
  
  // Test with pre-generated ID - Final
  const result2 = registerCategoryInSettings(
    "Test Category Final",
    0.30,
    "TEST_CATEGORY_FINAL",  // Pre-generated ID
    "final"  // Sheet type
  );
  
  Logger.log("Test 2 (Final with pre-generated ID):");
  Logger.log(JSON.stringify(result2, null, 2));
  
  // Test without ID (fallback) - uses default SETTINGS_MIDTERM tab
  const result3 = registerCategoryInSettings(
    "Test Category Default",
    0.35
    // No internalId - will generate
    // No sheetType - will use SETTINGS_MIDTERM tab (default)
  );
  
  Logger.log("Test 3 (Default SETTINGS_MIDTERM tab, fallback generation):");
  Logger.log(JSON.stringify(result3, null, 2));
  
  Logger.log("✅ Test complete! Check SETTINGS_MIDTERM and SETTINGS_FINAL tabs.");
}

/**
 * Test function to verify ID generation matches backend
 * Run this to compare with Python generate_category_id()
 */
function testIdGeneration() {
  const testCases = [
    "Quiz",
    "Lab Activities",
    "Quiz 1",
    "Assignment #2"
  ];
  
  Logger.log("Testing ID Generation (should match backend):");
  Logger.log("=" * 60);
  
  for (const displayName of testCases) {
    // Generate ID using same logic as backend
    let id = displayName.toUpperCase().trim();
    id = id.replace(/[^A-Z0-9]/g, "_");
    id = id.replace(/_+/g, "_");
    id = id.replace(/^_|_$/g, "");
    
    Logger.log(`'${displayName}' -> '${id}'`);
  }
  
  Logger.log("=" * 60);
  Logger.log("✅ Compare these with Python generate_category_id() output");
}
