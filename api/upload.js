import multiparty from 'multiparty';
import XLSX from 'xlsx';

/**
 * 將年級字串轉換為數字以便比較
 */
function gradeToNumber(gradeStr) {
  if (!gradeStr) return -3; // 空值視為未就學
  const str = String(gradeStr).trim();
  
  // 特殊處理：未就學和小班同等級
  if (str.includes('未就學') || str === '') {
    return -3;
  }
  if (str.includes('小班')) {
    return -3;
  }
  if (str.includes('中班')) {
    return -2;
  }
  if (str.includes('大班')) {
    return -1;
  }
  
  const gradeMap = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '國一': 7, '國二': 8, '國三': 9,
    '七': 7, '八': 8, '九': 9,
    '7': 7, '8': 8, '9': 9
  };
  
  for (const [key, value] of Object.entries(gradeMap)) {
    if (str.includes(key)) {
      return value;
    }
  }
  
  return -3; // 無法識別的年級視為未就學
}

/**
 * 計算手足稱謂
 */
function calculateSiblingTitle(currentGrade, siblingGrade, siblingGender) {
  const currentGradeNum = gradeToNumber(currentGrade);
  const siblingGradeNum = gradeToNumber(siblingGrade);
  
  if (currentGradeNum === siblingGradeNum) {
    return '同年齡';
  }
  
  const isOlder = siblingGradeNum > currentGradeNum;
  const isMale = siblingGender === '男';
  
  if (isOlder) {
    return isMale ? '哥哥' : '姊姊';
  } else {
    return isMale ? '弟弟' : '妹妹';
  }
}

/**
 * 解析手足資料字串
 */
function parseSiblingString(siblingStr) {
  if (!siblingStr || siblingStr === '無' || String(siblingStr).trim() === '') {
    return { names: [], genders: [], grades: [] };
  }

  const names = [];
  const genders = [];
  const grades = [];

  const pattern = /([^、，,]+?)[（(]([^,，]+?)[,，]\s*([^）)]+?)[）)]/g;
  
  let match;
  while ((match = pattern.exec(String(siblingStr))) !== null) {
    const [, name, gender, grade] = match;
    names.push(name.trim());
    genders.push(gender.trim());
    grades.push(grade.trim());
  }

  return { names, genders, grades };
}

/**
 * 設定工作表樣式
 */
function applySheetStyles(ws, data) {
  if (!ws || !data || data.length === 0) return;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const colCount = range.e.c + 1;
  const rowCount = range.e.r + 1;

  const calculateWidth = (str) => {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/)) {
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
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && cell.v) {
        const cellValue = String(cell.v);
        const width = calculateWidth(cellValue);
        maxContentWidth = Math.max(maxContentWidth, width);
      }
    }
    
    const finalWidth = maxContentWidth > headerWidth ? maxContentWidth : headerWidth;
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
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      if (!ws[cellAddress].s) {
        ws[cellAddress].s = {};
      }

      if (R === 0) {
        ws[cellAddress].s.alignment = { 
          horizontal: 'center', 
          vertical: 'center',
          wrapText: false
        };
      } else {
        const columnName = headers[C];
        
        if (columnName === '家長行動電話') {
          ws[cellAddress].t = 's';
          ws[cellAddress].s.alignment = { 
            horizontal: 'left', 
            vertical: 'center',
            wrapText: false
          };
        } else if (columnName === '家長姓名') {
          ws[cellAddress].s.alignment = { 
            horizontal: 'left', 
            vertical: 'center',
            wrapText: false
          };
        } else if (['項次', '報名序號', '兒童姓名', '性別', '年級'].includes(columnName)) {
          ws[cellAddress].s.alignment = { 
            horizontal: 'center', 
            vertical: 'center',
            wrapText: false
          };
        } else {
          ws[cellAddress].s.alignment = { 
            horizontal: 'right', 
            vertical: 'center',
            wrapText: false
          };
        }
      }
    }
  }
}

/**
 * 建立家長對應表
 */
