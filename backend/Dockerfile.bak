FROM node:18-alpine

WORKDIR /app

# 複製 package.json 和 package-lock.json（如果有）
COPY package*.json ./

# 安裝生產環境依賴
RUN npm install --only=production

# 複製其餘程式碼
COPY . .

# Cloud Run 會自己設定 PORT 環境變數，不一定要寫死 8080
# 你的 server.js 有：const PORT = process.env.PORT || 3001;

# 明確指定啟動指令
CMD ["npm", "start"]