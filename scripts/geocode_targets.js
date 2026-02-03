const ExcelJS = require('exceljs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_API_KEY || process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

if (!KAKAO_API_KEY) {
    console.error('Error: KAKAO API KEY not found in .env.local');
    process.exit(1);
}

const INPUT_FILE = path.join(process.cwd(), 'data', '정지,부실.xlsx');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'geocoded_targets.xlsx');

async function geocodeAddress(address) {
    if (!address) return { lat: null, lng: null };

    // Cleanup address slightly if needed (remove parens like (xxx동))
    const cleanAddress = address.split('(')[0].trim();

    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanAddress)}`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `KakaoAK ${KAKAO_API_KEY}`
            }
        });

        const data = response.data;
        if (data.documents && data.documents.length > 0) {
            return {
                lat: data.documents[0].y,
                lng: data.documents[0].x
            };
        } else {
            // console.warn(`No result for: ${address}`);
            return { lat: null, lng: null };
        }
    } catch (error) {
        console.error(`Fetch error for ${cleanAddress}:`, error.message);
        return { lat: null, lng: null };
    }
}

async function processFile() {
    console.log(`Reading input file: ${INPUT_FILE}`);
    const workbook = new ExcelJS.Workbook();

    try {
        await workbook.xlsx.readFile(INPUT_FILE);
    } catch (err) {
        console.error("Error reading file:", err);
        return;
    }

    const worksheet = workbook.worksheets[0];

    // Find Header Columns
    const headerRow = worksheet.getRow(1);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
        headers[cell.value] = colNumber;
    });

    // Check specific required headers
    const addrCol = headers['설치주소'];

    if (!addrCol) {
        console.error("Could not find '설치주소' column.");
        return;
    }

    // Add new headers if they don't exist
    let latCol = headers['위도'];
    let lngCol = headers['경도'];

    if (!latCol) {
        latCol = headerRow.cellCount + 1;
        worksheet.getRow(1).getCell(latCol).value = '위도';
    }
    if (!lngCol) {
        lngCol = headerRow.cellCount + (latCol === headerRow.cellCount + 1 ? 2 : 1);
        worksheet.getRow(1).getCell(lngCol).value = '경도';
    }

    console.log("Starting geocoding...");
    let processedCount = 0;
    let successCount = 0;

    // Iterate rows
    // Note: worksheet.eachRow includes header, so start from row 2
    const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];

    // Process in batches to avoid rate limits if necessary, but Kakao is usually fast enough for small batches.
    // We'll do simple sequential for safety and logging.

    for (const row of rows) {
        const address = row.getCell(addrCol).value;
        const existingLat = row.getCell(latCol).value;

        if (address && !existingLat) {
            process.stdout.write(`Processing ${processedCount + 1}/${rows.length}: ${address.substring(0, 20)}... `);

            // Artificial delay to be nice to API
            await new Promise(r => setTimeout(r, 100));

            const coords = await geocodeAddress(address);
            if (coords.lat) {
                row.getCell(latCol).value = coords.lat;
                row.getCell(lngCol).value = coords.lng;
                successCount++;
                console.log('OK');
            } else {
                console.log('FAIL');
            }
        }
        processedCount++;
    }

    console.log(`Geocoding complete. Success: ${successCount}, Total Scanned: ${processedCount}`);

    console.log(`Saving to ${OUTPUT_FILE}...`);
    await workbook.xlsx.writeFile(OUTPUT_FILE);
    console.log('Done.');
}

processFile();
