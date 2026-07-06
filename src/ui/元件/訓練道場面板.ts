import { MEMBERS } from "../../data/成員資料庫";
import { FAMILY_LABEL, WORLD_LABEL, type World } from "../../data/成員型別";
import type { CaptainId } from "../../data/戰鬥原語";
import { 幾何世界圖騰清單 } from "../../totem/資料/幾何世界圖騰";
import { 有機世界圖騰清單 } from "../../totem/資料/有機世界圖騰";
import { 分形世界圖騰清單 } from "../../totem/資料/分形世界圖騰";
import { 機械世界圖騰清單 } from "../../totem/資料/機械世界圖騰";
import { 隊長圖騰清單 } from "../../totem/資料/隊長圖騰";
import { 隊長清單 } from "../資料/隊長清單";
import { 建立玩家標記圖騰 } from "./玩家標記圖騰";
import { 應用程式狀態 } from "../應用程式狀態";
import { 選文 } from "../語系";
import { 取得正式小隊摘要, 刷新正式最大生命 } from "../正式對局小隊狀態";
import {
  取得上陣養成,
  設定正式小隊成員,
  設定正式小隊星級,
  確保Showcase九宮格,
  設定Showcase槽位成員,
  設定Showcase槽位星級,
  當前隊長星級,
  取得家族武器升級狀態,
  取得已裝備武器,
  切換家族武器裝備,
  直接設定家族武器星級,
  type 初始成員層級,
} from "../../progression/養成狀態";
import {
  交換訓練槽位,
  取得可召喚怪物圖鑑,
  取得訓練編隊預設列表,
  取得訓練召喚敵群,
  取得訓練小隊槽位,
  取得訓練道場摘要,
  保存目前為訓練編隊預設,
  切換訓練槽位星級,
  回滿訓練玩家生命,
  套用訓練預設小隊,
  套用訓練編隊預設,
  手動設定訓練玩家生命,
  更新訓練敵人,
  清空訓練小隊,
  清空訓練敵人,
  移除訓練敵人,
  設定訓練槽位成員,
  設定訓練移動倍率,
  設定訓練選中槽位,
  設定訓練預選怪物,
  設定訓練隊長,
  設定訓練世界場景,
  召喚訓練敵人,
} from "../訓練道場狀態";

type 職責色 = "保護" | "火力" | "補給";
type 左側視圖模式 = "編排" | "預覽";
type 正式舞台模式 = "stage" | "orbit" | "totem";
type 正式Showcase草稿 = { memberNo: string; star: 1 | 2 | 3 };

const 槽位職責色票: Record<職責色, { label: string; color: string }> = {
  保護: { label: "保護位", color: "#4d8dff" },
  火力: { label: "火力位", color: "#ff5b6e" },
  補給: { label: "補給位", color: "#ffd24d" },
};

const 軌道槽位配置: Array<{ slotId: number; layer: "外" | "中" | "內"; angle: number; role: 職責色 }> = [
  { slotId: 0, layer: "內", angle: -30, role: "火力" },
  { slotId: 1, layer: "內", angle: 90, role: "補給" },
  { slotId: 2, layer: "內", angle: 210, role: "保護" },
  { slotId: 3, layer: "中", angle: 0, role: "火力" },
  { slotId: 4, layer: "中", angle: 120, role: "補給" },
  { slotId: 5, layer: "中", angle: 240, role: "保護" },
  { slotId: 6, layer: "外", angle: 30, role: "火力" },
  { slotId: 7, layer: "外", angle: 150, role: "補給" },
  { slotId: 8, layer: "外", angle: 270, role: "保護" },
];

const 軌道半徑: Record<"外" | "中" | "內", number> = { 外: 140, 中: 98, 內: 60 };
let 正在編輯槽位: number | null = null;
let 正在編輯正式槽位: number | null = null;
const 正式編輯草稿 = new Map<number, 正式Showcase草稿>();
const 正式Showcase待儲存草稿 = new Map<number, 正式Showcase草稿>();
let 左側模式: 左側視圖模式 = "編排";
let 正式舞台視圖: 正式舞台模式 = "stage";
const 全部圖騰角色 = [...幾何世界圖騰清單, ...有機世界圖騰清單, ...分形世界圖騰清單, ...機械世界圖騰清單];
const 成員圖騰索引 = new Map(全部圖騰角色.map((entry) => [entry.名稱, entry]));
const 隊長圖騰索引 = new Map(隊長圖騰清單.map((entry) => [entry.id, entry]));
const 訓練世界選項: World[] = ["geometry", "organic", "fractal", "mechanical"];
const 一般正式槽位配置: Array<{ slotId: number; layer: 初始成員層級; ring: "外" | "中" | "內"; angle: number; role: 職責色 }> = [
  { slotId: 0, layer: "inner", ring: "內", angle: 0, role: "保護" },
  { slotId: 4, layer: "middle", ring: "中", angle: 0, role: "火力" },
  { slotId: 8, layer: "outer", ring: "外", angle: 0, role: "補給" },
];
const Showcase正式槽位配置: typeof 一般正式槽位配置 = [
  { slotId: 0, layer: "inner", ring: "內", angle: -30, role: "保護" },
  { slotId: 1, layer: "inner", ring: "內", angle: 90, role: "火力" },
  { slotId: 2, layer: "inner", ring: "內", angle: 210, role: "補給" },
  { slotId: 3, layer: "middle", ring: "中", angle: -30, role: "保護" },
  { slotId: 4, layer: "middle", ring: "中", angle: 90, role: "火力" },
  { slotId: 5, layer: "middle", ring: "中", angle: 210, role: "補給" },
  { slotId: 6, layer: "outer", ring: "外", angle: -30, role: "保護" },
  { slotId: 7, layer: "outer", ring: "外", angle: 90, role: "火力" },
  { slotId: 8, layer: "outer", ring: "外", angle: 210, role: "補給" },
];

function 取得正式槽位配置() {
  return 應用程式狀態.額外.Showcase模式 ? Showcase正式槽位配置 : 一般正式槽位配置;
}

function 取得Showcase草稿(slotId: number, member?: { memberNo: number; star: 1 | 2 | 3 } | null): 正式Showcase草稿 {
  const draft = 正式Showcase待儲存草稿.get(slotId) ?? 正式編輯草稿.get(slotId);
  if (draft) return draft;
  return { memberNo: String(member?.memberNo ?? ""), star: (member?.star ?? 1) as 1 | 2 | 3 };
}

function 讀取Showcase草稿成員(slotId: number, member?: { memberNo: number; star: 1 | 2 | 3 } | null) {
  if (!應用程式狀態.額外.Showcase模式) return { member, isDraft: false };
  const draft = 正式Showcase待儲存草稿.get(slotId);
  if (!draft) return { member, isDraft: false };
  const memberNo = Number(draft.memberNo);
  return {
    member: MEMBERS.some((entry) => entry.no === memberNo) ? { memberNo, star: draft.star } : member,
    isDraft: true,
  };
}

function 儲存Showcase正式小隊草稿(): boolean {
  if (!應用程式狀態.額外.Showcase模式 || 正式Showcase待儲存草稿.size === 0) return false;
  確保Showcase九宮格();
  正式Showcase待儲存草稿.forEach((draft, slotId) => {
    const memberNo = Number(draft.memberNo);
    if (!MEMBERS.some((entry) => entry.no === memberNo)) return;
    設定Showcase槽位成員(slotId, memberNo);
    設定Showcase槽位星級(slotId, draft.star);
  });
  正式Showcase待儲存草稿.clear();
  正式編輯草稿.clear();
  正在編輯正式槽位 = null;
  刷新正式最大生命();
  return true;
}

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 世界顯示名(world: World): string {
  return {
    geometry: 雙語("幾何", "Geometry"),
    organic: 雙語("有機", "Organic"),
    fractal: 雙語("分形", "Fractal"),
    mechanical: 雙語("機械", "Mechanical"),
  }[world];
}

function 家族顯示名(family: keyof typeof FAMILY_LABEL): string {
  return {
    shield: 雙語("護盾", "Shield"),
    multishot: 雙語("多發", "Multishot"),
    straight: 雙語("直線", "Straight"),
    mine: 雙語("地雷", "Mine"),
    laser: 雙語("激光", "Laser"),
  }[family];
}

function 成員顯示名(member: Pick<(typeof MEMBERS)[number], "nameZh" | "nameEn">): string {
  return 應用程式狀態.額外.語言 === "zh" ? member.nameZh : member.nameEn;
}

function 隊長顯示名(captain: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? captain.名稱 : captain.名稱英;
}

function 隊長代號顯示(captain: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? captain.代號 : captain.代號英;
}

function 隊長控制顯示(captain: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? captain.控制效果 : captain.控制效果英;
}

function 隊長主動顯示(captain: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? captain.主動位移技能 : captain.主動位移技能英;
}

function 隊長週期顯示(captain: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? captain.週期技能 : captain.週期技能英;
}

function 星節點顯示名(member: (typeof MEMBERS)[number], star: 1 | 2 | 3): string {
  return 應用程式狀態.額外.語言 === "zh" ? member.starNodes[star].name : `Star ${star} Node`;
}

function 成員角色摘要(member: (typeof MEMBERS)[number]): string {
  if (應用程式狀態.額外.語言 === "zh") return member.role;
  return `Role focus: ${家族顯示名(member.family)} tactics from ${世界顯示名(member.world)}.`;
}

function 取得層級標籤(layer: "外" | "中" | "內"): string {
  if (layer === "內") return 雙語("最內層", "Inner Ring");
  if (layer === "中") return 雙語("中層", "Middle Ring");
  return 雙語("最外層", "Outer Ring");
}

function 取得正式層級短標(layer: 初始成員層級): string {
  if (layer === "inner") return 雙語("最內層", "Inner");
  if (layer === "middle") return 雙語("中層", "Middle");
  return 雙語("最外層", "Outer");
}

function 建立標題(文字: string, 副標?: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "4px";
  wrap.innerHTML = `
    <h4 style="margin:0;color:#ff8a3b;font-size:0.9rem;">${文字}</h4>
    ${副標 ? `<span style="font-size:0.75rem;color:#8d93ad;">${副標}</span>` : ""}
  `;
  return wrap;
}

