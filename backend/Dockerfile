# 使用 Node.js 18
FROM node:18-alpine
WORKDIR /app

# 複製 package 設定檔
COPY package*.json ./

# 安裝套件
RUN npm install --production

# 複製所有程式碼
COPY . .

# 設定環境變數 Port (Cloud Run 預設 8080)
ENV PORT=8080

# 啟動指令 (請確認您的入口檔案是 index.js 還是 app.js)
CMD [ "node", "index.js" ]