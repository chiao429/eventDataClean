# Vercel 部署指南

## 架構說明

此專案已重構為 Vercel 相容架構:

- **前端**: React + Vite (部署為靜態網站)
- **後端**: Vercel Serverless Functions (取代原本的 Express 伺服器)
- **API 路徑**: `/api/upload` (自動路由到 serverless function)

## 檔案結構

```
eventDataClean/
├── api/                    # Serverless Functions
│   ├── upload.js          # 主要 API 端點
│   └── package.json       # API 依賴
├── frontend/              # React 前端
│   ├── src/
│   ├── dist/              # 建置輸出 (自動生成)
│   ├── .env.production    # 生產環境變數
│   └── .env.development   # 開發環境變數
├── backend/               # 原始後端 (僅供本地開發)
├── vercel.json            # Vercel 配置
├── .vercelignore          # 忽略檔案
└── package.json           # 根目錄配置
```

## 部署步驟

### 方法一: 使用 Vercel CLI (推薦)

1. **安裝 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登入 Vercel**
   ```bash
   vercel login
   ```

3. **部署到 Vercel**
   ```bash
   # 在專案根目錄執行
   vercel
   ```
   
   首次部署會詢問:
   - Set up and deploy? → **Yes**
   - Which scope? → 選擇您的帳號
   - Link to existing project? → **No**
   - What's your project's name? → 輸入專案名稱 (例如: `event-checkin`)
   - In which directory is your code located? → **./frontend**
   - Want to override the settings? → **No**

4. **部署到生產環境**
   ```bash
   vercel --prod
   ```

### 方法二: 使用 Vercel Dashboard (GitHub 整合)

1. **推送程式碼到 GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push origin main
   ```

2. **在 Vercel Dashboard 匯入專案**
   - 前往 [vercel.com](https://vercel.com)
   - 點擊 "Add New Project"
   - 選擇您的 GitHub repository
   - 配置設定:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - 點擊 "Deploy"

## 環境變數設定

### 本地開發

前端會自動使用 `frontend/.env.development`:
```env
VITE_API_URL=http://localhost:3001
```

### 生產環境

前端會自動使用 `frontend/.env.production`:
```env
VITE_API_URL=
```
(空值表示使用相對路徑,自動指向同網域的 `/api`)

## 本地開發

### 啟動本地開發環境

**選項 1: 使用原始 Express 後端 (推薦用於開發)**

```bash
# 終端機 1: 啟動後端
cd backend
npm install
npm run dev

# 終端機 2: 啟動前端
cd frontend
npm install
npm run dev
```

**選項 2: 使用 Vercel CLI 模擬 Serverless Functions**

```bash
# 安裝所有依賴
npm run install:all

# 使用 Vercel Dev
vercel dev
```

## 驗證部署

部署完成後,訪問 Vercel 提供的 URL:

1. **測試前端**: `https://your-project.vercel.app`
2. **測試 API**: `https://your-project.vercel.app/api/upload` (應該回傳 405 錯誤,因為只接受 POST)

## 重要限制

### Vercel Serverless Functions 限制

- **執行時間**: 
  - Hobby 方案: 10 秒
  - Pro 方案: 60 秒 (已在 `vercel.json` 設定為 30 秒)
- **請求大小**: 4.5MB (Hobby) / 4.5MB (Pro)
- **回應大小**: 4.5MB (Hobby) / 5MB (Pro)
- **記憶體**: 已設定為 1024MB

### 建議

- 如果 Excel 檔案超過 4MB,考慮:
  1. 分批上傳
  2. 使用其他平台部署後端 (Railway, Render, Fly.io)
  3. 升級到 Vercel Pro 方案

## 故障排除

### 部署失敗

1. **檢查建置日誌**
   ```bash
   vercel logs
   ```

2. **本地測試建置**
   ```bash
   cd frontend
   npm run build
   ```

### API 無法連接

1. **檢查 API 路徑**
   - 確認前端使用相對路徑 `/api/upload`
   - 檢查 `vercel.json` 路由設定

2. **檢查 CORS 設定**
   - API 已設定允許所有來源 (`Access-Control-Allow-Origin: *`)

### 檔案上傳失敗

1. **檢查檔案大小**: 確保小於 4.5MB
2. **檢查執行時間**: 大型檔案可能需要更長處理時間

## 更新部署

### 自動部署 (GitHub 整合)

推送到 main 分支會自動觸發部署:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

### 手動部署 (CLI)

```bash
vercel --prod
```

## 回滾部署

在 Vercel Dashboard:
1. 前往 "Deployments" 頁面
2. 找到之前的成功部署
3. 點擊 "Promote to Production"

或使用 CLI:
```bash
vercel rollback
```

## 監控與日誌

### 查看即時日誌
```bash
vercel logs --follow
```

### 查看特定部署的日誌
```bash
vercel logs [deployment-url]
```

## 自訂網域

在 Vercel Dashboard:
1. 前往 "Settings" → "Domains"
2. 新增您的自訂網域
3. 依照指示設定 DNS

## 成本估算

- **Hobby 方案** (免費):
  - 100GB 頻寬/月
  - Serverless Function 執行時間: 100 小時/月
  - 適合個人專案和測試

- **Pro 方案** ($20/月):
  - 1TB 頻寬/月
  - Serverless Function 執行時間: 1000 小時/月
  - 更長的執行時間限制

## 支援

- [Vercel 文件](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html#vercel)
