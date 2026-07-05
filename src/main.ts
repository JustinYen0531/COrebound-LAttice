/**
 * @file main.ts
 * @description 入口與畫面路由:主畫面 → 對局 → 結算 → 重玩/回主畫面。
 */

import "./style.css";
import type { CaptainId } from "./legacy/data/戰鬥原語";
import { preloadCore, music } from "./game/assets";
import { Game, type RunResult } from "./game/game";
import { showMenu } from "./screens/menu";
import { showResult } from "./screens/result";

const root = document.getElementById("app")!;
let currentGame: Game | null = null;

function toMenu(): void {
  currentGame = null;
  showMenu(root, startRun);
}

function startRun(captain: CaptainId): void {
  music.unlock();
  currentGame = new Game(root, captain, onRunEnd);
}

function onRunEnd(result: RunResult): void {
  currentGame = null;
  showResult(root, result, startRun, toMenu);
}

preloadCore();
toMenu();
