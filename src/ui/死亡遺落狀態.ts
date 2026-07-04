export interface 死亡遺落物 {
  id: string;
  x: number;
  y: number;
  materials: Array<{ no: number; count: number }>;
}

let sequence = 0;
let 遺落物: 死亡遺落物[] = [];

export function 重置死亡遺落物(): void {
  sequence = 0;
  遺落物 = [];
}

export function 新增死亡遺落物(x: number, y: number, materials: Array<{ no: number; count: number }>): 死亡遺落物 | null {
  if (materials.reduce((sum, item) => sum + item.count, 0) <= 0) return null;
  const drop = { id: `death_drop_${sequence++}`, x, y, materials: materials.map((item) => ({ ...item })) };
  遺落物.push(drop);
  return { ...drop, materials: drop.materials.map((item) => ({ ...item })) };
}

export function 取得死亡遺落物(): 死亡遺落物[] {
  return 遺落物.map((drop) => ({ ...drop, materials: drop.materials.map((item) => ({ ...item })) }));
}

export function 拾取死亡遺落物(id: string): 死亡遺落物 | null {
  const index = 遺落物.findIndex((drop) => drop.id === id);
  if (index < 0) return null;
  const [drop] = 遺落物.splice(index, 1);
  return { ...drop, materials: drop.materials.map((item) => ({ ...item })) };
}
