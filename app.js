/* Papelería Yebra — caja, inventario, ventas y estadísticas.
   Todo cambio (venta, entrada de mercancía, producto editado…) se guarda como un "movimiento".
   El inventario y las ventas se calculan juntando el inventario inicial (seed.js) con los movimientos.
   Si está conectada a Google Sheets, los movimientos se comparten entre celular y computadora. */
"use strict";

/* ================= utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $("#view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const money = n => MXN.format(r2(n));
const int = n => new Intl.NumberFormat("es-MX").format(Math.round(n || 0));
const parseMoney = s => { const v = parseFloat(String(s ?? "").replace(/[^\d.,-]/g, "").replace(",", ".")); return isFinite(v) ? v : NaN; };
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const hora = d => new Date(d).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fechaLarga = d => { d = new Date(d); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function toast(msg, ms = 2400) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
}

/* ================= guardado en el dispositivo (IndexedDB) ================= */
const store = (() => {
  let dbp;
  const open = () => dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open("papeleria-yebra", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  async function get(k) {
    try {
      const d = await open();
      return await new Promise((res, rej) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    } catch (e) { try { const v = localStorage.getItem("yebra:" + k); return v ? JSON.parse(v) : undefined; } catch (_) { return undefined; } }
  }
  async function set(k, v) {
    try {
      const d = await open();
      await new Promise((res, rej) => { const tx = d.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    } catch (e) { try { localStorage.setItem("yebra:" + k, JSON.stringify(v)); } catch (_) { toast("⚠️ No se pudo guardar en este dispositivo"); } }
  }
  return { get, set };
})();

/* ================= datos ================= */
const SERVICIOS_INICIALES = [
  { id: "s1", g: "Impresiones y copias", e: "📠", n: "Copia blanco y negro", tipo: "pieza", p: 1, k: 0 },
  { id: "s2", g: "Impresiones y copias", e: "🌈", n: "Copia a color", tipo: "pieza", p: 5, k: 0 },
  { id: "s3", g: "Impresiones y copias", e: "🖨️", n: "Impresión blanco y negro", tipo: "pieza", p: 3, k: 0 },
  { id: "s4", g: "Impresiones y copias", e: "🎨", n: "Impresión a color", tipo: "pieza", p: 8, k: 0 },
  { id: "s5", g: "Impresiones y copias", e: "📷", n: "Escaneo", tipo: "pieza", p: 5, k: 0 },
  { id: "s6", g: "Impresiones y copias", e: "🪪", n: "Enmicado", tipo: "pieza", p: 15, k: 0 },
  { id: "s7", g: "Impresiones y copias", e: "📚", n: "Engargolado", tipo: "pieza", p: 35, k: 0 },
  { id: "s10", g: "Trámites", e: "🆔", n: "CURP", tipo: "variable", p: 10, k: 0 },
  { id: "s11", g: "Trámites", e: "👶", n: "Acta de nacimiento", tipo: "variable", p: 0, k: 0 },
  { id: "s12", g: "Trámites", e: "🧾", n: "Constancia de situación fiscal (RFC)", tipo: "variable", p: 0, k: 0 },
  { id: "s13", g: "Trámites", e: "📋", n: "Otro trámite", tipo: "variable", p: 0, k: 0 },
  { id: "s20", g: "Pagos y recargas", e: "💡", n: "Pago de luz", tipo: "pago", p: 0, k: 0, cargo: 10 },
  { id: "s21", g: "Pagos y recargas", e: "🚰", n: "Pago de agua", tipo: "pago", p: 0, k: 0, cargo: 10 },
  { id: "s22", g: "Pagos y recargas", e: "📱", n: "Recarga de celular", tipo: "pago", p: 0, k: 0, cargo: 0, rapidos: [20, 30, 50, 100, 150, 200] },
  { id: "s23", g: "Pagos y recargas", e: "🧾", n: "Otro pago de servicio", tipo: "pago", p: 0, k: 0, cargo: 10 },
  { id: "s30", g: "Trabajos escolares", e: "🏠", n: "Maqueta", tipo: "variable", p: 0, k: 0 },
  { id: "s31", g: "Trabajos escolares", e: "✂️", n: "Manualidad", tipo: "variable", p: 0, k: 0 },
  { id: "s32", g: "Trabajos escolares", e: "📝", n: "Trabajo escolar / tarea", tipo: "variable", p: 0, k: 0 },
  { id: "s33", g: "Trabajos escolares", e: "⭐", n: "Otro servicio", tipo: "variable", p: 0, k: 0 }
];
const AJUSTES_INICIALES = {
  vendedores: [],
  servicios: SERVICIOS_INICIALES,
  com: { min: 50, tipo: "fijo", val: 5 },
  stockMin: 2
};

const S = {
  serverOps: [],      // movimientos ya guardados en Google Sheets
  pending: [],        // movimientos hechos aquí que faltan por subir (o todos, si no hay Sheets)
  local: { url: "", clave: "", device: "", tips: {}, welcomed: false, cart: [], lastSeller: "" },
  sync: { state: "off", msg: "" }
};
let P = new Map();     // productos (id -> producto)
let SALES = [];        // ventas (más reciente al final)
let SALE = new Map();  // id -> venta
let CFG = structuredClone(AJUSTES_INICIALES);

function allOps() { return S.serverOps.concat(S.pending); }

function rebuild() {
  P = new Map();
  for (const s of window.SEED_PRODUCTS || []) P.set(s.id, { id: s.id, n: s.n, c: s.c, u: s.u, s: s.s, p: s.p, k: s.k, o: s.o || "", min: null, off: false });
  SALES = []; SALE = new Map();
  CFG = structuredClone(AJUSTES_INICIALES);
  for (const op of allOps()) {
    try { applyOp(op); } catch (e) { console.warn("Movimiento con error", op, e); }
  }
  for (const p of P.values()) p.key = norm(`${p.n} ${p.c}`);
}

function applyOp(op) {
  switch (op.t) {
    case "venta": {
      if (SALE.has(op.id)) return;
      const sale = { ...op, cx: false };
      SALES.push(sale); SALE.set(op.id, sale);
      for (const it of op.items) if (it.pid && P.has(it.pid)) P.get(it.pid).s -= it.q;
      break;
    }
    case "cancelar": {
      const sale = SALE.get(op.venta);
      if (!sale || sale.cx) return;
      sale.cx = true; sale.cxv = op.v; sale.cxf = op.f; sale.cxm = op.motivo;
      for (const it of sale.items) if (it.pid && P.has(it.pid)) P.get(it.pid).s += it.q;
      break;
    }
    case "prod": {
      if (!P.has(op.pid)) P.set(op.pid, { id: op.pid, n: "", c: "Papelería", u: "PZA", s: 0, p: 0, k: 0, o: "", min: null, off: false });
      Object.assign(P.get(op.pid), op.x);
      break;
    }
    case "entrada": {
      const p = P.get(op.pid); if (!p) return;
      p.s += op.q;
      if (op.k > 0) p.k = op.k;
      break;
    }
    case "ajuste": {
      const p = P.get(op.pid); if (p) p.s = op.s;
      break;
    }
    case "ajustes": Object.assign(CFG, structuredClone(op.data)); break;
  }
}

async function addOp(op) {
  op.id ||= uid(op.t[0]);
  op.f ||= new Date().toISOString();
  op.d = S.local.device;
  S.pending.push(op);
  applyOp(op);
  if (op.t === "prod") { const p = P.get(op.pid); p.key = norm(`${p.n} ${p.c}`); }
  await store.set("pending", S.pending);
  syncSoon(400);
  return op;
}
const saveLocal = () => store.set("local", S.local);
function setCfg(data) { return addOp({ t: "ajustes", data }); }

function vendedores() {
  const set = new Set(CFG.vendedores);
  for (const s of SALES.slice(-300)) if (s.v) set.add(s.v);
  return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
}
function categorias() { return [...new Set([...P.values()].map(p => p.c))].sort((a, b) => a.localeCompare(b, "es")); }
function stockMin(p) { return p.min ?? CFG.stockMin; }

/* ================= sincronización con Google Sheets ================= */
let syncing = false, syncTimer = null;
function syncSoon(ms = 1000) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }

async function sync(manual) {
  if (!S.local.url) { S.sync.state = "off"; paintSync(); return; }
  if (syncing) return;
  if (!navigator.onLine) { S.sync.state = "warn"; S.sync.msg = "Sin internet"; paintSync(); return; }
  syncing = true; S.sync.state = "busy"; paintSync();
  try {
    let desde = S.serverOps.length;
    let j = await call({ desde, ops: S.pending });
    if (j.total < desde || desde + j.ops.length !== j.total) { // la hoja cambió: bajar todo de nuevo
      S.serverOps = [];
      j = await call({ desde: 0, ops: [] });
    }
    S.serverOps = S.serverOps.concat(j.ops);
    const ids = new Set(S.serverOps.map(o => o.id));
    S.pending = S.pending.filter(o => !ids.has(o.id));
    await store.set("serverOps", S.serverOps);
    await store.set("pending", S.pending);
    S.sync.state = S.pending.length ? "warn" : "ok";
    S.sync.msg = S.pending.length ? `${S.pending.length} sin subir` : "";
    S.sync.last = new Date();
    if (j.ops.length) { rebuild(); refresh(true); }
    if (manual) toast("✅ Todo está al día");
  } catch (e) {
    S.sync.state = "warn";
    S.sync.msg = String(e.message || e).includes("clave") ? "Clave incorrecta" : "Sin conexión";
    if (manual) toast("⚠️ No se pudo conectar: " + S.sync.msg);
  } finally { syncing = false; paintSync(); }
}

async function call(body, url = S.local.url, clave = S.local.clave) {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(url, { method: "POST", body: JSON.stringify({ clave, dispositivo: S.local.device, ...body }), headers: { "Content-Type": "text/plain;charset=utf-8" }, signal: ctrl.signal, redirect: "follow" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "error");
    return j;
  } finally { clearTimeout(to); }
}

function paintSync() {
  const b = $("#syncPill");
  const pend = S.pending.length;
  if (!S.local.url) { b.className = "sync off"; b.textContent = "📱 Solo en este equipo"; b.title = "Toca para conectar el celular y la computadora"; return; }
  if (S.sync.state === "busy") { b.className = "sync"; b.textContent = "⟳ Guardando…"; return; }
  if (S.sync.state === "ok") { b.className = "sync ok"; b.textContent = "✓ Guardado en la nube"; b.title = "Celular y computadora al día"; return; }
  b.className = "sync warn"; b.textContent = `⚠️ ${S.sync.msg || "Sin conexión"}${pend && !String(S.sync.msg).includes("sin subir") ? ` · ${pend} sin subir` : ""}`;
  b.title = "Las ventas se guardan aquí y se suben solas cuando regrese el internet";
}

/* ================= navegación ================= */
const SECCIONES = [
  { id: "vender", ic: "🛒", t: "Vender", sub: "Caja: registra una venta" },
  { id: "inventario", ic: "📦", t: "Inventario", sub: "Productos y existencias" },
  { id: "ventas", ic: "🧾", t: "Ventas", sub: "Historial y corte de caja" },
  { id: "estadisticas", ic: "📊", t: "Estadísticas", sub: "Ganancias y lo más vendido" },
  { id: "ajustes", ic: "⚙️", t: "Ajustes", sub: "Vendedores, servicios y respaldo" }
];
let current = "vender";
function navHTML(side) {
  return (side ? `<div class="logo"><img src="icons/icon-192.png" width="38" height="38" alt=""><b>Papelería<br>Yebra</b></div>` : "") +
    SECCIONES.map(s => `<button type="button" data-go="${s.id}" class="${s.id === current ? "on" : ""}"><span class="ic">${s.ic}</span><span>${s.t}</span></button>`).join("");
}
function go(id, keepScroll) {
  current = id;
  $("#side").innerHTML = navHTML(true);
  $("#bottom").innerHTML = navHTML(false);
  $("#topSub").textContent = SECCIONES.find(s => s.id === id).sub;
  VIEWS[id]();
  if (!keepScroll) window.scrollTo(0, 0);
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}
function refresh(fromSync) {
  if (!$("#modal").hidden && fromSync) { if (current === "vender") paintTicket(); return; }
  if (current === "vender") { paintResults(); paintTicket(); return; }
  if (fromSync && document.activeElement && document.activeElement.matches("input,select,textarea")) return;
  VIEWS[current]();
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) { go(g.dataset.go); return; }
  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a, e); }
});

