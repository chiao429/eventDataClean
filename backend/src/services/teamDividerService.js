import XLSX from 'xlsx-js-style';

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
          ws[cellAddress].z = '@';
        }
        
        if (columnName === '項次' || columnName === '報名序號') {
          ws[cellAddress].s.alignment = { 
            horizontal: 'center', 
            vertical: 'center',
            wrapText: false
          };
        } else {
          ws[cellAddress].s.alignment = { 
            horizontal: 'left', 
            vertical: 'center',
            wrapText: false
          };
        }
      }
    }
  }
}

/**
 * 處理 Excel 資料 - 分小隊版本（不含手足資訊）
 */
function processTeamData(rawData) {
  console.log('=== 開始處理分小隊資料 ===');
  console.log('原始資料筆數:', rawData.length);
  if (rawData.length > 0) {
    console.log('第一筆資料範例:', rawData[0]);
  }
  
  const gradeGroups = {};
  const allStudents = [];

  rawData.forEach((item, index) => {
    if (index === 0) {
      console.log('processTeamData 第一筆資料:', item);
      console.log('報名序號值:', item['報名序號']);
      console.log('兒童姓名值:', item['兒童姓名']);
    }
    
    // 取得年級
    let grade = item['年級'] ? String(item['年級']).trim() : '未分類';
    
    // 將學齡前統一分組
    if (grade.includes('大班') || grade.includes('中班') || grade.includes('小班') || grade.includes('未就學') || grade === '') {
      grade = '學齡前';
    }
    
    // 標準化年級名稱
    if (grade.match(/^[一二三四五六1-6]$/)) {
      const gradeMap = { '一': '一年級', '二': '二年級', '三': '三年級', '四': '四年級', '五': '五年級', '六': '六年級',
                        '1': '一年級', '2': '二年級', '3': '三年級', '4': '四年級', '5': '五年級', '6': '六年級' };
      grade = gradeMap[grade] || grade + '年級';
    } else if (!grade.includes('年級') && !grade.includes('國') && grade !== '學齡前' && grade !== '未分類') {
      grade = grade + '年級';
    }

    // 初始化該年級的陣列
    if (!gradeGroups[grade]) {
      gradeGroups[grade] = [];
    }

    // 處理家長行動電話
    let phoneNumber = item['家長行動電話'] || '';
    if (phoneNumber) {
      phoneNumber = String(phoneNumber).trim();
      if (/^9\d{8}$/.test(phoneNumber)) {
        phoneNumber = '0' + phoneNumber;
      }
    }

    // 處理報名序號
    let registrationNumber = item['報名序號'] || '';
    if (registrationNumber) {
      registrationNumber = String(registrationNumber).trim();
      if (registrationNumber.includes('不收費')) {
        registrationNumber = registrationNumber.replace(/[^\d]/g, '');
      }
    }
    
    // 如果報名序號為空,填入「尚未繳費」
    if (!registrationNumber || registrationNumber === '') {
      registrationNumber = '尚未繳費';
    }

    // 組裝該筆資料（不含手足資訊）
    const processedItem = {
      原始項次: index + 1,
      項次: gradeGroups[grade].length + 1,
      報名序號: registrationNumber,
      兒童姓名: item['兒童姓名'] || item['姓名'] || item['孩童姓名'] || '',
      性別: item['性別'] || '',
      年級: item['年級'] || '',
      學校: item['學校'] || '',
      家長姓名: item['家長姓名'] || '',
      家長行動電話: phoneNumber,
      備註: item['備註'] || ''
    };

    gradeGroups[grade].push(processedItem);
    allStudents.push(processedItem);
  });

  console.log('處理後總學生數:', allStudents.length);
  console.log('年級分組:', Object.keys(gradeGroups));
  Object.keys(gradeGroups).forEach(g => {
    console.log(`  ${g}: ${gradeGroups[g].length} 人`);
  });

  // 將每個年級的資料轉換為二維陣列格式
  const gradeSheets = {};
  
  // 定義年級順序
  const gradeOrder = ['學齡前', '一年級', '二年級', '三年級', '四年級', '五年級', '六年級', '國一', '國二', '國三'];

  for (const grade of gradeOrder) {
    if (!gradeGroups[grade]) continue;
    
    let students = gradeGroups[grade];
    
    // 學齡前需要特殊排序：年級(未就學/小班/中班/大班) + 報名序號
    if (grade === '學齡前') {
      const gradeOrderMap = {
        '未就學': 1,
        '小班': 2,
        '中班': 3,
        '大班': 4
      };
      
      students = students.sort((a, b) => {
        // 先按年級排序
        const gradeA = gradeOrderMap[a.年級] || 0;
        const gradeB = gradeOrderMap[b.年級] || 0;
        if (gradeA !== gradeB) {
          return gradeA - gradeB;
        }
        
        // 年級相同時,按報名序號排序
        const numA = parseInt(a.報名序號) || 0;
        const numB = parseInt(b.報名序號) || 0;
        return numA - numB;
      });
      
      // 重新編號項次
      students = students.map((student, index) => ({
        ...student,
        項次: index + 1
      }));
    } else {
      // 其他年級只按報名序號排序
      students = students.sort((a, b) => {
        const numA = parseInt(a.報名序號) || 0;
        const numB = parseInt(b.報名序號) || 0;
        return numA - numB;
      });
      
      // 重新編號項次
      students = students.map((student, index) => ({
        ...student,
        項次: index + 1
      }));
    }
    
    const headers = [
      '項次',
      '小隊',
      '報名序號',
      '兒童姓名',
      '性別',
      '年級',
      '學校',
      '家長姓名',
      '家長行動電話',
      '備註'
    ];

    const rows = students.map(student => [
      student.項次,
      '', // 小隊欄位留空
      student.報名序號,
      student.兒童姓名,
      student.性別,
      student.年級,
      student.學校,
      student.家長姓名,
      student.家長行動電話,
      student.備註
    ]);

    const sheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // 只為標題列(第一列)加上背景顏色
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C }); // r: 0 表示第一列
      if (!ws[cellAddress]) continue;
      
      // 設定背景顏色
      let fillColor = null;
      
      // B欄: 小隊 (#D1F1DA)
      if (C === 1) {
        fillColor = 'D1F1DA';
      }
      // C欄: 報名序號 (#D0E2F3)
      else if (C === 2) {
        fillColor = 'D0E2F3';
      }
      // J欄: 備註 (不填顏色)
      else if (C === 9) {
        fillColor = null;
      }
      // 其他欄位 (#FDE49A)
      else {
        fillColor = 'FDE49A';
      }
      
      if (fillColor) {
        ws[cellAddress].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: fillColor }
          }
        };
      }
    }
    
    gradeSheets[grade] = { sheet: ws, data: sheetData, merges: [] };
  }

  return { gradeSheets, allStudents };
}

