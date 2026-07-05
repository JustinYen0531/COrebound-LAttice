import type { World } from "../data/成員型別";

export type Boss召喚請求 =
  | { kind: "guardian"; world: World }
  | { kind: "cola" };

let 佇列: Boss召喚請求[] = [];

export function 排入Boss召喚(request: Boss召喚請求): void {
  const duplicate = 佇列.some((entry) =>
    entry.kind === request.kind && (entry.kind !== "guardian" || request.kind !== "guardian" || entry.world === request.world),
  );
  if (!duplicate) 佇列.push(request);
}

export function 取出Boss召喚(): Boss召喚請求[] {
  const pending = 佇列;
  佇列 = [];
  return pending;
}

export function 重置Boss召喚佇列(): void {
  佇列 = [];
}