/* ================= ventanas (modales) ================= */
let modalClose = null;
function openModal(html, { wide = false, onClose = null } = {}) {
  const m = $("#modal");
  m.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false; modalClose = onClose;
  document.body.style.overflow = "hidden";
  const f = m.querySelector("[autofocus]");
  if (f && matchMedia("(pointer:fine)").matches) setTimeout(() => f.focus(), 30);
  return m.firstElementChild;
}
function closeModal() {
  const m = $("#modal"); m.hidden = true; m.innerHTML = ""; document.body.style.overflow = "";
  const cb = modalClose; modalClose = null; if (cb) cb();
}
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
const mh = t => `<div class="mh"><h2>${t}</h2><button class="icon-btn" type="button" data-act="cerrar" aria-label="Cerrar">✕</button></div>`;

function tip(id, html) {
  if (S.local.tips[id]) return "";
  return `<div class="tip"><span>💡</span><div>${html}</div><button class="x" data-act="tipOff" data-id="${id}" aria-label="Ocultar">✕</button></div>`;
}

/* ================= VENDER ================= */
let cart = [];
let query = "";
const saveCart = () => { S.local.cart = cart; saveLocal(); };
const cartTotal = () => r2(cart.reduce((a, l) => a + l.q * l.p, 0));
const cartCount = () => cart.reduce((a, l) => a + (l.fixed ? 1 : l.q), 0);

function vVender() {
  view.innerHTML = `
  ${tip("vender", "<b>Así se vende:</b> 1) Busca el producto o toca un servicio. 2) Revisa la cuenta. 3) Toca <b>Cobrar</b>, escribe quién vendió y cómo pagó. La hora se pone sola.")}
  <div class="pos">
    <section>
      <div class="search"><span class="ic">🔍</span><input id="q" class="input" type="search" placeholder="Busca un producto o servicio: cuaderno, copia, foamy…" autocomplete="off" enterkeyhint="search" value="${esc(query)}"></div>
      <div id="results" class="results"></div>
      <div id="svcs" class="svc-groups"></div>
      <div style="margin-top:14px"><button class="btn" type="button" data-act="libre">➕ Vender algo que no está en la lista</button></div>
    </section>
    <aside class="ticket card desk" id="ticket"></aside>
  </div>
  <button class="cart-bar" id="cartBar" type="button" data-act="verTicket" hidden></button>`;
  const q = $("#q");
  q.addEventListener("input", () => { query = q.value; paintResults(); });
  q.addEventListener("keydown", e => {
    if (e.key === "Enter") { const first = $("#results [data-act]"); if (first) first.click(); }
  });
  paintServices(); paintResults(); paintTicket();
  if (matchMedia("(pointer:fine)").matches) q.focus();
}

function searchProducts(q, limit = 40) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const p of P.values()) {
    if (p.off) continue;
    if (words.every(w => p.key.includes(w))) out.push(p);
  }
  const w0 = words[0];
  out.sort((a, b) => (b.key.startsWith(w0) - a.key.startsWith(w0)) || ((b.s > 0) - (a.s > 0)) || a.n.localeCompare(b.n, "es"));
  return out.slice(0, limit);
}

function paintResults() {
  const box = $("#results"); if (!box) return;
  if (!query.trim()) {
    const top = topSold(14);
    box.innerHTML = top.length ? `<small style="font-weight:600">Lo que más se vende (toca para agregar):</small><div class="chips">${top.map(p => `<button class="chip" type="button" data-act="addProd" data-id="${p.id}">${esc(p.n)}</button>`).join("")}</div>` : "";
    $("#svcs").hidden = false;
    return;
  }
  const words = norm(query).split(/\s+/).filter(Boolean);
  const svcs = CFG.servicios.filter(s => words.every(w => norm(s.n + " " + s.g).includes(w)));
  const prods = searchProducts(query);
  $("#svcs").hidden = false;
  if (!prods.length && !svcs.length) {
    box.innerHTML = `<div class="empty"><div class="big">🤔</div>No encontré “${esc(query)}”.<br><button class="btn" style="margin-top:10px" type="button" data-act="libre">➕ Venderlo de todos modos</button></div>`;
    return;
  }
  box.innerHTML = svcs.map(s => `<button class="res" type="button" data-act="addSvc" data-id="${s.id}"><span style="font-size:1.4rem">${s.e}</span><span class="grow"><span class="nm">${esc(s.n)}</span><br><span class="meta">Servicio · ${esc(s.g)}</span></span><span class="pr">${s.tipo === "pieza" && s.p ? money(s.p) : ""}</span><span class="add">+</span></button>`).join("") +
    prods.map(p => {
      const st = p.s <= 0 ? `<span class="badge bad">Agotado</span>` : p.s <= stockMin(p) ? `<span class="badge warn">Quedan ${int(p.s)}</span>` : `<span class="badge">Hay ${int(p.s)}</span>`;
      return `<button class="res" type="button" data-act="addProd" data-id="${p.id}"><span class="grow"><span class="nm">${esc(p.n)}</span><br><span class="meta">${esc(p.c)} · ${st}</span></span><span class="pr">${p.p ? money(p.p) : `<span class="badge warn">Sin precio</span>`}</span><span class="add">+</span></button>`;
    }).join("");
}

function paintServices() {
  const groups = {};
  for (const s of CFG.servicios) (groups[s.g] ||= []).push(s);
  $("#svcs").innerHTML = Object.entries(groups).map(([g, list]) => `
    <div class="svc-group"><h3>${esc(g)}</h3><div class="svc-grid">${list.map(s => `
      <button class="svc" type="button" data-act="addSvc" data-id="${s.id}"><span class="e">${s.e || "⭐"}</span><span class="t">${esc(s.n)}</span><span class="p">${s.tipo === "pieza" ? (s.p ? money(s.p) + " c/u" : "") : s.tipo === "pago" ? "Monto + comisión" : "Precio variable"}</span></button>`).join("")}
    </div></div>`).join("");
}

function ticketHTML() {
  if (!cart.length) return `<h2>Venta actual</h2><div class="empty"><div class="big">🛒</div>Todavía no hay nada.<br>Busca un producto o toca un servicio.</div>`;
  return `<h2>Venta actual <button class="btn sm bad" type="button" data-act="vaciar">Vaciar</button></h2>
  <div class="lines">${cart.map((l, i) => `
    <div class="line">
      <div class="d">${esc(l.n)}</div><div class="sub num">${money(l.q * l.p)}</div>
      <div class="ctl">
        ${l.fixed ? `<span class="muted" style="font-size:.85rem">1 servicio</span>` : `<span class="qty"><button type="button" data-act="qty" data-i="${i}" data-d="-1" aria-label="Menos">−</button><input inputmode="numeric" data-qi="${i}" value="${l.q}" aria-label="Cantidad"><button type="button" data-act="qty" data-i="${i}" data-d="1" aria-label="Más">+</button></span>`}
        ${l.fixed ? "" : `<button class="price-edit" type="button" data-act="editPrice" data-i="${i}" title="Cambiar precio">${money(l.p)} c/u ✎</button>`}
        <button class="rm" type="button" data-act="quitar" data-i="${i}">Quitar</button>
      </div>
    </div>`).join("")}</div>
  <div class="total"><span>Total (${int(cartCount())})</span><b class="num">${money(cartTotal())}</b></div>
  <button class="btn ok big" type="button" data-act="cobrar">💰 Cobrar ${money(cartTotal())}</button>`;
}

function bindTicket(root) {
  $$("[data-qi]", root).forEach(inp => inp.addEventListener("change", () => {
    const l = cart[+inp.dataset.qi]; const v = Math.max(1, Math.round(parseMoney(inp.value) || 1));
    l.q = v; saveCart(); paintTicket();
  }));
}
function paintTicket() {
  const t = $("#ticket");
  if (t) { t.innerHTML = ticketHTML(); bindTicket(t); }
  const m = $("#modal .ticket-modal");
  if (m) { m.innerHTML = ticketHTML(); bindTicket(m); if (!cart.length) closeModal(); }
  const bar = $("#cartBar");
  if (bar) {
    bar.hidden = !cart.length;
    bar.innerHTML = `<span class="t"><small style="color:#c9d1e4">${int(cartCount())} en la venta</small><b class="num">${money(cartTotal())}</b></span><span class="go">Ver y cobrar ›</span>`;
  }
}

function addLine(line) {
  const same = !line.fixed && cart.find(l => !l.fixed && l.p === line.p && (line.pid ? l.pid === line.pid : l.sid === line.sid && l.n === line.n));
  if (same) same.q += line.q; else cart.push(line);
  saveCart(); paintTicket();
  toast(`✓ Agregado: ${line.n}`, 1400);
}

function topSold(n) {
  const cnt = new Map();
  for (const s of SALES.slice(-400)) if (!s.cx) for (const it of s.items) if (it.pid) cnt.set(it.pid, (cnt.get(it.pid) || 0) + it.q);
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => P.get(id)).filter(p => p && !p.off).slice(0, n);
}

function askPriceForProduct(p) {
  const m = openModal(`${mh("¿A cuánto lo vendes?")}
    <p><b>${esc(p.n)}</b><br><small>Este producto todavía no tiene precio en el inventario.</small></p>
    <label class="f"><span>Precio por ${esc(p.u.toLowerCase())}</span><input class="input money" id="pp" inputmode="decimal" placeholder="$0.00" autofocus></label>
    <label class="check" style="margin-top:12px"><input type="checkbox" id="pps" checked> Guardar este precio para la próxima vez</label>
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="ppok">Agregar</button></div>`);
  const ok = async () => {
    const v = parseMoney($("#pp", m).value);
    if (!(v > 0)) { toast("Escribe el precio"); return; }
    if ($("#pps", m).checked) await addOp({ t: "prod", pid: p.id, x: { p: r2(v) } });
    paintResults();
    closeModal();
    addLine({ pid: p.id, n: p.n, q: 1, p: r2(v), k: p.k || 0, cat: p.c });
  };
  $("#ppok", m).onclick = ok;
  $("#pp", m).addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
}

