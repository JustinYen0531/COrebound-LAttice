import "./style.css";
import "./圖鑑與地圖修正.css";
import { 啟動路由器 } from "./ui/主流程路由器";
import { 啟用世界瓷磚折皺 } from "./world/世界瓷磚折皺";

const 根節點 = document.getElementById("app");
if (!根節點) throw new Error("找不到 #app 掛載節點");

啟用世界瓷磚折皺();
啟動路由器(根節點);