function buildParentMap(rawData) {
  const parentMap = new Map();

  rawData.forEach(item => {
    const parentName = item['家長姓名'];
    
    if (!parentName || String(parentName).trim() === '') {
      return;
    }

    const trimmedParentName = String(parentName).trim();

    if (!parentMap.has(trimmedParentName)) {
      parentMap.set(trimmedParentName, []);
    }

    parentMap.get(trimmedParentName).push({
      兒童姓名: item['兒童姓名'] || item['姓名'] || item['孩童姓名'] || '',
      性別: item['性別'] || '',
      年級: item['年級'] || ''
    });
  });

  return parentMap;
}

/**
 * 取得手足資訊
 */
function getSiblings(currentChild, parentMap) {
  const siblingField = currentChild['兄弟姊妹'] || currentChild['手足'] || currentChild['兄弟姐妹'];
  
  if (siblingField && String(siblingField).trim() !== '' && String(siblingField).trim() !== '無') {
    return parseSiblingString(siblingField);
  }

  const parentName = currentChild['家長姓名'];
  const currentChildName = currentChild['兒童姓名'] || currentChild['姓名'] || currentChild['孩童姓名'];

  if (!parentName || String(parentName).trim() === '') {
    return { names: [], genders: [], grades: [] };
  }

  const trimmedParentName = String(parentName).trim();
  const allChildren = parentMap.get(trimmedParentName) || [];

  const siblings = allChildren.filter(child => child.兒童姓名 !== currentChildName);

  const names = siblings.map(s => s.兒童姓名);
  const genders = siblings.map(s => s.性別);
  const grades = siblings.map(s => s.年級);

  return { names, genders, grades };
}

/**
 * 處理 Excel 資料
 */
function processExcelData(rawData) {
  const parentMap = buildParentMap(rawData);
  const gradeGroups = {};
  const allStudents = [];

  rawData.forEach((item, index) => {
    const grade = item['年級'] ? String(item['年級']).trim() : '未分類';

    if (!gradeGroups[grade]) {
      gradeGroups[grade] = [];
    }

    const siblings = getSiblings(item, parentMap);
    
    // 計算手足稱謂
    const siblingTitles = siblings.names.map((name, idx) => {
      return calculateSiblingTitle(
        item['年級'] || '',
        siblings.grades[idx] || '',
        siblings.genders[idx] || ''
      );
    });

    let phoneNumber = item['家長行動電話'] || '';
    if (phoneNumber) {
      phoneNumber = String(phoneNumber).trim();
      if (/^9\d{8}$/.test(phoneNumber)) {
        phoneNumber = '0' + phoneNumber;
      }
    }

    let registrationNumber = item['報名序號'] || '';
    if (registrationNumber) {
      registrationNumber = String(registrationNumber).trim();
      if (registrationNumber.includes('不收費')) {
        registrationNumber = registrationNumber.replace(/[^\d]/g, '');
      }
    }

    const processedItem = {
      原始項次: index + 1,
      項次: gradeGroups[grade].length + 1,
      報名序號: registrationNumber,
      兒童姓名: item['兒童姓名'] || item['姓名'] || item['孩童姓名'] || '',
      性別: item['性別'] || '',
      年級: item['年級'] || '',
      學校: item['學校'] || '',
      手足稱謂: siblingTitles.join(', ') || '無',
      手足名稱: siblings.names.join(', ') || '無',
      手足性別: siblings.genders.join(', ') || '無',
      手足年級: siblings.grades.join(', ') || '無',
      家長姓名: item['家長姓名'] || '',
      家長行動電話: phoneNumber,
      備註: item['備註'] || ''
    };

    gradeGroups[grade].push(processedItem);
    allStudents.push(processedItem);
  });

  const gradeSheets = {};

  for (const [grade, students] of Object.entries(gradeGroups)) {
    const headers = [
      '項次', '報名序號', '兒童姓名', '性別', '年級', '學校',
      '手足稱謂', '手足名稱', '手足性別', '手足年級', '家長姓名', '家長行動電話', '備註'
    ];

    const rows = [];
    const merges = [];
    let currentIndex = 1;
    let rowIndex = 1;

    students.forEach(student => {
      const siblingTitles = student.手足稱謂 && student.手足稱謂 !== '無'
        ? student.手足稱謂.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];
      const siblingNames = student.手足名稱 && student.手足名稱 !== '無' 
        ? student.手足名稱.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];
      const siblingGenders = student.手足性別 && student.手足性別 !== '無'
        ? student.手足性別.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];
      const siblingGrades = student.手足年級 && student.手足年級 !== '無'
        ? student.手足年級.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];

      const startRow = rowIndex;

      if (siblingNames.length === 0) {
        rows.push([
          currentIndex, student.報名序號, student.兒童姓名, student.性別,
          student.年級, student.學校, '', '', '', '', student.家長姓名,
          student.家長行動電話, student.備註
        ]);
        rowIndex++;
      } else {
        siblingNames.forEach((siblingName, idx) => {
          rows.push([
            currentIndex, student.報名序號, student.兒童姓名, student.性別,
            student.年級, student.學校, siblingTitles[idx] || '', siblingName, siblingGenders[idx] || '',
            siblingGrades[idx] || '', student.家長姓名, student.家長行動電話, student.備註
          ]);
          rowIndex++;
        });

        if (siblingNames.length > 1) {
          const endRow = rowIndex - 1;
          [0, 1, 2, 3, 4, 5, 10, 11].forEach(col => {
            merges.push({
              s: { r: startRow, c: col },
              e: { r: endRow, c: col }
            });
          });
        }
      }

      currentIndex++;
    });

    gradeSheets[grade] = { data: [headers, ...rows], merges };
  }

  return { gradeSheets, allStudents };
}

