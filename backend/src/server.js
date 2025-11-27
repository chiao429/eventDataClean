import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中介軟體設定
app.use(cors()); // 允許跨域請求
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 確保 uploads 目錄存在
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API 路由
app.use('/api', uploadRoutes);
app.use('/api/team', teamRoutes);

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '後端服務運行中' });
});

// 這樣寫才對：優先讀取環境變數 PORT，沒有才用 8080
const port = process.env.PORT || 8080;

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 後端伺服器已啟動於 http://localhost:${PORT}`);
  console.log(`📁 上傳目錄: ${uploadsDir}`);
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('錯誤:', err);
  res.status(500).json({
    error: '伺服器錯誤',
    message: err.message
  });
});
