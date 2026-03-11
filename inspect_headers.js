const ExcelJS = require('exceljs');
const path = require('path');

async function inspectHeaders() {
    const workbook = new ExcelJS.Workbook();
    const filePath = '/Users/heebonpark/Downloads/내프로젝트모음/현장점검사진촬영앱_김우진/inspection-app/data/geocoded_targets.xlsx';

    console.log('--- geocoded_targets.xlsx ---');
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);
    console.log('Headers:', JSON.stringify(sheet.getRow(1).values));
    console.log('Sample Row 2:', JSON.stringify(sheet.getRow(2).values));

    const workbook2 = new ExcelJS.Workbook();
    const filePath2 = '/Users/heebonpark/Downloads/내프로젝트모음/현장점검사진촬영앱_김우진/inspection-app/data/정지,부실.xlsx';
    console.log('\n--- 정지,부실.xlsx ---');
    await workbook2.xlsx.readFile(filePath2);
    const sheet2 = workbook2.getWorksheet(1);
    console.log('Headers:', JSON.stringify(sheet2.getRow(1).values));
    console.log('Sample Row 2:', JSON.stringify(sheet2.getRow(2).values));
}

inspectHeaders().catch(console.error);
