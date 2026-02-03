const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });


const KAKAO_API_KEY = 'af04a0a8e5416c95eaa04cccc060031d';

if (!KAKAO_API_KEY) {
    console.error('Error: KAKAO_API_KEY is not defined');
}

async function geocodeAddress(address) {
    if (!address) return null;
    try {
        const response = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, {
            headers: {
                'Authorization': `KakaoAK ${KAKAO_API_KEY}`
            }
        });

        if (!response.ok) {
            console.error(`API Error for ${address}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
            return {
                lat: data.documents[0].y,
                lng: data.documents[0].x
            };
        }
        return null;
    } catch (error) {
        console.error(`Geocoding failed for ${address}: `, error.message);
        return null;
    }
}

async function processFile() {
    if (!KAKAO_API_KEY) return;

    const dataDir = path.join(__dirname, '..', 'public', 'data');
    console.log('Processing data in:', dataDir);

    if (!fs.existsSync(dataDir)) {
        console.error('Data directory not found');
        return;
    }

    const files = fs.readdirSync(dataDir);
    const targetFile = files.find(f => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$') && !f.includes('_geocoded'));

    if (!targetFile) {
        console.error('No source xlsx file found');
        return;
    }

    console.log(`Reading ${targetFile}...`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(dataDir, targetFile));
    const sheet = workbook.getWorksheet(1);

    // Find columns
    const headerRow = sheet.getRow(1);
    let addressColIdx = -1;
    let latColIdx = -1;
    let lngColIdx = -1;

    headerRow.eachCell((cell, colNumber) => {
        const val = String(cell.value).trim();
        if (val === '설치주소') addressColIdx = colNumber;
        if (val === '위도') latColIdx = colNumber;
        if (val === '경도') lngColIdx = colNumber;
    });

    if (addressColIdx === -1) {
        console.error('Column "설치주소" not found.');
        return;
    }

    // Create columns if not exist
    if (latColIdx === -1) {
        latColIdx = headerRow.cellCount + 1;
        headerRow.getCell(latColIdx).value = '위도';
    }
    if (lngColIdx === -1) {
        lngColIdx = headerRow.cellCount + 2; // Assuming previous was +1 if it didn't exist, but simplistic logic:
        // Actually best to just find next available
        // If lat added, count increased.
        if (latColIdx === headerRow.cellCount) { // it was added at end
            lngColIdx = latColIdx + 1;
        } else {
            lngColIdx = headerRow.cellCount + 1;
        }
        headerRow.getCell(lngColIdx).value = '경도';
    }

    console.log(`Address Col: ${addressColIdx}, Lat Col: ${latColIdx}, Lng Col: ${lngColIdx} `);

    let updatedCount = 0;
    const rows = sheet.getRows(2, sheet.rowCount - 1) || [];

    // Process in chunks to avoid rate limits? Kakao is generous but being safe.
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const address = row.getCell(addressColIdx).value;
        const currentLat = row.getCell(latColIdx).value;
        const currentLng = row.getCell(lngColIdx).value;

        if (address && (!currentLat || !currentLng)) {
            // Needs geocoding
            console.log(`Geocoding(${i + 1}/${rows.length}): ${address} `);
            const coords = await geocodeAddress(String(address));
            if (coords) {
                row.getCell(latColIdx).value = coords.lat;
                row.getCell(lngColIdx).value = coords.lng;
                updatedCount++;
            }
            // Small delay
            await new Promise(r => setTimeout(r, 100)); // 10 requests per second max

            if (updatedCount % 50 === 0) {
                console.log(`Saving progress at ${updatedCount} records...`);
                await workbook.xlsx.writeFile(path.join(dataDir, targetFile));
            }
        }
    }

    console.log(`Updated ${updatedCount} rows.`);

    // Save to valid path
    // Overwrite original or new? User usually wants one source of truth.
    // Let's overwrite safely (or rename old).
    // For now, write to same file.
    await workbook.xlsx.writeFile(path.join(dataDir, targetFile));
    console.log('Saved updated file.');
}

processFile().catch(console.error);
