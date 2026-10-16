const $ = id => document.getElementById(id);

const canvas = $("plan");
const ctx = canvas.getContext("2d");

let plotLength = 40;
let plotBreadth = 30;
let rooms = [];
let selectedId = null;
let nextId = 1;

let undoStack = [];
let redoStack = [];

let scale = 12;
let draggingRoom = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function snapshot() {
  undoStack.push(JSON.stringify({
    plotLength,
    plotBreadth,
    rooms,
    selectedId,
    nextId
  }));

  if (undoStack.length > 40) undoStack.shift();

  redoStack = [];
}

function restoreState(state) {
  plotLength = state.plotLength;
  plotBreadth = state.plotBreadth;
  rooms = state.rooms;
  selectedId = state.selectedId;
  nextId = state.nextId;

  $("plotLength").value = plotLength;
  $("plotBreadth").value = plotBreadth;

  drawPlan();
  updateProperties();
}

function say(message) {
  $("status").textContent = message;
}

function validNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) &&
    number >= min && number <= max;
}

function getSelected() {
  return rooms.find(r => r.id === selectedId);
}

function getVisibleRooms() {
  return rooms;
}

function updatePlot() {
  const length = Number($("plotLength").value);
  const breadth = Number($("plotBreadth").value);

  if (!validNumber(length, 10, 200) ||
      !validNumber(breadth, 10, 200)) {
    say("Plot length aur breadth 10–200 ft ke beech rakho.");
    return;
  }

  snapshot();
  plotLength = length;
  plotBreadth = breadth;

  rooms.forEach(r => {
    r.x = Math.min(r.x, plotLength - r.w);
    r.y = Math.min(r.y, plotBreadth - r.h);
  });

  drawPlan();
  say("Plot updated.");
}

function addRoom() {
  const w = Number($("roomLength").value);
  const h = Number($("roomBreadth").value);

  if (!validNumber(w, 4, 100) ||
      !validNumber(h, 4, 100)) {
    say("Room dimensions 4–100 ft ke beech rakho.");
    return;
  }

  if (w > plotLength || h > plotBreadth) {
    say("Room plot se bada nahi ho sakta.");
    return;
  }

  snapshot();

  const room = {
    id: nextId++,
    type: $("roomType").value,
    x: 0,
    y: 0,
    w,
    h
  };

  rooms.push(room);
  selectedId = room.id;

  updateProperties();
  drawPlan();
  say(room.type + " added.");
}

function deleteRoom() {
  if (!getSelected()) {
    say("Pehle koi room select karo.");
    return;
  }

  snapshot();
  rooms = rooms.filter(r => r.id !== selectedId);
  selectedId = null;

  drawPlan();
  updateProperties();
  say("Room deleted.");
}

function rotateRoom() {
  const r = getSelected();

  if (!r) {
    say("Pehle koi room select karo.");
    return;
  }

  if (r.h > plotLength || r.w > plotBreadth) {
    say("Room rotate karne ke liye plot ka size kam hai.");
    return;
  }

  snapshot();

  [r.w, r.h] = [r.h, r.w];

  r.x = Math.min(r.x, plotLength - r.w);
  r.y = Math.min(r.y, plotBreadth - r.h);

  updateProperties();
  drawPlan();
  say("Room rotated.");
}

function updateProperties() {
  const r = getSelected();

  if (!r) return;

  $("roomX").value = r.x;
  $("roomY").value = r.y;
  $("editLength").value = r.w;
  $("editBreadth").value = r.h;
  $("roomType").value = r.type;
}

function applyProperties() {
  const r = getSelected();

  if (!r) {
    say("Pehle room select karo.");
    return;
  }

  const x = Number($("roomX").value);
  const y = Number($("roomY").value);
  const w = Number($("editLength").value);
  const h = Number($("editBreadth").value);

  if (![x, y, w, h].every(Number.isFinite) ||
      x < 0 || y < 0 || w < 4 || h < 4 ||
      x + w > plotLength || y + h > plotBreadth) {
    say("Room ki position aur size plot ke andar rakho.");
    return;
  }

  snapshot();

  r.x = x;
  r.y = y;
  r.w = w;
  r.h = h;
  r.type = $("roomType").value;

  drawPlan();
  say("Room properties updated.");
}