function serviceModal(s) {
  let body = "";
  if (s.tipo === "pieza") {
    body = `<div class="grid2">
      <label class="f"><span>¿Cuántas?</span><input class="input money" id="sq" inputmode="numeric" value="1" autofocus></label>
      <label class="f"><span>Precio c/u</span><input class="input money" id="sp" inputmode="decimal" value="${s.p || ""}" placeholder="$0.00"></label></div>
      <label class="f" style="margin-top:12px"><span>Detalle (opcional)</span><input class="input" id="sd" placeholder="Ej. hojas tamaño oficio"></label>`;
  } else if (s.tipo === "pago") {
    body = `<label class="f"><span>${s.id === "s22" ? "Monto de la recarga" : "Monto que paga el cliente (recibo)"}</span><input class="input money" id="sm" inputmode="decimal" placeholder="$0.00" autofocus></label>
      ${s.rapidos ? `<div class="chips" style="margin-top:8px">${s.rapidos.map(v => `<button class="chip" type="button" data-rap="${v}">$${v}</button>`).join("")}</div>` : ""}
      <div class="grid2" style="margin-top:12px">
        <label class="f"><span>Comisión que cobras</span><input class="input money" id="sc" inputmode="decimal" value="${s.cargo || 0}"></label>
        <label class="f"><span>${s.id === "s22" ? "Compañía / número" : "Referencia (opcional)"}</span><input class="input" id="sd" placeholder="${s.id === "s22" ? "Telcel 833…" : "Núm. de servicio"}"></label>
      </div>
      <p class="muted" style="font-size:.85rem">El monto del recibo no es ganancia; la ganancia es solo tu comisión.</p>
      <div class="big-note pri" id="stot">Total a cobrar: $0.00</div>`;
  } else {
    body = `<label class="f"><span>¿Qué es? (descripción)</span><input class="input" id="sd" placeholder="${s.g === "Trabajos escolares" ? "Ej. maqueta del sistema solar" : "Ej. 2 copias certificadas"}" autofocus></label>
      <div class="grid2" style="margin-top:12px">
        <label class="f"><span>Precio al cliente</span><input class="input money" id="sp" inputmode="decimal" value="${s.p || ""}" placeholder="$0.00"></label>
        <label class="f"><span>Lo que te costó (opcional)</span><input class="input money" id="sk" inputmode="decimal" placeholder="$0.00"></label>
      </div>
      <p class="muted" style="font-size:.85rem">“Lo que te costó” sirve para calcular la ganancia (material, pago del trámite, etc.).</p>`;
  }
  const m = openModal(`${mh(`${s.e || ""} ${esc(s.n)}`)}${body}
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="sok">Agregar a la venta</button></div>`);
  const upd = () => { const t = $("#stot", m); if (t) t.textContent = "Total a cobrar: " + money((parseMoney($("#sm", m).value) || 0) + (parseMoney($("#sc", m).value) || 0)); };
  $$("[data-rap]", m).forEach(b => b.onclick = () => { $("#sm", m).value = b.dataset.rap; upd(); });
  $$("input", m).forEach(i => { i.addEventListener("input", upd); i.addEventListener("keydown", e => { if (e.key === "Enter") $("#sok", m).click(); }); });
  $("#sok", m).onclick = () => {
    const det = ($("#sd", m)?.value || "").trim();
    if (s.tipo === "pieza") {
      const q = Math.round(parseMoney($("#sq", m).value)); const p = parseMoney($("#sp", m).value);
      if (!(q > 0)) return toast("Escribe cuántas");
      if (!(p > 0)) return toast("Escribe el precio");
      closeModal(); addLine({ sid: s.id, n: s.n + (det ? ` (${det})` : ""), q, p: r2(p), k: s.k || 0, cat: "Servicios" });
    } else if (s.tipo === "pago") {
      const monto = parseMoney($("#sm", m).value); const cargo = parseMoney($("#sc", m).value) || 0;
      if (!(monto > 0)) return toast("Escribe el monto");
      closeModal(); addLine({ sid: s.id, n: `${s.n}${det ? ` · ${det}` : ""} — ${money(monto)}${cargo ? ` + comisión ${money(cargo)}` : ""}`, q: 1, p: r2(monto + cargo), k: r2(monto), cat: "Pagos y recargas", fixed: true });
    } else {
      const p = parseMoney($("#sp", m).value); const k = parseMoney($("#sk", m).value) || 0;
      if (!(p > 0)) return toast("Escribe el precio");
      closeModal(); addLine({ sid: s.id, n: s.n + (det ? `: ${det}` : ""), q: 1, p: r2(p), k: r2(k), cat: "Servicios", fixed: true });
    }
  };
}

/* ---------- cobrar ---------- */
function comision(cardAmt) {
  const c = CFG.com;
  if (!(cardAmt > 0) || cardAmt >= c.min || !(c.val > 0)) return 0;
  return c.tipo === "pct" ? r2(cardAmt * c.val / 100) : r2(c.val);
}

function cobrar() {
  if (!cart.length) return;
  const sub = cartTotal();
  const st = { v: S.local.lastSeller || "", m: "ef", rec: "", tj: "", comOn: true };
  const sellers = vendedores();
  const m = openModal(`${mh("Cobrar")}
    <div class="sumbox" style="margin-bottom:16px"><div class="r"><span>${int(cartCount())} artículo(s) / servicio(s)</span><b class="num">${money(sub)}</b></div></div>
    <div class="step-t"><span class="n">1</span>¿Quién hizo la venta?</div>
    <div class="chips" id="sellers">${sellers.map(n => `<button class="chip ${n === st.v ? "on" : ""}" type="button" data-seller="${esc(n)}">${esc(n)}</button>`).join("")}</div>
    <input class="input" id="sellerIn" placeholder="${sellers.length ? "O escribe otro nombre" : "Escribe tu nombre"}" value="${sellers.includes(st.v) ? "" : esc(st.v)}" style="margin-top:8px" autocomplete="name">
    <div class="step-t" style="margin-top:18px"><span class="n">2</span>¿Cómo paga?</div>
    <div class="pay-opts">
      <button class="pay-opt on" type="button" data-m="ef"><span class="e">💵</span>Efectivo</button>
      <button class="pay-opt" type="button" data-m="tj"><span class="e">💳</span>Tarjeta</button>
      <button class="pay-opt" type="button" data-m="mx"><span class="e">💵💳</span>Las dos</button>
    </div>
    <div id="payFields" style="margin-top:14px"></div>
    <div id="paySum" style="margin-top:14px"></div>
    <p class="muted" style="font-size:.85rem;margin:10px 0 0">🕒 La fecha y la hora se guardan solas (${fechaLarga(new Date())}, ${hora(new Date())})</p>
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Regresar</button><button class="btn ok" type="button" id="payOk">✅ Registrar venta</button></div>`);

  const fields = () => {
    const f = $("#payFields", m);
    const quick = [50, 100, 200, 500].filter(v => v >= sub).slice(0, 3);
    if (st.m === "ef") f.innerHTML = `<label class="f"><span>¿Con cuánto paga? (opcional, para saber el cambio)</span><input class="input money" id="rec" inputmode="decimal" placeholder="${money(sub)}" value="${esc(st.rec)}"></label>
      <div class="chips" style="margin-top:8px"><button class="chip" type="button" data-rec="${sub}">Exacto</button>${quick.map(v => `<button class="chip" type="button" data-rec="${v}">$${v}</button>`).join("")}</div>`;
    else if (st.m === "tj") f.innerHTML = "";
    else f.innerHTML = `<div class="grid2"><label class="f"><span>¿Cuánto paga con tarjeta?</span><input class="input money" id="tj" inputmode="decimal" placeholder="$0.00" value="${esc(st.tj)}"></label>
      <label class="f"><span>¿Con cuánto paga en efectivo? (opcional)</span><input class="input money" id="rec" inputmode="decimal" placeholder="$0.00" value="${esc(st.rec)}"></label></div>`;
    $$("input", f).forEach(i => i.addEventListener("input", () => { st[i.id] = i.value; summary(); }));
    $$("[data-rec]", f).forEach(b => b.onclick = () => { st.rec = b.dataset.rec; $("#rec", m).value = st.rec; summary(); });
  };
  const calc = () => {
    let cardPart = st.m === "tj" ? sub : st.m === "mx" ? Math.min(sub, Math.max(0, parseMoney(st.tj) || 0)) : 0;
    const comAuto = comision(cardPart);
    const com = st.comOn ? comAuto : 0;
    const ef = r2(sub - cardPart);
    const tj = r2(cardPart + com);
    const rec = parseMoney(st.rec);
    const cam = rec > 0 ? r2(rec - ef) : 0;
    return { cardPart, comAuto, com, ef, tj, tot: r2(sub + com), rec: rec > 0 ? r2(rec) : null, cam };
  };
  const summary = () => {
    const c = calc();
    let h = "";
    if (c.comAuto > 0) h += `<label class="check" style="margin-bottom:10px"><input type="checkbox" id="comOn" ${st.comOn ? "checked" : ""}> Cobrar comisión por tarjeta (${money(c.comAuto)}) — pago con tarjeta menor a ${money(CFG.com.min)}</label>`;
    h += `<div class="sumbox">
      <div class="r"><span>Productos y servicios</span><span class="num">${money(sub)}</span></div>
      ${c.com ? `<div class="r"><span>Comisión por tarjeta</span><span class="num">${money(c.com)}</span></div>` : ""}
      <div class="r tot"><span>Total</span><span class="num">${money(c.tot)}</span></div>
      ${st.m !== "ef" ? `<div class="r"><span>💳 Tarjeta</span><b class="num">${money(c.tj)}</b></div>` : ""}
      ${st.m !== "tj" ? `<div class="r"><span>💵 Efectivo</span><b class="num">${money(c.ef)}</b></div>` : ""}
    </div>`;
    if (st.m !== "ef" && c.tj > 0) h += `<div class="big-note pri" style="margin-top:10px">💳 Cobra en la terminal: ${money(c.tj)}</div>`;
    if (st.m === "mx" && !(parseMoney(st.tj) > 0)) h += `<div class="big-note bad" style="margin-top:10px">Escribe cuánto paga con tarjeta</div>`;
    if (st.m === "mx" && parseMoney(st.tj) >= sub) h += `<div class="big-note bad" style="margin-top:10px">Si paga todo con tarjeta, elige “Tarjeta”</div>`;
    if (c.rec !== null && st.m !== "tj") h += c.cam >= 0 ? `<div class="big-note ok" style="margin-top:10px">💵 Cambio a entregar: ${money(c.cam)}</div>` : `<div class="big-note bad" style="margin-top:10px">Faltan ${money(-c.cam)} en efectivo</div>`;
    $("#paySum", m).innerHTML = h;
    const cb = $("#comOn", m); if (cb) cb.onchange = () => { st.comOn = cb.checked; summary(); };
  };
  $$("[data-seller]", m).forEach(b => b.onclick = () => {
    st.v = b.dataset.seller; $("#sellerIn", m).value = "";
    $$("[data-seller]", m).forEach(x => x.classList.toggle("on", x === b));
  });
  $("#sellerIn", m).addEventListener("input", e => { st.v = e.target.value.trim(); $$("[data-seller]", m).forEach(x => x.classList.toggle("on", x.dataset.seller === st.v)); });
  $$("[data-m]", m).forEach(b => b.onclick = () => {
    st.m = b.dataset.m; $$("[data-m]", m).forEach(x => x.classList.toggle("on", x === b));
    fields(); summary();
  });
  fields(); summary();

  $("#payOk", m).onclick = async () => {
    const v = (st.v || "").trim();
    if (!v) { toast("Escribe quién hizo la venta"); $("#sellerIn", m).focus(); return; }
    const c = calc();
    if (st.m === "mx" && (!(c.cardPart > 0) || c.cardPart >= sub)) { toast("Revisa cuánto paga con tarjeta"); return; }
    if (c.rec !== null && st.m !== "tj" && c.cam < 0) { toast("El efectivo no alcanza"); return; }
    $("#payOk", m).disabled = true;
    const op = await addOp({
      t: "venta", v,
      items: cart.map(l => ({ pid: l.pid || null, sid: l.sid || null, n: l.n, q: l.q, p: l.p, k: l.k || 0, cat: l.cat || "" })),
      sub, com: c.com, tot: c.tot, ef: c.ef, tj: c.tj, pago: st.m, rec: st.m === "tj" ? null : c.rec, cam: st.m === "tj" ? 0 : Math.max(0, c.cam)
    });
    S.local.lastSeller = v;
    if (!CFG.vendedores.includes(v)) setCfg({ vendedores: [...CFG.vendedores, v] });
    cart = []; query = ""; saveCart();
    const low = op.items.filter(it => it.pid && P.get(it.pid) && P.get(it.pid).s <= stockMin(P.get(it.pid)));
    openModal(`<div class="done-ico">✅</div><h2 style="text-align:center">Venta registrada</h2>
      <p style="text-align:center" class="muted">${hora(op.f)} · vendió ${esc(v)}</p>
      <div class="sumbox"><div class="r tot" style="border:none;margin:0;padding:0"><span>Total</span><span class="num">${money(op.tot)}</span></div>
      ${op.tj ? `<div class="r"><span>💳 Tarjeta</span><span class="num">${money(op.tj)}</span></div>` : ""}
      ${op.ef ? `<div class="r"><span>💵 Efectivo</span><span class="num">${money(op.ef)}</span></div>` : ""}
      ${op.rec ? `<div class="r"><span>Pagó en efectivo con</span><span class="num">${money(op.rec)}</span></div><div class="r"><b>Cambio</b><b class="num">${money(op.cam)}</b></div>` : ""}</div>
      ${low.length ? `<div class="big-note bad" style="margin-top:12px;font-size:.92rem">📦 Se está acabando: ${low.map(it => `${esc(it.n)} (quedan ${int(P.get(it.pid).s)})`).join(", ")}</div>` : ""}
      <div class="mf"><button class="btn pri big" type="button" data-act="nuevaVenta">🛒 Nueva venta</button></div>`, { onClose: () => go("vender") });
  };
}

