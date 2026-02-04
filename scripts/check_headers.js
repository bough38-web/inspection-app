const ExcelJS = require('exceljs');
const path = require('path');

async function checkHeaders() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(process.cwd(), 'data', '정지,부실.xlsx');
    console.log(`Reading file: ${filePath}`);
    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        const headers = worksheet.getRow(1).values;
        console.log('Headers:', JSON.stringify(headers));
        // Check first few rows for data sample
        const firstRow = worksheet.getRow(2).values;
        console.log('First Row Data:', JSON.stringify(firstRow));

    } catch (error) {
        console.error('Error reading file:', error);
    }
}

checkHeaders();