/**
 * 建立總表
 */
function createSummarySheet(allStudents, sortBy = 'registrationNumber') {
  let sortedStudents;
  if (sortBy === 'originalIndex') {
    sortedStudents = [...allStudents].sort((a, b) => {
      const numA = parseInt(a.原始項次) || 0;
      const numB = parseInt(b.原始項次) || 0;
      return numA - numB;
    });
  } else {
    sortedStudents = [...allStudents].sort((a, b) => {
      const numA = parseInt(a.報名序號) || 0;
      const numB = parseInt(b.報名序號) || 0;
      return numA - numB;
    });
  }

  const headers = [
    '項次', '報名序號', '兒童姓名', '性別', '年級', '學校',
    '手足稱謂', '手足名稱', '手足性別', '手足年級', '家長姓名', '家長行動電話', '備註'
  ];

  const dataRows = [];
  const merges = [];
  let currentIndex = 1;
  let rowIndex = 1;

  sortedStudents.forEach(student => {
    const siblingTitles = student.手足稱謂 && student.手足稱謂 !== '無'
      ? student.手足稱謂.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];
    const siblingNames = student.手足名稱 && student.手足名稱 !== '無' 
      ? student.手足名稱.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];
    const siblingGenders = student.手足性別 && student.手足性別 !== '無'
      ? student.手足性別.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];
    const siblingGrades = student.手足年級 && student.手足年級 !== '無'
      ? student.手足年級.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];

    const startRow = rowIndex;
    const displayIndex = sortBy === 'originalIndex' ? student.原始項次 : currentIndex;

    if (siblingNames.length === 0) {
      dataRows.push([
        displayIndex, student.報名序號, student.兒童姓名, student.性別,
        student.年級, student.學校, '', '', '', '', student.家長姓名,
        student.家長行動電話, student.備註
      ]);
      rowIndex++;
    } else {
      siblingNames.forEach((siblingName, idx) => {
        dataRows.push([
          displayIndex, student.報名序號, student.兒童姓名, student.性別,
          student.年級, student.學校, siblingTitles[idx] || '', siblingName, siblingGenders[idx] || '',
          siblingGrades[idx] || '', student.家長姓名, student.家長行動電話, student.備註
        ]);
        rowIndex++;
      });

      if (siblingNames.length > 1) {
        const endRow = rowIndex - 1;
        [0, 1, 2, 3, 4, 5, 10, 11].forEach(col => {
          merges.push({
            s: { r: startRow, c: col },
            e: { r: endRow, c: col }
          });
        });
      }
    }

    currentIndex++;
  });

  const sheetData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
  
  return { sheet: ws, data: sheetData };
}