/**
 * 建立總表分頁
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
    '項次',
    '小隊',
    '報名序號',
    '兒童姓名',
    '性別',
    '年級',
    '學校',
    '家長姓名',
    '家長行動電話',
    '備註'
  ];

  const dataRows = sortedStudents.map((student, index) => {
    const displayIndex = sortBy === 'originalIndex' ? student.原始項次 : index + 1;
    return [
      displayIndex,
      '', // 小隊欄位留空
      student.報名序號,
      student.兒童姓名,
      student.性別,
      student.年級,
      student.學校,
      student.家長姓名,
      student.家長行動電話,
      student.備註
    ];
  });

  const sheetData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // 只為標題列(第一列)加上背景顏色
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C }); // r: 0 表示第一列
    if (!ws[cellAddress]) continue;
    
    // 設定背景顏色
    let fillColor = null;
    
    // B欄: 小隊 (#D1F1DA)
    if (C === 1) {
      fillColor = 'D1F1DA';
    }
    // C欄: 報名序號 (#D0E2F3)
    else if (C === 2) {
      fillColor = 'D0E2F3';
    }
    // J欄: 備註 (不填顏色)
    else if (C === 9) {
      fillColor = null;
    }
    // 其他欄位 (#FDE49A)
    else {
      fillColor = 'FDE49A';
    }
    
    if (fillColor) {
      ws[cellAddress].s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: fillColor }
        }
      };
    }
  }
  
  // 在總表的「小隊」欄位加入 VLOOKUP 公式
  // 從各年級分頁查找對應的小隊資料
  sortedStudents.forEach((student, index) => {
    const rowIndex = index + 2; // +2 因為第1列是標題,資料從第2列開始
    const cellAddress = `B${rowIndex}`; // B欄是「小隊」欄位
    
    // 根據年級決定要查找的分頁名稱
    let sheetName = student.年級;
    if (sheetName.includes('大班') || sheetName.includes('中班') || sheetName.includes('小班') || sheetName.includes('未就學')) {
      sheetName = '學齡前';
    }
    
    // INDEX+MATCH 公式: 在指定分頁中,根據兒童姓名(D欄)查找小隊(B欄)
    // =IFERROR(INDEX(學齡前!$B:$B,MATCH(D2,學齡前!$D:$D,0)),"")
    const formula = `IFERROR(INDEX('${sheetName}'!$B:$B,MATCH(D${rowIndex},'${sheetName}'!$D:$D,0)),"")`;
    
    // 保留原有樣式並加入公式
    const existingStyle = ws[cellAddress].s || {};
    ws[cellAddress] = { 
      t: 's', 
      f: formula, 
      z: '@',
      s: existingStyle
    };
  });
  
  return { sheet: ws, data: sheetData };
}

/**
 * 處理 Excel 檔案 - 分小隊版本
 */