function drawPlan() {
  scale = Math.min(
    20,
    Math.max(
      5,
      Math.min(700 / plotLength, 500 / plotBreadth)
    )
  );

  const padding = 25;

  canvas.width = Math.ceil(plotLength * scale + padding * 2);
  canvas.height = Math.ceil(plotBreadth * scale + padding * 2);

  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#080e19";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const px = padding;
  const py = padding;
  const pw = plotLength * scale;
  const ph = plotBreadth * scale;

  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(px, py, pw, ph);

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;

  for (let x = 0; x <= plotLength; x += 5) {
    ctx.beginPath();
    ctx.moveTo(px + x * scale, py);
    ctx.lineTo(px + x * scale, py + ph);
    ctx.stroke();
  }

  for (let y = 0; y <= plotBreadth; y += 5) {
    ctx.beginPath();
    ctx.moveTo(px, py + y * scale);
    ctx.lineTo(px + pw, py + y * scale);
    ctx.stroke();
  }

  rooms.forEach(r => {
    const x = px + r.x * scale;
    const y = py + r.y * scale;
    const w = r.w * scale;
    const h = r.h * scale;

    ctx.fillStyle = r.id === selectedId
      ? "#93c5fd"
      : "#bfdbfe";

    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = r.id === selectedId
      ? "#2563eb"
      : "#334155";

    ctx.lineWidth = r.id === selectedId ? 3 : 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
      r.type,
      x + w / 2,
      y + h / 2 - 3,
      Math.max(20, w - 4)
    );

    ctx.font = "11px Arial";
    ctx.fillText(
      `${r.w} × ${r.h} ft`,
      x + w / 2,
      y + h / 2 + 12
    );
  }

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
}

function selectAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();

  const x = (clientX - rect.left) * canvas.width / rect.width;
  const y = (clientY - rect.top) * canvas.height / rect.height;

  const padding = 25;

  const worldX = (x - padding) / scale;
  const worldY = (y - padding) / scale;

  return rooms.slice().reverse().find(r =>
    worldX >= r.x &&
    worldX <= r.x + r.w &&
    worldY >= r.y &&
    worldY <= r.y + r.h
  );
}

canvas.addEventListener("pointerdown", event => {
  const r = selectAt(event.clientX, event.clientY);

  if (!r) {
    selectedId = null;
    drawPlan();
    return;
  }

  selectedId = r.id;
  draggingRoom = r;

  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * canvas.width / rect.width;
  const py = (event.clientY - rect.top) * canvas.height / rect.height;

  dragOffsetX = (px - 25) / scale - r.x;
  dragOffsetY = (py - 25) / scale - r.y;

  updateProperties();
  drawPlan();

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {}
});

canvas.addEventListener("pointermove", event => {
  if (!draggingRoom) return;

  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * canvas.width / rect.width;
  const py = (event.clientY - rect.top) * canvas.height / rect.height;

  const newX = Math.round((px - 25) / scale - dragOffsetX);
  const newY = Math.round((py - 25) / scale - dragOffsetY);

  draggingRoom.x = Math.max(
    0,
    Math.min(plotLength - draggingRoom.w, newX)
  );

  draggingRoom.y = Math.max(
    0,
    Math.min(plotBreadth - draggingRoom.h, newY)
  );

  $("roomX").value = draggingRoom.x;
  $("roomY").value = draggingRoom.y;

  drawPlan();
});

canvas.addEventListener("pointerup", () => {
  if (draggingRoom) snapshot();
  draggingRoom = null;
});

canvas.addEventListener("pointercancel", () => {
  draggingRoom = null;
});

function undo() {
  if (!undoStack.length) {
    say("Undo history empty hai.");
    return;
  }

  redoStack.push(JSON.stringify({
    plotLength,
    plotBreadth,
    rooms,
    selectedId,
    nextId
  }));

  restoreState(JSON.parse(undoStack.pop()));
  say("Undo complete.");
}

function redo() {
  if (!redoStack.length) {
    say("Redo history empty hai.");
    return;
  }

  undoStack.push(JSON.stringify({
    plotLength,
    plotBreadth,
    rooms,
    selectedId,
    nextId
  }));

  restoreState(JSON.parse(redoStack.pop()));
  say("Redo complete.");
}

function saveDesign() {
  try {
    localStorage.setItem("homeDesignerProject", JSON.stringify({
      plotLength,
      plotBreadth,
      rooms,
      nextId
    }));

    say("Design is phone browser storage mein saved.");
  } catch {
    say("Save nahi hua. Browser storage check karo.");
  }
}

function loadDesign() {
  try {
    const saved = localStorage.getItem("homeDesignerProject");

    if (!saved) {
      say("Koi saved design nahi mila.");
      return;
    }

    snapshot();

    const state = JSON.parse(saved);

    if (!Array.isArray(state.rooms)) {
      throw new Error("Invalid project");
    }

    plotLength = state.plotLength;
    plotBreadth = state.plotBreadth;
    rooms = state.rooms;
    nextId = state.nextId || 1;
    selectedId = null;

    $("plotLength").value = plotLength;
    $("plotBreadth").value = plotBreadth;

    drawPlan();
    say("Design loaded.");
  } catch {
    say("Saved design load nahi ho paya.");
  }
}

