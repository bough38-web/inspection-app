const ExcelJS = require('exceljs');
const path = require('path');

async function countRows() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'data', 'geocoded_targets.xlsx');

    console.log('Reading:', filePath);
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);
    console.log('Total Rows in geocoded_targets.xlsx:', sheet.rowCount);

    // Check another file
    const filePath2 = path.join(__dirname, 'data', '정지,부실.xlsx');
    const workbook2 = new ExcelJS.Workbook();
    await workbook2.xlsx.readFile(filePath2);
    const sheet2 = workbook2.getWorksheet(1);
    console.log('Total Rows in 정지,부실.xlsx:', sheet2.rowCount);
}

countRows().catch(console.error);