/* ================= INVENTARIO ================= */
const INV = { q: "", cat: "", fil: "todos", limit: 60 };
function invFilter(p) {
  switch (INV.fil) {
    case "poco": return p.s > 0 && p.s <= stockMin(p);
    case "agotado": return p.s <= 0;
    case "sinprecio": return !p.p;
    case "sincosto": return !p.k;
    case "ocultos": return p.off;
    default: return true;
  }
}
function vInventario() {
  const all = [...P.values()];
  const vis = all.filter(p => !p.off);
  const n = {
    todos: vis.length, poco: vis.filter(p => p.s > 0 && p.s <= stockMin(p)).length, agotado: vis.filter(p => p.s <= 0).length,
    sinprecio: vis.filter(p => !p.p).length, sincosto: vis.filter(p => !p.k).length, ocultos: all.length - vis.length
  };
  const valor = vis.reduce((a, p) => a + Math.max(0, p.s) * (p.p || 0), 0);
  const valorCosto = vis.reduce((a, p) => a + Math.max(0, p.s) * (p.k || 0), 0);
  view.innerHTML = `
  ${tip("inv", "<b>Inventario:</b> aquí ves cuántas piezas hay de cada cosa. Cuando llegue mercancía toca <b>+ Entrada</b>. Para cambiar precio o nombre toca <b>Editar</b>. Las ventas se descuentan solas.")}
  <div class="head"><h2>📦 Inventario</h2>
    <div class="row wrap"><button class="btn" type="button" data-act="exportInv">⬇️ Descargar (Excel)</button><button class="btn pri" type="button" data-act="nuevoProd">＋ Producto nuevo</button></div></div>
  <div class="kpis four">
    <div class="kpi"><small>Productos</small><b class="num">${int(n.todos)}</b></div>
    <div class="kpi"><small>Piezas en tienda</small><b class="num">${int(vis.reduce((a, p) => a + Math.max(0, p.s), 0))}</b></div>
    <div class="kpi pri"><small>Valor a precio de venta</small><b class="num">${money(valor)}</b></div>
    <div class="kpi"><small>Valor a costo (donde hay costo)</small><b class="num">${money(valorCosto)}</b></div>
  </div>
  <div class="search" style="margin-bottom:10px"><span class="ic">🔍</span><input id="iq" class="input" type="search" placeholder="Buscar en el inventario…" value="${esc(INV.q)}" autocomplete="off"></div>
  <div class="chips scroll" style="margin-bottom:8px">
    ${[["todos", "Todos"], ["poco", "⚠️ Poco stock"], ["agotado", "⛔ Agotados"], ["sinprecio", "Sin precio"], ["sincosto", "Sin costo"], ["ocultos", "Ocultos"]].map(([k, t]) => `<button class="chip ${INV.fil === k ? "on" : ""}" type="button" data-act="invFil" data-k="${k}">${t} (${int(n[k])})</button>`).join("")}
  </div>
  <div class="chips scroll" style="margin-bottom:14px">
    <button class="chip ${!INV.cat ? "on" : ""}" type="button" data-act="invCat" data-k="">Todas las categorías</button>
    ${categorias().map(c => `<button class="chip ${INV.cat === c ? "on" : ""}" type="button" data-act="invCat" data-k="${esc(c)}">${esc(c)}</button>`).join("")}
  </div>
  <div id="invList"></div>`;
  const iq = $("#iq");
  iq.addEventListener("input", () => { INV.q = iq.value; INV.limit = 60; paintInv(); });
  paintInv();
}
function paintInv() {
  const words = norm(INV.q).split(/\s+/).filter(Boolean);
  let list = [...P.values()].filter(p => (INV.fil === "ocultos" ? p.off : !p.off) && invFilter(p) && (!INV.cat || p.c === INV.cat) && words.every(w => p.key.includes(w)));
  list.sort((a, b) => INV.fil === "poco" || INV.fil === "agotado" ? a.s - b.s || a.n.localeCompare(b.n, "es") : a.n.localeCompare(b.n, "es"));
  const total = list.length;
  list = list.slice(0, INV.limit);
  $("#invList").innerHTML = !total ? `<div class="empty"><div class="big">📭</div>No hay productos con ese filtro.</div>` : `
    <small>${int(total)} producto(s)</small>
    <div class="list" style="margin-top:8px">${list.map(p => {
      const low = p.s <= 0 ? "bad" : p.s <= stockMin(p) ? "warn" : "ok";
      return `<div class="prod">
        <div><div class="nm">${esc(p.n)}</div>
          <div class="meta"><span class="badge pri">${esc(p.c)}</span><span>${esc(p.u)}</span>${p.k ? `<span>Costo ${money(p.k)}</span>` : ""}${p.o ? `<span title="${esc(p.o)}">📝 ${esc(p.o.length > 50 ? p.o.slice(0, 50) + "…" : p.o)}</span>` : ""}</div></div>
        <div class="stock"><span class="badge ${low}" style="font-size:.95rem">${int(p.s)}</span><br><small style="font-weight:500">en existencia</small></div>
        <div class="stock">${p.p ? money(p.p) : `<span class="badge warn">Sin precio</span>`}<br><small style="font-weight:500">precio</small></div>
        <div class="acts"><button class="btn sm" type="button" data-act="entrada" data-id="${p.id}">＋ Entrada</button><button class="btn sm" type="button" data-act="editProd" data-id="${p.id}">✎ Editar</button></div>
      </div>`;
    }).join("")}</div>
    ${total > INV.limit ? `<div style="text-align:center;margin-top:14px"><button class="btn" type="button" data-act="invMas">Ver más (${int(total - INV.limit)} restantes)</button></div>` : ""}`;
}