function processTeamExcelFile(filePath, options = {}) {
  const { hideCancelled = false, hideNoNumber = false, sortBy = 'registrationNumber' } = options;

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 嘗試找到正確的標題列
  let rawData = null;
  for (let skipRows = 0; skipRows <= 10; skipRows++) {
    const testData = XLSX.utils.sheet_to_json(worksheet, { range: skipRows });
    
    if (testData.length > 0) {
      const firstRow = testData[0];
      const columns = Object.keys(firstRow);
      
      if (columns.some(col => col.includes('兒童姓名') || col.includes('報名序號') || col.includes('姓名'))) {
        rawData = testData;
        console.log(`找到標題列於第 ${skipRows + 1} 列`);
        break;
      }
    }
  }
  
  if (!rawData) {
    rawData = XLSX.utils.sheet_to_json(worksheet);
  }
  
  console.log(`讀取到 ${rawData.length} 筆原始資料`);
  
  // 清理欄位名稱並修正合併儲存格導致的欄位名稱問題
  const cleanedData = rawData.map((row, index) => {
    const cleanedRow = {};
    for (const [key, value] of Object.entries(row)) {
      let cleanKey = key.replace(/[\r\n]+/g, '').trim();
      
      // 修正合併儲存格導致的欄位名稱錯誤
      if (cleanKey === '(收費同工)報名序號' || cleanKey.includes('報名序號') && !cleanKey.includes('_')) {
        cleanKey = '報名序號';
      }
      if (cleanKey === '(收費同工)報名序號_1' || cleanKey.includes('報名序號_1')) {
        cleanKey = '兒童姓名';
      }
      
      cleanedRow[cleanKey] = value;
    }
    if (index === 0) {
      console.log('第一筆資料的欄位名稱:', Object.keys(cleanedRow));
      console.log('第一筆資料內容:', cleanedRow);
    }
    return cleanedRow;
  });

  // 過濾資料
  let filteredData = cleanedData;
  
  if (hideCancelled) {
    filteredData = filteredData.filter(item => {
      const regNum = item['報名序號'] || '';
      return !String(regNum).includes('取消');
    });
  }

  if (hideNoNumber) {
    filteredData = filteredData.filter(item => {
      const regNum = item['報名序號'] || '';
      return regNum && String(regNum).trim() !== '';
    });
  }
  
  console.log(`過濾後剩餘 ${filteredData.length} 筆資料`);

  const { gradeSheets, allStudents } = processTeamData(filteredData);

  const newWorkbook = XLSX.utils.book_new();

  // 建立總表
  const { sheet: summarySheet, data: summaryData } = createSummarySheet(allStudents, sortBy);
  applySheetStyles(summarySheet, summaryData);
  XLSX.utils.book_append_sheet(newWorkbook, summarySheet, '總表');

  // 建立統計分頁
  const { sheet: statsSheet, data: statsData } = createStatsSheet(allStudents, gradeSheets);
  applySheetStyles(statsSheet, statsData);
  XLSX.utils.book_append_sheet(newWorkbook, statsSheet, '統計');

  // 建立各年級分頁
  const gradeOrder = ['學齡前', '一年級', '二年級', '三年級', '四年級', '五年級', '六年級', '國一', '國二', '國三'];
  
  for (const grade of gradeOrder) {
    if (!gradeSheets[grade]) continue;
    
    const { sheet: ws, data, merges } = gradeSheets[grade];
    
    if (merges && merges.length > 0) {
      ws['!merges'] = merges;
    }
    
    applySheetStyles(ws, data);
    XLSX.utils.book_append_sheet(newWorkbook, ws, grade);
  }

  return newWorkbook;
}

