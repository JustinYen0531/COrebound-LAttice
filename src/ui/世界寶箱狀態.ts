import type { ChestState } from "../economy/寶箱系統";
import type { World } from "../data/成員型別";

export interface WorldChestInstance extends ChestState {
  x: number;
  y: number;
}

const CHEST_REFRESH_SECONDS = 180;
const 世界順序: World[] = ["geometry", "fractal", "organic", "mechanical"];
const 世界方向: Record<World, { x: number; y: number }> = {
  geometry: { x: 1, y: -1 },
  fractal: { x: -1, y: -1 },
  organic: { x: -1, y: 1 },
  mechanical: { x: 1, y: 1 },
};

let 已生成波次 = -1;
let 寶箱: WorldChestInstance[] = [];

export function 重置世界寶箱(): void {
  已生成波次 = -1;
  寶箱 = [];
}

/** 進場立即生成首波，之後每三分鐘在四個世界各補一箱。 */
export function 同步世界寶箱(elapsedSeconds: number): void {
  const targetWave = Math.max(0, Math.floor(Math.max(0, elapsedSeconds) / CHEST_REFRESH_SECONDS));
  while (已生成波次 < targetWave) {
    已生成波次 += 1;
    for (let index = 0; index < 世界順序.length; index += 1) {
      const world = 世界順序[index];
      const dir = 世界方向[world];
      const offset = ((已生成波次 * 719 + index * 431) % 900) - 450;
      寶箱.push({
        id: `zentangle_${已生成波次}_${world}`,
        world,
        opened: false,
        x: dir.x * (2050 + offset),
        y: dir.y * (1850 - offset * 0.45),
      });
    }
  }
}

export function 取得未開世界寶箱(): WorldChestInstance[] {
  return 寶箱.filter((chest) => !chest.opened).map((chest) => ({ ...chest }));
}

export function 標記世界寶箱已開啟(id: string): void {
  const chest = 寶箱.find((entry) => entry.id === id);
  if (chest) chest.opened = true;
}
