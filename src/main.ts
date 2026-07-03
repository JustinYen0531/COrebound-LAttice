import "./style.css";
import { 啟動路由器 } from "./ui/主流程路由器";

const 根節點 = document.getElementById("app");
if (!根節點) throw new Error("找不到 #app 掛載節點");

啟動路由器(根節點);
