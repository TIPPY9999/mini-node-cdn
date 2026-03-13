//嘗試寫自動化腳本

const TEST_URL = "http://localhost:3000/200/300";
const CLEAR_URL = "http://localhost:3000/api/clear";

async function runTest() {
  console.log("開始針對 Mini-Node-CDN進行測試 \n");

  try {
    console.log("前置作業，先清除所有快取");
    await fetch(CLEAR_URL, { method: "POST" });
    console.log("已清除完成!! 準備測試! \n");

    //測試1 第一次請求，預期應該是MISS
    console.log("[測試1] 發送第一次請求...");

    let read = await fetch(TEST_URL);
    let cacheStatus = read.headers.get("x-cache");
    console.log(`回傳 X-cache狀態 : ${cacheStatus}`);

    if (cacheStatus === "MISS") {
      console.log("測試成功!!!!，確實是MISS \n");
    } else {
      console.log("測試失敗! \n");
    }

    /*
    測試2 :第二次請求，預期應該是HIT
    */

    console.log("[測試2] 發送第二次請求...");

    let read2 = await fetch(TEST_URL);
    let cacheStatus2 = read2.headers.get("x-cache");
    console.log(`回傳 X-cache狀態 : ${cacheStatus2}`);

    if (cacheStatus2 === "HIT") {
      console.log("測試成功!!!!，確實是HIT \n");
    } else {
      console.log("測試失敗! \n");
    }

    /*
    測試3 
    */
    console.log("[測試3] 呼叫清除快取");
    let clear = await fetch(CLEAR_URL, { method: "POST" });
    let clearData = await clear.json();

    console.log(`回應 : ${clearData.message}`);
    console.log("測試成功!! \n");

    /*
    測試4清除後再次請求,預期應該回到MISS
    */

    console.log("[測試4] 清除後再次發送請求...");
    let read3 = await fetch(TEST_URL);
    let cacheStatus3 = read3.headers.get("x-cache");
    console.log(`回傳 x-cache狀態 : ${cacheStatus3}`);

    if (cacheStatus3 === "MISS") {
      console.log("測試成功!!!!，確實是MISS \n");
    } else {
      console.log("測試失敗! \n");
    }

    console.log("測試結束!!\n");
  } catch (err) {
    console.error("測試中發生錯誤，請重新試一次，或是確認伺服器狀態!");
  }
}

runTest();
