/* ================= CORE ================= */
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

let tool = "brush";
let drawing = false;
let onion = true;
let playing = false;
let fps = 12;

const TOTAL_FRAMES = 24;

/* ================= VIEW ================= */
let view = { x: 0, y: 0, zoom: 1 };
let panning = false;
let lastPan = { x: 0, y: 0 };

/* ================= PROJECT ================= */
const project = {
  currentFrame: 0,
  currentLayer: 0,
  layers: []
};

/* ================= INIT ================= */
addLayer();
buildTimeline();
selectFrame(0);

/* ================= LAYERS ================= */
function addLayer() {
  project.layers.unshift({
    name: "Layer " + (project.layers.length + 1),
    frames: Array(TOTAL_FRAMES).fill(null)
  });
  project.currentLayer = 0;
  redrawLayers();
}

function redrawLayers() {
  const el = document.getElementById("layers");
  if (!el) return;

  el.innerHTML = "";
  project.layers.forEach((l, i) => {
    const d = document.createElement("div");
    d.className = "layer" + (i === project.currentLayer ? " active" : "");
    d.textContent = l.name;
    d.onclick = () => {
      project.currentLayer = i;
      redrawLayers();
      redraw();
    };
    el.appendChild(d);
  });
}

/* ================= TIMELINE ================= */
function buildTimeline() {
  const tl = document.getElementById("timeline");
  if (!tl) return;

  tl.innerHTML = "";
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const f = document.createElement("div");
    f.className = "frame";
    f.textContent = i + 1;
    f.onclick = () => selectFrame(i);
    tl.appendChild(f);
  }
}

function selectFrame(i) {
  project.currentFrame = i;

  document.querySelectorAll(".frame").forEach((f, idx) => {
    f.classList.toggle("active", idx === i);
  });

  redraw();
}

/* ================= INPUT ================= */
function getPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const e = evt.touches ? evt.touches[0] : evt;

  return {
    x: (e.clientX - rect.left - view.x) / view.zoom,
    y: (e.clientY - rect.top - view.y) / view.zoom
  };
}

function startDraw(e) {
  if (panning) return;
  drawing = true;
  const p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
}

function moveDraw(e) {
  if (!drawing) return;
  e.preventDefault();

  const p = getPos(e);

  ctx.strokeStyle =
    document.getElementById("color")?.value || "#000";
  ctx.lineWidth =
    document.getElementById("size")?.value || 4;

  ctx.lineCap = "round";
  ctx.globalCompositeOperation =
    tool === "eraser" ? "destination-out" : "source-over";

  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  ctx.beginPath();

  project.layers[project.currentLayer]
    .frames[project.currentFrame] =
    ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/* ================= EVENTS ================= */
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);

canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", moveDraw, { passive: false });
canvas.addEventListener("touchend", endDraw);

/* ================= ZOOM / PAN ================= */
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  view.zoom += e.deltaY * -0.001;
  view.zoom = Math.min(Math.max(0.2, view.zoom), 5);
  redraw();
}, { passive: false });

window.addEventListener("keydown", e => {
  if (e.code === "Space") panning = true;
});
window.addEventListener("keyup", e => {
  if (e.code === "Space") panning = false;
});

canvas.addEventListener("mousedown", e => {
  if (!panning) return;
  lastPan = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mousemove", e => {
  if (!panning) return;
  view.x += e.clientX - lastPan.x;
  view.y += e.clientY - lastPan.y;
  lastPan = { x: e.clientX, y: e.clientY };
  redraw();
});

/* ================= RENDER ================= */
function redraw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.x, view.y);

  project.layers.forEach((layer, idx) => {
    const frame = layer.frames[project.currentFrame];
    if (!frame) return;

    if (onion && idx === project.currentLayer) {
      const prev = layer.frames[project.currentFrame - 1];
      if (prev) {
        ctx.globalAlpha = 0.3;
        ctx.putImageData(prev, 0, 0);
        ctx.globalAlpha = 1;
      }
    }

    ctx.putImageData(frame, 0, 0);
  });
}

/* ================= PLAY ================= */
function togglePlay() {
  playing = !playing;
}

setInterval(() => {
  if (!playing) return;
  project.currentFrame =
    (project.currentFrame + 1) % TOTAL_FRAMES;
  selectFrame(project.currentFrame);
}, 1000 / fps);

/* ================= SAVE / LOAD ================= */
function saveFLA() {
  const blob = new Blob(
    [JSON.stringify(project)],
    { type: "application/octet-stream" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "project.fla";
  a.click();
}

function loadFLA(file) {
  const reader = new FileReader();
  reader.onload = () => {
    Object.assign(project, JSON.parse(reader.result));
    redrawLayers();
    buildTimeline();
    selectFrame(project.currentFrame);
  };
  reader.readAsText(file);
}

/* ================= EXPORT ================= */
function exportSpritesheet() {
  const out = document.createElement("canvas");
  out.width = canvas.width * TOTAL_FRAMES;
  out.height = canvas.height;
  const octx = out.getContext("2d");

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    project.layers.forEach(layer => {
      const frame = layer.frames[f];
      if (frame)
        octx.putImageData(frame, f * canvas.width, 0);
    });
  }

  const a = document.createElement("a");
  a.href = out.toDataURL("image/png");
  a.download = "spritesheet.png";
  a.click();
}