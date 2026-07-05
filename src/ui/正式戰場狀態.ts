import { 建立怪物實例副本, type MonsterInstance } from "../data/怪物實例資料";
import type { World } from "../data/成員型別";

export interface 正式戰場怪物 {
  inst: MonsterInstance;
  x: number;
  y: number;
  dropped: boolean;
  bossKind?: "guardian" | "cola";
  bossWorld?: World;
}

let 怪物群: 正式戰場怪物[] = [];
let 玩家位置 = { x: 0, y: 0 };

export function 重置正式戰場(): void {
  玩家位置 = { x: 0, y: 0 };
  怪物群 = 建立怪物實例副本().map((inst) => ({
    inst,
    x: inst.x,
    y: inst.y,
    dropped: false,
  }));
}

export function 取得正式玩家位置(): { x: number; y: number } {
  return { ...玩家位置 };
}

export function 設定正式玩家位置(position: { x: number; y: number }): void {
  玩家位置 = { ...position };
}

/** 回傳單局內的持久物件；世界地圖會直接同步其生命與位置。 */
export function 取得正式戰場怪物(): 正式戰場怪物[] {
  if (怪物群.length === 0) 重置正式戰場();
  return 怪物群;
}

export function 加入正式戰場怪物(monster: 正式戰場怪物): void {
  怪物群.push(monster);
}
