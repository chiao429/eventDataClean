import XLSX from 'xlsx-js-style';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 設定工作表樣式（標題置中、內容靠右、自動欄寬）
 * @param {Object} ws - Excel 工作表物件
 * @param {Array} data - 資料陣列（包含標題列）
 */
function applySheetStyles(ws, data) {
  if (!ws || !data || data.length === 0) return;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const colCount = range.e.c + 1;
  const rowCount = range.e.r + 1;

  // 計算每欄的最大寬度（以標題為基準，內容超過才調整）
  const colWidths = [];
  
  // 輔助函數：計算字串寬度
  const calculateWidth = (str) => {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      // 判斷是否為中文字、全形符號
      if (char.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/)) {
        width += 2.2; // 中文字寬度
      } else {
        width += 1.1; // 英文/數字寬度
      }
    }
    return width;
  };
  
  for (let C = 0; C < colCount; C++) {
    // 1. 先取得標題列（第0列）的寬度作為基準
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    let headerWidth = 8; // 預設最小寬度
    let headerText = '';
    if (headerCell && headerCell.v) {
      headerText = String(headerCell.v);
      headerWidth = calculateWidth(headerText);
    }
    
    // 2. 檢查內容列是否有超過標題寬度的
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
    
    // 3. 特殊處理「出席」欄位，固定為兩個中文字寬度
    if (headerText === '出席') {
      colWidths.push({ wch: 5 }); // 兩個中文字的寬度
    } else {
      // 如果內容寬度超過標題，使用內容寬度；否則使用標題寬度
      const finalWidth = maxContentWidth > headerWidth ? maxContentWidth : headerWidth;
      colWidths.push({ wch: Math.ceil(finalWidth) + 1 }); // 向上取整並加1作為邊距
    }
  }
  ws['!cols'] = colWidths;

  // 設定儲存格樣式
  // 取得標題列，用於判斷欄位名稱
  const headers = [];
  for (let C = 0; C < colCount; C++) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    headers.push(headerCell && headerCell.v ? String(headerCell.v) : '');
  }

  for (let R = 0; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      // 初始化樣式物件
      if (!ws[cellAddress].s) {
        ws[cellAddress].s = {};
      }
      
      // 設定外框
      ws[cellAddress].s.border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      // 第一列（標題列）：全部置中並加上背景顏色
      if (R === 0) {
        ws[cellAddress].s.alignment = { 
          horizontal: 'center', 
          vertical: 'center',
          wrapText: false
        };
        
        // 設定背景顏色
        const columnName = headers[C];
        let fillColor = null;
        
        // 所屬小隊欄位 (#D1F1DA - 綠色)
        if (columnName === '所屬小隊') {
          fillColor = 'D1F1DA';
        }
        // 報名序號欄位 (#D0E2F3 - 藍色)
        else if (columnName === '報名序號') {
          fillColor = 'D0E2F3';
        }
        // 備註欄位 (不填顏色)
        else if (columnName === '備註') {
          fillColor = null;
        }
        // 其他欄位 (#FDE49A - 黃色)
        else {
          fillColor = 'FDE49A';
        }
        
        if (fillColor) {
          ws[cellAddress].s.fill = {
            patternType: 'solid',
            fgColor: { rgb: fillColor }
          };
        }
      } 
      // 內容列：根據欄位名稱決定對齊方式
      else {
        const columnName = headers[C];
        
        // 家長行動電話：設定為字串格式並靠左對齊
        if (columnName === '家長行動電話') {
          ws[cellAddress].t = 's'; // 設定為字串類型
          ws[cellAddress].s.alignment = { 
            horizontal: 'left', 
            vertical: 'center',
            wrapText: false
          };
        }
        // 家長姓名：靠左對齊
        else if (columnName === '家長姓名') {
          ws[cellAddress].s.alignment = { 
            horizontal: 'left', 
            vertical: 'center',
            wrapText: false
          };
        }
        // 項次、報名序號、兒童姓名、性別、年級：置中對齊
        else if (['項次', '報名序號', '兒童姓名', '性別', '年級'].includes(columnName)) {
          ws[cellAddress].s.alignment = { 
            horizontal: 'center', 
            vertical: 'center',
            wrapText: false
          };
        }
        // 其他欄位：靠右對齊（預設）
        else {
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
 * 將年級字串轉換為數字以便比較
 * 例如：「一年級" -> 1, "大班" -> -1, "中班" -> -2, "小班" -> -3, "未就學" -> -3
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
 * @param {string} currentGrade - 當前孩子的年級
 * @param {string} siblingGrade - 手足的年級
 * @param {string} siblingGender - 手足的性別
 * @returns {string} - 稱謂（哥哥/姊姊/弟弟/妹妹/同年齡）
 */
function calculateSiblingTitle(currentGrade, siblingGrade, siblingGender) {
  const currentGradeNum = gradeToNumber(currentGrade);
  const siblingGradeNum = gradeToNumber(siblingGrade);
  
  // 年級相同
  if (currentGradeNum === siblingGradeNum) {
    return '同年齡';
  }
  
  // 判斷年級大小和性別
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
 * 輸入格式：小明（男, 二年級）、小美（女, 四年級）
 * 輸出：{ names: ['小明', '小美'], genders: ['男', '女'], grades: ['二年級', '四年級'], registrationNumbers: [], teams: [] }
 */
function parseSiblingString(siblingStr) {
  // 如果是空值或「無」，返回空陣列
  if (!siblingStr || siblingStr === '無' || String(siblingStr).trim() === '') {
    return { names: [], genders: [], grades: [], registrationNumbers: [], teams: [] };
  }

  const names = [];
  const genders = [];
  const grades = [];

  // 使用正則表達式找出所有符合「姓名（性別, 年級）」格式的手足
  // 支援全形和半形括號
  const pattern = /([^、，,]+?)[（(]([^,，]+?)[,，]\s*([^）)]+?)[）)]/g;
  
  let match;
  while ((match = pattern.exec(String(siblingStr))) !== null) {
    const [, name, gender, grade] = match;
    names.push(name.trim());
    genders.push(gender.trim());
    grades.push(grade.trim());
  }

  // 從字串解析無法取得報名序號和小隊，返回空陣列
  return { names, genders, grades, registrationNumbers: [], teams: [] };
}

/**
 * 處理 Excel 檔案的主函數
 * @param {string} inputPath - 輸入檔案路徑
 * @param {Object} filterOptions - 過濾選項
 * @param {boolean} filterOptions.hideCancelled - 是否隱藏取消名單
 * @param {boolean} filterOptions.hideNoNumber - 是否隱藏無序號名單
 * @param {string} filterOptions.sortBy - 排序方式 ('registrationNumber' | 'originalIndex')
 * @param {Object} teamInfo - 小隊資訊(活動名稱、小隊長資料)
 * @returns {Promise<string>} - 輸出檔案路徑
 */
export async function processExcelFile(inputPath, filterOptions = {}, teamInfo = null) {
  try {
    // 1. 讀取 Excel 檔案
    const workbook = XLSX.readFile(inputPath);
    
    // 2. 取得第一個工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 3. 嘗試不同的起始列來找到正確的資料
    let rawData = null;
    let headerRowIndex = 0;
    
    // 嘗試從第 0 列到第 10 列，找到包含「兒童姓名」或「報名序號」的標題列
    for (let skipRows = 0; skipRows <= 10; skipRows++) {
      const testData = XLSX.utils.sheet_to_json(worksheet, { range: skipRows });
      
      if (testData.length > 0) {
        const firstRow = testData[0];
        const columns = Object.keys(firstRow);
        
        // 檢查是否包含關鍵欄位
        if (columns.some(col => col.includes('兒童姓名') || col.includes('報名序號') || col.includes('姓名'))) {
          rawData = testData;
          headerRowIndex = skipRows;
          console.log(`找到標題列於第 ${skipRows + 1} 列`);
          break;
        }
      }
    }
    
    // 如果找不到標題列，使用預設的第一列
    if (!rawData) {
      console.warn('未找到標準標題列，使用第一列作為標題');
      rawData = XLSX.utils.sheet_to_json(worksheet);
    }
    
    console.log(`讀取到 ${rawData.length} 筆資料`);
    
    // 4. 檢查資料是否為空
    if (!rawData || rawData.length === 0) {
      throw new Error('Excel 檔案中沒有資料，請確認檔案內容');
    }
    
    // 5. 清理欄位名稱（移除換行符、空格等）並重新對應資料
    const cleanedData = rawData.map(row => {
      const cleanedRow = {};
      for (const [key, value] of Object.entries(row)) {
        // 清理欄位名稱：移除 \r\n, \n, \r 和多餘空格
        let cleanKey = key.replace(/[\r\n]+/g, '').trim();
        
        // 處理特殊情況：合併儲存格導致的欄位名稱錯誤
        // '(收費同工)報名序號_1' 或 '報名序號_1' 實際上是「兒童姓名」欄位
        if (cleanKey.includes('報名序號_1')) {
          cleanKey = '兒童姓名';
        }
        // '(收費同工)報名序號' 或單純的 '報名序號' 都是「報名序號」欄位
        if (cleanKey.includes('(收費同工)報名序號') || cleanKey === '報名序號') {
          cleanKey = '報名序號';
        }
        
        cleanedRow[cleanKey] = value;
      }
      return cleanedRow;
    });
    
    // 6. 檢查必要欄位並顯示可用欄位
    const firstRow = cleanedData[0];
    const availableColumns = Object.keys(firstRow);
    console.log('Excel 中的欄位（已清理）:', availableColumns);
    console.log('第一筆資料範例:', firstRow);
    
    // 必要欄位列表
    const requiredColumns = ['兒童姓名', '性別', '年級', '學校', '家長姓名', '家長行動電話', '小隊'];
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.warn('警告：缺少以下欄位:', missingColumns);
      console.warn('系統將繼續處理，但這些欄位的資料會是空值');
      console.warn('特別提醒：「小隊」欄位是必要的，用於填入所屬小隊和手足小隊資訊');
    }

    // 6.5. 根據過濾選項過濾資料
    let filteredData = cleanedData;
    
    if (filterOptions.hideCancelled) {
      filteredData = filteredData.filter(row => {
        const registrationNumber = String(row['報名序號'] || '').trim();
        // 只要包含「取消」兩個字就過濾掉
        return !registrationNumber.includes('取消');
      });
      console.log(`過濾「取消名單」後剩餘 ${filteredData.length} 筆資料`);
    }
    
    if (filterOptions.hideNoNumber) {
      filteredData = filteredData.filter(row => {
        const registrationNumber = String(row['報名序號'] || '').trim();
        return registrationNumber !== '' && registrationNumber !== '無';
      });
      console.log(`過濾「無序號名單」後剩餘 ${filteredData.length} 筆資料`);
    }

    // 7. 處理資料：依小隊分組並加入手足資訊
    const { teamSheets, allStudents } = processExcelData(filteredData);

    // 8. 建立新的工作簿
    const newWorkbook = XLSX.utils.book_new();

    // 9. 建立「總表」分頁（放在第一個）
    const { sheet: summarySheet, data: summaryData } = createSummarySheet(allStudents, filterOptions.sortBy);
    applySheetStyles(summarySheet, summaryData);
    XLSX.utils.book_append_sheet(newWorkbook, summarySheet, '總表');
    console.log(`建立分頁: 總表, 共 ${allStudents.length} 筆資料`);

    // 10. 建立各小隊分頁（按小隊名稱自然排序）
    const teamNames = Object.keys(teamSheets).sort((a, b) => {
      // 自然排序：先比較字母部分，再比較數字部分
      const matchA = a.match(/^([a-zA-Z]+)(\d+)$/);
      const matchB = b.match(/^([a-zA-Z]+)(\d+)$/);
      
      if (matchA && matchB) {
        // 先比較字母部分
        if (matchA[1] !== matchB[1]) {
          return matchA[1].localeCompare(matchB[1]);
        }
        // 再比較數字部分
        return parseInt(matchA[2]) - parseInt(matchB[2]);
      }
      
      // 如果不符合格式，使用普通字串排序
      return a.localeCompare(b);
    });
    
    console.log(`找到 ${teamNames.length} 個小隊: ${teamNames.join(', ')}`);
    
    for (const teamName of teamNames) {
      const sheetInfo = teamSheets[teamName];
      // 建立工作表名稱（Excel 工作表名稱有長度限制）
      const sheetName = teamName.substring(0, 31); // Excel 限制 31 字元
      
      // 準備工作表資料，在最上方新增活動名稱和小隊資訊
      let finalData = [...sheetInfo.data];
      let additionalMerges = [];
      
      if (teamInfo && teamInfo.activityName) {
        // 取得小隊長資訊
        const leaderInfo = teamInfo.leaders && teamInfo.leaders[teamName];
        
        // 建立第一列：活動名稱 + 小隊資訊（用換行符號分隔）
        let combinedText = teamInfo.activityName;
        
        // 建立小隊資訊
        let teamInfoText = `${teamName}小隊`;
        if (leaderInfo) {
          if (leaderInfo.leader) {
            const leaderTitle = leaderInfo.leaderGender === '男' ? '哥哥' : leaderInfo.leaderGender === '女' ? '姊姊' : '';
            teamInfoText += ` 隊長：${leaderInfo.leader}${leaderTitle}`;
          }
          if (leaderInfo.viceLeader) {
            const viceLeaderTitle = leaderInfo.viceLeaderGender === '男' ? '哥哥' : leaderInfo.viceLeaderGender === '女' ? '姊姊' : '';
            teamInfoText += ` / 副小隊長：${leaderInfo.viceLeader}${viceLeaderTitle}`;
          }
        }
        
        // 用換行符號合併
        combinedText += '\n' + teamInfoText;
        const infoRow = [combinedText];
        
        // 在資料最前面插入這一列
        finalData = [infoRow, ...sheetInfo.data];
        
        // 設定合併儲存格（合併整列）
        const colCount = sheetInfo.data[0].length; // 取得欄位數量
        additionalMerges = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }  // 第一列合併
        ];
      }
      
      // 將資料轉換為工作表
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      
      // 設定合併儲存格
      const allMerges = [...additionalMerges];
      if (sheetInfo.merges && sheetInfo.merges.length > 0) {
        // 原有的合併需要調整列索引（因為新增了一列）
        const offsetMerges = sheetInfo.merges.map(merge => ({
          s: { r: merge.s.r + (teamInfo && teamInfo.activityName ? 1 : 0), c: merge.s.c },
          e: { r: merge.e.r + (teamInfo && teamInfo.activityName ? 1 : 0), c: merge.e.c }
        }));
        allMerges.push(...offsetMerges);
      }
      
      if (allMerges.length > 0) {
        ws['!merges'] = allMerges;
      }
      
      // 先設定樣式和欄寬
      applySheetStyles(ws, finalData);
      
      // 如果有小隊資訊,在 applySheetStyles 之後再設定第一列的樣式（避免被覆蓋）
      if (teamInfo && teamInfo.activityName) {
        const colCount = sheetInfo.data[0].length;
        
        // 設定第一列的列高（足夠顯示兩行文字）
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 40 }; // 設定第一列高度為40點
        
        // 設定第一列所有儲存格的樣式
        for (let c = 0; c < colCount; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: c });
          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }
          ws[cellAddress].s = {
            alignment: {
              wrapText: true,
              vertical: 'center',
              horizontal: 'center'
            },
            font: {
              sz: 16,
              bold: true
            },
            fill: {
              fgColor: { rgb: 'D0D0D0' }
            },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
        
        // 設定標題列(第二列)的底色
        for (let c = 0; c < colCount; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 1, c: c });
          if (ws[cellAddress]) {
            if (!ws[cellAddress].s) {
              ws[cellAddress].s = {};
            }
            ws[cellAddress].s.fill = {
              fgColor: { rgb: 'D0D0D0' }
            };
          }
        }
        
        // 修正「出席」欄位寬度（在有小隊資訊時，標題列是第二列）
        if (ws['!cols']) {
          ws['!cols'][0] = { wch: 5 }; // 第一欄（出席）固定為5字元寬
        }
      }
      
      // 加入到工作簿
      XLSX.utils.book_append_sheet(newWorkbook, ws, sheetName);
      
      console.log(`建立分頁: ${sheetName}, 共 ${finalData.length - 1} 筆資料`);
    }

    // 11. 輸出檔案
    const outputPath = path.join(__dirname, '../../uploads', `processed-${Date.now()}.xlsx`);
    XLSX.writeFile(newWorkbook, outputPath);

    console.log(`處理完成，輸出檔案: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('處理 Excel 時發生錯誤:', error);
    console.error('錯誤詳情:', error.message);
    console.error('錯誤堆疊:', error.stack);
    
    // 提供更友善的錯誤訊息
    if (error.message.includes('Cannot read')) {
      throw new Error('Excel 檔案格式錯誤或檔案損壞，請確認檔案是否正確');
    }
    throw error;
  }
}

/**
 * 處理 Excel 資料：依年級分組並加入手足資訊
 * @param {Array} rawData - 原始資料陣列
 * @returns {Object} - 包含年級分組資料和所有學生資料
 */
function processExcelData(rawData) {
  // 1. 建立家長對應表，用於判斷手足關係
  const parentMap = buildParentMap(rawData);

  // 2. 依小隊分組，並收集所有處理過的學生資料
  const teamGroups = {};
  const allStudents = []; // 收集所有學生資料

  rawData.forEach((item, index) => {
    // 取得小隊，若為空則歸類到「未分隊」
    const team = item['小隊'] ? String(item['小隊']).trim() : '未分隊';

    // 初始化該小隊的陣列
    if (!teamGroups[team]) {
      teamGroups[team] = [];
    }

    // 取得手足資訊
    const siblings = getSiblings(item, parentMap);
    
    // 計算手足稱謂
    const siblingTitles = siblings.names.map((name, idx) => {
      return calculateSiblingTitle(
        item['年級'] || '',
        siblings.grades[idx] || '',
        siblings.genders[idx] || ''
      );
    });

    // 處理家長行動電話：如果是 9 開頭，補上 0
    let phoneNumber = item['家長行動電話'] || '';
    if (phoneNumber) {
      phoneNumber = String(phoneNumber).trim();
      // 如果是 9 開頭且長度為 9 位數，前面補 0
      if (/^9\d{8}$/.test(phoneNumber)) {
        phoneNumber = '0' + phoneNumber;
      }
    }

    // 處理報名序號：如果包含「不收費」，只保留數字
    let registrationNumber = item['報名序號'] || '';
    if (registrationNumber) {
      registrationNumber = String(registrationNumber).trim();
      // 如果包含「不收費」，移除所有中文字，只保留數字
      if (registrationNumber.includes('不收費')) {
        registrationNumber = registrationNumber.replace(/[^\d]/g, '');
      }
    }
    
    // 取得手足的報名序號和小隊
    const siblingNumbers = siblings.registrationNumbers || [];
    const siblingTeams = siblings.teams || [];

    // 組裝該筆資料（支援多種欄位名稱）
    const processedItem = {
      原始項次: index + 1, // 使用資料的順序位置（從1開始）
      項次: teamGroups[team].length + 1, // 小隊內的項次
      所屬小隊: team,
      報名序號: registrationNumber,
      兒童姓名: item['兒童姓名'] || item['姓名'] || item['孩童姓名'] || '',
      性別: item['性別'] || '',
      年級: item['年級'] || '',
      學校: item['學校'] || '',
      手足稱謂: siblingTitles.join(', ') || '無',
      手足名稱: siblings.names.join(', ') || '無',
      手足性別: siblings.genders.join(', ') || '無',
      手足年級: siblings.grades.join(', ') || '無',
      手足序號: siblingNumbers.join(', ') || '無',
      手足小隊: siblingTeams.join(', ') || '無',
      家長姓名: item['家長姓名'] || '',
      家長行動電話: phoneNumber,
      公開照片: '',
      提供聯繫方式: '',
      備註: item['備註'] || ''
    };

    teamGroups[team].push(processedItem);
    allStudents.push(processedItem); // 加入到總表
  });

  // 3. 對每個小隊的資料按年級和報名序號排序
  for (const [team, students] of Object.entries(teamGroups)) {
    students.sort((a, b) => {
      // 先按年級排序（學齡前分組）
      const gradeOrder = { '未就學': 0, '小班': 1, '中班': 2, '大班': 3 };
      let gradeA, gradeB;
      
      // 處理學齡前
      if (a.年級.includes('未就學') || a.年級.includes('小班') || a.年級.includes('中班') || a.年級.includes('大班')) {
        gradeA = gradeOrder[a.年級] !== undefined ? gradeOrder[a.年級] : 0;
      } else {
        gradeA = gradeToNumber(a.年級);
      }
      
      if (b.年級.includes('未就學') || b.年級.includes('小班') || b.年級.includes('中班') || b.年級.includes('大班')) {
        gradeB = gradeOrder[b.年級] !== undefined ? gradeOrder[b.年級] : 0;
      } else {
        gradeB = gradeToNumber(b.年級);
      }
      
      if (gradeA !== gradeB) {
        return gradeA - gradeB;
      }
      
      // 同年級內按報名序號排序
      const numA = parseInt(a.報名序號) || 0;
      const numB = parseInt(b.報名序號) || 0;
      return numA - numB;
    });
  }

  // 4. 將每個小隊的資料轉換為二維陣列格式（用於 Excel 輸出）
  const teamSheets = {};

  for (const [team, students] of Object.entries(teamGroups)) {
    // 建立標題列
    const headers = [
      '出席',
      '項次',
      '所屬小隊',
      '報名序號',
      '兒童姓名',
      '性別',
      '年級',
      '學校',
      '家長姓名',
      '家長行動電話',
      '手足稱謂',
      '手足名稱',
      '手足性別',
      '手足年級',
      '手足序號',
      '手足小隊',
      '公開照片',
      '提供聯繫方式',
      '備註'
    ];

    // 建立資料列（只展開手足，不保留原始列）
    const rows = [];
    const merges = [];  // 記錄需要合併的儲存格
    let currentIndex = 1;
    let rowIndex = 1;  // Excel 列索引（從1開始，0是標題列）

    students.forEach(student => {
      // 展開手足資料成多列（每個手足一列）
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
      const siblingNumbers = student.手足序號 && student.手足序號 !== '無'
        ? student.手足序號.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];
      const siblingTeams = student.手足小隊 && student.手足小隊 !== '無'
        ? student.手足小隊.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];

      const startRow = rowIndex;  // 記錄起始列

      // 如果沒有手足，輸出一列（手足欄位為空）
      if (siblingNames.length === 0) {
        rows.push([
          '',  // 出席欄位留空
          currentIndex,
          student.所屬小隊,
          student.報名序號,
          student.兒童姓名,
          student.性別,
          student.年級,
          student.學校,
          student.家長姓名,
          student.家長行動電話,
          '',  // 手足稱謂為空
          '',  // 手足名稱為空
          '',  // 手足性別為空
          '',  // 手足年級為空
          '',  // 手足序號為空
          '',  // 手足小隊為空
          '',  // 公開照片為空
          '',  // 提供聯繫方式為空
          student.備註
        ]);
        rowIndex++;
      } else {
        // 為每個手足產生一列
        siblingNames.forEach((siblingName, idx) => {
          rows.push([
            '',  // 出席欄位留空
            currentIndex,
            student.所屬小隊,
            student.報名序號,
            student.兒童姓名,
            student.性別,
            student.年級,
            student.學校,
            student.家長姓名,
            student.家長行動電話,
            siblingTitles[idx] || '',   // 單一手足稱謂
            siblingName,  // 單一手足名稱（不含逗號）
            siblingGenders[idx] || '',  // 單一手足性別
            siblingGrades[idx] || '',   // 單一手足年級
            siblingNumbers[idx] || '',  // 單一手足序號
            siblingTeams[idx] || '',    // 單一手足小隊
            '',  // 公開照片為空
            '',  // 提供聯繫方式為空
            student.備註
          ]);
          rowIndex++;
        });

        // 如果有多個手足，需要合併基本資料欄位
        if (siblingNames.length > 1) {
          const endRow = rowIndex - 1;
          // 合併欄位：出席(0), 項次(1), 所屬小隊(2), 報名序號(3), 兒童姓名(4), 性別(5), 年級(6), 學校(7), 家長姓名(8), 家長行動電話(9), 公開照片(16), 提供聯繫方式(17), 備註(18)
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18].forEach(col => {
            merges.push({
              s: { r: startRow, c: col },  // start
              e: { r: endRow, c: col }     // end
            });
          });
        }
      }

      currentIndex++;
    });

    // 合併標題列和資料列
    teamSheets[team] = { data: [headers, ...rows], merges };
  }

  return { teamSheets, allStudents };
}

/**
 * 建立總表分頁
 * 將所有學生資料排序，並展開手足資料
 * @param {Array} allStudents - 所有學生資料
 * @param {string} sortBy - 排序方式 ('registrationNumber' | 'originalIndex')
 * @returns {Object} - Excel 工作表物件
 */
function createSummarySheet(allStudents, sortBy = 'registrationNumber') {
  // 1. 根據排序選項排序
  let sortedStudents;
  if (sortBy === 'originalIndex') {
    // 依原始項次排序（保持上傳檔案的順序）
    sortedStudents = [...allStudents].sort((a, b) => {
      const numA = parseInt(a.原始項次) || 0;
      const numB = parseInt(b.原始項次) || 0;
      return numA - numB;
    });
    console.log('總表排序方式: 依原始項次');
  } else {
    // 依報名序號排序（預設）
    sortedStudents = [...allStudents].sort((a, b) => {
      const numA = parseInt(a.報名序號) || 0;
      const numB = parseInt(b.報名序號) || 0;
      return numA - numB;
    });
    console.log('總表排序方式: 依報名序號');
  }

  // 2. 建立標題列
  const headers = [
    '出席',
    '項次',
    '所屬小隊',
    '報名序號',
    '兒童姓名',
    '性別',
    '年級',
    '學校',
    '家長姓名',
    '家長行動電話',
    '手足稱謂',
    '手足名稱',
    '手足性別',
    '手足年級',
    '手足序號',
    '手足小隊',
    '公開照片',
    '提供聯繫方式',
    '備註'
  ];

  // 3. 建立資料列（只展開手足，不保留原始列）
  const dataRows = [];
  const merges = [];  // 記錄需要合併的儲存格
  let currentIndex = 1;
  let rowIndex = 1;  // Excel 列索引（從1開始，0是標題列）

  sortedStudents.forEach(student => {
    // 展開手足資料成多列（每個手足一列）
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
    const siblingNumbers = student.手足序號 && student.手足序號 !== '無'
      ? student.手足序號.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];
    const siblingTeams = student.手足小隊 && student.手足小隊 !== '無'
      ? student.手足小隊.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];

    const startRow = rowIndex;  // 記錄起始列
    
    // 決定項次：如果是依原始項次排序，使用原始項次；否則重新編號
    const displayIndex = sortBy === 'originalIndex' ? student.原始項次 : currentIndex;

    // 如果沒有手足，輸出一列（手足欄位為空）
    if (siblingNames.length === 0) {
      dataRows.push([
        '',  // 出席欄位留空
        displayIndex,
        student.所屬小隊,
        student.報名序號,
        student.兒童姓名,
        student.性別,
        student.年級,
        student.學校,
        student.家長姓名,
        student.家長行動電話,
        '',  // 手足稱謂為空
        '',  // 手足名稱為空
        '',  // 手足性別為空
        '',  // 手足年級為空
        '',  // 手足序號為空
        '',  // 手足小隊為空
        '',  // 公開照片為空
        '',  // 提供聯繫方式為空
        student.備註
      ]);
      rowIndex++;
    } else {
      // 為每個手足產生一列
      siblingNames.forEach((siblingName, idx) => {
        dataRows.push([
          '',  // 出席欄位留空
          displayIndex,
          student.所屬小隊,
          student.報名序號,
          student.兒童姓名,
          student.性別,
          student.年級,
          student.學校,
          student.家長姓名,
          student.家長行動電話,
          siblingTitles[idx] || '',   // 單一手足稱謂
          siblingName,  // 單一手足名稱（不含逗號）
          siblingGenders[idx] || '',  // 單一手足性別
          siblingGrades[idx] || '',   // 單一手足年級
          siblingNumbers[idx] || '',  // 單一手足序號
          siblingTeams[idx] || '',    // 單一手足小隊
          '',  // 公開照片為空
          '',  // 提供聯繫方式為空
          student.備註
        ]);
        rowIndex++;
      });

      // 如果有多個手足，需要合併基本資料欄位
      if (siblingNames.length > 1) {
        const endRow = rowIndex - 1;
        // 合併欄位：出席(0), 項次(1), 所屬小隊(2), 報名序號(3), 兒童姓名(4), 性別(5), 年級(6), 學校(7), 家長姓名(8), 家長行動電話(9), 公開照片(16), 提供聯繫方式(17), 備註(18)
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18].forEach(col => {
          merges.push({
            s: { r: startRow, c: col },  // start
            e: { r: endRow, c: col }     // end
          });
        });
      }
    }

    currentIndex++;
  });

  // 4. 合併標題列和資料列，轉換為工作表
  const sheetData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // 設定合併儲存格
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
  
  return { sheet: ws, data: sheetData };
}

/**
 * 建立家長對應表
 * 用於快速查詢同一個家長的所有孩子
 * @param {Array} rawData - 原始資料
 * @returns {Map} - 家長姓名 -> 孩子陣列的對應表
 */
function buildParentMap(rawData) {
  const parentMap = new Map();

  rawData.forEach(item => {
    const parentName = item['家長姓名'];
    
    // 若家長姓名為空，則跳過
    if (!parentName || String(parentName).trim() === '') {
      return;
    }

    const trimmedParentName = String(parentName).trim();

    // 初始化該家長的孩子陣列
    if (!parentMap.has(trimmedParentName)) {
      parentMap.set(trimmedParentName, []);
    }

    // 處理報名序號：如果包含「不收費」，只保留數字
    let registrationNumber = item['報名序號'] || '';
    if (registrationNumber) {
      registrationNumber = String(registrationNumber).trim();
      if (registrationNumber.includes('不收費')) {
        registrationNumber = registrationNumber.replace(/[^\d]/g, '');
      }
    }

    // 加入孩子資訊（支援多種欄位名稱）
    parentMap.get(trimmedParentName).push({
      兒童姓名: item['兒童姓名'] || item['姓名'] || item['孩童姓名'] || '',
      性別: item['性別'] || '',
      年級: item['年級'] || '',
      報名序號: registrationNumber,
      小隊: item['小隊'] || ''
    });
  });

  return parentMap;
}

/**
 * 取得某個孩子的手足資訊
 * @param {Object} currentChild - 當前孩子的資料
 * @param {Map} parentMap - 家長對應表
 * @returns {Object} - 手足資訊 { names: [], genders: [], grades: [], registrationNumbers: [], teams: [] }
 */
function getSiblings(currentChild, parentMap) {
  // 優先檢查是否有「兄弟姊妹」或「手足」欄位（格式：姓名（性別, 年級）、姓名（性別, 年級））
  const siblingField = currentChild['兄弟姊妹'] || currentChild['手足'] || currentChild['兄弟姐妹'];
  
  if (siblingField && String(siblingField).trim() !== '' && String(siblingField).trim() !== '無') {
    // 使用字串解析方式
    return parseSiblingString(siblingField);
  }

  // 否則使用家長姓名判斷手足關係（原有邏輯）
  const parentName = currentChild['家長姓名'];
  const currentChildName = currentChild['兒童姓名'] || currentChild['姓名'] || currentChild['孩童姓名'];

  // 若家長姓名為空，則無手足
  if (!parentName || String(parentName).trim() === '') {
    return { names: [], genders: [], grades: [], registrationNumbers: [], teams: [] };
  }

  const trimmedParentName = String(parentName).trim();
  const allChildren = parentMap.get(trimmedParentName) || [];

  // 過濾掉當前孩子，剩下的就是手足
  const siblings = allChildren.filter(child => child.兒童姓名 !== currentChildName);

  // 整理手足資訊
  const names = siblings.map(s => s.兒童姓名);
  const genders = siblings.map(s => s.性別);
  const grades = siblings.map(s => s.年級);
  const registrationNumbers = siblings.map(s => {
    let regNum = s.報名序號 || '';
    if (regNum) {
      regNum = String(regNum).trim();
      // 如果包含「不收費」，移除所有中文字，只保留數字
      if (regNum.includes('不收費')) {
        regNum = regNum.replace(/[^\d]/g, '');
      }
    }
    return regNum;
  });
  const teams = siblings.map(s => s.小隊 || '');

  return { names, genders, grades, registrationNumbers, teams };
}
