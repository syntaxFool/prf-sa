// Code.gs
const SPREADSHEET_ID = '1W1UYfzfMVc5Z7KLP3ycLPdRELfavuzdRHMJjQKqvWvM'; // Your Google Sheet ID
const SHEET_NAME = 'wpPayments'; // Your sheet name

function doGet(e) {
  Logger.log("doGet function called.");
  return ContentService.createTextOutput("This is a POST-only endpoint. Please submit data via the form.");
}

function doPost(e) {
  Logger.log("doPost function started.");
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); // Wait 30 seconds for the lock
    Logger.log("Lock acquired.");

    if (!e || !e.postData || !e.postData.contents) {
      Logger.log("Error: No postData or contents found in the request.");
      throw new Error("Invalid request: No postData received.");
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      Logger.log("Error: Sheet '" + SHEET_NAME + "' not found in spreadsheet ID: " + SPREADSHEET_ID);
      throw new Error("Sheet not found: " + SHEET_NAME);
    }
    Logger.log("Sheet '" + SHEET_NAME + "' found.");

    const data = JSON.parse(e.postData.contents);
    Logger.log("Received data (before ID): " + JSON.stringify(data));

    // Generate a unique Reference ID in format AA11AA1111-100825
    const referenceId = generateReferenceId();
    data.referenceId = referenceId; // Add the new ID to your data object
    Logger.log("Generated Reference ID: " + referenceId);
    Logger.log("Received data (after ID): " + JSON.stringify(data));


    // Define the order of columns as they appear in your Google Sheet,
    // ensuring 'referenceId' and 'paymentType' are included.
    const headers = [
      "referenceId", // Added Reference ID here, usually first for easy tracking
      "type", "studentId", "studentName", "amount", "modeOfPayment",
      "paymentType", // NEW: Added Payment Type header
      "txId", "courseName", "batchNo", "dateOfPayment", "note"
    ];
    Logger.log("Defined headers: " + JSON.stringify(headers));

    // Get existing headers from the sheet to ensure consistency, or set them if the sheet is empty
    let sheetHeaders = [];
    if (sheet.getLastRow() > 0) {
        sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        Logger.log("Existing sheet headers: " + JSON.stringify(sheetHeaders));
    }

    if (sheet.getLastRow() === 0 || sheetHeaders.every(h => !h)) {
        // If the sheet is empty or headers are missing, set them
        sheet.appendRow(headers);
        sheetHeaders = headers; // Update sheetHeaders for current operation
        Logger.log("Headers appended to sheet: " + JSON.stringify(headers));
    }

    const rowData = [];
    for (const header of sheetHeaders) {
        const cleanHeader = header.trim();
        rowData.push(data[cleanHeader] || '');
    }
    Logger.log("Row data to append: " + JSON.stringify(rowData));

    sheet.appendRow(rowData);
    Logger.log("Row appended successfully.");

    lock.releaseLock();
    Logger.log("Lock released. doPost function completed successfully.");
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Data appended successfully!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    if (lock && lock.hasLock()) { // Check if lock exists and is held before releasing
      lock.releaseLock();
    }
    Logger.log("Error in doPost: " + error.message);
    console.error("Error in doPost:", error); // This also logs to Cloud Logging
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function generateReferenceId() {
  // Generate random letters and numbers for the first part
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let firstPart = '';
  // First 2 characters: random letters
  for (let i = 0; i < 2; i++) {
    firstPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  // Next 2 characters: random numbers
  for (let i = 0; i < 2; i++) {
    firstPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  // Next 2 characters: random letters
  for (let i = 0; i < 2; i++) {
    firstPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  // Next 4 characters: random numbers
  for (let i = 0; i < 4; i++) {
    firstPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // Generate timestamp part (current date in format MMDDYY)
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const timestamp = month + day + year;
  
  return firstPart + '-' + timestamp;
}