function 建立隊長核心卡(captain: (typeof 隊長清單)[number]): HTMLElement {
  const captainCard = document.createElement("div");
  captainCard.className = "訓練軌道編排器-隊長卡";
  captainCard.style.setProperty("--captain-color", captain.代表色);
  captainCard.innerHTML = `
    <div class="訓練軌道編排器-隊長卡眉標">${雙語("隊長核心", "Captain Core")}</div>
    <div class="訓練軌道編排器-隊長卡主列">
      <span class="訓練軌道編排器-隊長徽記">${隊長顯示名(captain).slice(0, 1)}</span>
      <div>
        <div class="訓練軌道編排器-隊長名稱">${隊長顯示名(captain)}</div>
        <div class="訓練軌道編排器-隊長資訊">${隊長代號顯示(captain)} | ${隊長控制顯示(captain)}</div>
      </div>
    </div>
    <div class="訓練軌道編排器-隊長描述">${隊長主動顯示(captain)} | ${隊長週期顯示(captain)}</div>
  `;
  return captainCard;
}

function 建立資料膠囊(label: string, value: string): string {
  return `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;">
      <div style="font-size:0.68rem;color:#8d93ad;">${label}</div>
      <div style="font-size:0.82rem;color:#fff;font-weight:700;margin-top:2px;">${value}</div>
    </div>
  `;
}

function 以編號套用成員(slotId: number, raw: string): boolean {
  const no = Number(raw.trim());
  if (!Number.isInteger(no) || no <= 0) return false;
  const target = MEMBERS.find((member) => member.no === no);
  if (!target) return false;
  const slots = 取得訓練小隊槽位();
  const existing = slots.find((slot) => slot.memberId === target.id);
  if (existing && existing.slotId !== slotId) {
    交換訓練槽位(existing.slotId, slotId);
    return true;
  }
  設定訓練槽位成員(slotId, target.id);
  return true;
}

function 轉換圖騰職責(role: 職責色): "藍" | "紅" | "黃" {
  if (role === "保護") return "藍";
  if (role === "火力") return "紅";
  return "黃";
}

function 建立隊長舞台立繪(captain: (typeof 隊長清單)[number]): HTMLElement {
  const figure = document.createElement("div");
  figure.className = "正式立會舞台-隊長";
  figure.innerHTML = `
    <img src="${取得正式隊長立繪路徑(captain.id, 1)}" alt="${隊長顯示名(captain)}" />
    <span class="正式立會舞台-名牌 正式立會舞台-名牌--隊長">${隊長顯示名(captain)}</span>
  `;
  return figure;
}

function 取得正式隊長立繪路徑(captainId: string, form = 1): string {
  return `/assets/transparent-portraits/captains/${captainId}_form${form}.png`;
}

function 建立職責圖例(): HTMLElement {
  const legend = document.createElement("div");
  legend.className = "訓練軌道編排器-圖例";
  legend.innerHTML = (Object.values(槽位職責色票))
    .map((item) => `<span class="訓練軌道編排器-圖例項"><i style="background:${item.color};"></i>${item.label}</span>`)
    .join("");
  return legend;
}

function 由正式職責轉換(role: "protect" | "firepower" | "supply"): 職責色 {
  if (role === "protect") return "保護";
  if (role === "firepower") return "火力";
  return "補給";
}

