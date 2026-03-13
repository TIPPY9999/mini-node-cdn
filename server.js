//  引入node.js 內建模組 (CommonJS寫法)
// const http = require("http");
// const fs = required("fs").promises;
// const path = required("path");

// // 伺服器基本設定
// const PORT = 3000;
// const CACHE = path.join(__dirname, "cache");
// const TTL_SECONDS = 120;

// // 建立全域變數統計
// let hitCount = 0;
// let missCount = 0;
//===============================================

// ES modules的寫法
//import工具
import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 取得當前的路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//伺服器基本設定
const PORT = 3000;
const CACHE = path.join(__dirname, "cache");
if (!fsSync.existsSync(CACHE)) {
  fsSync.mkdirSync(CACHE);
  console.log("偵測到沒有cache資料夾，已經自動建立!");
}
const TTL_SECONDS = 120;
const ORIGIN_URL = "https://picsum.photos";

//建立統計
let hitCount = 0;
let missCount = 0;

/*
開始寫伺服器邏輯
======================================
建立HTTP伺服器(核心邏輯)
======================================
*/
const cdnServer = http.createServer(async (req, res) => {
  const { url, method } = req;

  //建立防護機制  可以使用公開的防禦資料庫
  //(舊版本)
  //   if (url.includes("..")) {
  //     res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
  //     return res.end("403:禁止存取!");
  //   }
  const defenseFilePath = decodeURIComponent(url);
  if (defenseFilePath.includes("..")) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    return res.end("403: 禁止存取!");
  }

  //狀態監控
  if (url === "/api/stats" && method === "GET") {
    try {
      const files = await fs.readdir(CACHE);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(
        JSON.stringify({
          total_files: files.length,
          hit_count: hitCount,
          miss_count: missCount,
        }),
      );
    } catch (err) {
      res.writeHead(500);
      return res.end("伺服器錯誤,快取檔案不存在");
    }
  }

  //清除快取
  if (url === "/api/clear" && method === "POST") {
    try {
      const files = await fs.readdir(CACHE);
      for (const file of files) {
        await fs.rm(path.join(CACHE, file));
      }

      hitCount = 0;
      missCount = 0;

      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ message: "快取已全部刪除!" }));
    } catch (err) {
      res.writeHead(500);
      return res.end("清除失敗，請重新嘗試");
    }
  }

  //Dashboard面板邏輯
  if (url === "/dashboard" && method === "GET") {
    try {
      const files = await fs.readdir(CACHE);
      let fileListHTML = "";
      const now = Date.now();

      for (const file of files) {
        const stats = await fs.stat(path.join(CACHE, file));
        const lifeTime = (now - stats.mtimeMs) / 1000;
        const remain = Math.max(0, TTL_SECONDS - lifeTime);
        fileListHTML += `<li>${file} (剩餘 ${Math.floor(remain)} 秒)</li>`;
      }

      const dashboardPath = path.join(__dirname, "dashboard.html");
      const htmlTemplate = await fs.readFile(dashboardPath, "utf-8");

      const showHtml = htmlTemplate
        .replace("{{TOTAL_FILES}}", files.length)
        .replace("{{HIT_COUNT}}", hitCount)
        .replace("{{MISS_COUNT}}", missCount)
        .replace("{{FILE_LIST}}", fileListHTML || "<li>目前沒有快取檔案</li>");

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(showHtml);
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      return res.end("伺服器錯誤，無法載入Dashboard面板，請稍後在試");
    }
  }

  //核心邏輯
  if (method === "GET") {
    const fileName = url.replace(/\//g, "_") + ".jpg";
    const filePath = path.join(CACHE, fileName);

    const finalDefenseFilePath = path.resolve(filePath);
    if (!finalDefenseFilePath.startsWith(path.resolve(CACHE))) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      return res.end("403: 禁止存取!");
    }

    let cacheValid = false;

    //檢查是否過期
    try {
      const state = await fs.stat(filePath);
      const now = Date.now();
      const fileSeconds = (now - state.mtimeMs) / 1000;

      if (fileSeconds < TTL_SECONDS) {
        cacheValid = true;
      } else {
        console.log(`檔案已經過期(${Math.floor(fileSeconds)}秒),準備重新抓取`);
      }
    } catch (err) {}

    //根據上述判斷決定hit還是miss
    if (cacheValid) {
      hitCount++;
      const data = await fs.readFile(filePath);
      console.log(`檔案從快取回傳 : ${fileName}`);
      res.writeHead(200, { "X-Cache": "HIT", "Content-Type": "image/jpeg" });
      return res.end(data);
    } else {
      missCount++;
      const confirmUrl = `${ORIGIN_URL}${url}`;

      try {
        const response = await fetch(confirmUrl);
        if (!response.ok) throw new Error(`無法回應`);

        const changeBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(changeBuffer);

        await fs.writeFile(filePath, buffer);

        res.writeHead(200, {
          "X-Cache": "MISS",
          "Content-Type": "image/jpeg",
        });
        return res.end(buffer);
      } catch (error) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("404: 無法從源頭取得資源");
      }
    }
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  return res.end("405: 不支援的該方法");
});

/*===================================
啟動伺服器
*/
cdnServer.listen(PORT, () => {
  console.log(`Mini-Node-CDN啟動成功! `);
  console.log(`監聽端口: ${PORT}`);
  console.log(`監控API: http://localhost:${PORT}/api/stats`);
});