/**
 * 處理 Excel 檔案
 */
function processExcelFile(fileBuffer, filterOptions = {}) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  let rawData = null;
  for (let skipRows = 0; skipRows <= 10; skipRows++) {
    const testData = XLSX.utils.sheet_to_json(worksheet, { range: skipRows });
    
    if (testData.length > 0) {
      const firstRow = testData[0];
      const columns = Object.keys(firstRow);
      
      if (columns.some(col => col.includes('兒童姓名') || col.includes('報名序號') || col.includes('姓名'))) {
        rawData = testData;
        break;
      }
    }
  }
  
  if (!rawData) {
    rawData = XLSX.utils.sheet_to_json(worksheet);
  }
  
  if (!rawData || rawData.length === 0) {
    throw new Error('Excel 檔案中沒有資料');
  }
  
  const cleanedData = rawData.map(row => {
    const cleanedRow = {};
    for (const [key, value] of Object.entries(row)) {
      let cleanKey = key.replace(/[\r\n]+/g, '').trim();
      
      if (cleanKey.includes('報名序號_1') || cleanKey === '(收費同工)報名序號_1') {
        cleanKey = '兒童姓名';
      }
      if (cleanKey === '(收費同工)報名序號') {
        cleanKey = '報名序號';
      }
      
      cleanedRow[cleanKey] = value;
    }
    return cleanedRow;
  });
  
  let filteredData = cleanedData;
  
  if (filterOptions.hideCancelled) {
    filteredData = filteredData.filter(row => {
      const registrationNumber = String(row['報名序號'] || '').trim();
      return !registrationNumber.includes('取消');
    });
  }
  
  if (filterOptions.hideNoNumber) {
    filteredData = filteredData.filter(row => {
      const registrationNumber = String(row['報名序號'] || '').trim();
      return registrationNumber !== '' && registrationNumber !== '無';
    });
  }

  const { gradeSheets, allStudents } = processExcelData(filteredData);
  const newWorkbook = XLSX.utils.book_new();

  const { sheet: summarySheet, data: summaryData } = createSummarySheet(allStudents, filterOptions.sortBy);
  applySheetStyles(summarySheet, summaryData);
  XLSX.utils.book_append_sheet(newWorkbook, summarySheet, '總表');

  for (const [grade, sheetInfo] of Object.entries(gradeSheets)) {
    const sheetName = grade.substring(0, 31);
    const ws = XLSX.utils.aoa_to_sheet(sheetInfo.data);
    
    if (sheetInfo.merges && sheetInfo.merges.length > 0) {
      ws['!merges'] = sheetInfo.merges;
    }
    
    applySheetStyles(ws, sheetInfo.data);
    XLSX.utils.book_append_sheet(newWorkbook, ws, sheetName);
  }

  return XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Vercel Serverless Function Handler
 */
export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST 請求' });
  }

  try {
    // 使用 multiparty 解析 multipart/form-data
    const form = new multiparty.Form();
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    if (!files.file || files.file.length === 0) {
      return res.status(400).json({ error: '請上傳檔案' });
    }

    const uploadedFile = files.file[0];
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(uploadedFile.path);

    // 取得過濾選項
    const filterOptions = {
      hideCancelled: fields.hideCancelled?.[0] === 'true',
      hideNoNumber: fields.hideNoNumber?.[0] === 'true',
      sortBy: fields.sortBy?.[0] || 'registrationNumber'
    };

    // 處理 Excel
    const outputBuffer = processExcelFile(fileBuffer, filterOptions);

    // 清理暫存檔案
    fs.unlinkSync(uploadedFile.path);

    // 設定回應 headers
    const encodedFilename = encodeURIComponent('整理後的報名資料.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="processed.xlsx"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', outputBuffer.length);

    // 傳送檔案
    res.status(200).send(outputBuffer);

  } catch (error) {
    console.error('處理檔案時發生錯誤:', error);
    res.status(500).json({
      error: '處理檔案失敗',
      message: error.message
    });
  }
}
