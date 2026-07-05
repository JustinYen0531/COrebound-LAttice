/**
 * @file render.ts
 * @description Canvas 世界渲染:四世界地板(舊專案地板圖平鋪)、中央廣場、
 *              設施、雕像、敵人(舊圖騰 PNG)、小隊三層同心圓、投射物、侵蝕。
 */

import type { World } from "../legacy/data/成員型別";
import { memberStatsAtStar } from "../legacy/data/成員資料庫";
import { avatarImage, captainImage, enemyImage, facilityImage, floorImage, loadImage, propImage } from "./assets";
import { MAP_W, MAP_H, CX, CY, PLAZA_R, WORLDS, WORLD_TINT, WORLD_NAME, QUADRANT_CENTER, CORE_R, worldAt, type Facility } from "./world";
import { WORKSHOP_IMG } from "./world";
import type { Sim, Enemy, Projectile } from "./sim";
import type { RunState } from "./state";

const FAMILY_COLOR: Record<string, string> = {
  shield: "#6fb7ff", multishot: "#ff9d5c", straight: "#ffe066", mine: "#ff6b6b", laser: "#c792ea",
};

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private patterns = new Map<World, CanvasPattern | null>();
  private patternScale = 0.35;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private floorPattern(w: World): CanvasPattern | null {
    if (this.patterns.has(w)) return this.patterns.get(w) ?? null;
    const img = floorImage(w);
    if (!img.complete || img.naturalWidth === 0) return null;
    // 縮小地板圖做為重複底紋
    const off = document.createElement("canvas");
    const tw = Math.round(img.naturalWidth * this.patternScale);
    const th = Math.round(img.naturalHeight * this.patternScale);
    off.width = tw; off.height = th;
    const octx = off.getContext("2d")!;
    octx.drawImage(img, 0, 0, tw, th);
    const p = this.ctx.createPattern(off, "repeat");
    this.patterns.set(w, p);
    return p;
  }

  render(sim: Sim, state: RunState): void {
    const { ctx, canvas } = this;
    const vw = canvas.width, vh = canvas.height;
    const camX = sim.px - vw / 2;
    const camY = sim.py - vh / 2;
    const now = state.timeSec;

    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(-camX, -camY);

    // ---------- 地板:四象限 ----------
    const viewL = camX - 100, viewT = camY - 100, viewR = camX + vw + 100, viewB = camY + vh + 100;
    for (const w of WORLDS) {
      const qc = QUADRANT_CENTER[w];
      const qx = qc.x < CX ? 0 : CX, qy = qc.y < CY ? 0 : CY;
      const l = Math.max(qx, viewL), t = Math.max(qy, viewT);
      const r = Math.min(qx + CX, viewR), b = Math.min(qy + CY, viewB);
      if (l >= r || t >= b) continue;
      const pat = this.floorPattern(w);
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(l, t, r - l, b - t);
        ctx.fillStyle = WORLD_TINT[w] + "3d";
        ctx.fillRect(l, t, r - l, b - t);
      } else {
        ctx.fillStyle = WORLD_TINT[w] + "55";
        ctx.fillRect(l, t, r - l, b - t);
      }
      // 核心區淡光圈
      if (Math.abs(qc.x - sim.px) < vw && Math.abs(qc.y - sim.py) < vh + CORE_R) {
        ctx.strokeStyle = WORLD_TINT[w] + "aa";
        ctx.setLineDash([26, 18]);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(qc.x, qc.y, CORE_R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 世界分界十字
    ctx.strokeStyle = "#ffffff2e";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(CX, Math.max(0, viewT)); ctx.lineTo(CX, Math.min(MAP_H, viewB));
    ctx.moveTo(Math.max(0, viewL), CY); ctx.lineTo(Math.min(MAP_W, viewR), CY);
    ctx.stroke();

    // ---------- 中央廣場 ----------
    if (Math.hypot(CX - sim.px, CY - sim.py) < Math.hypot(vw, vh) / 2 + PLAZA_R + 200) {
      const grd = ctx.createRadialGradient(CX, CY, PLAZA_R * 0.2, CX, CY, PLAZA_R);
      grd.addColorStop(0, "#2c3350");
      grd.addColorStop(1, "#1a1f33");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(CX, CY, PLAZA_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8ea0ff";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = "#8ea0ff44";
      ctx.lineWidth = 3;
      for (const rr of [0.45, 0.7]) {
        ctx.beginPath();
        ctx.arc(CX, CY, PLAZA_R * rr, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ---------- 環境物件 ----------
    for (const p of sim.layout.props) {
      if (p.x < viewL || p.x > viewR || p.y < viewT || p.y > viewB) continue;
      const img = propImage(p.world, p.name);
      if (img.complete && img.naturalWidth > 0) {
        const s = p.size;
        ctx.drawImage(img, p.x - s / 2, p.y - s * 0.82, s, s);
      }
    }

    // ---------- 設施 ----------
    for (const f of sim.layout.facilities) {
      if (f.x < viewL - 200 || f.x > viewR + 200 || f.y < viewT - 200 || f.y > viewB + 200) continue;
      this.drawFacility(f, sim, state, now);
    }

    // ---------- 寶箱 ----------
    for (const c of sim.chests) {
      if (c.opened || c.x < viewL || c.x > viewR || c.y < viewT || c.y > viewB) continue;
      const pulse = 1 + Math.sin(now * 4) * 0.08;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#ffd76b";
      ctx.strokeStyle = "#8a6d1f";
      ctx.lineWidth = 4;
      const s = 34 * pulse;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.restore();
      ctx.fillStyle = "#ffd76b";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("寶箱", c.x, c.y - 40);
    }

    // ---------- 減速領域 ----------
    for (const f of sim.slowFields) {
      if (now >= f.until) continue;
      ctx.fillStyle = f.side === "enemy" ? "#6fb7ff22" : "#ff6b6b22";
      ctx.strokeStyle = f.side === "enemy" ? "#6fb7ff66" : "#ff6b6b66";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // ---------- 掉落物 ----------
    for (const d of sim.drops) {
      if (d.x < viewL || d.x > viewR || d.y < viewT || d.y > viewB) continue;
      const bob = Math.sin((now + d.x * 0.01) * 5) * 4;
      if (d.kind === "gems") {
        ctx.save();
        ctx.translate(d.x, d.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#7ee8fa";
        ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 2;
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
      } else {
        ctx.fillStyle = d.rarity === "fine" ? "#ffb84d" : "#b9c7d8";
        ctx.beginPath();
        ctx.arc(d.x, d.y + bob, 10 + (d.star ?? 1) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = d.world ? WORLD_TINT[d.world] : "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // ---------- 投射物 ----------
    for (const p of sim.projectiles) this.drawProjectile(p);

    // ---------- 敵人 ----------
    for (const e of sim.enemies) {
      if (e.x < viewL - 200 || e.x > viewR + 200 || e.y < viewT - 200 || e.y > viewB + 200) continue;
      this.drawEnemy(e, now);
    }

    // ---------- 小隊 ----------
    this.drawSquad(sim, state, now);

    // ---------- 浮字 ----------
    ctx.textAlign = "center";
    for (const f of sim.floats) {
      const a = Math.max(0, 1 - f.age / 1.4);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(f.text, f.x, f.y - f.age * 46);
      ctx.globalAlpha = 1;
    }

    // ---------- 侵蝕 ----------
    if (sim.erosionR < Infinity) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(viewL, viewT, viewR - viewL, viewB - viewT);
      ctx.arc(CX, CY, sim.erosionR, 0, Math.PI * 2, true);
      ctx.fillStyle = "#05060acc";
      ctx.fill("evenodd");
      ctx.restore();
      ctx.strokeStyle = "#e14646";
      ctx.lineWidth = 6;
      ctx.setLineDash([30, 22]);
      ctx.beginPath();
      ctx.arc(CX, CY, sim.erosionR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // ---------- 設施 ----------

  private drawFacility(f: Facility, sim: Sim, state: RunState, now: number): void {
    const { ctx } = this;
    if (f.kind === "altar") {
      const img = facilityImage(`guardian_altar_${f.world}`);
      const s = 240;
      if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, f.x - s / 2, f.y - s * 0.8, s, s);
      const p = state.progress[f.world as World];
      const ready = p.t1Kills >= 10 && p.t2Kills >= 2 && !p.guardianSummoned;
      if (ready) {
        ctx.strokeStyle = "#ffd76b";
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r + 26 + Math.sin(now * 3) * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      this.label(f.x, f.y + 66, `${WORLD_NAME[f.world as World]}祭壇`, p.guardianDefeated ? "#7bd88f" : "#ffffff");
    } else if (f.kind === "workshop") {
      const img = facilityImage(WORKSHOP_IMG[f.world as World]);
      const s = 190;
      if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, f.x - s / 2, f.y - s * 0.8, s, s);
      this.label(f.x, f.y + 52, "工坊(熔煉/升星)", "#ffffff");
    } else if (f.kind === "shop") {
      const img = facilityImage("shop");
      const s = 190;
      if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, f.x - s / 2, f.y - s * 0.8, s, s);
      this.label(f.x, f.y + 52, "流浪商店", "#ffffff");
    } else if (f.kind === "cola") {
      // 中央 COLA 裝配儀
      const pulse = Math.sin(now * 2) * 0.15 + 1;
      ctx.strokeStyle = state.sigils >= 4 && !state.colaSummoned ? "#ff5c5c" : "#8ea0ff";
      ctx.lineWidth = 8;
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = state.sigils > i ? 1 : 0.25;
        ctx.beginPath();
        ctx.arc(f.x, f.y, (44 + i * 22) * pulse, i * 0.8, i * 0.8 + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      this.label(f.x, f.y + 150, `COLA 裝配儀(印記 ${state.sigils}/4)`, state.sigils >= 4 ? "#ffd76b" : "#aab6d8");
    } else if (f.kind === "statue" && f.memberId) {
      const unlocked = state.members.some((m) => m.def.id === f.memberId);
      // 台座
      ctx.fillStyle = unlocked ? "#3a4a3f" : "#454d63";
      ctx.strokeStyle = unlocked ? "#7bd88f88" : "#aab6d888";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 26, 62, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const img = avatarImage(f.memberId, 1);
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (unlocked) ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(f.x, f.y - 34, 46, 0, Math.PI * 2);
        ctx.fillStyle = "#ece7da";
        ctx.fill();
        ctx.clip();
        ctx.drawImage(img, f.x - 46, f.y - 80, 92, 92);
        ctx.restore();
        ctx.strokeStyle = unlocked ? "#7bd88f" : "#ffd76b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y - 34, 46, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.label(f.x, f.y + 66, unlocked ? "雕像(已解鎖)" : "成員雕像", unlocked ? "#7bd88f" : "#ffd76b");
    }
  }

  private label(x: number, y: number, text: string, color: string): void {
    const { ctx } = this;
    ctx.font = "bold 19px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00000088";
    ctx.fillText(text, x + 1.5, y + 1.5);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // ---------- 敵人 ----------

  private drawEnemy(e: Enemy, now: number): void {
    const { ctx } = this;
    const img = enemyImage(e.def.id);
    const s = e.radius * 2.15;
    const wob = e.boss ? Math.sin(now * 2 + e.uid) * 0.06 : 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(now * 0.8 + e.uid * 1.7) * 0.1 + wob);
    if (e.boss) {
      ctx.shadowColor = e.boss === "cola" ? "#ff5c5c" : "#ffd76b";
      ctx.shadowBlur = 40;
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    } else {
      ctx.fillStyle = "#b9c7d8";
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 狀態圈
    if (now < e.stunUntil) this.label(e.x, e.y - e.radius - 26, "✦眩暈✦", "#ffe066");
    else if (now < e.silenceUntil) this.label(e.x, e.y - e.radius - 26, "沉默", "#c792ea");

    // 血條
    if (e.hp < e.maxHp) {
      const w = Math.max(56, e.radius * 1.6);
      const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "#000000aa";
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 18, w, 8);
      ctx.fillStyle = e.boss ? "#ff5c5c" : e.def.tier >= 2 ? "#ffb84d" : "#7bd88f";
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 18, w * ratio, 8);
    }
  }

  // ---------- 投射物 ----------

  private drawProjectile(p: Projectile): void {
    const { ctx } = this;
    const color = p.side === "enemy" ? "#ff7a7a" : FAMILY_COLOR[p.family] ?? "#fff";
    if (p.kind === "wave") {
      const dir = p.arcDir ?? Math.atan2(p.vy, p.vx);
      const span = p.arcSpan ?? 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.x - Math.cos(dir) * 30, p.y - Math.sin(dir) * 30, p.r, dir - span / 2, dir + span / 2);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(p.x - Math.cos(dir) * 44, p.y - Math.sin(dir) * 44, p.r * 0.8, dir - span / 2, dir + span / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.kind === "mine") {
      const blink = p.age > p.life - 1.4 ? (Math.sin(p.age * 18) > 0 ? 1 : 0.4) : 1;
      ctx.globalAlpha = blink;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#00000088";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#00000066";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 小隊 ----------

  private drawSquad(sim: Sim, state: RunState, now: number): void {
    const { ctx } = this;
    const x = sim.px, y = sim.py;
    const invuln = now < sim.invulnUntil;
    const spin = now * 0.35;

    // 三層同心圓(禪繞圖騰骨架)
    const rings = [
      { r: sim.squadR, width: 5, dash: [18, 10] as number[] },
      { r: sim.squadR * 0.68, width: 4, dash: [12, 9] as number[] },
      { r: sim.squadR * 0.4, width: 3, dash: [7, 7] as number[] },
    ];
    ctx.save();
    ctx.translate(x, y);
    if (invuln) ctx.globalAlpha = 0.55 + Math.sin(now * 10) * 0.3;
    for (let i = 0; i < rings.length; i++) {
      ctx.save();
      ctx.rotate(spin * (i % 2 === 0 ? 1 : -1));
      ctx.strokeStyle = i === 0 ? "#e8ecf8" : i === 1 ? "#aab6d8" : "#8ea0ff";
      ctx.lineWidth = rings[i].width;
      ctx.setLineDash(rings[i].dash);
      ctx.beginPath();
      ctx.arc(0, 0, rings[i].r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // 成員頭像:依家族分層(護盾/多發→外圈、直線→中圈、地雷→內圈)
    const layerOf = (family: string): number => (family === "shield" || family === "multishot" ? 0 : family === "straight" ? 1 : 2);
    const byLayer: Array<typeof state.members> = [[], [], []];
    state.members.forEach((m) => byLayer[layerOf(m.def.family)].push(m));
    byLayer.forEach((layer, li) => {
      const r = [sim.squadR, sim.squadR * 0.68, sim.squadR * 0.4][li];
      layer.forEach((m, i) => {
        const ang = spin * (li % 2 === 0 ? 1 : -1) + (i / layer.length) * Math.PI * 2;
        const mx = x + Math.cos(ang) * r;
        const my = y + Math.sin(ang) * r;
        const img = avatarImage(m.def.id, m.star);
        const size = 21 + m.star * 3;
        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(mx, my, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = "#ece7da";
          ctx.fill();
          ctx.clip();
          ctx.drawImage(img, mx - size / 2, my - size / 2, size, size);
          ctx.restore();
          ctx.strokeStyle = FAMILY_COLOR[m.def.family];
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(mx, my, size / 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    });

    // 隊長核心
    const capImg = captainImage(state.captainId);
    const cs = 44;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, cs / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#141a2c";
    ctx.fill();
    ctx.clip();
    if (capImg.complete && capImg.naturalWidth > 0) {
      // 立繪張左半是全身像;取上半居中裁一塊當頭像
      const iw = capImg.naturalWidth, ih = capImg.naturalHeight;
      const crop = Math.min(iw, ih) * 0.5;
      ctx.drawImage(capImg, iw * 0.22 - crop / 2, ih * 0.18, crop, crop, x - cs / 2, y - cs / 2, cs, cs);
    }
    ctx.restore();
    ctx.strokeStyle = "#ffd76b";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y, cs / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---------- 小地圖 ----------

  renderMinimap(mini: HTMLCanvasElement, sim: Sim, state: RunState): void {
    const mctx = mini.getContext("2d");
    if (!mctx) return;
    const s = mini.width;
    const k = s / MAP_W;
    mctx.clearRect(0, 0, s, s);
    // 象限
    for (const w of WORLDS) {
      const qc = QUADRANT_CENTER[w];
      mctx.fillStyle = WORLD_TINT[w] + "66";
      mctx.fillRect(qc.x < CX ? 0 : s / 2, qc.y < CY ? 0 : s / 2, s / 2, s / 2);
    }
    // 廣場
    mctx.fillStyle = "#2c3350";
    mctx.beginPath();
    mctx.arc(s / 2, s / 2, PLAZA_R * k, 0, Math.PI * 2);
    mctx.fill();
    // 侵蝕
    if (sim.erosionR < Infinity) {
      mctx.strokeStyle = "#e14646";
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.arc(s / 2, s / 2, sim.erosionR * k, 0, Math.PI * 2);
      mctx.stroke();
    }
    // 祭壇/雕像/寶箱
    for (const f of sim.layout.facilities) {
      if (f.kind === "altar") {
        const p = state.progress[f.world as World];
        mctx.fillStyle = p.guardianDefeated ? "#7bd88f" : "#ffd76b";
        mctx.beginPath();
        mctx.moveTo(f.x * k, f.y * k - 5);
        mctx.lineTo(f.x * k - 4.5, f.y * k + 4);
        mctx.lineTo(f.x * k + 4.5, f.y * k + 4);
        mctx.fill();
      } else if (f.kind === "workshop" || f.kind === "shop") {
        mctx.fillStyle = f.kind === "workshop" ? "#ffb84d" : "#7ee8fa";
        mctx.fillRect(f.x * k - 2.5, f.y * k - 2.5, 5, 5);
      }
    }
    for (const c of sim.chests) {
      if (c.opened) continue;
      mctx.fillStyle = "#ffd76b";
      mctx.fillRect(c.x * k - 2, c.y * k - 2, 4, 4);
    }
    // Boss
    for (const e of sim.enemies) {
      if (!e.boss) continue;
      mctx.fillStyle = "#ff5c5c";
      mctx.beginPath();
      mctx.arc(e.x * k, e.y * k, 4.5, 0, Math.PI * 2);
      mctx.fill();
    }
    // 玩家
    mctx.fillStyle = "#ffffff";
    mctx.beginPath();
    mctx.arc(sim.px * k, sim.py * k, 4, 0, Math.PI * 2);
    mctx.fill();
    mctx.strokeStyle = "#ffd76b";
    mctx.lineWidth = 1.5;
    mctx.stroke();
  }
}
