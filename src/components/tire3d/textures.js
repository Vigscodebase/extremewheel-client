import * as THREE from "three";

// Procedurally-generated, photoreal-leaning tire textures. No external
// image files are fetched — everything is drawn to an offscreen canvas at
// module load and cached, so it costs one cheap draw pass regardless of
// how many tire meshes reuse it (comparison pages render 2+ tires that all
// share the same texture instances).
let cachedTextures = null;

function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// Color/albedo map: dark rubber base with a tread band of repeating
// blocks (circumferential = X axis) and smoother sidewall bands above/below.
function buildColorMap() {
  const w = 1024;
  const h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#141316";
  ctx.fillRect(0, 0, w, h);

  // Sidewall bands (top/bottom thirds): faint concentric rings, matte rubber.
  const sidewallBandH = h * 0.28;
  [0, h - sidewallBandH].forEach((y0) => {
    for (let i = 0; i < 14; i++) {
      const y = y0 + (i / 14) * sidewallBandH + 2;
      ctx.strokeStyle = `rgba(255,255,255,${i % 3 === 0 ? 0.035 : 0.015})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });

  // Tread band (middle): staggered rubber blocks, dark-on-dark contrast —
  // enough for a believable tread without reading as an illustration.
  const treadY0 = h * 0.28;
  const treadY1 = h * 0.72;
  const blockW = 9;
  let x = 0;
  let row = 0;
  while (x < w) {
    const stagger = row % 2 === 0 ? 0 : blockW / 2;
    const groove = 2;
    ctx.fillStyle = "#0c0c0e";
    ctx.fillRect(x + stagger, treadY0, groove, treadY1 - treadY0);
    x += blockW;
    row++;
  }
  // subtle horizontal centreline groove
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, (treadY0 + treadY1) / 2 - 1.5, w, 3);

  // fine grain noise for realism (avoids a "flat vector" look)
  const imgData = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
    imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + n));
    imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 1);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Roughness map: tread band rougher (brighter), sidewalls slightly smoother.
function buildRoughnessMap() {
  const w = 256;
  const h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#b8b8b8";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#dedede";
  ctx.fillRect(0, h * 0.26, w, h * 0.48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 1);
  return tex;
}

// Brushed-alloy roughness variation for the wheel rim.
function buildMetalRoughnessMap() {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#9c9c9c";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function getTireTextures() {
  if (cachedTextures) return cachedTextures;
  cachedTextures = {
    colorMap: buildColorMap(),
    roughnessMap: buildRoughnessMap(),
    metalRoughnessMap: buildMetalRoughnessMap(),
  };
  return cachedTextures;
}
