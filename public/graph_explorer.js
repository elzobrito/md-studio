import * as THREE from "./vendor/three.module.min.js";

(() => {
  const d3 = globalThis.d3;
  const embedded = document.getElementById("embedded-graph");
  const tooltip = document.getElementById("tooltip");
  const canvas = document.getElementById("graph-canvas");
  const labelCanvas = document.getElementById("label-canvas");
  const $ = (id) => document.getElementById(id);

  let rawGraph, nodes = [], edges = [], simulation, selectedId = null;
  let width = 900, height = 700, labelOverride = false, paused = false;
  let colorByKind = new Map(), nodeById = new Map(), adjacent = new Map();
  let transform = { x: 0, y: 0, k: 1 };
  let dragging = false, dragMoved = false, lastPointer = null, hoverId = null;
  let renderer, scene, camera, nodeMesh, edgeMesh, circleGeometry, nodeMaterial, edgeMaterial;
  let dummy = new THREE.Object3D();
  let rafId = 0;
  let visibleNode = new Uint8Array(0);
  let visibleEdge = new Uint8Array(0);

  const SMOOTH = 0.22;
  const palette = ["#7dd3fc","#86efac","#fbbf77","#c4b5fd","#f9a8d4","#67e8f9","#fca5a5","#bef264","#a5b4fc","#fdba74","#5eead4","#e9d5ff","#fde68a","#93c5fd","#f0abfc","#a7f3d0"];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function colorFor(kind) { return colorByKind.get(kind) || "#9aa9bd"; }
  function nodeRadius(d) { return d.kind === "module" ? 10 : d.kind === "flow" ? 7.5 : d.kind === "feature" ? 6.5 : 4.5; }
  function nodeText(d) { return d.name || d.id; }
  function status(message, cls = "") { const el = $("status"); el.textContent = message; el.className = "status " + cls; }
  function hexColor(hex) { return new THREE.Color(hex); }

  function sizeView() {
    const box = canvas.parentElement.getBoundingClientRect();
    width = Math.max(box.width, 320);
    height = Math.max(box.height, 280);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (renderer) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
    }
    labelCanvas.width = Math.floor(width * dpr);
    labelCanvas.height = Math.floor(height * dpr);
    labelCanvas.style.width = `${width}px`;
    labelCanvas.style.height = `${height}px`;
    updateCamera();
    if (simulation) {
      clusterTargets();
      simulation.force("center", d3.forceCenter(width / 2, height / 2));
      simulation.force("x", d3.forceX((d) => d.tx).strength(0.11));
      simulation.force("y", d3.forceY((d) => d.ty).strength(0.11));
      if (!paused) simulation.alpha(0.12).restart();
    }
  }

  function updateCamera() {
    if (!camera) return;
    const t = transform;
    // Three.js Y sobe; o layout d3-force usa Y para baixo. Frustum com top > bottom evita backface culling.
    camera.left = -t.x / t.k;
    camera.right = (width - t.x) / t.k;
    camera.top = t.y / t.k;
    camera.bottom = -(height - t.y) / t.k;
    camera.updateProjectionMatrix();
  }

  function clusterTargets() {
    const groups = [...new Set(nodes.map((d) => d.module || `(${d.kind || "outros"})`))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const radius = Math.min(width, height) * 0.34, cx = width / 2, cy = height / 2;
    const target = new Map();
    groups.forEach((g, i) => {
      const a = (i / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
      target.set(g, { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    });
    nodes.forEach((d, i) => {
      const t = target.get(d.module || `(${d.kind || "outros"})`);
      const jitter = ((i % 13) - 6) * 2.8;
      d.tx = t.x + jitter;
      d.ty = t.y + (((i * 7) % 13) - 6) * 2.8;
      if (!Number.isFinite(d.x)) {
        d.x = d.tx + (Math.random() - 0.5) * 42;
        d.y = d.ty + (Math.random() - 0.5) * 42;
      }
      if (!Number.isFinite(d.dispX)) { d.dispX = d.x; d.dispY = d.y; }
    });
  }

  function fillSelect(id, values, first) {
    const select = $(id), prior = select.value;
    select.replaceChildren(new Option(first, "*"));
    values.forEach((v) => select.add(new Option(v, v)));
    if (values.includes(prior)) select.value = prior;
  }

  function disposeMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }

  function ensureRenderer() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setClearColor(0x0b1020, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1000, 1000);
    camera.position.set(0, 0, 10);
    circleGeometry = new THREE.CircleGeometry(1, 24);
    nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    nodeMaterial.transparent = false;
    edgeMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 });
  }

  function rebuildMeshes() {
    disposeMesh(nodeMesh);
    disposeMesh(edgeMesh);
    const n = nodes.length;
    const e = edges.length;
    nodeMesh = new THREE.InstancedMesh(circleGeometry, nodeMaterial, Math.max(n, 1));
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    nodeMesh.frustumCulled = false;
    if (n) {
      nodeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      nodeMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    scene.add(nodeMesh);

    const lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(Math.max(e, 1) * 6);
    const colors = new Float32Array(Math.max(e, 1) * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    if (e) lineGeo.setDrawRange(0, e * 2);
    else lineGeo.setDrawRange(0, 0);
    edgeMesh = new THREE.LineSegments(lineGeo, edgeMaterial);
    edgeMesh.frustumCulled = false;
    scene.add(edgeMesh);
    visibleNode = new Uint8Array(n);
    visibleEdge = new Uint8Array(e);
    visibleNode.fill(1);
    visibleEdge.fill(1);
  }

  function initialize(data, source) {
    if (!data || data.artifact !== "graph" || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      throw new Error("O arquivo não segue o formato graph.json do MD Studio.");
    }
    const validIds = new Set(data.nodes.filter((n) => n && typeof n.id === "string").map((n) => n.id));
    rawGraph = data;
    nodes = data.nodes.filter((n) => n && typeof n.id === "string").map((n) => ({ ...n, dispX: 0, dispY: 0 }));
    edges = data.edges.filter((e) => e && validIds.has(e.from) && validIds.has(e.to)).map((e) => ({ ...e, source: e.from, target: e.to }));
    nodeById = new Map(nodes.map((n) => [n.id, n]));
    adjacent = new Map(nodes.map((n) => [n.id, new Set()]));
    edges.forEach((e) => {
      adjacent.get(e.from)?.add(e.to);
      adjacent.get(e.to)?.add(e.from);
    });
    const kinds = [...new Set(nodes.map((n) => n.kind || "outros"))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const modules = [...new Set(nodes.map((n) => n.module).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const relations = [...new Set(edges.map((e) => e.relation).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    colorByKind = new Map(kinds.map((k, i) => [k, palette[i % palette.length]]));
    fillSelect("kind-filter", kinds, "Todas as categorias");
    fillSelect("module-filter", modules, "Todos os módulos");
    fillSelect("relation-filter", relations, "Todas as relações");
    $("legend").innerHTML = kinds.map((k) => `<div class="legend-row"><i class="swatch" style="background:${colorFor(k)}"></i><span>${esc(k)}</span><span class="hint">${nodes.filter((n) => (n.kind || "outros") === k).length}</span></div>`).join("");
    $("node-count").textContent = nodes.length.toLocaleString("pt-BR");
    $("edge-count").textContent = edges.length.toLocaleString("pt-BR");
    $("module-count").textContent = String(data.stats?.nodes_by_kind?.module ?? nodes.filter((n) => n.kind === "module").length);
    $("flow-count").textContent = String(data.stats?.nodes_by_kind?.flow ?? nodes.filter((n) => n.kind === "flow").length);
    const sourceCommit = data.source_commit ? ` · origem ${data.source_commit.slice(0, 8)}` : "";
    $("meta").textContent = `${source}${sourceCommit} · ${data.generated_at ? new Date(data.generated_at).toLocaleString("pt-BR") : "data sem registro"}`;
    selectedId = null;
    $("details").className = "detail-empty";
    $("details").textContent = "Selecione um nó para inspecionar sua origem e relações.";
    ensureRenderer();
    sizeView();
    clusterTargets();
    rebuildMeshes();
    simulation?.stop();
    simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d) => d.id).distance((d) => d.relation === "contains" ? 30 : 54).strength((d) => d.relation === "contains" ? 0.26 : 0.1))
      .force("charge", d3.forceManyBody().strength(-24).distanceMax(240))
      .force("collide", d3.forceCollide((d) => nodeRadius(d) + 2).iterations(1))
      .force("x", d3.forceX((d) => d.tx).strength(0.11))
      .force("y", d3.forceY((d) => d.ty).strength(0.11))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.025)
      .on("tick", () => {});
    applyFilters();
    fitGraph(false);
    status(`${source} · ${nodes.length.toLocaleString("pt-BR")} nós carregados`);
  }

  function applyFilters() {
    if (!nodes.length) return;
    const kind = $("kind-filter").value, module = $("module-filter").value, relation = $("relation-filter").value;
    const term = $("search").value.trim().toLocaleLowerCase("pt-BR");
    const base = nodes.filter((n) => (kind === "*" || (n.kind || "outros") === kind) && (module === "*" || n.module === module));
    const matched = term
      ? base.filter((n) => [n.id, n.name, n.module, n.trace_task, n.anchor?.path, n.anchor?.symbol].some((v) => String(v || "").toLocaleLowerCase("pt-BR").includes(term)))
      : base;
    const visibleIds = new Set(matched.map((n) => n.id));
    if (term) matched.forEach((n) => adjacent.get(n.id)?.forEach((id) => { if (base.some((x) => x.id === id)) visibleIds.add(id); }));
    nodes.forEach((n, i) => { visibleNode[i] = visibleIds.has(n.id) ? 1 : 0; });
    let ve = 0;
    edges.forEach((e, i) => {
      const on = (relation === "*" || e.relation === relation) && visibleIds.has(e.from) && visibleIds.has(e.to);
      visibleEdge[i] = on ? 1 : 0;
      if (on) ve += 1;
    });
    $("visible-count").textContent = `Exibindo ${visibleIds.size.toLocaleString("pt-BR")} de ${nodes.length.toLocaleString("pt-BR")} nós · ${ve.toLocaleString("pt-BR")} relações`;
  }

  function screenFromWorld(x, y) {
    return { sx: x * transform.k + transform.x, sy: y * transform.k + transform.y };
  }

  function worldFromScreen(sx, sy) {
    return { x: (sx - transform.x) / transform.k, y: (sy - transform.y) / transform.k };
  }

  function pointerOnCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return { sx: event.clientX - rect.left, sy: event.clientY - rect.top };
  }

  function pickNode(sx, sy) {
    let best = null, bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!visibleNode[i]) continue;
      const n = nodes[i];
      const p = screenFromWorld(n.dispX, n.dispY);
      const hit = nodeRadius(n) * transform.k + 6;
      const d = Math.hypot(sx - p.sx, sy - p.sy);
      if (d <= hit && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  function showTip(event, d) {
    tooltip.style.display = "block";
    tooltip.innerHTML = `<strong>${esc(d.name || d.id)}</strong><br>${esc(d.kind || "outros")} · ${esc(d.module || "sem módulo")}<br><span style="color:#8ea0ba">${esc(d.id)}</span>`;
    moveTip(event);
  }
  function moveTip(event) {
    const rect = canvas.parentElement.getBoundingClientRect();
    tooltip.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - 350)}px`;
    tooltip.style.top = `${Math.min(event.clientY - rect.top + 12, rect.height - 80)}px`;
  }
  function hideTip() { tooltip.style.display = "none"; }

  function selectNode(id) {
    selectedId = id;
    applyFilters();
    const n = nodeById.get(id);
    if (!n) return;
    const incoming = edges.filter((e) => e.to === id), outgoing = edges.filter((e) => e.from === id);
    const anchor = n.anchor || {};
    const edgeList = (items, label) => items.length ? `<div class="section"><h2>${label} · ${items.length}</h2><ul class="edge-list">${items.slice(0, 40).map((e) => {
      const other = nodeById.get(e.from === id ? e.to : e.from);
      return `<li><span class="relation">${esc(e.relation || "relação")}</span><span class="edge-target">${esc(other?.name || other?.id || e.from || e.to)}</span><small>${esc(e.method || "")} ${e.trace_task ? `· ${esc(e.trace_task)}` : ""}</small></li>`;
    }).join("")}</ul>${items.length > 40 ? `<p class="hint">Mais ${items.length - 40} relações não exibidas.</p>` : ""}</div>` : "";
    $("details").className = "";
    $("details").innerHTML = `<div class="detail-title">${esc(n.name || n.id)}</div><div class="detail-id">${esc(n.id)}</div><span class="badge">${esc(n.kind || "outros")}</span>${n.type ? `<span class="badge">${esc(n.type)}</span>` : ""}${n.module ? `<span class="badge">${esc(n.module)}</span>` : ""}<dl class="detail-grid"><dt>Tarefa</dt><dd>${esc(n.trace_task || "—")}</dd><dt>Arquivo</dt><dd>${esc(anchor.path || "—")}</dd><dt>Símbolo</dt><dd>${esc(anchor.symbol || "—")}</dd><dt>Linhas</dt><dd>${esc(anchor.lines?.join("–") || "—")}</dd><dt>Alias</dt><dd>${esc(anchor.alias || n.alias || "—")}</dd></dl>${edgeList(incoming, "Rastreado por")}${edgeList(outgoing, "Rastreia")}`;
  }

  function clearSelection() {
    selectedId = null;
    applyFilters();
    $("details").className = "detail-empty";
    $("details").textContent = "Selecione um nó para inspecionar sua origem e relações.";
  }

  function fitGraph(animate = true) {
    if (!nodes.length) return;
    const pad = 70;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    nodes.forEach((d) => {
      x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x);
      y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y);
    });
    const w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1);
    const k = Math.min(width / (w + pad * 2), height / (h + pad * 2), 1.6);
    const nx = width / 2 - k * (x0 + x1) / 2;
    const ny = height / 2 - k * (y0 + y1) / 2;
    if (!animate) { transform = { x: nx, y: ny, k }; updateCamera(); return; }
    const from = { ...transform };
    const t0 = performance.now();
    const dur = 450;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - u, 3);
      transform.x = from.x + (nx - from.x) * e;
      transform.y = from.y + (ny - from.y) * e;
      transform.k = from.k + (k - from.k) * e;
      updateCamera();
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function zoomAt(sx, sy, factor) {
    const w = worldFromScreen(sx, sy);
    transform.k = Math.min(5, Math.max(0.12, transform.k * factor));
    transform.x = sx - w.x * transform.k;
    transform.y = sy - w.y * transform.k;
    updateCamera();
  }

  function drawLabels() {
    const ctx = labelCanvas.getContext("2d");
    const dpr = labelCanvas.width / Math.max(width, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const show = labelOverride || transform.k > 1.35;
    if (!show) return;
    ctx.font = "10px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0b1020";
    ctx.fillStyle = "#b8c8dd";
    for (let i = 0; i < nodes.length; i++) {
      if (!visibleNode[i]) continue;
      const n = nodes[i];
      const p = screenFromWorld(n.dispX, n.dispY);
      if (p.sx < -40 || p.sy < -20 || p.sx > width + 40 || p.sy > height + 20) continue;
      const label = nodeText(n);
      const x = p.sx + 8;
      const y = p.sy;
      ctx.strokeText(label, x, y);
      ctx.fillStyle = n.id === selectedId ? "#fff" : "#b8c8dd";
      ctx.fillText(label, x, y);
    }
  }

  function syncGpu() {
    if (!nodeMesh || !edgeMesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.dispX += (n.x - n.dispX) * SMOOTH;
      n.dispY += (n.y - n.dispY) * SMOOTH;
      const vis = visibleNode[i];
      const r = vis ? (n.id === selectedId ? nodeRadius(n) * 1.35 : nodeRadius(n)) : 0.0001;
      dummy.position.set(n.dispX, -n.dispY, n.id === selectedId ? 1 : 0);
      dummy.scale.set(r, r, 1);
      dummy.updateMatrix();
      nodeMesh.setMatrixAt(i, dummy.matrix);
      color.set(colorFor(n.kind || "outros"));
      if (n.id === selectedId) color.lerp(new THREE.Color("#ffffff"), 0.35);
      else if (!vis) color.set("#0b1020");
      else if (selectedId && n.id !== selectedId && !adjacent.get(selectedId)?.has(n.id)) color.multiplyScalar(0.45);
      nodeMesh.setColorAt(i, color);
    }
    nodeMesh.instanceMatrix.needsUpdate = true;
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    nodeMesh.count = nodes.length;

    const pos = edgeMesh.geometry.getAttribute("position");
    const col = edgeMesh.geometry.getAttribute("color");
    const observed = hexColor("#74d7b2");
    const inferred = hexColor("#f1b971");
    const derived = hexColor("#667b99");
    let drawn = 0;
    for (let i = 0; i < edges.length; i++) {
      if (!visibleEdge[i]) continue;
      const e = edges[i];
      const a = e.source && e.source.dispX !== undefined ? e.source : nodeById.get(e.from);
      const b = e.target && e.target.dispX !== undefined ? e.target : nodeById.get(e.to);
      if (!a || !b) continue;
      const p = drawn * 6;
      pos.array[p] = a.dispX; pos.array[p + 1] = -a.dispY; pos.array[p + 2] = -1;
      pos.array[p + 3] = b.dispX; pos.array[p + 4] = -b.dispY; pos.array[p + 5] = -1;
      const c = e.method === "observed" ? observed : e.method === "inferred" ? inferred : derived;
      col.array[p] = c.r; col.array[p + 1] = c.g; col.array[p + 2] = c.b;
      col.array[p + 3] = c.r; col.array[p + 4] = c.g; col.array[p + 5] = c.b;
      drawn += 1;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    edgeMesh.geometry.setDrawRange(0, drawn * 2);
    renderer.render(scene, camera);
    drawLabels();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    syncGpu();
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const p = pointerOnCanvas(event);
    dragging = true;
    dragMoved = false;
    lastPointer = p;
  });
  canvas.addEventListener("pointermove", (event) => {
    const p = pointerOnCanvas(event);
    if (dragging && lastPointer) {
      const dx = p.sx - lastPointer.sx, dy = p.sy - lastPointer.sy;
      if (Math.hypot(dx, dy) > 3) dragMoved = true;
      transform.x += dx;
      transform.y += dy;
      lastPointer = p;
      updateCamera();
      hideTip();
      return;
    }
    const hit = pickNode(p.sx, p.sy);
    canvas.style.cursor = hit ? "pointer" : "grab";
    if (hit) {
      if (hoverId !== hit.id) { hoverId = hit.id; showTip(event, hit); }
      else moveTip(event);
    } else {
      hoverId = null;
      hideTip();
    }
  });
  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    lastPointer = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (!dragMoved) {
      const p = pointerOnCanvas(event);
      const hit = pickNode(p.sx, p.sy);
      if (hit) selectNode(hit.id);
      else clearSelection();
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", () => { hoverId = null; hideTip(); });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const p = pointerOnCanvas(event);
    zoomAt(p.sx, p.sy, event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  $("fit").addEventListener("click", () => fitGraph(true));
  $("pause").addEventListener("click", () => {
    paused = !paused;
    if (paused) simulation?.stop();
    else simulation?.alpha(0.25).restart();
    $("pause").textContent = paused ? "Retomar" : "Pausar";
  });
  $("labels").addEventListener("change", (e) => { labelOverride = e.target.checked; });
  ["search", "kind-filter", "module-filter", "relation-filter"].forEach((id) => {
    $(id).addEventListener(id === "search" ? "input" : "change", applyFilters);
  });
  $("load-file").addEventListener("click", () => $("file-input").click());
  $("file-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { initialize(JSON.parse(await file.text()), `Arquivo ${file.name}`); }
    catch (err) { status(err.message, "error"); }
    finally { e.target.value = ""; }
  });
  window.addEventListener("resize", sizeView);

  ensureRenderer();
  sizeView();
  loop();

  try { initialize(JSON.parse(embedded.textContent), "Snapshot local"); }
  catch (err) { status(err.message, "error"); return; }
  if (location.protocol === "http:" || location.protocol === "https:") {
    const liveUrl = new URL("../.esaa/traceability/graph.json", location.href);
    fetch(liveUrl, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => initialize(data, "graph.json ao vivo"))
      .catch(() => status("Snapshot real incorporado; use “Abrir graph.json” para atualizar.", "warn"));
  } else status("Snapshot real incorporado; use “Abrir graph.json” para atualizar.", "warn");
})();