/**
 * 建立統計分頁
 */
function createStatsSheet(allStudents, gradeSheets) {
  // 統計各年級的資料
  const stats = [];
  
  const gradeOrder = ['學齡前', '一年級', '二年級', '三年級', '四年級', '五年級', '六年級', '國一', '國二', '國三'];
  
  // 設定區的規則
  const getArea = (grade) => {
    if (grade === '學齡前') return '夢夢基地';
    if (['一年級', '二年級', '三年級'].includes(grade)) return '大衛區';
    if (['四年級', '五年級', '六年級'].includes(grade)) return '約書亞區';
    return '';  // 國中留空
  };
  
  for (const grade of gradeOrder) {
    if (!gradeSheets[grade]) continue;
    
    // 取得該年級的學生資料
    const gradeStudents = allStudents.filter(s => {
      if (grade === '學齡前') {
        return s.年級.includes('未就學') || s.年級.includes('小班') || s.年級.includes('中班') || s.年級.includes('大班');
      }
      return s.年級 === grade;
    });
    
    // 計算人數
    const totalCount = gradeStudents.length;
    
    // 計算尚未繳費人數（報名序號包含「尚未繳費」）
    const unpaidCount = gradeStudents.filter(s => 
      String(s.報名序號 || '').includes('尚未繳費')
    ).length;
    
    stats.push({
      區: getArea(grade),
      年級: grade,
      人數: totalCount,
      隊數: '',  // 留空
      每隊人數: '',  // 留空
      尚未繳費: unpaidCount
    });
  }
  
  // 建立標題列
  const headers = ['區', '年級', '人數', '隊數', '每隊人數', '尚未繳費'];
  
  // 建立資料列
  const dataRows = stats.map(stat => [
    stat.區,
    stat.年級,
    stat.人數,
    stat.隊數,
    stat.每隊人數,
    stat.尚未繳費
  ]);
  
  // 新增總計列（使用公式）
  const totalRowIndex = dataRows.length + 2; // +1為標題列，+1為從1開始
  const totalRow = [
    '總計',
    '',
    { f: `SUM(C2:C${totalRowIndex - 1})` },  // 人數總計
    { f: `SUM(D2:D${totalRowIndex - 1})` },  // 隊數總計
    '',  // 每隊人數留空
    { f: `SUM(F2:F${totalRowIndex - 1})` }   // 尚未繳費總計
  ];
  
  // 合併標題列、資料列和總計列
  const sheetData = [headers, ...dataRows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // 設定合併儲存格（區欄位）
  const merges = [];
  let currentArea = null;
  let startRow = 1; // 從第2列開始（第1列是標題）
  
  dataRows.forEach((row, index) => {
    const area = row[0]; // 區欄位
    const rowIndex = index + 1; // Excel 列索引（從1開始）
    
    if (area !== currentArea) {
      // 如果區改變，先合併上一個區
      if (currentArea !== null && startRow < rowIndex) {
        merges.push({
          s: { r: startRow, c: 0 },  // start: 列, 欄
          e: { r: rowIndex, c: 0 }    // end: 列, 欄
        });
      }
      currentArea = area;
      startRow = rowIndex + 1; // +1 因為 Excel 列索引從1開始
    }
  });
  
  // 處理最後一個區
  if (currentArea !== null && startRow < dataRows.length + 1) {
    merges.push({
      s: { r: startRow, c: 0 },
      e: { r: dataRows.length, c: 0 }
    });
  }
  
  // 設定合併儲存格
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
  
  return { sheet: ws, data: sheetData };
}

export {
  processTeamExcelFile
};
