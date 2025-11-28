import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx-js-style';
import { processTeamExcelFile } from '../services/teamDividerService.js';
import { processExcelFile as processTeamListFile } from '../services/teamListService.js';
import { processWorkerAttendanceFile } from '../services/workerAttendanceService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 設定檔案上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'team-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('只接受 .xlsx 或 .xls 格式的檔案'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/team/worker-attendance
 * 上傳同工名單並產生同工出席名單 Excel 檔案
 */
router.post('/worker-attendance', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請上傳檔案' });
    }

    const filePath = req.file.path;

    console.log('處理同工出席名單檔案:', filePath);

    const outputPath = await processWorkerAttendanceFile(filePath);

    const fileBuffer = fs.readFileSync(outputPath);

    const userFileName = (req.body && req.body.outputFileName ? String(req.body.outputFileName).trim() : '') || '';

    let downloadName = userFileName;
    if (!downloadName) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      downloadName = `同工出席名單_${yyyy}${mm}${dd}.xlsx`;
    }

    const encodedFilename = encodeURIComponent(downloadName);

    // 清理暫存檔案
    fs.unlinkSync(filePath);
    fs.unlinkSync(outputPath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('處理同工出席名單檔案時發生錯誤:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('清理上傳檔案失敗:', e);
      }
    }

    return res.status(500).json({
      error: '處理檔案時發生錯誤',
      details: error.message
    });
  }
});

// 測試端點：GET /api/team
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'team API is ready' });
});

/**
 * POST /api/team/upload
 * 上傳並處理分小隊 Excel 檔案
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請上傳檔案' });
    }

    const filePath = req.file.path;
    
    // 取得過濾和排序選項
    const options = {
      hideCancelled: req.body.hideCancelled === 'true',
      hideNoNumber: req.body.hideNoNumber === 'true',
      sortBy: req.body.sortBy || 'registrationNumber'
    };

    console.log('處理分小隊檔案:', filePath);
    console.log('選項:', options);

    // 處理 Excel 檔案
    const workbook = processTeamExcelFile(filePath, options);

    // 產生輸出檔案
    const outputFileName = `分小隊_${Date.now()}.xlsx`;
    const outputPath = path.join(__dirname, '../../uploads', outputFileName);
    
    XLSX.writeFile(workbook, outputPath);

    // 讀取檔案並回傳
    const fileBuffer = fs.readFileSync(outputPath);
    
    // 清理暫存檔案
    fs.unlinkSync(filePath);
    fs.unlinkSync(outputPath);

    // 設定回應標頭並傳送檔案
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFileName)}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('處理分小隊檔案時發生錯誤:', error);
    
    // 清理上傳的檔案
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '處理檔案時發生錯誤',
      details: error.message 
    });
  }
});

/**
 * POST /api/team/team-list
 * 上傳並處理產生小隊名單 Excel 檔案
 */
router.post('/team-list', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請上傳檔案' });
    }

    const filePath = req.file.path;
    
    // 取得過濾和排序選項
    const options = {
      hideCancelled: req.body.hideCancelled === 'true',
      hideNoNumber: req.body.hideNoNumber === 'true',
      sortBy: req.body.sortBy || 'registrationNumber'
    };
    
    // 取得小隊資訊
    let teamInfo = null;
    if (req.body.teamInfo) {
      try {
        teamInfo = JSON.parse(req.body.teamInfo);
      } catch (e) {
        console.error('解析小隊資訊失敗:', e);
      }
    }

    console.log('處理產生小隊名單檔案:', filePath);
    console.log('選項:', options);
    console.log('小隊資訊:', teamInfo);

    // 處理 Excel 檔案
    const outputPath = await processTeamListFile(filePath, options, teamInfo);

    // 讀取檔案並回傳
    const fileBuffer = fs.readFileSync(outputPath);
    
    // 清理暫存檔案
    fs.unlinkSync(filePath);
    fs.unlinkSync(outputPath);
    
    console.log('已清理暫存檔案');

    // 設定回應標頭並傳送檔案
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent('小隊名單.xlsx')}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('處理產生小隊名單檔案時發生錯誤:', error);
    
    // 清理上傳的檔案
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '處理檔案時發生錯誤',
      details: error.message 
    });
  }
});

export default router;
