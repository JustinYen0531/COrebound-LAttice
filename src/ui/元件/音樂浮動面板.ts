import { 取得音樂狀態, 切換音樂靜音, 訂閱音樂狀態, 設定音樂音量 } from "../../audio/音樂管理";
import { 應用程式狀態 } from "../應用程式狀態";
import { 選文 } from "../語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

export function 建立音樂浮動面板(): HTMLElement {
  const wrap = document.createElement("aside");
  wrap.className = "音樂浮動面板";

  const title = document.createElement("div");
  title.className = "音樂浮動面板-標題";

  const titleText = document.createElement("strong");
  titleText.textContent = 雙語("音樂控制", "Music Control");

  const track = document.createElement("span");
  track.className = "音樂浮動面板-音軌";

  const scene = document.createElement("div");
  scene.className = "音樂浮動面板-場景";

  title.append(titleText, track);

  const row = document.createElement("div");
  row.className = "音樂浮動面板-列";

  const muteBtn = document.createElement("button");
  muteBtn.type = "button";
  muteBtn.className = "音樂浮動面板-按鈕";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.className = "音樂浮動面板-滑桿";

  const value = document.createElement("span");
  value.className = "音樂浮動面板-數值";

  const hint = document.createElement("div");
  hint.className = "音樂浮動面板-提示";
  hint.textContent = 雙語("這裡會直接影響主畫面、準備頁、戰場、Boss 與結算音樂。", "This changes the lobby, setup, battlefield, boss, and settlement music.");

  const render = () => {
    const state = 取得音樂狀態();
    slider.value = String(Math.round(state.volume * 100));
    muteBtn.textContent = state.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    value.textContent = state.muted ? 雙語("已靜音", "Muted") : `${Math.round(state.volume * 100)}%`;
    track.textContent = `${雙語("目前", "Now")}: ${state.trackLabel}`;
    scene.textContent = `${雙語("場景", "Scene")}: ${state.sceneLabel}`;
    hint.textContent = 雙語("這裡會直接影響主畫面、準備頁、戰場、Boss 與結算音樂。", "This changes the lobby, setup, battlefield, boss, and settlement music.");
    titleText.textContent = 雙語("音樂控制", "Music Control");
  };

  muteBtn.onclick = () => {
    切換音樂靜音();
    render();
  };
  slider.oninput = () => {
    設定音樂音量(Number(slider.value) / 100);
    render();
  };

  row.append(muteBtn, slider, value);
  wrap.append(title, row, scene, hint);

  const unsubscribe = 訂閱音樂狀態(render);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  render();
  return wrap;
}
