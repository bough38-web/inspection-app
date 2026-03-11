const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function extractTargets() {
    console.log('--- Extracting Master Target List ---');
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'data', 'geocoded_targets.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);
    const totalRows = sheet.rowCount;

    const targets = [];
    const headers = sheet.getRow(1).values;

    // Column indices based on previous inspection:
    // [null,"대구/경북","서대구",null,null,"105490.0","권용철치과", ...]
    // 2: Region, 3: Branch, 6: ContractNo, 7: BusinessName, 29: Address

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const rowValues = row.values;
        targets.push({
            id: rowValues[6] || `row-${rowNumber}`,
            region: rowValues[2],
            branch: rowValues[3],
            contract_no: rowValues[6],
            business_name: rowValues[7],
            address: rowValues[29],
            status: rowValues[18] // e.g. "정지"
        });
    });

    const outputPath = path.join(__dirname, 'data', 'extracted_master_list.json');
    fs.writeFileSync(outputPath, JSON.stringify(targets, null, 2));

    console.log(`Successfully extracted ${targets.length} targets to ${outputPath}`);
}

extractTargets().catch(console.error);
