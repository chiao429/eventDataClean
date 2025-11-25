# 🚀 快速部署到 Vercel

## 最快速的部署方式 (3 步驟)

### 1️⃣ 安裝 Vercel CLI

```bash
npm install -g vercel
```

### 2️⃣ 登入 Vercel

```bash
vercel login
```

### 3️⃣ 部署!

```bash
# 在專案根目錄執行
vercel

# 部署到生產環境
vercel --prod
```

---

## 部署時的問題回答

執行 `vercel` 時會問幾個問題,這樣回答:

```
? Set up and deploy "~/eventDataClean"? 
→ Y (按 Enter)

? Which scope do you want to deploy to? 
→ 選擇您的帳號 (按 Enter)

? Link to existing project? 
→ N (輸入 N)

? What's your project's name? 
→ event-checkin (或您想要的名稱)

? In which directory is your code located? 
→ ./frontend (重要!)

? Want to override the settings? 
→ N (按 Enter)
```

完成!您的網站會在幾分鐘內上線 🎉

---

## 部署後測試

Vercel 會給您一個網址,例如:
```
https://event-checkin-xxx.vercel.app
```

1. **測試前端**: 直接訪問該網址
2. **測試上傳功能**: 上傳一個 Excel 檔案

---

## 常見問題

### Q: 部署失敗怎麼辦?

**A:** 檢查錯誤訊息,通常是:
- 依賴安裝失敗 → 執行 `cd frontend && npm install` 確認本地可以安裝
- 建置失敗 → 執行 `cd frontend && npm run build` 確認本地可以建置

### Q: API 無法連接?

**A:** 檢查:
1. 瀏覽器開發者工具 → Network 標籤
2. 確認請求是發送到 `/api/upload` (相對路徑)
3. 檢查 Console 是否有 CORS 錯誤

### Q: 檔案上傳失敗?

**A:** Vercel 有限制:
- 檔案大小上限: 4.5MB
- 執行時間: 30 秒
- 如果超過,考慮使用其他平台部署後端

### Q: 如何更新部署?

**A:** 
```bash
# 修改程式碼後
git add .
git commit -m "Update"
vercel --prod
```

或者連接 GitHub 後,每次 push 都會自動部署!

---

## 進階: GitHub 自動部署

### 1. 推送到 GitHub

```bash
git add .
git commit -m "Add Vercel deployment"
git push origin main
```

### 2. 在 Vercel 連接 GitHub

1. 前往 https://vercel.com/dashboard
2. 點擊 "Add New Project"
3. 選擇您的 GitHub repository
4. 設定:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
5. 點擊 "Deploy"

### 3. 完成!

之後每次 push 到 GitHub,Vercel 會自動部署 🎊

---

## 需要幫助?

查看完整文件: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
