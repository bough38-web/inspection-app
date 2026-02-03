import { NextResponse } from 'next/server';
import path from 'path';
import ExcelJS from 'exceljs';
import fs from 'fs';

// Specify dynamic to prevent static caching issues in some environments, though usually fine for data files.
export const dynamic = 'force-dynamic';

interface Target {
    id: string;
    business_name: string;
    address: string;
    lat: number;
    lng: number;
    contract_no: string;
    branch: string;
    manager: string;
}

export async function GET() {
    try {
        // Updated to read specifically from the processed data file
        const dataPath = path.join(process.cwd(), 'data', 'geocoded_targets.xlsx');

        if (!fs.existsSync(dataPath)) {
            // Fallback or error if file doesn't exist yet (script might be running)
            console.error('Geocoded data file not found:', dataPath);
            return NextResponse.json({ error: 'Data processing in progress. Please try again later.' }, { status: 503 });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(dataPath);
        const sheet = workbook.getWorksheet(1);

        if (!sheet) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        const targets: Target[] = [];
        const headerRow = sheet.getRow(1);

        // Column Mapping
        const colMap: Record<string, number> = {};
        headerRow.eachCell((cell, colNumber) => {
            const val = String(cell.value).trim();
            colMap[val] = colNumber;
        });

        // Mapping keys based on "정지,부실.xlsx" headers
        const cols = {
            name: colMap['상호'],
            address: colMap['설치주소'],
            lat: colMap['위도'],
            lng: colMap['경도'],
            branch: colMap['지사'],
            manager: colMap['담당'] || colMap['구역담당영업사원'], // Try '담당' first as it had data in sample
            service_no: colMap['계약번호']
        };

        // Iterate rows
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const lat = row.getCell(cols.lat).value;
            const lng = row.getCell(cols.lng).value;
            const business_name = row.getCell(cols.name).value;

            if (lat && lng && business_name) {
                targets.push({
                    id: String(rowNumber), // Simple ID
                    business_name: String(business_name),
                    address: String(row.getCell(cols.address).value || ''),
                    lat: Number(lat),
                    lng: Number(lng),
                    contract_no: String(row.getCell(cols.service_no).value || ''),
                    branch: String(row.getCell(cols.branch).value || ''),
                    manager: String(row.getCell(cols.manager).value || '')
                });
            }
        });

        return NextResponse.json(targets);

    } catch (e: any) {
        console.error('Error reading targets:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
