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
// 優先使用環境變數 PORT（例如 Cloud Run 會設定），本機開發預設使用 3001
const PORT = process.env.PORT || 3001;

// 中介軟體設定
app.use(cors()); // 允許跨域請求
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 確保 uploads 目錄存在
const uploadsDir = path.join(__dirname, '../uploads');
const frontendDistDir = path.join(__dirname, '../../frontend-dist');
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

// 單一 Cloud Run 容器同時提供 React 前端與 API
if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

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
