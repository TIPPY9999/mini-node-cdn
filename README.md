啟動指南請詳細說明如何使用 docker-compose up 指令啟動此服務。
技術實作你是如何實作「檢查檔案是否過期」的邏輯？
問題解決：專案開發過程中遇到了哪些挑戰？你是如何克服的？

# 實作簡易的 Mini-Node-CDN

## 核心功能

- **快取**：攔截請求，若快取未命中 (MISS) 則向源頭抓取並儲存；若命中 (HIT) 則直接回傳。
- **TTL過期機制**：動態計算檔案存活時間，自動淘汰過期快取。
- **Dashboard面板**：視覺化監控檔案數量、HIT/MISS 次數，還有一鍵清除快取按鈕 API。
- **資安防禦**：使用 path.resolve 還有 startsWith 讓讀取範圍受限，避免使用網路的路徑攻擊嚴格限制讀取範圍。
- **測試腳本** : 寫了test.js可以去模擬 「MISS- HIT - 清除快取-MISS-HIT」的過程

## 啟動指南 (使用 Docker)

請確保已安裝 Docker 。

1. 進入專案目錄，執行以下指令啟動服務：
   bash
   docker-compose up -d --build

2. 啟動後可以在以下端點進行測試
   http://localhost:3000/200/300(獲取圖片來源)
   http://localhost:3000/dashboard (監控控制面板)
   http://localhost:3000/api/stats (系統API狀態)
   http://localhost:3000/api/clear (清除快取)

如果沒有Docker
可以在終端機使用
node test.js
node server.js
做啟動

## 技術實作，如何實作「檢查檔案是否過期」的邏輯？

1. 我先設定 全域常數 TTL_SECONDS =120
2. 讀取檔案狀態：當我的請求命中快取時，用 await fs.stat(filePath) 取得檔案資訊。
3. 計算時間，使用Data()這個方法取得目前時間，在去減檔案最後修改時間
   state.mtimeMs，除以1000毫秒轉換成秒數。
4. 最後就是邏輯判斷，當我的時間小於TTL_SECONDS就會判定HIT，反之則判定為MISS，伺服器就回重新去源頭做抓取。

## 問題解決

在開發過程中遇到了以下問題：

-**1:路徑攻擊 :**

一開始是寫
if (url.includes("..")) {
res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
return res.end("403:禁止存取!");
}
但後來發現很薄弱，上網查了一下，好像大家使用網路上的一些成熟的防禦資料庫像是OWASP 。
最後我針對這部分做了修改

在進到路徑之前做一層防禦
const defenseFilePath = decodeURIComponent(url);
if (defenseFilePath.includes("..")) {
res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
return res.end("403: 禁止存取!");
}

拿到路徑之後再做一層防禦
const finalDefenseFilePath = path.resolve(filePath);
if (!finalDefenseFilePath.startsWith(path.resolve(CACHE))) {
res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
return res.end("403: 禁止存取!");
}

-**2:環境測試的問題 :**
後來發現我如果連續測試 test.js時 會報錯，後來發現原因是因為第二次測試會因為 第一次測試留下的快取而導致我的 MISS失敗進而造成錯誤。
所以我在前面先做清空快取的動作

try {
console.log("前置作業，先清除所有快取");
await fetch(CLEAR_URL, { method: "POST" });
console.log("已清除完成!! 準備測試! \n");
}
之後才開始進行測試。
