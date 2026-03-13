# 1. 基底環境：使用Node.js 18
FROM node:18-alpine

# 2. 工作目錄：容器內的所有動作都在 /app 底下進行
WORKDIR /app

# 3. 複製身分證：把 package.json 複製進去
COPY package.json ./

# 4. 安裝依賴，目前我沒有用到(第三方套建)，但還是先寫上去
RUN npm install

# 5. 複製原始碼：把我的 server.js, dashboard.html, test.js這三份檔案複製進去
COPY . .

# 6. 開放 Port：讓Docker知道是 3000 port
EXPOSE 3000

# 7. 啟動指令
CMD ["node", "server.js"]