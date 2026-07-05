export interface 資源掉落物 {
  id: string;
  x: number;
  y: number;
  gems: number;
  materials: Array<{ no: number; count: number }>;
}

let sequence = 0;
let 掉落物: 資源掉落物[] = [];

export function 重置資源掉落物(): void {
  sequence = 0;
  掉落物 = [];
}

export function 新增資源掉落物(
  x: number,
  y: number,
  payload: { gems?: number; materials?: Array<{ no: number; count: number }> },
): 資源掉落物 | null {
  const gems = Math.max(0, Math.floor(payload.gems ?? 0));
  const materials = (payload.materials ?? [])
    .map((item) => ({ no: item.no, count: Math.max(0, Math.floor(item.count)) }))
    .filter((item) => item.count > 0);
  if (gems <= 0 && materials.length === 0) return null;

  const drop: 資源掉落物 = {
    id: `resource_drop_${sequence++}`,
    x,
    y,
    gems,
    materials,
  };
  掉落物.push(drop);
  return { ...drop, materials: drop.materials.map((item) => ({ ...item })) };
}

export function 取得資源掉落物(): 資源掉落物[] {
  return 掉落物.map((drop) => ({ ...drop, materials: drop.materials.map((item) => ({ ...item })) }));
}

export function 拾取資源掉落物(id: string): 資源掉落物 | null {
  const index = 掉落物.findIndex((drop) => drop.id === id);
  if (index < 0) return null;
  const [drop] = 掉落物.splice(index, 1);
  return { ...drop, materials: drop.materials.map((item) => ({ ...item })) };
}
