/**
 * @file 主動技能效果.ts
 * @description 四位隊長「主動位移技能」的實際效果計算（純函式，可單元驗收）。
 *
 * 與 隊長主動技能.ts 的分工：
 *   - 隊長主動技能.ts / 能量系統.ts：負責「能不能放」（冷卻、能量、施法延遲）。
 *   - 本檔：負責「放了會怎樣」（位移玩家、拉近/減速敵人、加速全隊），只吃資料回傳指定，不碰 DOM。
 *
 * 效果對照（見 src/ui/資料/隊長清單.ts 的主動位移技能欄）：
 *   conductor 指導者 → 加速 Speed Boost：短時間提升全隊移速。
 *   operator  操作者 → 傳送點 Teleport：朝面向瞬移一段距離。
 *   launcher  投射者 → 鉤索拖曳 Grapple Pull：把範圍內敵人強制拉近到身邊。
 *   architect 建築師 → 減速領域 Slow Field：在原地放下一塊持續減速的區域。
 */

import type { CaptainId } from "../data/戰鬥原語";

export interface 向量 {
  x: number;
  y: number;
}

/** 給效果計算用的怪物唯讀視圖（世界座標 + 生命）。 */
export interface 主動技能怪物視圖 {
  pos: 向量;
  hp: number;
}

export interface 主動技能情境 {
  captainId: CaptainId;
  playerPos: 向量;
  /** 玩家面向（最後一次移動方向；靜止時沿用上一個，預設向上）。 */
  facing: 向量;
  monsters: readonly 主動技能怪物視圖[];
  nowMs: number;
}

export interface 速度增益指定 {
  mult: number;
  durationMs: number;
}
export interface 減速領域指定 {
  center: 向量;
  radius: number;
  durationMs: number;
  /** 場內敵人的移速倍率（0.4 = 剩 40%）。 */
  mult: number;
}
export interface 拉近指定 {
  /** 對應 情境.monsters 的索引。 */
  index: number;
  to: 向量;
}

export interface 主動技能效果 {
  label: string;
  /** 玩家瞬移目標（未夾邊界；世界層負責 clamp）。 */
  playerTeleportTo?: 向量;
  speedBuff?: 速度增益指定;
  slowField?: 減速領域指定;
  pulls?: 拉近指定[];
  /** 這次影響到的單位數（供驗收顯示）。 */
  affected: number;
  logZh: string;
  logEn: string;
}

/** 效果強度參數（與能量/冷卻分離，方便單獨調平衡）。 */
export const 主動技能效果參數 = {
  conductor: { speedMult: 1.6, durationMs: 3000 },
  operator: { blinkDistance: 620 },
  launcher: { pullRadius: 900, pullGap: 220 },
  architect: { fieldRadius: 520, durationMs: 4000, slowMult: 0.4 },
} as const;

function 正規化(v: 向量): 向量 {
  const len = Math.hypot(v.x, v.y);
  if (len <= 1e-6) return { x: 0, y: -1 };
  return { x: v.x / len, y: v.y / len };
}

function 距離(a: 向量, b: 向量): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 依當前隊長計算主動技能效果。純函式：相同輸入必得相同輸出，方便單元驗收。
 */
export function 計算主動技能效果(ctx: 主動技能情境): 主動技能效果 {
  switch (ctx.captainId) {
    case "conductor": {
      const p = 主動技能效果參數.conductor;
      const 秒 = (p.durationMs / 1000).toFixed(0);
      return {
        label: "加速 Speed Boost",
        speedBuff: { mult: p.speedMult, durationMs: p.durationMs },
        affected: 1,
        logZh: `加速：全隊移速 ×${p.speedMult}，持續 ${秒} 秒`,
        logEn: `Speed Boost: squad move speed ×${p.speedMult} for ${秒}s`,
      };
    }
    case "operator": {
      const p = 主動技能效果參數.operator;
      const dir = 正規化(ctx.facing);
      return {
        label: "傳送點 Teleport",
        playerTeleportTo: {
          x: ctx.playerPos.x + dir.x * p.blinkDistance,
          y: ctx.playerPos.y + dir.y * p.blinkDistance,
        },
        affected: 1,
        logZh: `傳送點：朝面向瞬移 ${p.blinkDistance} 單位`,
        logEn: `Teleport: blink ${p.blinkDistance} units toward facing`,
      };
    }
    case "launcher": {
      const p = 主動技能效果參數.launcher;
      const pulls: 拉近指定[] = [];
      ctx.monsters.forEach((m, index) => {
        if (m.hp <= 0) return;
        const d = 距離(m.pos, ctx.playerPos);
        if (d > p.pullRadius || d <= p.pullGap) return;
        const ratio = p.pullGap / d;
        pulls.push({
          index,
          to: {
            x: ctx.playerPos.x + (m.pos.x - ctx.playerPos.x) * ratio,
            y: ctx.playerPos.y + (m.pos.y - ctx.playerPos.y) * ratio,
          },
        });
      });
      return {
        label: "鉤索拖曳 Grapple Pull",
        pulls,
        affected: pulls.length,
        logZh: `鉤索拖曳：把 ${pulls.length} 個敵人拉近到身邊`,
        logEn: `Grapple Pull: yanked ${pulls.length} enemies to you`,
      };
    }
    case "architect": {
      const p = 主動技能效果參數.architect;
      const inside = ctx.monsters.filter(
        (m) => m.hp > 0 && 距離(m.pos, ctx.playerPos) <= p.fieldRadius,
      ).length;
      return {
        label: "減速領域 Slow Field",
        slowField: {
          center: { x: ctx.playerPos.x, y: ctx.playerPos.y },
          radius: p.fieldRadius,
          durationMs: p.durationMs,
          mult: p.slowMult,
        },
        affected: inside,
        logZh: `減速領域：場內 ${inside} 個敵人減速至 ${Math.round(p.slowMult * 100)}%`,
        logEn: `Slow Field: ${inside} enemies slowed to ${Math.round(p.slowMult * 100)}%`,
      };
    }
    default: {
      const _exhaustive: never = ctx.captainId;
      return { label: String(_exhaustive), affected: 0, logZh: "", logEn: "" };
    }
  }
}