function 建立正式圖騰預覽(): HTMLElement {
  const summary = 取得訓練道場摘要();
  const captain = 隊長圖騰索引.get(summary.captainId) ?? 隊長圖騰清單[0];
  const slots = 取得訓練小隊槽位();
  const totemSquad = 軌道槽位配置
    .map((item) => {
      const slot = slots.find((entry) => entry.slotId === item.slotId);
      const member = MEMBERS.find((entry) => entry.id === slot?.memberId) ?? null;
      const totemRole = member ? 成員圖騰索引.get(member.nameZh) : null;
      if (!slot || !member || !totemRole) return null;
      return {
        角色: totemRole,
        大環: item.layer,
        職責: 轉換圖騰職責(item.role),
        等級: Math.max(1, Math.min(3, slot.star)),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const root = document.createElement("div");
  root.className = "訓練軌道編排器-圖騰預覽畫面";
  root.innerHTML = `
    <div class="訓練軌道編排器-圖騰預覽標題">${雙語("主畫面圖騰預覽", "Lobby Totem Preview")}</div>
    <div class="訓練軌道編排器-圖騰預覽說明">${雙語("這裡直接套用正式遊戲的圖騰元件，方便看整體圖騰樣貌。", "Uses the real in-game totem component so you can inspect the full look directly.")}</div>
  `;

  const view = document.createElement("div");
  view.className = "訓練軌道編排器-圖騰預覽框";
  view.appendChild(
    建立玩家標記圖騰({
      size: 248,
      隊長: captain,
      隊長等級: 4,
      小隊: totemSquad,
      旋轉: true,
    }),
  );
  root.appendChild(view);
  return root;
}

function 建立正式對局圖騰預覽(): HTMLElement {
  const captainId = 應用程式狀態.額外.選中隊長 ?? 隊長清單[0].id;
  const captain = 隊長圖騰索引.get(captainId) ?? 隊長圖騰清單[0];
  const roster = 取得上陣養成();
  const totemSquad = roster
    .map((entry) => {
      const layout = 取得正式槽位配置().find((item) => item.slotId === entry.slotId);
      const totemRole = 成員圖騰索引.get(entry.nameZh);
      if (!layout || !totemRole) return null;
      return {
        角色: totemRole,
        大環: layout.ring,
        職責: 轉換圖騰職責(由正式職責轉換(entry.role)),
        等級: entry.star,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const root = document.createElement("div");
  root.className = "訓練軌道編排器-圖騰預覽畫面";
  root.innerHTML = `
    <div class="訓練軌道編排器-圖騰預覽標題">${雙語("正式遊戲圖騰預覽", "Live Match Totem Preview")}</div>
    <div class="訓練軌道編排器-圖騰預覽說明">${雙語("這裡會直接顯示目前正式對局實際使用中的三層編隊。", "Shows the three-ring loadout currently used in the live match.")}</div>
  `;

  const view = document.createElement("div");
  view.className = "訓練軌道編排器-圖騰預覽框";
  view.appendChild(
    建立玩家標記圖騰({
      size: 248,
      隊長: captain,
      隊長等級: 當前隊長星級(),
      小隊: totemSquad,
      旋轉: true,
    }),
  );
  root.appendChild(view);
  return root;
}

function 建立正式小隊立繪舞台(captain: (typeof 隊長清單)[number]): HTMLElement {
  const roster = 取得上陣養成();
  const isNineMemberStage = roster.length >= 9;
  const root = document.createElement("div");
  root.className = "正式立會舞台";
  const stageCopy = isNineMemberStage
    ? 雙語("九名 Showcase 成員以後排／中排／前排的大合照站位呈現。", "Shows the nine Showcase members as a layered group portrait.")
    : 雙語("預設展示三名正式上陣成員的合照站位，含隊長前景。", "Shows the deployed members and captain as a group portrait on the stage.");
  root.innerHTML = `
    <div class="訓練軌道編排器-圖騰預覽標題">${雙語("小隊立會舞台", "Squad Stage")}</div>
    <div class="訓練軌道編排器-圖騰預覽說明">${stageCopy}</div>
  `;

  const stage = document.createElement("div");
  stage.className = `正式立會舞台-框${isNineMemberStage ? " 正式立會舞台-框--九人" : ""}`;
  stage.appendChild(建立隊長舞台立繪(captain));

  const stageMembers = isNineMemberStage
    ? roster.map((memberState) => ({ memberState, className: `正式立會舞台-角色 正式立會舞台-角色--九宮-${memberState.slotId}` }))
    : ([
        { memberState: roster.find((entry) => entry.layer === "middle"), className: "正式立會舞台-角色 正式立會舞台-角色--高" },
        { memberState: roster.find((entry) => entry.layer === "inner"), className: "正式立會舞台-角色 正式立會舞台-角色--左" },
        { memberState: roster.find((entry) => entry.layer === "outer"), className: "正式立會舞台-角色 正式立會舞台-角色--右" },
      ]);

  stageMembers.forEach(({ memberState, className }) => {
    if (!memberState) return;
    const member = MEMBERS.find((entry) => entry.no === memberState.memberNo);
    if (!member) return;
    const figure = document.createElement("div");
    figure.className = className;
    figure.innerHTML = `
      <img src="/assets/transparent-portraits/members/${member.id}_s${memberState.star}.png" alt="${成員顯示名(member)}" />
      <span class="正式立會舞台-名牌">${成員顯示名(member)}</span>
    `;
    stage.appendChild(figure);
  });

  root.appendChild(stage);
  return root;
}

function 建立正式軌道預覽(selectedSlotId: number, 刷新: () => void): HTMLElement {
  const slots = 取得正式編隊資料();
  const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]));
  const stage = document.createElement("div");
  stage.className = "訓練軌道編排器-舞台";

  const orbit = document.createElement("div");
  orbit.className = "訓練軌道編排器-軌道";

  (["外", "中", "內"] as const).forEach((layer, idx) => {
    const ring = document.createElement("div");
    ring.className = `訓練軌道編排器-環 訓練軌道編排器-環-${layer}`;
    ring.style.setProperty("--ring-duration", idx === 0 ? "30s" : idx === 1 ? "22s" : "16s");
    ring.style.setProperty("--ring-direction", idx === 1 ? "reverse" : "normal");
    const duration = idx === 0 ? 30 : idx === 1 ? 22 : 16;
    ring.style.animationDelay = `-${(Date.now() / 1000) % duration}s`;

    取得正式槽位配置()
      .filter((item) => item.ring === layer)
      .forEach((item) => {
        const slot = slotMap.get(item.slotId);
        if (!slot) return;
        const role = 槽位職責色票[item.role];
        const node = document.createElement("button");
        node.type = "button";
        node.className = `訓練軌道編排器-槽位${selectedSlotId === item.slotId ? " 作用中" : ""}`;
        node.style.setProperty("--slot-angle", `${item.angle}deg`);
        node.style.setProperty("--slot-radius", `${軌道半徑[item.ring]}px`);
        node.style.setProperty("--slot-color", role.color);

        let nameStr = 雙語("未配置", "Unassigned");
        let initStr = "-";
        if (slot?.member) {
          const memberNo = slot.member.memberNo;
          const matchDef = MEMBERS.find((candidate) => candidate.no === memberNo);
          if (matchDef) {
            nameStr = 應用程式狀態.額外.語言 === "zh" ? matchDef.nameZh : matchDef.nameEn;
            initStr = nameStr.slice(0, 1);
          }
        }

        node.title = `${取得層級標籤(item.ring)} | ${nameStr}`;
        node.onclick = () => {
          應用程式狀態.額外.選中的小隊成員展示位 = item.slotId;
          刷新();
        };

        const num = document.createElement("span");
        num.className = "訓練軌道編排器-編號";
        num.textContent = String(item.slotId + 1);

        const initial = document.createElement("span");
        initial.className = "訓練軌道編排器-縮寫";
        initial.textContent = initStr;

        node.append(num, initial);
        ring.appendChild(node);
      });

    orbit.appendChild(ring);
  });

  stage.appendChild(orbit);
  return stage;
}

function 建立正式舞台切換區(captain: (typeof 隊長清單)[number], selectedSlotId: number, 刷新: () => void): HTMLElement {
  const root = document.createElement("section");
  root.className = "正式舞台切換區";

  const frame = document.createElement("div");
  frame.className = "正式舞台切換區-框";

  const header = document.createElement("div");
  header.className = "正式舞台切換區-標題列";
  const title = document.createElement("div");
  title.className = "訓練軌道編排器-視圖標題";
  title.textContent =
    正式舞台視圖 === "stage" ? 雙語("小隊立會舞台", "Squad Stage") :
    正式舞台視圖 === "orbit" ? 雙語("軌道預覽", "Orbit Preview") :
    雙語("圖騰預覽", "Totem Preview");
  const hint = document.createElement("div");
  hint.className = "正式舞台切換區-說明";
  hint.textContent =
    正式舞台視圖 === "stage" ? 雙語("像合照一樣看三名上陣成員的站位。", "View the deployed trio like a staged group portrait.") :
    正式舞台視圖 === "orbit" ? 雙語("切回原本的軌道視圖，看圈層與位置。", "Switch back to the orbit view to inspect ring placement.") :
    雙語("查看目前正式上陣對應的圖騰樣貌。", "Inspect the current deployed totem layout.");
  header.append(title, hint);
  frame.appendChild(header);

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "正式舞台切換區-箭頭 正式舞台切換區-箭頭--左";
  prev.textContent = "←";
  prev.title = 雙語("切到前一種預覽", "Previous Preview");
  prev.onclick = () => {
    正式舞台視圖 = 正式舞台視圖 === "stage" ? "orbit" : 正式舞台視圖 === "orbit" ? "totem" : "stage";
    刷新();
  };

  const next = document.createElement("button");
  next.type = "button";
  next.className = "正式舞台切換區-箭頭 正式舞台切換區-箭頭--右";
  next.textContent = "→";
  next.title = 雙語("切到下一種預覽", "Next Preview");
  next.onclick = () => {
    正式舞台視圖 = 正式舞台視圖 === "stage" ? "totem" : 正式舞台視圖 === "totem" ? "orbit" : "stage";
    刷新();
  };
  frame.append(prev, next);

  const body =
    正式舞台視圖 === "stage"
      ? 建立正式小隊立繪舞台(captain)
      : 正式舞台視圖 === "orbit"
        ? 建立正式軌道預覽(selectedSlotId, 刷新)
        : 建立正式對局圖騰預覽();
  frame.appendChild(body);

  root.appendChild(frame);
  root.appendChild(建立隊長核心卡(captain));
  root.appendChild(建立職責圖例());
  return root;
}

function 建立訓練槽位格(刷新: () => void): HTMLElement {
  const summary = 取得訓練道場摘要();
  const slots = 取得訓練小隊槽位();
  const grid = document.createElement("div");
  grid.className = "訓練軌道編排器-槽位格";

  slots.forEach((slot) => {
    const member = MEMBERS.find((entry) => entry.id === slot.memberId) ?? null;
    const layout = 軌道槽位配置.find((item) => item.slotId === slot.slotId);
    const role = 槽位職責色票[layout?.role ?? "保護"];
    const card = document.createElement("div");
    card.className = `訓練軌道編排器-槽位卡${summary.selectedSlotId === slot.slotId ? " 作用中" : ""}`;
    card.draggable = true;
    card.style.setProperty("--slot-color", role.color);
    card.addEventListener("click", () => {
      設定訓練選中槽位(slot.slotId);
      刷新();
    });

    const head = document.createElement("div");
    head.className = "訓練軌道編排器-槽位卡頭";
    const number = document.createElement("span");
    number.className = "訓練軌道編排器-槽位編號";
    number.style.background = role.color;
    number.textContent = String(slot.slotId + 1);
    const roleLabel = document.createElement("span");
    roleLabel.className = "訓練軌道編排器-槽位職責";
    roleLabel.style.color = role.color;
    roleLabel.textContent = role.label;
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "訓練軌道編排器-鉛筆按鈕";
    editBtn.textContent = "✎";
    editBtn.title = "輸入成員編號，例如 02 會切到矩陣；若該角色已在別處，則直接交換位置。";
    editBtn.onclick = (event) => {
      event.stopPropagation();
      正在編輯槽位 = 正在編輯槽位 === slot.slotId ? null : slot.slotId;
      刷新();
    };
    head.append(number, roleLabel, editBtn);
    card.appendChild(head);

    if (正在編輯槽位 === slot.slotId) {
      const editRow = document.createElement("div");
      editRow.className = "訓練軌道編排器-編輯列";
      const input = document.createElement("input");
      input.className = "訓練軌道編排器-編輯輸入";
      input.placeholder = member ? member.no.toString().padStart(2, "0") : "02";
      input.maxLength = 2;
      input.inputMode = "numeric";
      const ok = document.createElement("button");
      ok.type = "button";
      ok.className = "訓練軌道編排器-編輯確認";
      ok.textContent = "套用";
      const apply = () => {
        if (以編號套用成員(slot.slotId, input.value)) {
          正在編輯槽位 = null;
          刷新();
        }
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") apply();
      });
      ok.onclick = (event) => {
        event.stopPropagation();
        apply();
      };
      editRow.append(input, ok);
      card.appendChild(editRow);
    }

    const level = document.createElement("div");
    level.className = "訓練軌道編排器-槽位層級";
    level.textContent = `${取得層級標籤(layout?.layer ?? "外")} ｜ 第 ${slot.slotId + 1} 槽`;
    card.appendChild(level);

    const main = document.createElement("div");
    main.className = "訓練軌道編排器-槽位主文";
    main.textContent = member ? `${member.no.toString().padStart(2, "0")} ${成員顯示名(member)}` : 雙語("（空槽）", "(Empty Slot)");
    card.appendChild(main);

    const sub = document.createElement("div");
    sub.className = "訓練軌道編排器-槽位副文";
    sub.textContent = `${slot.star}★${member ? ` | ${世界顯示名(member.world)}` : ""}`;
    card.appendChild(sub);
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", String(slot.slotId));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      card.classList.add("拖曳中");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("拖曳中");
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("可放置");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("可放置");
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("可放置");
      const sourceSlotId = Number(event.dataTransfer?.getData("text/plain"));
      if (!Number.isFinite(sourceSlotId)) return;
      交換訓練槽位(sourceSlotId, slot.slotId);
      刷新();
    });
    grid.appendChild(card);
  });

  return grid;
}

function 建立訓練軌道編排器(captain: (typeof 隊長清單)[number], 刷新: () => void): HTMLElement {
  const summary = 取得訓練道場摘要();
  const slots = 取得訓練小隊槽位();
  const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]));

  const root = document.createElement("section");
  root.className = "訓練軌道編排器";

  const stage = document.createElement("div");
  stage.className = "訓練軌道編排器-舞台";

  const topBar = document.createElement("div");
  topBar.className = "訓練軌道編排器-視圖列";
  const viewTitle = document.createElement("div");
  viewTitle.className = "訓練軌道編排器-視圖標題";
  viewTitle.textContent = "編排視圖";
  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "訓練軌道編排器-切換箭頭";
  previewBtn.textContent = `→ ${雙語("圖騰預覽", "Totem Preview")}`;
  previewBtn.onclick = () => {
    左側模式 = "預覽";
    刷新();
  };
  topBar.append(viewTitle, previewBtn);
  stage.appendChild(topBar);

  const orbit = document.createElement("div");
  orbit.className = "訓練軌道編排器-軌道";
  orbit.title = "滑鼠停留時會暫停旋轉，方便安排槽位。";
  orbit.addEventListener("mouseenter", () => {
    orbit.classList.add("已暫停");
  });
  orbit.addEventListener("mouseleave", () => {
    orbit.classList.remove("已暫停");
  });

  (["外", "中", "內"] as const).forEach((layer, idx) => {
    const ring = document.createElement("div");
    ring.className = `訓練軌道編排器-環 訓練軌道編排器-環-${layer}`;
    ring.style.setProperty("--ring-duration", idx === 0 ? "30s" : idx === 1 ? "22s" : "16s");
    ring.style.setProperty("--ring-direction", idx === 1 ? "reverse" : "normal");
    const duration = idx === 0 ? 30 : idx === 1 ? 22 : 16;
    ring.style.animationDelay = `-${(Date.now() / 1000) % duration}s`;

    軌道槽位配置
      .filter((item) => item.layer === layer)
      .forEach((item) => {
        const slot = slotMap.get(item.slotId);
        if (!slot) return;
        const member = MEMBERS.find((entry) => entry.id === slot.memberId) ?? null;
        const role = 槽位職責色票[item.role];

        const node = document.createElement("button");
        node.type = "button";
        node.className = `訓練軌道編排器-槽位${summary.selectedSlotId === item.slotId ? " 作用中" : ""}`;
        node.style.setProperty("--slot-angle", `${item.angle}deg`);
        node.style.setProperty("--slot-radius", `${軌道半徑[item.layer]}px`);
        node.style.setProperty("--slot-color", role.color);
        node.title = `${雙語("槽位", "Slot")} ${item.slotId + 1} | ${role.label} | ${member ? 成員顯示名(member) : 雙語("空槽", "Empty")}`;
        node.onclick = () => {
          設定訓練選中槽位(item.slotId);
          刷新();
        };

        const num = document.createElement("span");
        num.className = "訓練軌道編排器-編號";
        num.textContent = String(item.slotId + 1);

        const initial = document.createElement("span");
        initial.className = "訓練軌道編排器-縮寫";
        initial.textContent = member ? 成員顯示名(member).slice(0, 1) : "-";

        node.append(num, initial);
        ring.appendChild(node);
      });

    orbit.appendChild(ring);
  });

  const core = document.createElement("div");
  core.className = "訓練軌道編排器-核心";
  core.style.setProperty("--captain-color", captain.代表色);
  core.textContent = captain.名稱.slice(0, 1);
  orbit.appendChild(core);

  stage.appendChild(orbit);

  const legend = document.createElement("div");
  legend.className = "訓練軌道編排器-圖例";
  legend.innerHTML = (Object.values(槽位職責色票))
    .map((item) => `<span class="訓練軌道編排器-圖例項"><i style="background:${item.color};"></i>${item.label}</span>`)
    .join("");
  stage.appendChild(legend);
  root.append(stage, 建立隊長核心卡(captain), 建立訓練槽位格(刷新));
  return root;
}