function exportImage() {
  const link = document.createElement("a");
  link.download = "my-house-plan.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

$("updatePlot").addEventListener("click", updatePlot);
$("addRoom").addEventListener("click", addRoom);
$("deleteRoom").addEventListener("click", deleteRoom);
$("rotateRoom").addEventListener("click", rotateRoom);
$("applyProperties").addEventListener("click", applyProperties);
$("undo").addEventListener("click", undo);
$("redo").addEventListener("click", redo);
$("saveDesign").addEventListener("click", saveDesign);
$("loadDesign").addEventListener("click", loadDesign);
$("exportImage").addEventListener("click", exportImage);

// ----------------------------
// THREE.JS 3D HOUSE PREVIEW
// ----------------------------

let scene3D = null;
let camera3D = null;
let renderer3D = null;
let houseGroup = null;
let angle3D = Math.PI / 4;
let height3D = 25;
let distance3D = 40;
let dragging3D = false;
let lastX3D = 0;
let lastY3D = 0;

function init3D() {
  if (typeof THREE === "undefined") {
    $("status3D").textContent =
      "Three.js load nahi hua. CodePen Settings mein external script add karo.";
    return false;
  }

  const container = $("house3D");

  if (!renderer3D) {
    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0x0b1120);

    camera3D = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    renderer3D = new THREE.WebGLRenderer({ antialias: true });
    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.replaceChildren(renderer3D.domElement);

    scene3D.add(new THREE.HemisphereLight(0xffffff, 0x475569, 2));

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(20, 40, 20);
    scene3D.add(light);

    scene3D.add(new THREE.GridHelper(100, 50));

    houseGroup = new THREE.Group();
    scene3D.add(houseGroup);

    function animate() {
      renderer3D.render(scene3D, camera3D);
      requestAnimationFrame(animate);
    }

    animate();
  }

  renderer3D.setSize(container.clientWidth, container.clientHeight);
  drawHouse3D();
  $("status3D").textContent =
    "3D preview ready. Finger se drag karke view ghumao.";

  return true;
}

function drawHouse3D() {
  if (!houseGroup) return;

  while (houseGroup.children.length) {
    const obj = houseGroup.children[0];
    houseGroup.remove(obj);

    obj.geometry?.dispose();

    if (obj.material) {
      const mats = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];

      mats.forEach(m => m.dispose());
    }
  }

  const s = 0.5;
  const wallH = 3;
  const W = plotLength * s;
  const D = plotBreadth * s;

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.15, D),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
  );

  ground.position.set(W / 2, 0, D / 2);
  houseGroup.add(ground);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.85
  });

  rooms.forEach(r => {
    const x = r.x * s;
    const z = r.y * s;
    const w = r.w * s;
    const d = r.h * s;

    const roomFloor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd })
    );

    roomFloor.position.set(x + w / 2, 0.12, z + d / 2);
    houseGroup.add(roomFloor);

    const walls = [
      { w, d: 0.12, x: x + w / 2, z },
      { w, d: 0.12, x: x + w / 2, z: z + d },
      { w: 0.12, d, x, z: z + d / 2 },
      { w: 0.12, d, x: x + w, z: z + d / 2 }
    ];

    walls.forEach(wall => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(wall.w, wallH, wall.d),
        wallMaterial
      );

      mesh.position.set(wall.x, wallH / 2 + 0.15, wall.z);
      houseGroup.add(mesh);
    });

    const label = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.min(w * 0.5, 0.5),
        0.08,
        Math.min(d * 0.5, 0.5)
      ),
      new THREE.MeshStandardMaterial({ color: 0x2563eb })
    );

    label.position.set(x + w / 2, 0.25, z + d / 2);
    houseGroup.add(label);
  });

  houseGroup.position.set(-W / 2, 0, -D / 2);
  updateCamera3D();
}

function updateCamera3D() {
  if (!camera3D) return;

  const target = new THREE.Vector3(0, 2, 0);

  camera3D.position.set(
    Math.cos(angle3D) * distance3D,
    height3D,
    Math.sin(angle3D) * distance3D
  );

  camera3D.lookAt(target);
}

$("show3D").addEventListener("click", init3D);

$("reset3D").addEventListener("click", () => {
  angle3D = Math.PI / 4;
  height3D = 25;
  distance3D = Math.max(plotLength, plotBreadth) * 0.9;
  updateCamera3D();
});

$("house3D").addEventListener("pointerdown", event => {
  if (!renderer3D) return;

  dragging3D = true;
  lastX3D = event.clientX;
  lastY3D = event.clientY;
  $("house3D").setPointerCapture(event.pointerId);
});

$("house3D").addEventListener("pointermove", event => {
  if (!dragging3D) return;

  const dx = event.clientX - lastX3D;
  const dy = event.clientY - lastY3D;

  angle3D -= dx * 0.01;
  height3D = Math.max(5, Math.min(60, height3D + dy * 0.15));

  lastX3D = event.clientX;
  lastY3D = event.clientY;

  updateCamera3D();
});

$("house3D").addEventListener("pointerup", () => {
  dragging3D = false;
});

$("house3D").addEventListener("pointercancel", () => {
  dragging3D = false;
});

window.addEventListener("resize", () => {
  if (!renderer3D) return;

  const container = $("house3D");
  camera3D.aspect = container.clientWidth / container.clientHeight;
  camera3D.updateProjectionMatrix();

  renderer3D.setSize(container.clientWidth, container.clientHeight);
});

drawPlan();
