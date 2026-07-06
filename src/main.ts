import "./style.css";
import "./圖鑑與地圖修正.css";
import { 啟動路由器 } from "./ui/主流程路由器";
import { 啟用世界瓷磚折皺 } from "./world/世界瓷磚折皺";
import { 啟動音樂管理 } from "./audio/音樂管理";
import { 啟動音效管理 } from "./audio/音效管理";

const 根節點 = document.getElementById("app");
if (!根節點) throw new Error("找不到 #app 掛載節點");

try {
  啟用世界瓷磚折皺();
} catch (error) {
  console.error("世界瓷磚折皺初始化失敗", error);
}

try {
  啟動音樂管理();
} catch (error) {
  console.error("音樂管理初始化失敗", error);
}

try {
  啟動音效管理();
} catch (error) {
  console.error("音效管理初始化失敗", error);
}

啟動路由器(根節點);
