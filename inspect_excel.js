const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function read() {
    const workbook = new ExcelJS.Workbook();
    // Correct path based on route.ts
    const dataDir = path.join(__dirname, 'public', 'data');
    console.log('Looking in:', dataDir);
    
    if (!fs.existsSync(dataDir)) {
        console.log('Data dir does not exist');
        return;
    }

    const files = fs.readdirSync(dataDir);
    const targetFile = files.find(f => f.includes('.xlsx') && !f.startsWith('~$'));

    if (!targetFile) {
        console.log('No xlsx file found');
        return;
    }

    console.log('Reading file:', targetFile);
    await workbook.xlsx.readFile(path.join(dataDir, targetFile));
    const sheet = workbook.getWorksheet(1);

    // Print header row
    const headerRow = sheet.getRow(1);
    console.log('Headers:', JSON.stringify(headerRow.values));
    
    // Print a sample row
    const sampleRow = sheet.getRow(2);
    console.log('Sample Row:', JSON.stringify(sampleRow.values));
}
read().catch(console.error);
