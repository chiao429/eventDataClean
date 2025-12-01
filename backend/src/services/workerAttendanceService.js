import XLSX from 'xlsx-js-style';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectHeaderAndReadData(worksheet) {
  let rawData = null;
  for (let skipRows = 0; skipRows <= 10; skipRows++) {
    const testData = XLSX.utils.sheet_to_json(worksheet, { range: skipRows });
    if (testData.length === 0) continue;

    const firstRow = testData[0];
    const columns = Object.keys(firstRow);

    if (columns.some(col => col.includes('姓名'))) {
      rawData = testData;
      console.log(`同工出席名單：偵測到標題列於第 ${skipRows + 1} 列`);
      break;
    }
  }

  if (!rawData) {
    console.warn('同工出席名單：未找到標準標題列，使用第一列作為標題');
    rawData = XLSX.utils.sheet_to_json(worksheet);
  }

  return rawData;
}

function cleanColumns(rawData) {
  return rawData.map(row => {
    const cleanedRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key) continue;
      let cleanKey = String(key).replace(/[\r\n]+/g, '').trim();
      cleanedRow[cleanKey] = value;
    }
    return cleanedRow;
  });
}

function buildAttendanceRows(cleanedData) {
  if (!cleanedData || cleanedData.length === 0) {
    throw new Error('Excel 檔案中沒有資料，請確認檔案內容');
  }

  const normalizeHeader = (key) =>
    String(key)
      .replace(/[\r\n\s\u3000]+/g, '')
      .trim();

  const columnMap = new Map();
  cleanedData.forEach(row => {
    Object.keys(row).forEach(key => {
      const norm = normalizeHeader(key);
      if (!columnMap.has(norm)) {
        columnMap.set(norm, key);
      }
    });
  });

  const availableColumns = Array.from(columnMap.keys());
  console.log('同工出席名單：可用欄位', availableColumns);

  const findCol = (...candidates) => {
    for (const name of candidates) {
      if (columnMap.has(name)) {
        return columnMap.get(name);
      }
    }
    return null;
  };

  const nameCol = findCol('姓名', '同工姓名', '名稱');
  const genderCol = findCol('性別');
  const groupCol = findCol('組別', '部門', '服事組別');
  const phoneCol = findCol('聯絡電話', '手機', '電話', '行動電話');
  const teamCol = findCol('所屬小組', '小組', '所屬小隊');

  if (!nameCol) {
    throw new Error('找不到「姓名」欄位，請確認同工名單檔案的欄位名稱');
  }

  const headers = [
    '序號',
    '姓名',
    '到達時間',
    '已到',
    '組別',
    '聯絡電話',
    '性別',
    '所屬小組'
  ];

  const rows = cleanedData.map((row, index) => {
    const valueOf = (col) => (col ? (row[col] ?? '') : '');

    return [
      index + 1,
      valueOf(nameCol),
      '',
      '',
      valueOf(groupCol),
      valueOf(phoneCol),
      valueOf(genderCol),
      valueOf(teamCol)
    ];
  });

  return [headers, ...rows];
}

function applySimpleStyles(ws) {
  if (!ws || !ws['!ref']) return;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const colCount = range.e.c + 1;
  const rowCount = range.e.r + 1;

  const calculateWidth = (str) => {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch)) {
        width += 2.2;
      } else {
        width += 1.1;
      }
    }
    return width;
  };

  const colWidths = [];
  for (let C = 0; C < colCount; C++) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    let headerWidth = 8;
    if (headerCell && headerCell.v) {
      headerWidth = calculateWidth(String(headerCell.v));
    }

    let maxContentWidth = 0;
    for (let R = 1; R < rowCount; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        const w = calculateWidth(String(cell.v));
        if (w > maxContentWidth) maxContentWidth = w;
      }
    }

    const finalWidth = Math.max(headerWidth, maxContentWidth);
    colWidths.push({ wch: Math.ceil(finalWidth) + 1 });
  }
  ws['!cols'] = colWidths;

  const headers = [];
  for (let C = 0; C < colCount; C++) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    headers.push(headerCell && headerCell.v ? String(headerCell.v) : '');
  }

  for (let R = 0; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;

      if (!cell.s) cell.s = {};

      if (R === 0) {
        cell.s.alignment = {
          horizontal: 'center',
          vertical: 'center',
          wrapText: false
        };
        cell.s.fill = {
          patternType: 'solid',
          fgColor: { rgb: 'FDE49A' }
        };
        cell.s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        };
      } else {
        const colName = headers[C];
        const isNumberLike = colName === '序號';

        cell.s.alignment = {
          horizontal: isNumberLike ? 'center' : 'left',
          vertical: 'center',
          wrapText: false
        };
        cell.s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        };
      }
    }
  }
}

export async function processWorkerAttendanceFile(inputPath) {
  try {
    const workbook = XLSX.readFile(inputPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawData = detectHeaderAndReadData(worksheet);
    if (!rawData || rawData.length === 0) {
      throw new Error('Excel 檔案中沒有資料，請確認檔案內容');
    }

    const cleanedData = cleanColumns(rawData);
    const sheetData = buildAttendanceRows(cleanedData);

    const newWb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    applySimpleStyles(ws);
    XLSX.utils.book_append_sheet(newWb, ws, '同工出席名單');

    const outputPath = path.join(__dirname, '../../uploads', `worker-attendance-${Date.now()}.xlsx`);
    XLSX.writeFile(newWb, outputPath);

    console.log('同工出席名單輸出檔案:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('處理同工出席名單時發生錯誤:', error);
    if (error.message.includes('Cannot read')) {
      throw new Error('Excel 檔案格式錯誤或檔案損壞，請確認檔案是否正確');
    }
    throw error;
  }
}