function 建立訓練圖騰預覽面板(captain: (typeof 隊長清單)[number], 刷新: () => void): HTMLElement {
  const root = document.createElement("section");
  root.className = "訓練軌道編排器";

  const stage = document.createElement("div");
  stage.className = "訓練軌道編排器-舞台 訓練軌道編排器-預覽舞台";

  const topBar = document.createElement("div");
  topBar.className = "訓練軌道編排器-視圖列";
  const viewTitle = document.createElement("div");
  viewTitle.className = "訓練軌道編排器-視圖標題";
  viewTitle.textContent = 雙語("圖騰預覽", "Totem Preview");
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "訓練軌道編排器-切換箭頭";
  backBtn.textContent = `← ${雙語("返回編排", "Back to Layout")}`;
  backBtn.onclick = () => {
    左側模式 = "編排";
    刷新();
  };
  topBar.append(viewTitle, backBtn);
  stage.append(topBar, 建立正式圖騰預覽());

  root.append(stage, 建立隊長核心卡(captain), 建立訓練槽位格(刷新));
  return root;
}

function 取得正式編隊資料() {
  const roster = 取得上陣養成();
  return 取得正式槽位配置().map((layout) => {
    const member = roster.find((entry) => entry.slotId === layout.slotId) ?? null;
    return {
      slotId: layout.slotId,
      layer: layout.layer,
      ring: layout.ring,
      role: layout.role,
      member,
    };
  });
}

function 套用正式槽位成員(layer: 初始成員層級, memberNo: number): void {
  const current = 取得正式編隊資料();
  const targetSlot = current.find((entry) => entry.layer === layer);
  if (!targetSlot) return;
  const existingSlot = current.find((entry) => entry.member?.memberNo === memberNo);
  if (existingSlot && existingSlot.layer !== layer && targetSlot.member) {
    設定正式小隊成員(existingSlot.layer, targetSlot.member.memberNo);
  }
  設定正式小隊成員(layer, memberNo);
  刷新正式最大生命();
}

function 建立正式槽位格(selectedSlotId: number, 刷新: () => void): HTMLElement {
  const slots = 取得正式編隊資料();
  const grid = document.createElement("div");
  grid.className = "訓練軌道編排器-槽位格";

  slots.forEach((slot) => {
    const role = 槽位職責色票[slot.role];
    const card = document.createElement("div");
    card.className = `訓練軌道編排器-槽位卡${selectedSlotId === slot.slotId ? " 作用中" : ""}`;
    card.style.setProperty("--slot-color", role.color);
    card.addEventListener("click", () => {
      應用程式狀態.額外.選中的小隊成員展示位 = slot.slotId;
      刷新();
    });

    const head = document.createElement("div");
    head.className = "訓練軌道編排器-槽位卡頭";
    const number = document.createElement("span");
    number.className = "訓練軌道編排器-槽位編號";
    number.style.background = role.color;
    number.textContent = String(slot.slotId + 1);
    const roleLabel = document.createElement("span");
    roleLabel.className = "訓練軌道編排器-槽位職責";
    roleLabel.style.color = role.color;
    roleLabel.textContent = `${role.label}｜${取得層級標籤(slot.ring)}`;
    head.append(number, roleLabel);
    card.appendChild(head);

    const level = document.createElement("div");
    level.className = "訓練軌道編排器-槽位層級";
    level.textContent = `正式編隊 ｜ ${slot.member?.star ?? 1}★`;
    card.appendChild(level);

    const main = document.createElement("div");
    main.className = "訓練軌道編排器-槽位主文";
    let nameStr = 雙語("（未配置）", "(Unassigned)");
    if (slot.member) {
      const matchDef = MEMBERS.find((entry) => entry.no === slot.member?.memberNo);
      if (matchDef) {
        nameStr = `${slot.member.memberNo.toString().padStart(2, "0")} ${應用程式狀態.額外.語言 === "zh" ? matchDef.nameZh : matchDef.nameEn}`;
      }
    }
    main.textContent = nameStr;
    card.appendChild(main);

    const sub = document.createElement("div");
    sub.className = "訓練軌道編排器-槽位副文";
    let descStr = 雙語("請從下方成員庫指派", "Assign a member from the library below.");
    if (slot.member) {
      const memberNo = slot.member.memberNo;
      const matchDef = MEMBERS.find((entry) => entry.no === memberNo);
      if (matchDef) {
        descStr = `${世界顯示名(matchDef.world)} | ${家族顯示名(matchDef.family as any)}`;
      }
    }
    sub.textContent = descStr;
    card.appendChild(sub);
    grid.appendChild(card);
  });

  return grid;
}

function 建立正式例會預覽(captain: (typeof 隊長清單)[number], selectedSlotId: number, 刷新: () => void): HTMLElement {
  const slots = 取得正式編隊資料();
  const root = document.createElement("section");
  root.className = "訓練軌道編排器";

  const stage = document.createElement("div");
  stage.className = "訓練軌道編排器-舞台";

  const topBar = document.createElement("div");
  topBar.className = "訓練軌道編排器-視圖列";
  const viewTitle = document.createElement("div");
  viewTitle.className = "訓練軌道編排器-視圖標題";
  viewTitle.textContent = 雙語("小隊例會預覽", "Squad Meeting Preview");
  const hint = document.createElement("div");
  hint.style.fontSize = "0.72rem";
  hint.style.color = "#8d93ad";
  hint.textContent = "隊長置頂，三層席位依序往下展開。";
  topBar.append(viewTitle, hint);
  stage.appendChild(topBar);

  const fan = document.createElement("div");
  fan.className = "訓練圖騰預覽-舞台";
  fan.style.padding = "20px 18px";

  const captainRow = document.createElement("div");
  captainRow.className = "正式例會-隊長列";
  const captainChip = document.createElement("button");
  captainChip.type = "button";
  captainChip.className = "正式例會-隊長席";
  captainChip.style.setProperty("--captain-color", captain.代表色);
  captainChip.innerHTML = `
    <span class="正式例會-席位標">隊長席</span>
    <span class="正式例會-隊長徽記">${captain.名稱.slice(0, 1)}</span>
    <span class="正式例會-席位名">${captain.名稱}</span>
  `;
  captainRow.appendChild(captainChip);
  fan.appendChild(captainRow);

  const layers: Array<{ ring: "內" | "中" | "外"; label: string; width: string }> = [
    { ring: "內", label: "最內層", width: "70%" },
    { ring: "中", label: "中層", width: "82%" },
    { ring: "外", label: "最外層", width: "94%" },
  ];

  layers.forEach((layer) => {
    const row = document.createElement("div");
    row.className = "正式例會-列";
    row.style.width = layer.width;

    const tag = document.createElement("div");
    tag.className = "正式例會-列標";
    tag.textContent = layer.label;
    row.appendChild(tag);

    取得正式槽位配置()
      .filter((item) => item.ring === layer.ring)
      .forEach((item) => {
        const slot = slots.find((entry) => entry.slotId === item.slotId);
        if (!slot) return;
        const role = 槽位職責色票[item.role];
        const member = slot.member ? MEMBERS.find((entry) => entry.no === slot.member?.memberNo) ?? null : null;
        const seat = document.createElement("button");
        seat.type = "button";
        seat.className = `正式例會-席位${selectedSlotId === item.slotId ? " 作用中" : ""}`;
        seat.style.setProperty("--slot-color", role.color);
        seat.title = `${layer.label} | ${member ? 成員顯示名(member) : 雙語("未配置", "Unassigned")}`;
        seat.onclick = () => {
          應用程式狀態.額外.選中的小隊成員展示位 = item.slotId;
          刷新();
        };
        seat.innerHTML = `
          <span class="正式例會-席位標">${role.label}</span>
          <span class="正式例會-席位名">${member ? 成員顯示名(member) : 雙語("空位", "Empty Seat")}</span>
          <span class="正式例會-席位副文">${member ? `${member.no.toString().padStart(2, "0")} ｜ 1★` : "待指派"}</span>
        `;
        row.appendChild(seat);
      });

    fan.appendChild(row);
  });

  stage.appendChild(fan);
  root.append(stage);
  return root;
}

