import { 取得音樂狀態, 切換音樂靜音, 訂閱音樂狀態, 設定音樂音量 } from "../../audio/音樂管理";
import { 取得音效狀態, 切換音效靜音, 訂閱音效狀態, 設定音效音量, 播放音效 } from "../../audio/音效管理";
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

  const sfxSection = document.createElement("section");
  sfxSection.className = "音樂浮動面板-分區";

  const sfxHeader = document.createElement("div");
  sfxHeader.className = "音樂浮動面板-分區標題";
  sfxHeader.textContent = 雙語("音效", "Sound Effects");

  const sfxRow = document.createElement("div");
  sfxRow.className = "音樂浮動面板-列";

  const sfxMuteBtn = document.createElement("button");
  sfxMuteBtn.type = "button";
  sfxMuteBtn.className = "音樂浮動面板-按鈕";

  const sfxSlider = document.createElement("input");
  sfxSlider.type = "range";
  sfxSlider.min = "0";
  sfxSlider.max = "100";
  sfxSlider.step = "1";
  sfxSlider.className = "音樂浮動面板-滑桿";

  const sfxValue = document.createElement("span");
  sfxValue.className = "音樂浮動面板-數值";

  const sfxTestBtn = document.createElement("button");
  sfxTestBtn.type = "button";
  sfxTestBtn.className = "音樂浮動面板-按鈕 音樂浮動面板-按鈕-次要";

  const sfxHint = document.createElement("div");
  sfxHint.className = "音樂浮動面板-提示";

  const hint = document.createElement("div");
  hint.className = "音樂浮動面板-提示";
  hint.textContent = 雙語("這裡會直接影響主畫面、準備頁、戰場、Boss 與結算音樂。", "This changes the lobby, setup, battlefield, boss, and settlement music.");

  const render = () => {
    const musicState = 取得音樂狀態();
    const sfxState = 取得音效狀態();
    slider.value = String(Math.round(musicState.volume * 100));
    muteBtn.textContent = musicState.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    value.textContent = musicState.muted ? 雙語("已靜音", "Muted") : `${Math.round(musicState.volume * 100)}%`;
    track.textContent = `${雙語("目前", "Now")}: ${musicState.trackLabel}`;
    scene.textContent = `${雙語("場景", "Scene")}: ${musicState.sceneLabel}`;
    hint.textContent = 雙語("這裡會直接影響主畫面、準備頁、戰場、Boss 與結算音樂。", "This changes the lobby, setup, battlefield, boss, and settlement music.");
    titleText.textContent = 雙語("音樂控制", "Music Control");
    sfxHeader.textContent = 雙語("音效", "Sound Effects");
    sfxSlider.value = String(Math.round(sfxState.volume * 100));
    sfxMuteBtn.textContent = sfxState.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    sfxValue.textContent = sfxState.muted ? 雙語("已靜音", "Muted") : `${Math.round(sfxState.volume * 100)}%`;
    sfxTestBtn.textContent = 雙語("試聽", "Test");
    sfxHint.textContent = 雙語("這裡控制按鈕、HUD、戰鬥碰撞、寶箱與設施互動音效。", "This controls buttons, HUD, combat hits, chests, and facility interaction sounds.");
  };

  muteBtn.onclick = () => {
    切換音樂靜音();
    render();
  };
  slider.oninput = () => {
    設定音樂音量(Number(slider.value) / 100);
    render();
  };

  sfxMuteBtn.onclick = () => {
    切換音效靜音();
    render();
  };
  sfxSlider.oninput = () => {
    設定音效音量(Number(sfxSlider.value) / 100);
    render();
  };
  sfxTestBtn.onclick = () => {
    播放音效("藥水成功");
    render();
  };

  row.append(muteBtn, slider, value);
  sfxRow.append(sfxMuteBtn, sfxSlider, sfxValue, sfxTestBtn);
  sfxSection.append(sfxHeader, sfxRow, sfxHint);
  wrap.append(title, row, scene, hint, sfxSection);

  const unsubscribe = 訂閱音樂狀態(render);
  const unsubscribeSfx = 訂閱音效狀態(render);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      unsubscribe();
      unsubscribeSfx();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  render();
  return wrap;
}