function prodModal(p) {
  const isNew = !p;
  p = p || { id: uid("n"), n: "", c: INV.cat || "Papelería", u: "PZA", s: 0, p: 0, k: 0, o: "", min: null, off: false };
  const cats = categorias();
  const m = openModal(`${mh(isNew ? "Producto nuevo" : "Editar producto")}
    <div class="stack">
      <label class="f"><span>Nombre</span><input class="input" id="pn" value="${esc(p.n)}" placeholder="Ej. Cuaderno profesional Scribe 100 hojas" autofocus></label>
      <div class="grid2">
        <label class="f"><span>Precio de venta</span><input class="input money" id="pp" inputmode="decimal" value="${p.p || ""}" placeholder="$0.00"></label>
        <label class="f"><span>Costo por pieza (lo que te cuesta)</span><input class="input money" id="pk" inputmode="decimal" value="${p.k || ""}" placeholder="$0.00"></label>
      </div>
      <div class="grid2">
        <label class="f"><span>Existencia (piezas que hay)</span><input class="input money" id="ps" inputmode="numeric" value="${p.s}"></label>
        <label class="f"><span>Avisar cuando queden</span><input class="input" id="pmin" inputmode="numeric" value="${p.min ?? ""}" placeholder="${CFG.stockMin} (normal)"></label>
      </div>
      <div class="grid2">
        <label class="f"><span>Categoría</span><select class="select input" id="pc">${cats.map(c => `<option ${c === p.c ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__new">＋ Nueva categoría…</option></select></label>
        <label class="f"><span>Unidad</span><select class="select input" id="pu">${["PZA", "PQT", "CAJA", "METRO", "HOJA", "PLANILLA", "ROLLO", "JUEGO"].concat(["PZA", "PQT", "CAJA", "METRO", "HOJA", "PLANILLA", "ROLLO", "JUEGO"].includes(p.u) ? [] : [p.u]).map(u => `<option ${u === p.u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></label>
      </div>
      <label class="f"><span>Nota (opcional)</span><input class="input" id="po" value="${esc(p.o)}" placeholder="Ej. 2 piezas por $7"></label>
      ${isNew ? "" : `<label class="check"><input type="checkbox" id="poff" ${p.off ? "checked" : ""}> Ocultar (ya no se vende, no sale al buscar)</label>`}
    </div>
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="pok">Guardar</button></div>`);
  $("#pc", m).onchange = e => {
    if (e.target.value !== "__new") return;
    const c = prompt("Nombre de la nueva categoría:");
    if (c && c.trim()) { const o = document.createElement("option"); o.textContent = c.trim(); o.selected = true; e.target.insertBefore(o, e.target.lastElementChild); }
    else e.target.value = p.c;
  };
  $("#pok", m).onclick = async () => {
    const n = $("#pn", m).value.trim();
    if (!n) return toast("Escribe el nombre");
    const x = { n, c: $("#pc", m).value, u: $("#pu", m).value, p: r2(parseMoney($("#pp", m).value) || 0), k: r2(parseMoney($("#pk", m).value) || 0), o: $("#po", m).value.trim() };
    const mn = parseInt($("#pmin", m).value, 10); x.min = isFinite(mn) ? mn : null;
    if (!isNew) x.off = $("#poff", m).checked;
    const s = Math.round(parseMoney($("#ps", m).value));
    const changed = isNew || Object.keys(x).some(k => x[k] !== p[k]);
    if (changed) await addOp({ t: "prod", pid: p.id, x });
    if (isFinite(s) && s !== p.s) await addOp({ t: "ajuste", pid: p.id, s, antes: p.s });
    closeModal(); toast(isNew ? "✓ Producto agregado" : "✓ Cambios guardados");
    if (isNew) { INV.q = n; }
    VIEWS[current]();
  };
}

function entradaModal(p) {
  const m = openModal(`${mh("Entrada de mercancía")}
    <p><b>${esc(p.n)}</b><br><small>Hay ${int(p.s)} ${esc(p.u.toLowerCase())} ahora.</small></p>
    <div class="grid2">
      <label class="f"><span>¿Cuántas llegaron?</span><input class="input money" id="eq" inputmode="numeric" placeholder="0" autofocus></label>
      <label class="f"><span>Costo por pieza (opcional)</span><input class="input money" id="ek" inputmode="decimal" placeholder="${p.k ? money(p.k) : "$0.00"}"></label>
    </div>
    <div class="big-note pri" id="enew" style="margin-top:12px">Quedarán ${int(p.s)}</div>
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="eok">Sumar al inventario</button></div>`);
  const eq = $("#eq", m);
  eq.addEventListener("input", () => { $("#enew", m).textContent = `Quedarán ${int(p.s + (Math.round(parseMoney(eq.value)) || 0))}`; });
  const ok = async () => {
    const q = Math.round(parseMoney(eq.value));
    if (!(q > 0)) return toast("Escribe cuántas llegaron");
    const k = parseMoney($("#ek", m).value);
    await addOp({ t: "entrada", pid: p.id, q, k: k > 0 ? r2(k) : 0, v: S.local.lastSeller || "" });
    closeModal(); toast(`✓ +${q} ${p.n}`); VIEWS[current]();
  };
  $("#eok", m).onclick = ok;
  eq.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
}

/* ================= VENTAS (historial) ================= */
const H = { mode: "dia", ref: new Date(), vend: "" };
function rangeOf(mode, ref) {
  const d = new Date(ref); d.setHours(0, 0, 0, 0);
  let a, b, label;
  if (mode === "dia") { a = d; b = new Date(d); b.setDate(b.getDate() + 1); label = cap(fechaLarga(a)); }
  else if (mode === "semana") {
    a = new Date(d); a.setDate(a.getDate() - ((a.getDay() + 6) % 7)); b = new Date(a); b.setDate(b.getDate() + 7);
    const e = new Date(b); e.setDate(e.getDate() - 1);
    label = `${a.getDate()} ${MES3[a.getMonth()]} – ${e.getDate()} ${MES3[e.getMonth()]} ${e.getFullYear()}`;
  } else if (mode === "mes") { a = new Date(d.getFullYear(), d.getMonth(), 1); b = new Date(d.getFullYear(), d.getMonth() + 1, 1); label = `${cap(MESES[a.getMonth()])} ${a.getFullYear()}`; }
  else if (mode === "anio") { a = new Date(d.getFullYear(), 0, 1); b = new Date(d.getFullYear() + 1, 0, 1); label = `Año ${a.getFullYear()}`; }
  else { a = new Date(2000, 0, 1); b = new Date(2999, 0, 1); label = "Todo"; }
  return { a, b, label };
}
function shiftRef(mode, ref, dir) {
  const d = new Date(ref);
  if (mode === "dia") d.setDate(d.getDate() + dir);
  else if (mode === "semana") d.setDate(d.getDate() + 7 * dir);
  else if (mode === "mes") d.setMonth(d.getMonth() + dir, 1);
  else d.setFullYear(d.getFullYear() + dir, 0, 1);
  return d;
}
const inRange = (s, r) => { const t = new Date(s.f); return t >= r.a && t < r.b; };

function totals(list) {
  const t = { n: 0, tot: 0, sub: 0, ef: 0, tj: 0, com: 0, gan: 0, venConCosto: 0, sinCosto: 0 };
  for (const s of list) {
    if (s.cx) continue;
    t.n++; t.tot += s.tot; t.sub += s.sub; t.ef += s.ef; t.tj += s.tj; t.com += s.com;
    for (const it of s.items) {
      const known = it.k > 0 || !it.pid;
      if (known) { t.gan += (it.p - it.k) * it.q; t.venConCosto += it.p * it.q; } else t.sinCosto += it.p * it.q;
    }
  }
  return t;
}

function saleCard(s) {
  const pay = s.pago === "mx" ? `<span class="badge pri">💵 ${money(s.ef)} + 💳 ${money(s.tj)}</span>` : s.pago === "tj" ? `<span class="badge pri">💳 Tarjeta</span>` : `<span class="badge ok">💵 Efectivo</span>`;
  return `<div class="sale ${s.cx ? "cx" : ""}">
    <div class="hd"><b>🕒 ${hora(s.f)}</b><span class="badge">👤 ${esc(s.v)}</span>${pay}${s.com ? `<span class="badge warn">Comisión ${money(s.com)}</span>` : ""}${s.cx ? `<span class="badge bad">CANCELADA${s.cxv ? " por " + esc(s.cxv) : ""}</span>` : ""}<span class="tt num">${money(s.tot)}</span></div>
    <table>${s.items.map(it => `<tr><td>${int(it.q)} ×</td><td style="width:100%">${esc(it.n)}<br><small>${money(it.p)} c/u</small></td><td class="r num">${money(it.q * it.p)}</td></tr>`).join("")}</table>
    ${!s.cx ? `<div style="text-align:right;margin-top:6px"><button class="btn sm bad" type="button" data-act="cancelarVenta" data-id="${s.id}">Cancelar venta</button></div>` : s.cxm ? `<small>Motivo: ${esc(s.cxm)}</small>` : ""}
  </div>`;
}

function vVentas() {
  const r = rangeOf(H.mode, H.ref);
  const sellers = vendedores();
  const list = SALES.filter(s => inRange(s, r) && (!H.vend || s.v === H.vend)).sort((x, y) => new Date(y.f) - new Date(x.f));
  const t = totals(list);
  let body = "";
  if (!list.length) body = `<div class="empty"><div class="big">🧾</div>No hay ventas ${H.mode === "dia" ? "este día" : "en este periodo"}.</div>`;
  else if (H.mode === "dia") {
    const per = {};
    for (const s of list) if (!s.cx) { const v = per[s.v] ||= { tot: 0, ef: 0, tj: 0, n: 0 }; v.tot += s.tot; v.ef += s.ef; v.tj += s.tj; v.n++; }
    body = `<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:8px">🧮 Corte de caja por vendedor</h3>
      <div class="list">${Object.entries(per).map(([v, x]) => `<div class="row wrap"><b class="grow">👤 ${esc(v)} <small>(${x.n} venta${x.n === 1 ? "" : "s"})</small></b><span>💵 ${money(x.ef)}</span><span>💳 ${money(x.tj)}</span><b class="num">${money(x.tot)}</b></div>`).join("")}</div></div>` +
      `<div class="list">${list.map(saleCard).join("")}</div>`;
  } else if (H.mode === "anio") {
    const byM = Array.from({ length: 12 }, () => []);
    for (const s of list) byM[new Date(s.f).getMonth()].push(s);
    body = `<div class="list">${byM.map((ls, i) => ({ ls, i })).filter(x => x.ls.length).reverse().map(({ ls, i }) => {
      const tt = totals(ls);
      return `<button class="day" type="button" data-act="verMes" data-m="${i}" style="all:unset;cursor:pointer;display:flex;gap:10px;align-items:center;padding:12px 14px;background:var(--card);border-radius:12px;border:1px solid var(--line);font-weight:700">📅 ${cap(MESES[i])} <small style="font-weight:500">${tt.n} venta${tt.n === 1 ? "" : "s"} · 💵 ${money(tt.ef)} · 💳 ${money(tt.tj)}</small><span style="margin-left:auto" class="num">${money(tt.tot)} ›</span></button>`;
    }).join("")}</div>`;
  } else {
    const byD = new Map();
    for (const s of list) { const k = dayKey(s.f); if (!byD.has(k)) byD.set(k, []); byD.get(k).push(s); }
    body = [...byD.entries()].map(([k, ls], i) => {
      const tt = totals(ls);
      return `<details class="day" ${i === 0 ? "open" : ""}><summary>📅 ${cap(fechaLarga(ls[0].f))} <small style="font-weight:500">${tt.n} venta${tt.n === 1 ? "" : "s"} · 💵 ${money(tt.ef)} · 💳 ${money(tt.tj)}</small><span class="tt num">${money(tt.tot)}</span></summary><div class="list">${ls.map(saleCard).join("")}</div></details>`;
    }).join("");
  }
  view.innerHTML = `
  ${tip("ventas", "<b>Historial:</b> elige Día, Semana, Mes o Año y muévete con las flechas ‹ ›. Arriba ves cuánto entró en efectivo y en tarjeta (sirve para el corte de caja).")}
  <div class="head"><h2>🧾 Ventas</h2>
    <div class="row wrap"><button class="btn" type="button" data-act="exportVentas">⬇️ Descargar (Excel)</button></div></div>
  <div class="row wrap" style="margin-bottom:14px;gap:12px">
    <div class="seg">${[["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["anio", "Año"]].map(([k, t]) => `<button type="button" class="${H.mode === k ? "on" : ""}" data-act="hMode" data-k="${k}">${t}</button>`).join("")}</div>
    <div class="datenav"><button class="icon-btn" type="button" data-act="hMove" data-d="-1" aria-label="Anterior">‹</button><b>${r.label}</b><button class="icon-btn" type="button" data-act="hMove" data-d="1" aria-label="Siguiente">›</button></div>
    <button class="btn sm" type="button" data-act="hHoy">Hoy</button>
    ${sellers.length ? `<select class="select input" id="hv" style="width:auto;min-height:40px"><option value="">Todos los vendedores</option>${sellers.map(v => `<option ${v === H.vend ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : ""}
  </div>
  <div class="kpis six">
    <div class="kpi pri"><small>Total vendido</small><b class="num">${money(t.tot)}</b></div>
    <div class="kpi"><small>Número de ventas</small><b class="num">${int(t.n)}</b></div>
    <div class="kpi"><small>💵 Efectivo</small><b class="num">${money(t.ef)}</b></div>
    <div class="kpi"><small>💳 Tarjeta</small><b class="num">${money(t.tj)}</b></div>
    <div class="kpi"><small>Comisiones tarjeta</small><b class="num">${money(t.com)}</b></div>
    <div class="kpi ok"><small>Ganancia estimada</small><b class="num">${money(t.gan + t.com)}</b></div>
  </div>
  ${body}`;
  const hv = $("#hv"); if (hv) hv.onchange = () => { H.vend = hv.value; vVentas(); };
}

/* ================= ESTADÍSTICAS ================= */
const E = { per: "mes", year: new Date().getFullYear() };
function hbars(rows, fmt = money, cls = "") {
  const max = Math.max(...rows.map(r => r.v), 1);
  return `<div class="hbars">${rows.map(r => `<div class="hb ${cls}"><span class="lb" title="${esc(r.l)}">${esc(r.l)}</span><span class="vl num">${fmt(r.v)}${r.x ? ` <small style="font-weight:500">${r.x}</small>` : ""}</span><span class="tr"><i style="width:${Math.max(1.5, r.v / max * 100)}%"></i></span></div>`).join("")}</div>`;
}
function vEstadisticas() {
  const now = new Date();
  let r;
  if (E.per === "mes") r = rangeOf("mes", now);
  else if (E.per === "mesant") r = rangeOf("mes", new Date(now.getFullYear(), now.getMonth() - 1, 1));
  else if (E.per === "anio") r = rangeOf("anio", new Date(E.year, 0, 1));
  else r = rangeOf("todo", now);
  const list = SALES.filter(s => !s.cx && inRange(s, r));
  const t = totals(list);
  const costo = t.venConCosto - t.gan;
  const margen = t.venConCosto ? t.gan / t.venConCosto * 100 : 0;

  // por producto / servicio
  const prod = new Map(), serv = new Map(), cat = new Map(), seller = new Map(), horas = Array(24).fill(0);
  for (const s of list) {
    seller.set(s.v, (seller.get(s.v) || 0) + s.tot);
    horas[new Date(s.f).getHours()] += s.tot;
    for (const it of s.items) {
      const amount = it.p * it.q;
      if (it.pid) {
        const x = prod.get(it.pid) || { l: P.get(it.pid)?.n || it.n, q: 0, v: 0, g: 0, known: true };
        x.q += it.q; x.v += amount; if (it.k > 0) x.g += (it.p - it.k) * it.q; else x.known = false;
        prod.set(it.pid, x);
      } else {
        const key = it.sid || "libre:" + it.n;
        const sv = CFG.servicios.find(z => z.id === it.sid);
        const x = serv.get(key) || { l: sv ? sv.n : it.n, q: 0, v: 0, g: 0 };
        x.q += it.q; x.v += amount; x.g += (it.p - it.k) * it.q;
        serv.set(key, x);
      }
      const c = it.pid ? (P.get(it.pid)?.c || it.cat || "Otros") : (it.cat || "Servicios");
      cat.set(c, (cat.get(c) || 0) + amount);
    }
  }
  const prodArr = [...prod.values()];
  const mas = [...prodArr].sort((a, b) => b.q - a.q || b.v - a.v).slice(0, 10);
  const menos = [...prodArr].sort((a, b) => a.q - b.q || a.v - b.v).slice(0, 10);
  const soldIds = new Set(prod.keys());
  const sinVenta = [...P.values()].filter(p => !p.off && p.s > 0 && !soldIds.has(p.id));
  const ganancia = [...prodArr.filter(x => x.g > 0), ...serv.values()].sort((a, b) => b.g - a.g).slice(0, 10);

  // ventas por mes del año elegido
  const ys = SALES.filter(s => !s.cx && new Date(s.f).getFullYear() === E.year);
  const months = Array(12).fill(0); const monthsN = Array(12).fill(0);
  for (const s of ys) { const mm = new Date(s.f).getMonth(); months[mm] += s.tot; monthsN[mm]++; }
  const maxM = Math.max(...months);
  const best = maxM > 0 ? months.indexOf(maxM) : -1;
  const conVentas = months.map((v, i) => ({ v, i })).filter(x => x.v > 0);
  const worst = conVentas.length > 1 ? conVentas.sort((a, b) => a.v - b.v)[0] : null;
  const years = [...new Set(SALES.map(s => new Date(s.f).getFullYear()).concat([now.getFullYear()]))].sort();

  const horasRows = horas.map((v, h) => ({ v, h })).filter(x => x.v > 0);
  view.innerHTML = `
  ${tip("stats", "<b>Estadísticas:</b> elige el periodo arriba. La <b>ganancia</b> se calcula con el costo de cada producto; si a un producto le falta el costo, agrégalo en Inventario → Editar.")}
  <div class="head"><h2>📊 Estadísticas</h2>
    <div class="seg">${[["mes", "Este mes"], ["mesant", "Mes pasado"], ["anio", "Año"], ["todo", "Todo"]].map(([k, tt]) => `<button type="button" class="${E.per === k ? "on" : ""}" data-act="ePer" data-k="${k}">${tt}</button>`).join("")}</div></div>
  <p class="muted" style="margin:-6px 0 14px">Periodo: <b>${r.label}</b></p>
  <div class="kpis six">
    <div class="kpi pri"><small>Vendido</small><b class="num">${money(t.tot)}</b></div>
    <div class="kpi"><small>Costo de lo vendido</small><b class="num">${money(costo)}</b></div>
    <div class="kpi ok"><small>Ganancia</small><b class="num">${money(t.gan + t.com)}</b></div>
    <div class="kpi ok"><small>Margen de ganancia</small><b class="num">${margen.toFixed(1)}%</b></div>
    <div class="kpi"><small>Ventas</small><b class="num">${int(t.n)}</b></div>
    <div class="kpi"><small>Ticket promedio</small><b class="num">${money(t.n ? t.tot / t.n : 0)}</b></div>
  </div>
  ${t.sinCosto > 0 ? `<div class="tip" style="background:var(--soft);border-color:var(--line)"><span>ℹ️</span><div>${money(t.sinCosto)} de lo vendido son productos <b>sin costo registrado</b>, por eso no entran en la ganancia ni en el margen. Puedes agregar el costo en Inventario → filtro “Sin costo”.</div></div>` : ""}
  <div class="charts">
    <div class="card wide">
      <div class="head" style="margin-bottom:4px"><h3>📅 Ventas por mes</h3>
        <div class="datenav"><button class="icon-btn" type="button" data-act="eYear" data-d="-1" ${years[0] >= E.year ? "disabled" : ""}>‹</button><b style="min-width:60px">${E.year}</b><button class="icon-btn" type="button" data-act="eYear" data-d="1" ${E.year >= now.getFullYear() ? "disabled" : ""}>›</button></div></div>
      ${best >= 0 ? `<div class="highlight" style="margin:8px 0 4px"><span class="e">🏆</span><div><b>${cap(MESES[best])} fue el mes con más ventas</b><br>${money(maxM)} en ${int(monthsN[best])} ventas${worst ? ` · el mes más bajo fue ${MESES[worst.i]} (${money(worst.v)})` : ""}</div></div>` : `<p class="muted">Aún no hay ventas en ${E.year}.</p>`}
      <div class="bars">${months.map((v, i) => `<div class="b ${i === best ? "top" : ""}" title="${cap(MESES[i])}: ${money(v)}"><em>${v ? (v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + Math.round(v)) : ""}</em><i style="height:${maxM ? Math.max(1, v / maxM * 100) : 1}%"></i><span>${MES3[i]}</span></div>`).join("")}</div>
    </div>
    <div class="card"><h3 style="margin-bottom:10px">🔥 Productos más vendidos</h3>${mas.length ? `<ol class="rank">${mas.map(x => `<li><span class="n" title="${esc(x.l)}">${esc(x.l)}</span><span class="v num">${int(x.q)} pzas</span><small class="num">${money(x.v)}</small></li>`).join("")}</ol>` : `<p class="muted">Sin ventas de productos en este periodo.</p>`}</div>
    <div class="card"><h3 style="margin-bottom:10px">🐢 Productos que menos se venden</h3>${menos.length ? `<ol class="rank">${menos.map(x => `<li><span class="n" title="${esc(x.l)}">${esc(x.l)}</span><span class="v num">${int(x.q)} pzas</span><small class="num">${money(x.v)}</small></li>`).join("")}</ol>` : `<p class="muted">Sin ventas de productos en este periodo.</p>`}
      <p style="margin:12px 0 0"><button class="btn sm" type="button" data-act="sinVenta">Ver ${int(sinVenta.length)} productos con existencia que no se vendieron</button></p></div>
    <div class="card"><h3 style="margin-bottom:10px">💰 Lo que más ganancia deja</h3>${ganancia.length ? hbars(ganancia.map(x => ({ l: x.l, v: x.g })), money, "g") : `<p class="muted">Todavía no hay datos de ganancia.</p>`}</div>
    <div class="card"><h3 style="margin-bottom:10px">🛠️ Servicios más pedidos</h3>${serv.size ? hbars([...serv.values()].sort((a, b) => b.v - a.v).slice(0, 10).map(x => ({ l: x.l, v: x.v, x: `(${int(x.q)})` })), money, "alt") : `<p class="muted">Sin servicios en este periodo.</p>`}</div>
    <div class="card"><h3 style="margin-bottom:10px">🗂️ Ventas por categoría</h3>${cat.size ? hbars([...cat.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }))) : `<p class="muted">Sin datos.</p>`}</div>
    <div class="card"><h3 style="margin-bottom:10px">💳 Efectivo y tarjeta</h3>${t.n ? hbars([{ l: "💵 Efectivo", v: t.ef, x: `${(t.ef / t.tot * 100).toFixed(0)}%` }, { l: "💳 Tarjeta", v: t.tj, x: `${(t.tj / t.tot * 100).toFixed(0)}%` }, { l: "Comisiones cobradas", v: t.com }]) : `<p class="muted">Sin datos.</p>`}</div>
    <div class="card"><h3 style="margin-bottom:10px">👤 Ventas por vendedor</h3>${seller.size ? hbars([...seller.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }))) : `<p class="muted">Sin datos.</p>`}</div>
    <div class="card"><h3 style="margin-bottom:10px">🕒 Horas con más ventas</h3>${horasRows.length ? hbars(horasRows.map(x => ({ l: `${x.h % 12 || 12}:00 ${x.h < 12 ? "am" : "pm"}`, v: x.v }))) : `<p class="muted">Sin datos.</p>`}</div>
  </div>`;
  ACT._sinVenta = sinVenta;
}

/* ================= AJUSTES ================= */
function vAjustes() {
  const conectado = !!S.local.url;
  view.innerHTML = `
  <div class="head"><h2>⚙️ Ajustes</h2><button class="btn" type="button" data-act="ayuda">❓ Cómo se usa la app</button></div>
  <div class="charts">
    <div class="card wide">
      <h3>☁️ Celular y computadora juntos</h3>
      <p class="muted" style="margin:6px 0 12px">${conectado ? `Conectada a Google Sheets. Las ventas que hagas aquí se ven en los otros equipos. ${S.sync.last ? "Última vez: " + hora(S.sync.last) : ""}` : `Ahora las ventas se guardan <b>solo en este equipo</b>. Conéctala a tu hoja de Google para ver lo mismo en el celular y en la computadora (y no perder nada si se borra el navegador). <a href="https://github.com/ivannnavarro/papeleria-yebra/blob/main/GUIA.md#2-conectar-celular-y-computadora-muy-recomendado" target="_blank" rel="noopener">Ver cómo hacerlo (5 minutos)</a>.`}</p>
      <div class="grid2">
        <label class="f"><span>Dirección de la hoja (termina en /exec)</span><input class="input" id="su" value="${esc(S.local.url)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
        <label class="f"><span>Clave</span><input class="input" id="sk" value="${esc(S.local.clave)}" placeholder="La misma que pusiste en la hoja"></label>
      </div>
      <div class="row wrap" style="margin-top:12px"><button class="btn pri" type="button" data-act="conectar">${conectado ? "Guardar cambios" : "Conectar"}</button>${conectado ? `<button class="btn" type="button" data-act="syncAhora">⟳ Sincronizar ahora</button><button class="btn bad" type="button" data-act="desconectar">Desconectar</button>` : ""}</div>
      ${S.pending.length ? `<p class="muted" style="margin:10px 0 0">${int(S.pending.length)} movimiento(s) guardados en este equipo ${conectado ? "esperando subir" : ""}.</p>` : ""}
    </div>
    <div class="card">
      <h3>👤 Vendedores</h3>
      <p class="muted" style="margin:6px 0 12px">Salen como botones al cobrar, para no escribir el nombre cada vez.</p>
      <div class="chips" style="margin-bottom:10px">${CFG.vendedores.length ? CFG.vendedores.map(v => `<span class="chip">${esc(v)} <button type="button" data-act="quitarVend" data-v="${esc(v)}" style="border:none;background:none;color:var(--bad);font-weight:700" aria-label="Quitar">✕</button></span>`).join("") : `<small>Todavía no hay vendedores.</small>`}</div>
      <div class="row"><input class="input" id="nv" placeholder="Nombre"><button class="btn pri" type="button" data-act="agregarVend">Agregar</button></div>
    </div>
    <div class="card">
      <h3>💳 Comisión por pagar con tarjeta</h3>
      <p class="muted" style="margin:6px 0 12px">Se cobra sola cuando lo que se paga con tarjeta es menor al mínimo. Al cobrar se puede quitar si no aplica.</p>
      <div class="grid2">
        <label class="f"><span>Si el pago con tarjeta es menor a</span><input class="input money" id="cmin" inputmode="decimal" value="${CFG.com.min}"></label>
        <label class="f"><span>Cobrar</span><div class="row"><input class="input money" id="cval" inputmode="decimal" value="${CFG.com.val}" style="flex:1"><select class="select input" id="ctipo" style="width:auto"><option value="fijo" ${CFG.com.tipo === "fijo" ? "selected" : ""}>pesos</option><option value="pct" ${CFG.com.tipo === "pct" ? "selected" : ""}>%</option></select></div></label>
      </div>
      <label class="f" style="margin-top:12px"><span>Avisar “poco stock” cuando queden (piezas)</span><input class="input" id="smin" inputmode="numeric" value="${CFG.stockMin}"></label>
      <div style="margin-top:12px"><button class="btn pri" type="button" data-act="guardarCom">Guardar</button></div>
    </div>
    <div class="card wide">
      <div class="head" style="margin-bottom:6px"><h3>🛠️ Servicios y precios</h3><button class="btn sm pri" type="button" data-act="nuevoServ">＋ Agregar servicio</button></div>
      <p class="muted" style="margin:0 0 12px">“Precio fijo” cobra por pieza (copias, impresiones). “Precio variable” pregunta el precio cada vez (maquetas, trámites). “Pago de servicio” pide el monto del recibo y tu comisión (luz, agua, recargas).</p>
      <div class="list">${CFG.servicios.map(s => `<div class="prod"><div><div class="nm">${s.e || "⭐"} ${esc(s.n)}</div><div class="meta"><span class="badge pri">${esc(s.g)}</span><span>${s.tipo === "pieza" ? "Precio fijo" : s.tipo === "pago" ? "Pago de servicio" : "Precio variable"}</span></div></div>
        <div class="stock">${s.tipo === "pieza" ? money(s.p) : s.tipo === "pago" ? `+${money(s.cargo || 0)}` : s.p ? money(s.p) : "—"}</div><div></div>
        <div class="acts"><button class="btn sm" type="button" data-act="editServ" data-id="${s.id}">✎ Editar</button></div></div>`).join("")}</div>
    </div>
    <div class="card wide">
      <h3>💾 Respaldo</h3>
      <p class="muted" style="margin:6px 0 12px">Descarga una copia de todas las ventas y cambios. Si algún día cambias de equipo, la puedes cargar aquí.</p>
      <div class="row wrap"><button class="btn" type="button" data-act="respaldo">⬇️ Descargar respaldo</button><label class="btn">⬆️ Cargar respaldo<input type="file" id="rf" accept=".json,application/json" hidden></label></div>
    </div>
  </div>`;
  $("#rf").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const ops = (j.serverOps || []).concat(j.pending || []);
      const have = new Set(allOps().map(o => o.id));
      const nuevos = ops.filter(o => o && o.id && o.t && !have.has(o.id));
      S.pending.push(...nuevos); await store.set("pending", S.pending);
      rebuild(); syncSoon(200); toast(`✓ Respaldo cargado: ${nuevos.length} movimientos nuevos`); vAjustes();
    } catch (err) { toast("⚠️ Ese archivo no es un respaldo válido"); }
  };
}

function servModal(s) {
  const isNew = !s;
  s = s || { id: uid("s"), g: "Trabajos escolares", e: "⭐", n: "", tipo: "variable", p: 0, k: 0, cargo: 0 };
  const grupos = [...new Set(CFG.servicios.map(x => x.g))];
  const m = openModal(`${mh(isNew ? "Servicio nuevo" : "Editar servicio")}
    <div class="stack">
      <div class="row"><label class="f" style="width:80px"><span>Ícono</span><input class="input" id="ve" value="${esc(s.e)}" maxlength="4" style="text-align:center;font-size:1.3rem"></label>
        <label class="f grow"><span>Nombre</span><input class="input" id="vn" value="${esc(s.n)}" autofocus></label></div>
      <label class="f"><span>Grupo</span><input class="input" id="vg" value="${esc(s.g)}" list="vgl"><datalist id="vgl">${grupos.map(g => `<option value="${esc(g)}">`).join("")}</datalist></label>
      <label class="f"><span>Tipo de precio</span><select class="select input" id="vt">
        <option value="pieza" ${s.tipo === "pieza" ? "selected" : ""}>Precio fijo por pieza (copias, impresiones)</option>
        <option value="variable" ${s.tipo === "variable" ? "selected" : ""}>Precio variable, se escribe al vender</option>
        <option value="pago" ${s.tipo === "pago" ? "selected" : ""}>Pago de servicio (monto + comisión)</option></select></label>
      <div class="grid2">
        <label class="f" id="vpL"><span>Precio</span><input class="input money" id="vp" inputmode="decimal" value="${s.p || ""}"></label>
        <label class="f" id="vkL"><span>Costo por pieza (opcional)</span><input class="input money" id="vk" inputmode="decimal" value="${s.k || ""}"></label>
        <label class="f" id="vcL"><span>Comisión que cobras</span><input class="input money" id="vc" inputmode="decimal" value="${s.cargo || 0}"></label>
      </div>
    </div>
    <div class="mf">${isNew ? "" : `<button class="btn bad" type="button" id="vdel">Borrar</button>`}<button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="vok">Guardar</button></div>`);
  const tog = () => { const t = $("#vt", m).value; $("#vpL", m).hidden = t === "pago"; $("#vkL", m).hidden = t !== "pieza"; $("#vcL", m).hidden = t !== "pago"; };
  $("#vt", m).onchange = tog; tog();
  $("#vok", m).onclick = async () => {
    const n = $("#vn", m).value.trim(); if (!n) return toast("Escribe el nombre");
    const x = { ...s, e: $("#ve", m).value.trim() || "⭐", n, g: $("#vg", m).value.trim() || "Otros", tipo: $("#vt", m).value, p: r2(parseMoney($("#vp", m).value) || 0), k: r2(parseMoney($("#vk", m).value) || 0), cargo: r2(parseMoney($("#vc", m).value) || 0) };
    if (x.tipo === "pieza" && !(x.p > 0)) return toast("Escribe el precio");
    const list = isNew ? [...CFG.servicios, x] : CFG.servicios.map(z => z.id === s.id ? x : z);
    await setCfg({ servicios: list }); closeModal(); toast("✓ Servicio guardado"); vAjustes();
  };
  const del = $("#vdel", m);
  if (del) del.onclick = async () => { if (!confirm(`¿Borrar “${s.n}”? Las ventas pasadas no se borran.`)) return; await setCfg({ servicios: CFG.servicios.filter(z => z.id !== s.id) }); closeModal(); vAjustes(); };
}

/* ================= descargas ================= */
function download(name, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" + text : text], { type });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const csvCell = v => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = rows => rows.map(r => r.map(csvCell).join(",")).join("\r\n");

/* ================= ayuda ================= */
function ayuda(first) {
  openModal(`${mh(first ? "👋 Bienvenido a Papelería Yebra" : "❓ Cómo se usa")}
    <div class="guide-step"><span class="e">🛒</span><div><b>1. Vender</b>Escribe en el buscador lo que lleva el cliente (ej. “cuaderno”) y tócalo para agregarlo. Para copias, impresiones, trámites, pagos de luz/agua, recargas o maquetas toca el botón del servicio.</div></div>
    <div class="guide-step"><span class="e">💰</span><div><b>2. Cobrar</b>Toca <b>Cobrar</b>, escoge quién vendió y cómo paga: efectivo, tarjeta o las dos (ej. $50 con tarjeta y el resto en efectivo). Si con tarjeta paga menos de ${money(CFG.com.min)}, la comisión se suma sola. La hora se guarda sola.</div></div>
    <div class="guide-step"><span class="e">📦</span><div><b>3. Inventario</b>Cada venta descuenta las piezas. Cuando llegue mercancía toca <b>+ Entrada</b>. Los productos que se están acabando salen en “Poco stock”.</div></div>
    <div class="guide-step"><span class="e">🧾</span><div><b>4. Ventas</b>Mira lo vendido por día, semana, mes o año, cuánto fue en efectivo y cuánto en tarjeta. Si te equivocaste, cancela la venta y las piezas regresan.</div></div>
    <div class="guide-step"><span class="e">📊</span><div><b>5. Estadísticas</b>Ganancia, margen, lo que más y menos se vende, y el mes con más ventas.</div></div>
    <div class="mf"><button class="btn pri big" type="button" data-act="cerrar">${first ? "¡Empezar a vender!" : "Entendido"}</button></div>`, { wide: true });
}

/* ================= acciones (botones) ================= */
const ACT = {
  cerrar: () => closeModal(),
  tipOff: el => { S.local.tips[el.dataset.id] = 1; saveLocal(); el.closest(".tip").remove(); },
  ayuda: () => ayuda(false),
  addProd: el => {
    const p = P.get(el.dataset.id); if (!p) return;
    if (!p.p) return askPriceForProduct(p);
    const inCart = cart.filter(l => l.pid === p.id).reduce((a, l) => a + l.q, 0);
    addLine({ pid: p.id, n: p.n, q: 1, p: p.p, k: p.k || 0, cat: p.c });
    if (inCart + 1 > p.s) setTimeout(() => toast(`⚠️ En inventario hay ${int(Math.max(0, p.s))}. Se vende igual; revisa el inventario.`, 3200), 1500);
  },
  addSvc: el => { const s = CFG.servicios.find(x => x.id === el.dataset.id); if (s) serviceModal(s); },
  libre: () => {
    const m = openModal(`${mh("Vender algo que no está en la lista")}
      <label class="f"><span>¿Qué es?</span><input class="input" id="ld" value="${esc(query)}" autofocus></label>
      <div class="grid2" style="margin-top:12px"><label class="f"><span>Cantidad</span><input class="input money" id="lq" inputmode="numeric" value="1"></label>
      <label class="f"><span>Precio c/u</span><input class="input money" id="lp" inputmode="decimal" placeholder="$0.00"></label></div>
      <p class="muted" style="font-size:.85rem">Tip: si lo vas a vender seguido, mejor dalo de alta en Inventario → Producto nuevo.</p>
      <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="lok">Agregar</button></div>`);
    $("#lok", m).onclick = () => {
      const n = $("#ld", m).value.trim(), q = Math.round(parseMoney($("#lq", m).value)), p = parseMoney($("#lp", m).value);
      if (!n) return toast("Escribe qué es"); if (!(q > 0)) return toast("Escribe la cantidad"); if (!(p > 0)) return toast("Escribe el precio");
      closeModal(); addLine({ sid: "libre", n, q, p: r2(p), k: 0, cat: "Otros" });
    };
  },
  qty: el => { const l = cart[+el.dataset.i]; l.q = Math.max(1, l.q + +el.dataset.d); saveCart(); paintTicket(); },
  quitar: el => { cart.splice(+el.dataset.i, 1); saveCart(); paintTicket(); },
  vaciar: () => { if (confirm("¿Borrar toda la venta actual?")) { cart = []; saveCart(); paintTicket(); } },
  editPrice: el => {
    const l = cart[+el.dataset.i];
    const v = prompt(`Precio por pieza de:\n${l.n}`, l.p);
    if (v === null) return;
    const n = parseMoney(v); if (!(n >= 0)) return toast("Precio no válido");
    l.p = r2(n); saveCart(); paintTicket();
  },
  verTicket: () => { const m = openModal(`<div class="ticket-modal"></div><div class="mf" style="margin-top:6px"><button class="btn" type="button" data-act="cerrar">Seguir agregando</button></div>`); paintTicket(); },
  cobrar: () => { if ($("#modal .ticket-modal")) closeModal(); cobrar(); },
  nuevaVenta: () => closeModal(),

  invFil: el => { INV.fil = el.dataset.k; INV.limit = 60; vInventario(); },
  invCat: el => { INV.cat = el.dataset.k; INV.limit = 60; vInventario(); },
  invMas: () => { INV.limit += 100; paintInv(); },
  nuevoProd: () => prodModal(null),
  editProd: el => prodModal(P.get(el.dataset.id)),
  entrada: el => entradaModal(P.get(el.dataset.id)),
  exportInv: () => {
    const rows = [["Producto", "Categoría", "Unidad", "Existencia", "Precio", "Costo", "Nota"]];
    for (const p of [...P.values()].filter(p => !p.off).sort((a, b) => a.n.localeCompare(b.n, "es"))) rows.push([p.n, p.c, p.u, p.s, p.p, p.k, p.o]);
    download(`inventario-yebra-${dayKey(new Date())}.csv`, csv(rows));
  },

  hMode: el => { H.mode = el.dataset.k; vVentas(); },
  hMove: el => { H.ref = shiftRef(H.mode, H.ref, +el.dataset.d); vVentas(); },
  hHoy: () => { H.ref = new Date(); H.mode = "dia"; vVentas(); },
  verMes: el => { H.mode = "mes"; H.ref = new Date(new Date(H.ref).getFullYear(), +el.dataset.m, 1); vVentas(); window.scrollTo(0, 0); },
  cancelarVenta: el => {
    const s = SALE.get(el.dataset.id); if (!s) return;
    const m = openModal(`${mh("Cancelar venta")}
      <p>Venta de las <b>${hora(s.f)}</b> por <b>${money(s.tot)}</b> (vendió ${esc(s.v)}).<br>Los productos regresan al inventario y la venta deja de contar.</p>
      <label class="f"><span>¿Quién cancela?</span><input class="input" id="cv" value="${esc(S.local.lastSeller)}"></label>
      <label class="f" style="margin-top:10px"><span>Motivo (opcional)</span><input class="input" id="cm" placeholder="Ej. se cobró dos veces"></label>
      <div class="mf"><button class="btn" type="button" data-act="cerrar">No cancelar</button><button class="btn bad" type="button" id="cok">Sí, cancelar venta</button></div>`);
    $("#cok", m).onclick = async () => {
      const v = $("#cv", m).value.trim(); if (!v) return toast("Escribe quién cancela");
      await addOp({ t: "cancelar", venta: s.id, v, motivo: $("#cm", m).value.trim() });
      closeModal(); toast("Venta cancelada"); vVentas();
    };
  },
  exportVentas: () => {
    const r = rangeOf(H.mode, H.ref);
    const rows = [["Fecha", "Hora", "Vendedor", "Cantidad", "Descripción", "Precio", "Subtotal", "Total venta", "Efectivo", "Tarjeta", "Comisión", "Estado", "Folio"]];
    for (const s of SALES.filter(s => inRange(s, r)).sort((a, b) => new Date(a.f) - new Date(b.f)))
      s.items.forEach((it, i) => rows.push([dayKey(s.f), hora(s.f), s.v, it.q, it.n, it.p, r2(it.p * it.q), i ? "" : s.tot, i ? "" : s.ef, i ? "" : s.tj, i ? "" : s.com, s.cx ? "Cancelada" : "", s.id]));
    download(`ventas-yebra-${r.label.replace(/[^\wáéíóúñ]+/gi, "-")}.csv`, csv(rows));
  },

  ePer: el => { E.per = el.dataset.k; if (E.per !== "anio") E.year = new Date().getFullYear(); vEstadisticas(); },
  eYear: el => { E.year += +el.dataset.d; vEstadisticas(); },
  sinVenta: () => {
    const list = (ACT._sinVenta || []).slice().sort((a, b) => b.s * (b.p || 0) - a.s * (a.p || 0));
    openModal(`${mh("Con existencia y sin ventas")}<p class="muted">Productos que hay en la tienda pero no se vendieron en este periodo (los de más valor primero).</p>
      <ol class="rank">${list.slice(0, 300).map(p => `<li><span class="n">${esc(p.n)}</span><span class="v">${int(p.s)} pzas</span></li>`).join("")}</ol>
      ${list.length > 300 ? `<p class="muted">…y ${int(list.length - 300)} más.</p>` : ""}`, { wide: true });
  },

  conectar: async () => {
    let url = $("#su").value.trim(), clave = $("#sk").value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return toast("La dirección debe empezar con https://script.google.com/");
    if (!clave) return toast("Escribe la clave");
    toast("Probando conexión…", 8000);
    try { await call({ desde: 0, ops: [], soloProbar: true }, url, clave); }
    catch (e) { return toast("⚠️ No se pudo conectar: " + (String(e.message).includes("clave") ? "la clave no coincide" : "revisa la dirección")); }
    S.local.url = url; S.local.clave = clave; await saveLocal();
    S.serverOps = []; await store.set("serverOps", []);
    toast("✅ Conectada. Subiendo y bajando ventas…");
    await sync(); vAjustes();
  },
  desconectar: async () => {
    if (!confirm("¿Desconectar de Google Sheets? Este equipo dejará de ver las ventas de los otros.")) return;
    // lo que ya estaba en la nube se queda en este equipo como local
    S.pending = S.serverOps.concat(S.pending); S.serverOps = [];
    S.local.url = ""; await saveLocal(); await store.set("pending", S.pending); await store.set("serverOps", []);
    paintSync(); vAjustes();
  },
  syncAhora: () => sync(true),
  agregarVend: async () => {
    const v = $("#nv").value.trim(); if (!v) return;
    if (!CFG.vendedores.includes(v)) await setCfg({ vendedores: [...CFG.vendedores, v] });
    vAjustes();
  },
  quitarVend: async el => { await setCfg({ vendedores: CFG.vendedores.filter(v => v !== el.dataset.v) }); vAjustes(); },
  guardarCom: async () => {
    const min = parseMoney($("#cmin").value), val = parseMoney($("#cval").value), sm = parseInt($("#smin").value, 10);
    if (!(min >= 0) || !(val >= 0)) return toast("Revisa los números");
    await setCfg({ com: { min: r2(min), val: r2(val), tipo: $("#ctipo").value }, stockMin: isFinite(sm) ? sm : CFG.stockMin });
    toast("✓ Guardado"); vAjustes();
  },
  nuevoServ: () => servModal(null),
  editServ: el => servModal(CFG.servicios.find(s => s.id === el.dataset.id)),
  respaldo: () => download(`respaldo-papeleria-yebra-${dayKey(new Date())}.json`, JSON.stringify({ app: "papeleria-yebra", fecha: new Date().toISOString(), serverOps: S.serverOps, pending: S.pending }), "application/json")
};

const VIEWS = { vender: vVender, inventario: vInventario, ventas: vVentas, estadisticas: vEstadisticas, ajustes: vAjustes };

/* ================= arranque ================= */
(async function start() {
  const [serverOps, pending, local] = await Promise.all([store.get("serverOps"), store.get("pending"), store.get("local")]);
  S.serverOps = serverOps || []; S.pending = pending || [];
  Object.assign(S.local, local || {});
  if (!S.local.device) { S.local.device = uid("eq"); saveLocal(); }
  cart = Array.isArray(S.local.cart) ? S.local.cart : [];
  rebuild();
  $("#helpBtn").onclick = () => ayuda(false);
  $("#syncPill").onclick = () => S.local.url ? sync(true) : go("ajustes");
  const start = location.hash.slice(1);
  go(VIEWS[start] ? start : "vender");
  paintSync();
  if (!S.local.welcomed) { S.local.welcomed = true; saveLocal(); ayuda(true); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  sync();
  setInterval(() => { if (document.visibilityState === "visible") sync(); }, 45000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
  addEventListener("online", () => sync());
  addEventListener("hashchange", () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== current) go(h); });
})();