export function 建立訓練小隊編輯器(刷新: () => void): HTMLElement {
  const root = document.createElement("section");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "14px";

  const summary = 取得訓練道場摘要();
  const slots = 取得訓練小隊槽位();
  const presets = 取得訓練編隊預設列表();
  const selectedSlot = slots.find((slot) => slot.slotId === summary.selectedSlotId) ?? slots[0];
  const selectedMember = MEMBERS.find((member) => member.id === selectedSlot.memberId) ?? null;
  const captain = 隊長清單.find((entry) => entry.id === summary.captainId) ?? 隊長清單[0];

  root.appendChild(
    左側模式 === "編排"
      ? 建立標題("訓練編隊台", "左邊看軌道與槽位、右邊做細節調整與成員替換。")
      : 建立標題(雙語("主畫面｜圖騰預覽", "Lobby | Totem Preview"), 雙語("左邊正在預覽主畫面圖騰，右邊仍可維持編隊與替換。", "The left side previews the lobby totem while the right side keeps the roster editor active.")),
  );

  const layout = document.createElement("div");
  layout.style.display = "grid";
  layout.style.gridTemplateColumns = "420px minmax(0, 1fr)";
  layout.style.gap = "18px";
  layout.style.alignItems = "start";

  const leftPane = document.createElement("div");
  leftPane.style.display = "flex";
  leftPane.style.flexDirection = "column";
  leftPane.style.gap = "14px";
  leftPane.appendChild(左側模式 === "編排" ? 建立訓練軌道編排器(captain, 刷新) : 建立訓練圖騰預覽面板(captain, 刷新));

  const rightPane = document.createElement("div");
  rightPane.style.display = "flex";
  rightPane.style.flexDirection = "column";
  rightPane.style.gap = "14px";

  const presetBlock = document.createElement("div");
  presetBlock.style.display = "grid";
  presetBlock.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  presetBlock.style.gap = "8px";
  presets.forEach((preset) => {
    const filledCount = preset.slots.filter((slot) => slot.memberId).length;
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "6px";
    wrap.style.padding = "10px";
    wrap.style.background = "rgba(255,255,255,0.03)";
    wrap.style.border = preset.id === summary.activePresetId ? "1px solid rgba(216,180,106,0.5)" : "1px solid rgba(255,255,255,0.06)";
    wrap.style.borderRadius = "10px";
    wrap.innerHTML = `
      <div style="font-size:0.82rem;color:#fff;font-weight:700;">${preset.label}</div>
      <div style="font-size:0.72rem;color:#8d93ad;">隊長 ${preset.captainId} ｜ 隊員 ${filledCount}/9</div>
    `;
    const row = document.createElement("div");
    row.className = "按鈕列";
    row.style.marginTop = "0";
    const loadBtn = document.createElement("button");
    loadBtn.className = preset.id === summary.activePresetId ? "一級按鈕" : "二級按鈕";
    loadBtn.textContent = "套用";
    loadBtn.onclick = () => {
      套用訓練編隊預設(preset.id);
      刷新();
    };
    const saveBtn = document.createElement("button");
    saveBtn.className = "二級按鈕";
    saveBtn.textContent = "存檔";
    saveBtn.onclick = () => {
      保存目前為訓練編隊預設(preset.id);
      刷新();
    };
    row.append(loadBtn, saveBtn);
    wrap.appendChild(row);
    presetBlock.appendChild(wrap);
  });
  rightPane.appendChild(presetBlock);

  const captainRow = document.createElement("div");
  captainRow.style.display = "grid";
  captainRow.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  captainRow.style.gap = "8px";
  隊長清單.forEach((captain) => {
    const btn = document.createElement("button");
    btn.className = summary.captainId === captain.id ? "一級按鈕" : "二級按鈕";
    btn.textContent = captain.名稱;
    btn.style.setProperty("--隊長色", captain.代表色);
    btn.onclick = () => {
      設定訓練隊長(captain.id as CaptainId);
      刷新();
    };
    captainRow.appendChild(btn);
  });
  rightPane.appendChild(captainRow);

  const speedBlock = document.createElement("div");
  speedBlock.style.display = "flex";
  speedBlock.style.alignItems = "center";
  speedBlock.style.gap = "12px";
  speedBlock.style.padding = "10px 12px";
  speedBlock.style.borderRadius = "10px";
  speedBlock.style.background = "rgba(255,255,255,0.03)";
  speedBlock.style.border = "1px solid rgba(255,255,255,0.06)";
  speedBlock.innerHTML = `<span style="font-size:0.8rem;color:#fff;font-weight:700;">移動速度倍率</span>`;
  const speedValue = document.createElement("strong");
  speedValue.style.color = "#ffd24d";
  speedValue.textContent = `${summary.moveSpeedScale.toFixed(2)}x`;
  const speedSlider = document.createElement("input");
  speedSlider.type = "range";
  speedSlider.min = "0.25";
  speedSlider.max = "3";
  speedSlider.step = "0.05";
  speedSlider.value = String(summary.moveSpeedScale);
  speedSlider.style.flex = "1";
  speedSlider.oninput = () => {
    設定訓練移動倍率(Number(speedSlider.value));
    speedValue.textContent = `${Number(speedSlider.value).toFixed(2)}x`;
  };
  speedSlider.onchange = () => 刷新();
  speedBlock.append(speedSlider, speedValue);
  rightPane.appendChild(speedBlock);

  const slotActions = document.createElement("div");
  slotActions.className = "按鈕列";
  const cycleStar = document.createElement("button");
  cycleStar.className = "二級按鈕";
  cycleStar.textContent = `切換星級 (${selectedSlot.star}★)`;
  cycleStar.onclick = () => {
    切換訓練槽位星級(selectedSlot.slotId);
    刷新();
  };
  const clearSlot = document.createElement("button");
  clearSlot.className = "二級按鈕";
  clearSlot.textContent = "清空目前槽位";
  clearSlot.onclick = () => {
    設定訓練槽位成員(selectedSlot.slotId, null);
    刷新();
  };
  const resetDemo = document.createElement("button");
  resetDemo.className = "二級按鈕";
  resetDemo.textContent = "恢復預設編隊";
  resetDemo.onclick = () => {
    套用訓練預設小隊();
    刷新();
  };
  const clearAll = document.createElement("button");
  clearAll.className = "二級按鈕";
  clearAll.textContent = "全部清空";
  clearAll.onclick = () => {
    清空訓練小隊();
    刷新();
  };
  slotActions.append(cycleStar, clearSlot, resetDemo, clearAll);
  rightPane.appendChild(slotActions);

  const summaryGrid = document.createElement("div");
  summaryGrid.style.display = "grid";
  summaryGrid.style.gridTemplateColumns = "repeat(5, minmax(0, 1fr))";
  summaryGrid.style.gap = "8px";
  summaryGrid.innerHTML = [
    建立資料膠囊("隊員數", `${summary.memberCount} / 9`),
    建立資料膠囊("總生命", `${summary.playerHp} / ${summary.playerMaxHp}`),
    建立資料膠囊("總攻擊", `${summary.totalAtk}`),
    建立資料膠囊("總重量", `${summary.totalWeight}`),
    建立資料膠囊("平均速度", `${summary.avgSpeedContribution}`),
  ].join("");
  rightPane.appendChild(summaryGrid);

  const healRow = document.createElement("div");
  healRow.className = "按鈕列";
  const healBtn = document.createElement("button");
  healBtn.className = "二級按鈕";
  healBtn.textContent = "回滿玩家生命";
  healBtn.onclick = () => {
    回滿訓練玩家生命();
    刷新();
  };
  const zeroBtn = document.createElement("button");
  zeroBtn.className = "二級按鈕";
  zeroBtn.textContent = "玩家生命歸零";
  zeroBtn.onclick = () => {
    手動設定訓練玩家生命(0);
    刷新();
  };
  healRow.append(healBtn, zeroBtn);
  rightPane.appendChild(healRow);

  const selectedInfo = document.createElement("div");
  selectedInfo.style.padding = "12px";
  selectedInfo.style.borderRadius = "10px";
  selectedInfo.style.background = "rgba(255,255,255,0.03)";
  selectedInfo.style.border = "1px solid rgba(255,255,255,0.06)";
  if (selectedMember) {
    selectedInfo.innerHTML = `
      <div style="font-size:0.72rem;color:#8d93ad;">目前編輯：槽位 ${selectedSlot.slotId + 1}</div>
      <div style="font-size:0.9rem;color:#fff;font-weight:700;margin-top:4px;">${selectedMember.no.toString().padStart(2, "0")} ${selectedMember.nameZh}</div>
      <div style="font-size:0.78rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        ${WORLD_LABEL[selectedMember.world]}世界｜${FAMILY_LABEL[selectedMember.family]}家族｜${selectedMember.starNodes[selectedSlot.star].name}
      </div>
      <div style="font-size:0.78rem;color:#fff;line-height:1.5;margin-top:6px;">
        ${selectedMember.role}
      </div>
    `;
  } else {
    selectedInfo.innerHTML = `
      <div style="font-size:0.72rem;color:#8d93ad;">目前編輯：槽位 ${selectedSlot.slotId + 1}</div>
      <div style="font-size:0.9rem;color:#fff;font-weight:700;margin-top:4px;">空槽</div>
      <div style="font-size:0.78rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        先在左邊點槽位，再從下方成員庫指派，或直接拖曳左側九宮格交換位置。
      </div>
    `;
  }
  rightPane.appendChild(selectedInfo);

  const library = document.createElement("div");
  library.style.display = "grid";
  library.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  library.style.gap = "8px";
  library.style.maxHeight = "340px";
  library.style.overflowY = "auto";
  MEMBERS.forEach((member) => {
    const btn = document.createElement("button");
    btn.className = "二級按鈕";
    btn.style.textAlign = "left";
    btn.style.padding = "10px";
    btn.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <strong>${member.no.toString().padStart(2, "0")} ${member.nameZh}</strong>
        <span style="color:#8d93ad;">${WORLD_LABEL[member.world]}</span>
      </div>
      <div style="font-size:0.72rem;color:#8d93ad;margin-top:4px;">${FAMILY_LABEL[member.family]} ｜ ${member.starNodes[1].name}</div>
    `;
    btn.onclick = () => {
      設定訓練槽位成員(selectedSlot.slotId, member.id);
      刷新();
    };
    library.appendChild(btn);
  });
  rightPane.appendChild(library);

  layout.append(leftPane, rightPane);
  root.appendChild(layout);
  return root;
}

export function 建立正式小隊編輯器(刷新: () => void): HTMLElement {
  const root = document.createElement("section");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "14px";

  const captain = 隊長清單.find((entry) => entry.id === (應用程式狀態.額外.選中隊長 ?? 隊長清單[0].id)) ?? 隊長清單[0];
  const squad = 取得正式編隊資料();
  const selectedSlotId = squad.some((slot) => slot.slotId === 應用程式狀態.額外.選中的小隊成員展示位)
    ? (應用程式狀態.額外.選中的小隊成員展示位 as number)
    : squad[0].slotId;
  const selectedSlot = squad.find((slot) => slot.slotId === selectedSlotId) ?? squad[0];
  const selectedDisplay = 讀取Showcase草稿成員(selectedSlot.slotId, selectedSlot.member);
  const selectedMemberState = selectedDisplay.member;
  const selectedMember = selectedMemberState ? MEMBERS.find((member) => member.no === selectedMemberState.memberNo) ?? null : null;
  const summary = 取得正式小隊摘要();
  const assignedMembers = new Map(squad.filter((slot) => slot.member).map((slot) => [slot.member!.memberNo, slot.layer]));

  root.appendChild(建立標題(雙語("小隊例會", "Squad Meeting"), 雙語("先看正式小隊的例會席位與圖騰概況，再從下方調整隊長與三層成員。", "Review the meeting stage and totem overview first, then adjust the captain and the three deployed members below.")));

  const layout = document.createElement("div");
  layout.style.display = "grid";
  layout.style.gridTemplateColumns = "420px minmax(0, 1fr)";
  layout.style.gap = "18px";
  layout.style.alignItems = "start";

  const leftPane = document.createElement("div");
  leftPane.style.display = "flex";
  leftPane.style.flexDirection = "column";
  leftPane.style.gap = "14px";
  leftPane.appendChild(建立正式舞台切換區(captain, selectedSlotId, 刷新));

  const rightPane = document.createElement("div");
  rightPane.style.display = "flex";
  rightPane.style.flexDirection = "column";
  rightPane.style.gap = "14px";

  const captainRow = document.createElement("div");
  captainRow.className = "正式隊長列";
  隊長清單.forEach((entry) => {
    const btn = document.createElement("button");
    btn.className = `正式隊長卡${captain.id === entry.id ? " 作用中" : ""}`;
    btn.style.setProperty("--隊長色", entry.代表色);
    btn.innerHTML = `
      <span class="正式隊長卡-立繪"><img src="${取得正式隊長立繪路徑(entry.id, 1)}" alt="${隊長顯示名(entry)}" /></span>
      <span class="正式隊長卡-名稱">${隊長顯示名(entry)}</span>
      <span class="正式隊長卡-代號">${隊長代號顯示(entry)}</span>
    `;
    btn.onclick = () => {
      應用程式狀態.額外.選中隊長 = entry.id;
      刷新正式最大生命();
      刷新();
    };
    captainRow.appendChild(btn);
  });
  rightPane.appendChild(captainRow);

  const squadSummaryRow = document.createElement("div");
  squadSummaryRow.className = `正式小隊摘要列${應用程式狀態.額外.Showcase模式 ? " 正式小隊摘要列--Showcase" : ""}`;
  squad.forEach((slot, index) => {
    const role = 槽位職責色票[slot.role];
    const display = 讀取Showcase草稿成員(slot.slotId, slot.member);
    const member = display.member ? MEMBERS.find((entry) => entry.no === display.member?.memberNo) ?? null : null;
    const cardWrap = document.createElement("div");
    cardWrap.className = "正式小隊摘要卡框";
    const card = document.createElement("button");
    card.type = "button";
    card.className = `正式小隊摘要卡${selectedSlotId === slot.slotId ? " 作用中" : ""}`;
    card.style.setProperty("--slot-color", role.color);
    card.onclick = () => {
      應用程式狀態.額外.選中的小隊成員展示位 = slot.slotId;
      刷新();
    };
    card.innerHTML = `
      <div class="正式小隊摘要卡-編號">${index + 1}</div>
      <div class="正式小隊摘要卡-標頭">
        <span>${role.label}</span>
        <span>${取得正式層級短標(slot.layer)}</span>
      </div>
      <div class="正式小隊摘要卡-名稱">${member ? `${member.no.toString().padStart(2, "0")} ${成員顯示名(member)}` : 雙語("未配置", "Unassigned")}</div>
      <div class="正式小隊摘要卡-副文">${member ? `${display.isDraft ? 雙語("待儲存", "Pending Save") + " | " : ""}${家族顯示名(member.family)} | ${display.member?.star ?? 1}★ ${星節點顯示名(member, display.member?.star ?? 1)}` : 雙語("請從下方成員庫指派", "Assign a member from the library below.")}</div>
    `;
    cardWrap.appendChild(card);

    if (應用程式狀態.額外.Showcase模式) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "訓練軌道編排器-鉛筆按鈕 正式小隊摘要卡-鉛筆";
      editButton.textContent = "✎";
      editButton.title = 雙語("Showcase：直接修改成員編號與星級", "Showcase: directly edit member number and star level");
      editButton.onclick = (event) => {
        event.stopPropagation();
        正在編輯正式槽位 = 正在編輯正式槽位 === slot.slotId ? null : slot.slotId;
        if (正在編輯正式槽位 !== null && !正式編輯草稿.has(slot.slotId)) {
          正式編輯草稿.set(slot.slotId, {
            memberNo: String(slot.member?.memberNo ?? 1),
            star: (slot.member?.star ?? 1) as 1 | 2 | 3,
          });
        }
        應用程式狀態.額外.選中的小隊成員展示位 = slot.slotId;
        刷新();
      };
      cardWrap.appendChild(editButton);
    }
    squadSummaryRow.appendChild(cardWrap);
  });
  const squadHost = 應用程式狀態.額外.Showcase模式 ? leftPane : rightPane;
  squadHost.appendChild(squadSummaryRow);

  if (應用程式狀態.額外.Showcase模式) {
    const saveRow = document.createElement("div");
    saveRow.className = "正式Showcase儲存列";
    saveRow.innerHTML = `
      <span>${雙語("目前舞台仍顯示已儲存的正式隊伍；按 Save 才會把草稿套用到真正上陣。", "The stage still shows the saved squad; press Save to apply drafts to the real deployment.")}</span>
      <button type="button" class="一級按鈕" ${正式Showcase待儲存草稿.size === 0 ? "disabled" : ""} data-save-showcase>${雙語("Save 小隊", "Save Squad")}</button>
    `;
    saveRow.querySelector<HTMLButtonElement>("[data-save-showcase]")!.onclick = () => {
      儲存Showcase正式小隊草稿();
      刷新();
    };
    squadHost.appendChild(saveRow);
  }

  if (應用程式狀態.額外.Showcase模式 && 正在編輯正式槽位 !== null) {
    const editingSlot = squad.find((slot) => slot.slotId === 正在編輯正式槽位);
    if (editingSlot) {
      const draft = 取得Showcase草稿(editingSlot.slotId, editingSlot.member);
      const editor = document.createElement("div");
      editor.className = "正式Showcase編輯列";
      editor.innerHTML = `
        <div><small>SHOWCASE EDIT</small><strong>${取得層級標籤(editingSlot.ring)}</strong></div>
        <label>${雙語("成員編號", "Member No.")}<input type="number" min="1" max="${MEMBERS.length}" value="${draft.memberNo}" data-member-no /></label>
        <label>${雙語("星級", "Star Level")}<select data-star><option value="1">1★</option><option value="2">2★</option><option value="3">3★</option></select></label>
        <button type="button" class="一級按鈕" data-apply>${雙語("套用", "Apply")}</button>
        <button type="button" class="二級按鈕" data-cancel>${雙語("取消", "Cancel")}</button>
        <span class="正式Showcase編輯列-錯誤" data-error></span>
      `;
      const numberInput = editor.querySelector<HTMLInputElement>("[data-member-no]")!;
      const starSelect = editor.querySelector<HTMLSelectElement>("[data-star]")!;
      starSelect.value = String(draft.star);
      numberInput.oninput = () => {
        draft.memberNo = numberInput.value;
        正式編輯草稿.set(editingSlot.slotId, draft);
      };
      starSelect.onchange = () => {
        draft.star = Number(starSelect.value) as 1 | 2 | 3;
        正式編輯草稿.set(editingSlot.slotId, draft);
      };
      editor.querySelector<HTMLButtonElement>("[data-apply]")!.onclick = () => {
        const memberNo = Number(numberInput.value);
        const targetMember = MEMBERS.find((entry) => entry.no === memberNo);
        if (!targetMember) {
          editor.querySelector<HTMLElement>("[data-error]")!.textContent = 雙語("找不到這個成員編號", "Member number not found");
          return;
        }
        正式Showcase待儲存草稿.set(editingSlot.slotId, {
          memberNo: String(memberNo),
          star: Number(starSelect.value) as 1 | 2 | 3,
        });
        正式編輯草稿.delete(editingSlot.slotId);
        正在編輯正式槽位 = null;
        刷新();
      };
      numberInput.onkeydown = (event) => {
        if (event.key === "Enter") editor.querySelector<HTMLButtonElement>("[data-apply]")!.click();
      };
      editor.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = () => {
        正式編輯草稿.delete(editingSlot.slotId);
        正在編輯正式槽位 = null;
        刷新();
      };
      squadHost.appendChild(editor);
    }
  }
  const summaryGrid = document.createElement("div");
  summaryGrid.style.display = "grid";
  summaryGrid.style.gridTemplateColumns = "repeat(5, minmax(0, 1fr))";
  summaryGrid.style.gap = "8px";
  summaryGrid.innerHTML = [
    建立資料膠囊(雙語("上陣隊員", "Deployed"), `${squad.filter((slot) => slot.member).length} / ${應用程式狀態.額外.Showcase模式 ? 9 : 3}`),
    建立資料膠囊(雙語("隊長階段", "Captain Tier"), `${當前隊長星級()}★`),
    建立資料膠囊(雙語("總生命", "Total HP"), `${summary.playerHp} / ${summary.playerMaxHp}`),
    建立資料膠囊(雙語("總攻擊", "Total ATK"), `${summary.totalAtk}`),
    建立資料膠囊(雙語("總重量", "Total Weight"), `${summary.totalWeight}`),
  ].join("");
  rightPane.appendChild(summaryGrid);

  const selectedInfo = document.createElement("div");
  selectedInfo.style.padding = "12px";
  selectedInfo.style.borderRadius = "10px";
  selectedInfo.style.background = "rgba(255,255,255,0.03)";
  selectedInfo.style.border = "1px solid rgba(255,255,255,0.06)";
  if (selectedMember && selectedMemberState) {
    selectedInfo.innerHTML = `
      <div style="font-size:0.72rem;color:#8d93ad;">${雙語("目前編輯", "Currently Editing")}: ${取得層級標籤(selectedSlot.ring)}</div>
      <div style="font-size:0.9rem;color:#fff;font-weight:700;margin-top:4px;">${selectedMember.no.toString().padStart(2, "0")} ${成員顯示名(selectedMember)}</div>
      <div style="font-size:0.78rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        ${selectedDisplay.isDraft ? 雙語("待儲存草稿", "Pending Save Draft") + " | " : ""}${世界顯示名(selectedMember.world)} | ${家族顯示名(selectedMember.family)} | ${星節點顯示名(selectedMember, selectedMemberState.star)}
      </div>
      <div style="font-size:0.78rem;color:#fff;line-height:1.5;margin-top:6px;">
        ${成員角色摘要(selectedMember)}
      </div>
      <div style="font-size:0.74rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        ${雙語("若你選到已經在別的圈層上的成員，系統會自動幫你交換位置，不會產生重複上陣。", "If the member is already assigned elsewhere, the system will automatically swap positions instead of duplicating the deployment.")}
      </div>
    `;
  } else {
    selectedInfo.innerHTML = `
      <div style="font-size:0.72rem;color:#8d93ad;">${雙語("目前編輯", "Currently Editing")}: ${取得層級標籤(selectedSlot.ring)}</div>
      <div style="font-size:0.9rem;color:#fff;font-weight:700;margin-top:4px;">${雙語("未配置成員", "No Member Assigned")}</div>
      <div style="font-size:0.78rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        ${雙語("先點左邊的圈層，再從下方成員庫指定對應的正式上陣成員。", "Select a ring on the left, then assign the matching deployed member from the library below.")}
      </div>
    `;
  }
  rightPane.appendChild(selectedInfo);

  const library = document.createElement("div");
  library.style.display = "grid";
  library.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  library.style.gap = "8px";
  MEMBERS.forEach((member) => {
    const assignedLayer = assignedMembers.get(member.no) ?? null;
    const btn = document.createElement("button");
    btn.className = assignedLayer === selectedSlot.layer ? "一級按鈕" : "二級按鈕";
    btn.style.textAlign = "left";
    btn.style.padding = "10px";
    btn.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <strong>${member.no.toString().padStart(2, "0")} ${成員顯示名(member)}</strong>
        <span style="color:#8d93ad;">${世界顯示名(member.world)}</span>
      </div>
      <div style="font-size:0.72rem;color:#8d93ad;margin-top:4px;">${家族顯示名(member.family)} | ${星節點顯示名(member, 1)}</div>
      <div style="font-size:0.68rem;color:${assignedLayer ? "#ffd24d" : "#8d93ad"};margin-top:4px;">${assignedLayer ? `${雙語("目前在", "Currently in")} ${assignedLayer === "inner" ? 雙語("最內層", "Inner Ring") : assignedLayer === "middle" ? 雙語("中層", "Middle Ring") : 雙語("最外層", "Outer Ring")}` : 雙語("可指派到目前圈層", "Can be assigned to the current ring")}</div>
    `;
    btn.onclick = () => {
      if (應用程式狀態.額外.Showcase模式) {
        const currentDraft = 取得Showcase草稿(selectedSlot.slotId, selectedSlot.member);
        正式Showcase待儲存草稿.set(selectedSlot.slotId, {
          memberNo: String(member.no),
          star: currentDraft.star,
        });
      } else {
        套用正式槽位成員(selectedSlot.layer, member.no);
      }
      刷新();
    };
    library.appendChild(btn);
  });
  rightPane.appendChild(library);

  const weaponPanel = document.createElement("section");
  const weaponStatus = 取得家族武器升級狀態();
  const equippedWeapons = 取得已裝備武器();
  const weaponMeta = {
    shield: { name: "Shield", mark: "S", color: "#6f91bd" },
    multishot: { name: "Multishot", mark: "M", color: "#799b63" },
    straight: { name: "Straight", mark: "R", color: "#b76556" },
    mine: { name: "Mine", mark: "F", color: "#b58a46" },
    laser: { name: "Laser", mark: "L", color: "#8a829c" },
  } as const;
  Object.assign(weaponPanel.style, {
    padding: "14px",
    border: "1px solid rgba(121, 90, 43, 0.24)",
    borderRadius: "14px",
    background: "rgba(255, 250, 231, 0.42)",
    color: "#433623",
  });
  weaponPanel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:10px;">
      <div><small style="display:block;color:#9a7440;letter-spacing:.12em;font-weight:800;">LOADOUT</small><strong style="font-size:1rem;">${雙語("已裝備武器", "Equipped Weapons")}</strong></div>
      <span style="font-size:.68rem;color:#806b4c;">${雙語("依目前正式小隊解鎖", "Based on current squad")}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
      ${(["shield", "multishot", "straight", "mine"] as const).map((family) => {
          const meta = weaponMeta[family];
          const entry = equippedWeapons.find((item) => item.family === family);
          const status = weaponStatus.find((item) => item.family === family);
          const equippedStar = entry?.currentStar ?? 0;
          const equipped = equippedStar > 0;
          const starButtons = [0, 1, 2, 3].map((star) => `
            <button
              type="button"
              data-weapon-star="${family}"
              data-star="${star}"
              style="padding:4px 0;border-radius:8px;border:1px solid ${star === equippedStar ? meta.color : "rgba(90,76,55,.18)"};background:${star === equippedStar ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.4)"};color:#5b462b;font-weight:700;cursor:pointer;">
              ${star === 0 ? "0★" : `${star}★`}
            </button>
          `).join("");
          return `
            <article style="display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid ${equipped ? meta.color : "rgba(90,76,55,.16)"};border-radius:10px;background:${equipped ? "rgba(255,255,255,.56)" : "rgba(210,204,188,.28)"};opacity:${equipped ? "1" : ".58"};">
              <span style="display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:${meta.color};color:white;font-weight:900;">${meta.mark}</span>
              <span>
                <strong style="display:block;font-size:.82rem;">${meta.name}</strong>
                <small style="color:#806b4c;">${equipped ? `${equippedStar}★ Weapon` : "Not unlocked"} · ${雙語("已解鎖至", "Unlocked to")} ${status?.unlockedStar ?? 0}★</small>
                ${應用程式狀態.額外.Showcase模式
                  ? `<span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px;">
                      <button
                        type="button"
                        data-weapon-toggle="${family}"
                        style="padding:4px 10px;border-radius:999px;border:1px solid ${equipped ? meta.color : "rgba(90,76,55,.18)"};background:${equipped ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.45)"};color:#5b462b;font-weight:800;cursor:pointer;">
                        ${equipped ? "EQUIPPED" : "LOCKED"}
                      </button>
                    </span>
                    <span style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px;">
                      ${starButtons}
                    </span>`
                  : ""}
              </span>
              <b style="font-size:.62rem;letter-spacing:.08em;color:${equipped ? "#9a6518" : "#807869"};">${equipped ? "EQUIPPED" : "LOCKED"}</b>
            </article>`;
        }).join("")}
    </div>
  `;
  if (應用程式狀態.額外.Showcase模式) {
    weaponPanel.querySelectorAll<HTMLButtonElement>("[data-weapon-toggle]").forEach((button) => {
      button.onclick = () => {
        切換家族武器裝備(button.dataset.weaponToggle as any);
        刷新();
      };
    });
    weaponPanel.querySelectorAll<HTMLButtonElement>("[data-weapon-star]").forEach((button) => {
      button.onclick = () => {
        const family = button.dataset.weaponStar as any;
        const star = Number(button.dataset.star) as 0 | 1 | 2 | 3;
        直接設定家族武器星級(family, star);
        刷新();
      };
    });
  }
  rightPane.appendChild(weaponPanel);

  layout.append(leftPane, rightPane);
  root.appendChild(layout);
  return root;
}

export function 建立訓練召喚面板(刷新: () => void, 生成座標: { x: number; y: number }): HTMLElement {
  const root = document.createElement("section");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "14px";

  const summary = 取得訓練道場摘要();
  const active = 取得訓練召喚敵群();
  const catalog = 取得可召喚怪物圖鑑();

  root.appendChild(建立標題(雙語("敵群召喚台", "Enemy Summon Console"), 雙語("選定怪物後可在玩家附近直接叫出來，立刻做碰撞測試。", "Choose a monster and summon it near the player for immediate collision testing.")));

  const selectorWrap = document.createElement("div");
  selectorWrap.style.display = "grid";
  selectorWrap.style.gridTemplateColumns = "minmax(148px, 0.8fr) minmax(220px, 1.3fr) auto auto auto auto";
  selectorWrap.style.gap = "8px";
  selectorWrap.style.alignItems = "stretch";
  selectorWrap.style.overflow = "visible";

  const 場景選擇 = document.createElement("select");
  場景選擇.className = "訓練召喚面板-場景選擇";
  場景選擇.style.width = "100%";
  場景選擇.style.minWidth = "0";
  場景選擇.style.padding = "9px 12px";
  場景選擇.style.background = "rgba(17,21,33,0.92)";
  場景選擇.style.color = "#e9ecf8";
  場景選擇.style.border = "1px solid rgba(111,140,255,0.28)";
  場景選擇.style.borderRadius = "10px";
  訓練世界選項.forEach((world) => {
    const option = document.createElement("option");
    option.value = world;
    option.textContent = `${世界顯示名(world)} ${雙語("世界場景", "Scene")}`;
    option.selected = world === summary.selectedWorld;
    場景選擇.appendChild(option);
  });
  場景選擇.onchange = () => {
    設定訓練世界場景(場景選擇.value as World);
    刷新();
  };

  const 目前怪物 = catalog.find((monster) => monster.id === summary.selectedEnemyMonsterId) ?? catalog[0];
  const 目前怪物Id = () => 取得訓練道場摘要().selectedEnemyMonsterId || 目前怪物?.id || "";

  const pickerWrap = document.createElement("div");
  pickerWrap.style.position = "relative";
  pickerWrap.style.minWidth = "0";
  pickerWrap.style.overflow = "visible";

  const pickerBtn = document.createElement("button");
  pickerBtn.type = "button";
  pickerBtn.className = "訓練召喚面板-選單";
  pickerBtn.style.width = "100%";
  pickerBtn.style.minWidth = "0";
  pickerBtn.style.padding = "9px 12px";
  pickerBtn.style.background = "rgba(17,21,33,0.92)";
  pickerBtn.style.color = "#e9ecf8";
  pickerBtn.style.border = "1px solid rgba(111,140,255,0.28)";
  pickerBtn.style.borderRadius = "10px";
  pickerBtn.style.cursor = "pointer";
  pickerBtn.style.display = "flex";
  pickerBtn.style.alignItems = "center";
  pickerBtn.style.justifyContent = "space-between";
  pickerBtn.style.gap = "10px";
  pickerBtn.style.textAlign = "left";
  pickerBtn.style.fontSize = "0.85rem";

  const pickerLabel = document.createElement("span");
  pickerLabel.style.flex = "1";
  pickerLabel.style.minWidth = "0";
  pickerLabel.style.whiteSpace = "nowrap";
  pickerLabel.style.overflow = "hidden";
  pickerLabel.style.textOverflow = "ellipsis";

  const pickerArrow = document.createElement("span");
  pickerArrow.textContent = "▾";
  pickerArrow.style.color = "#9db3ff";
  pickerArrow.style.fontSize = "0.8rem";
  pickerArrow.style.flex = "0 0 auto";

  pickerBtn.append(pickerLabel, pickerArrow);

  const menu = document.createElement("div");
  menu.style.position = "absolute";
  menu.style.left = "0";
  menu.style.right = "0";
  menu.style.top = "calc(100% + 8px)";
  menu.style.display = "none";
  menu.style.flexDirection = "column";
  menu.style.gap = "8px";
  menu.style.maxHeight = "340px";
  menu.style.overflowY = "auto";
  menu.style.padding = "10px";
  menu.style.background = "rgba(10,13,22,0.98)";
  menu.style.border = "1px solid rgba(111,140,255,0.32)";
  menu.style.boxShadow = "0 20px 40px rgba(0,0,0,0.45)";
  menu.style.zIndex = "30";

  let menuOpen = false;
  const 更新按鈕文字 = () => {
    const current = catalog.find((monster) => monster.id === 目前怪物Id()) ?? 目前怪物;
    if (!current) {
      pickerLabel.textContent = 雙語("請先選擇怪物", "Choose a monster first");
      return;
    }
    const worldName = current.world === "core" ? "COLA" : 世界顯示名(current.world);
    pickerLabel.textContent = `${worldName} | T${current.tier} | ${current.no.toString().padStart(2, "0")} ${應用程式狀態.額外.語言 === "zh" ? current.nameZh : current.nameEn}`;
  };
  const 設定選單開關 = (open: boolean) => {
    menuOpen = open;
    menu.style.display = open ? "flex" : "none";
    pickerArrow.textContent = open ? "▴" : "▾";
    pickerBtn.style.borderColor = open ? "rgba(255,210,120,0.65)" : "rgba(111,140,255,0.28)";
    pickerBtn.style.boxShadow = open ? "0 0 0 1px rgba(255,210,120,0.18)" : "none";
  };
  更新按鈕文字();

  pickerBtn.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    設定選單開關(!menuOpen);
  };
  pickerWrap.addEventListener("mousedown", (event) => event.stopPropagation());
  pickerWrap.addEventListener("click", (event) => event.stopPropagation());

  catalog.forEach((monster) => {
    const optionBtn = document.createElement("button");
    optionBtn.type = "button";
    optionBtn.style.display = "flex";
    optionBtn.style.alignItems = "center";
    optionBtn.style.justifyContent = "space-between";
    optionBtn.style.gap = "10px";
    optionBtn.style.width = "100%";
    optionBtn.style.padding = "8px 10px";
    optionBtn.style.border = "1px solid rgba(255,255,255,0.08)";
    optionBtn.style.background =
      monster.id === 目前怪物Id() ? "rgba(255,210,120,0.16)" : "rgba(255,255,255,0.03)";
    optionBtn.style.color = "#eef1ff";
    optionBtn.style.cursor = "pointer";
    optionBtn.style.fontSize = "0.8rem";
    optionBtn.style.textAlign = "left";
    optionBtn.innerHTML = `
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">T${monster.tier} | ${monster.no
        .toString()
        .padStart(2, "0")} ${應用程式狀態.額外.語言 === "zh" ? monster.nameZh : monster.nameEn}</span>
      <span style="color:${monster.id === 目前怪物Id() ? "#ffd278" : "#7f8ab0"};font-size:0.72rem;">${monster.id === 目前怪物Id() ? 雙語("已選中", "Selected") : 雙語("點擊選取", "Click to Select")}</span>
    `;
    optionBtn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      設定訓練預選怪物(monster.id);
      設定選單開關(false);
      刷新();
    };
    menu.appendChild(optionBtn);
  });

  pickerWrap.append(pickerBtn, menu);

  const summon1 = document.createElement("button");
  summon1.className = "一級按鈕";
  summon1.textContent = 雙語("召喚 1", "Spawn 1");
  summon1.onclick = () => {
    召喚訓練敵人(目前怪物Id(), 1, 生成座標);
    刷新();
  };
  const summon3 = document.createElement("button");
  summon3.className = "二級按鈕";
  summon3.textContent = 雙語("召喚 3", "Spawn 3");
  summon3.onclick = () => {
    召喚訓練敵人(目前怪物Id(), 3, 生成座標);
    刷新();
  };
  const summon6 = document.createElement("button");
  summon6.className = "二級按鈕";
  summon6.textContent = 雙語("召喚 6", "Spawn 6");
  summon6.onclick = () => {
    召喚訓練敵人(目前怪物Id(), 6, 生成座標);
    刷新();
  };
  const clear = document.createElement("button");
  clear.className = "二級按鈕";
  clear.textContent = 雙語("清空敵群", "Clear Enemies");
  clear.onclick = () => {
    清空訓練敵人();
    刷新();
  };
  selectorWrap.append(場景選擇, pickerWrap, summon1, summon3, summon6, clear);
  root.appendChild(selectorWrap);

  const status = document.createElement("div");
  status.style.display = "grid";
  status.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  status.style.gap = "8px";
  status.innerHTML = [
    建立資料膠囊(雙語("當前敵數", "Active Enemies"), `${active.length}`),
    建立資料膠囊(雙語("碰撞測試", "Collision Test"), summary.lastCollision ? summary.lastCollision.enemyNames.join(應用程式狀態.額外.語言 === "zh" ? "、" : ", ") : 雙語("尚未接觸", "No Contact Yet")),
    建立資料膠囊(雙語("最近我方輸出", "Latest Squad Damage"), summary.lastCollision ? `${summary.lastCollision.squadDamage}` : "0"),
    建立資料膠囊(雙語("最近敵方輸出", "Latest Enemy Damage"), summary.lastCollision ? `${summary.lastCollision.enemyDamage}` : "0"),
  ].join("");
  root.appendChild(status);

  const activeList = document.createElement("div");
  activeList.style.display = "flex";
  activeList.style.flexDirection = "column";
  activeList.style.gap = "8px";
  activeList.style.maxHeight = "360px";
  activeList.style.overflowY = "auto";

  if (active.length === 0) {
    activeList.innerHTML = `<div style="padding:18px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);font-size:0.8rem;color:#8d93ad;">${雙語("目前沒有任何召喚中的敵人。先選一隻，然後在玩家附近召喚出來。", "There are no summoned enemies right now. Pick one and spawn it near the player.")}</div>`;
  } else {
    active.forEach((enemy) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto auto";
      row.style.gap = "10px";
      row.style.alignItems = "center";
      row.style.padding = "10px 12px";
      row.style.borderRadius = "10px";
      row.style.background = "rgba(255,255,255,0.03)";
      row.style.border = "1px solid rgba(255,255,255,0.06)";
      row.innerHTML = `
        <div>
          <div style="font-size:0.82rem;color:#fff;font-weight:700;">T${enemy.tier} | ${應用程式狀態.額外.語言 === "zh" ? enemy.nameZh : enemy.nameEn}</div>
          <div style="font-size:0.72rem;color:#8d93ad;margin-top:4px;">HP ${enemy.hp}/${enemy.maxHp} | ${雙語("重量", "Weight")} ${enemy.weight} | ATK ${enemy.atk}</div>
        </div>
      `;
      const resetHp = document.createElement("button");
      resetHp.className = "二級按鈕";
      resetHp.textContent = 雙語("補滿", "Refill");
      resetHp.onclick = () => {
        更新訓練敵人(enemy.id, { hp: enemy.maxHp });
        刷新();
      };
      const remove = document.createElement("button");
      remove.className = "二級按鈕";
      remove.textContent = 雙語("移除", "Remove");
      remove.onclick = () => {
        移除訓練敵人(enemy.id);
        刷新();
      };
      row.append(resetHp, remove);
      activeList.appendChild(row);
    });
  }

  root.appendChild(activeList);
  return root;
}
