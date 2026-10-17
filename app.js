/* Papelería Yebra — caja, inventario, surtido, ventas y estadísticas.
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
const plural = (n, a, b) => `${int(n)} ${n === 1 ? a : b}`;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES3 = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const hora = d => new Date(d).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" }).replace(/\.$/, "");
const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fechaLarga = d => { d = new Date(d); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* íconos de línea (estilo Lucide) */
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.17-2.87L3 3"/><path d="m15 9 6-6"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  idcard: '<rect width="20" height="16" x="2" y="4" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16a3 3 0 0 1 6 0"/><path d="M14 9h5M14 13h5"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-2 1 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-2 1 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-2 1 2.7 2.7 0 0 1-2-1 2 2 0 0 1-2-1z"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'
};
const ic = (name, size) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${size ? ` style="width:${size}px;height:${size}px"` : ""}>${ICONS[name] || ICONS.tag}</svg>`;

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
    } catch (e) { try { localStorage.setItem("yebra:" + k, JSON.stringify(v)); } catch (_) { toast("No se pudo guardar en este dispositivo"); } }
  }
  return { get, set };
})();

/* ================= datos ================= */
const SERVICIOS_INICIALES = [
  { id: "s1", g: "Impresiones y copias", n: "Copia blanco y negro", tipo: "pieza", p: 1, k: 0 },
  { id: "s2", g: "Impresiones y copias", n: "Copia a color", tipo: "pieza", p: 5, k: 0 },
  { id: "s3", g: "Impresiones y copias", n: "Impresión blanco y negro", tipo: "pieza", p: 3, k: 0 },
  { id: "s4", g: "Impresiones y copias", n: "Impresión a color", tipo: "pieza", p: 8, k: 0 },
  { id: "s5", g: "Impresiones y copias", n: "Escaneo", tipo: "pieza", p: 5, k: 0 },
  { id: "s6", g: "Impresiones y copias", n: "Enmicado", tipo: "pieza", p: 15, k: 0 },
  { id: "s7", g: "Impresiones y copias", n: "Engargolado", tipo: "pieza", p: 35, k: 0 },
  { id: "s10", g: "Trámites", n: "CURP", tipo: "variable", p: 10, k: 0 },
  { id: "s11", g: "Trámites", n: "Acta de nacimiento", tipo: "variable", p: 0, k: 0 },
  { id: "s12", g: "Trámites", n: "Constancia de situación fiscal (RFC)", tipo: "variable", p: 0, k: 0 },
  { id: "s13", g: "Trámites", n: "Otro trámite", tipo: "variable", p: 0, k: 0 },
  { id: "s20", g: "Pagos y recargas", n: "Pago de luz", tipo: "pago", p: 0, k: 0, cargo: 10 },
  { id: "s21", g: "Pagos y recargas", n: "Pago de agua", tipo: "pago", p: 0, k: 0, cargo: 10 },
  { id: "s22", g: "Pagos y recargas", n: "Recarga de celular", tipo: "pago", p: 0, k: 0, cargo: 0, rapidos: [20, 30, 50, 100, 150, 200] },
  { id: "s23", g: "Pagos y recargas", n: "Otro pago de servicio", tipo: "pago", p: 0, k: 0, cargo: 10 },
  { id: "s30", g: "Trabajos escolares", n: "Maqueta", tipo: "variable", p: 0, k: 0 },
  { id: "s31", g: "Trabajos escolares", n: "Manualidad", tipo: "variable", p: 0, k: 0 },
  { id: "s32", g: "Trabajos escolares", n: "Trabajo escolar / tarea", tipo: "variable", p: 0, k: 0 },
  { id: "s33", g: "Trabajos escolares", n: "Otro servicio", tipo: "variable", p: 0, k: 0 }
];
const SVC_IC = { s1: "copy", s2: "copy", s3: "printer", s4: "printer", s5: "scan", s6: "layers", s7: "book", s10: "idcard", s11: "file", s12: "file", s13: "clipboard", s20: "zap", s21: "droplet", s22: "phone", s23: "receipt", s30: "box", s31: "scissors", s32: "pencil", s33: "star" };
const ICON_CHOICES = [["tag", "Etiqueta"], ["copy", "Copias"], ["printer", "Impresora"], ["scan", "Escaneo"], ["layers", "Enmicado"], ["book", "Engargolado"], ["file", "Documento"], ["idcard", "Credencial"], ["clipboard", "Trámite"], ["zap", "Luz"], ["droplet", "Agua"], ["phone", "Celular"], ["receipt", "Recibo"], ["box", "Maqueta"], ["scissors", "Manualidad"], ["pencil", "Tarea"], ["star", "Otro"]];
const svcIcon = s => s.ic || SVC_IC[s.id] || "tag";

const AJUSTES_INICIALES = {
  vendedores: [],
  servicios: SERVICIOS_INICIALES,
  com: { min: 50, tipo: "fijo", val: 5 },
  stockMin: 2
};

const S = {
  serverOps: [],      // movimientos ya guardados en Google Sheets
  pending: [],        // movimientos hechos aquí que faltan por subir (o todos, si no hay Sheets)
  local: { url: "", clave: "", device: "", tips: {}, welcomed: false, cart: [], lastSeller: "", lastView: "", surtir: {} },
  sync: { state: "off", msg: "" }
};
let P = new Map();     // productos (id -> producto)
let SALES = [];        // ventas
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
  soldCache.clear();
}

function applyOp(op) {
  switch (op.t) {
    case "venta": {
      if (SALE.has(op.id)) return;
      const sale = { ...op, cx: false };
      SALES.push(sale); SALE.set(op.id, sale);
      for (const it of op.items) if (it.pid && P.has(it.pid)) P.get(it.pid).s -= it.q;
      soldCache.clear();
      break;
    }
    case "cancelar": {
      const sale = SALE.get(op.venta);
      if (!sale || sale.cx) return;
      sale.cx = true; sale.cxv = op.v; sale.cxf = op.f; sale.cxm = op.motivo;
      for (const it of sale.items) if (it.pid && P.has(it.pid)) P.get(it.pid).s += it.q;
      soldCache.clear();
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
  paintNav();
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

/* piezas vendidas por producto en los últimos N días */
const soldCache = new Map();
function soldSince(days) {
  if (soldCache.has(days)) return soldCache.get(days);
  const since = Date.now() - days * 864e5, m = new Map();
  for (const s of SALES) {
    if (s.cx || new Date(s.f).getTime() < since) continue;
    for (const it of s.items) if (it.pid) m.set(it.pid, (m.get(it.pid) || 0) + it.q);
  }
  soldCache.set(days, m);
  return m;
}

/* productos que hay que comprar, con cantidad sugerida */
function restockList() {
  const v30 = soldSince(30), v90 = soldSince(90), marks = S.local.surtir || {};
  const out = [];
  for (const p of P.values()) {
    if (p.off) continue;
    const min = stockMin(p), manual = marks[p.id]?.manual;
    if (p.s > min && !manual) continue;
    const sold = v30.get(p.id) || 0, sold90 = v90.get(p.id) || 0;
    const target = Math.max(min * 2, Math.ceil(sold * 1.25), min + 1);
    const sug = Math.max(1, target - Math.max(0, p.s));
    out.push({ p, sold, sold90, sug, min, out: p.s <= 0, manual: !!manual });
  }
  out.sort((a, b) => b.sold - a.sold || b.sold90 - a.sold90 || (b.out - a.out) || a.p.n.localeCompare(b.p.n, "es"));
  return out;
}
const buyQty = r => S.local.surtir[r.p.id]?.q ?? r.sug;
const isBought = id => !!S.local.surtir[id]?.ok;

/* ================= sincronización con Google Sheets ================= */
let syncing = false, syncTimer = null;
function syncSoon(ms = 1000) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }

async function sync(manual) {
  if (!S.local.url) { S.sync.state = "off"; paintSync(); return; }
  if (syncing) return;
  if (!navigator.onLine) { S.sync.state = "warn"; S.sync.msg = "Sin internet"; paintSync(); return; }
  syncing = true; S.sync.state = "busy"; paintSync();
  try {
    const desde = S.serverOps.length;
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
    if (manual) toast("Todo está al día");
  } catch (e) {
    S.sync.state = "warn";
    S.sync.msg = String(e.message || e).includes("clave") ? "Clave incorrecta" : "Sin conexión";
    if (manual) toast("No se pudo conectar: " + S.sync.msg);
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

function syncText() {
  if (!S.local.url) return ["off", "Solo en este equipo. Toca para conectar el celular y la computadora."];
  if (S.sync.state === "busy") return ["busy", "Guardando…"];
  if (S.sync.state === "ok") return ["ok", "Guardado en la nube. Celular y computadora al día."];
  return ["warn", `${S.sync.msg || "Sin conexión"}. Las ventas se guardan aquí y se suben solas cuando regrese el internet.`];
}
function paintSync() {
  const [st, txt] = syncText();
  const b = $("#syncBtn");
  b.innerHTML = ic(S.local.url ? (st === "busy" ? "refresh" : "cloud") : "phone") + `<span class="dot ${st}"></span>`;
  b.title = txt; b.setAttribute("aria-label", txt);
}

/* ================= navegación ================= */
const SECCIONES = [
  { id: "inicio", ic: "home", t: "Inicio", h: "Resumen del inventario" },
  { id: "vender", ic: "cart", t: "Vender", h: "Caja" },
  { id: "surtir", ic: "truck", t: "Surtir", h: "Lista para surtir" },
  { id: "inventario", ic: "box", t: "Inventario", h: "Inventario" },
  { id: "ventas", ic: "receipt", t: "Ventas", h: "Historial de ventas" },
  { id: "estadisticas", ic: "chart", t: "Estadísticas", h: "Estadísticas" },
  { id: "ajustes", ic: "settings", t: "Ajustes", h: "Ajustes" }
];
const BOTTOM = ["inicio", "vender", "surtir", "ventas", "mas"];
let current = "inicio";

function urgentCount() { // agotados que sí se venden
  const v90 = soldSince(90); let n = 0;
  for (const p of P.values()) if (!p.off && p.s <= 0 && (v90.get(p.id) || 0) > 0) n++;
  return n;
}
function paintNav() {
  const n = urgentCount();
  const badge = id => id === "surtir" && n ? `<span class="cnt">${n > 99 ? "99+" : n}</span>` : "";
  $("#side").innerHTML = `<div class="logo"><img src="icons/icon-192.png" width="36" height="36" alt=""><b>Papelería<br>Yebra</b></div>` +
    SECCIONES.map(s => `<button type="button" data-go="${s.id}" class="${s.id === current ? "on" : ""}">${ic(s.ic)}<span>${s.t}</span>${badge(s.id)}</button>`).join("") +
    `<div class="foot">Caja e inventario</div>`;
  const inMore = !BOTTOM.includes(current);
  $("#bottom").innerHTML = BOTTOM.map(id => {
    if (id === "mas") return `<button type="button" data-act="masMenu" class="${inMore ? "on" : ""}">${ic("grid")}<span>Más</span></button>`;
    const s = SECCIONES.find(x => x.id === id);
    return `<button type="button" data-go="${id}" class="${id === current ? "on" : ""}">${ic(s.ic)}<span>${s.t}</span>${badge(id)}</button>`;
  }).join("");
}
function go(id, keepScroll) {
  current = id;
  paintNav();
  $("#pageTitle").textContent = SECCIONES.find(s => s.id === id).h;
  document.title = `${SECCIONES.find(s => s.id === id).t} · Papelería Yebra`;
  VIEWS[id]();
  if (!keepScroll) window.scrollTo(0, 0);
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  if (S.local.lastView !== id) { S.local.lastView = id; saveLocal(); }
}
function refresh(fromSync) {
  paintNav();
  if (!$("#modal").hidden && fromSync) { if (current === "vender") paintTicket(); return; }
  if (current === "vender") { paintResults(); paintTicket(); return; }
  if (fromSync && document.activeElement && document.activeElement.matches("input,select,textarea")) return;
  VIEWS[current]();
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) { if (!$("#modal").hidden) closeModal(); go(g.dataset.go); return; }
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
const mh = t => `<div class="mh"><h2>${t}</h2><button class="icon-btn" type="button" data-act="cerrar" aria-label="Cerrar">${ic("x")}</button></div>`;
const empty = (icon, html) => `<div class="empty"><span class="ei">${ic(icon)}</span><div>${html}</div></div>`;

function tip(id, html) {
  if (S.local.tips[id]) return "";
  return `<div class="tip">${ic("bulb")}<div>${html}</div><button class="x" data-act="tipOff" data-id="${id}" aria-label="Ocultar">${ic("x", 16)}</button></div>`;
}
const kpi = ({ icon, val, label, cls = "", go: to = "", act = "", data = "" }) => {
  const tag = to || act ? "button" : "div";
  const attrs = to ? ` data-go="${to}"` : act ? ` data-act="${act}" ${data}` : "";
  return `<${tag} class="kpi ${cls}" ${tag === "button" ? 'type="button"' : ""}${attrs}><span class="kt"><span class="kic">${ic(icon)}</span>${tag === "button" ? ic("arrow") : ""}</span><b>${val}</b><small>${label}</small></${tag}>`;
};

/* ================= INICIO (resumen) ================= */
const DONUT_COLORS = ["#3B82F6", "#FBBF24", "#A78BFA", "#4FD1A5", "#1E40AF", "#60A5FA", "#F472B6", "#94A3B8"];
function donut(rows, total) {
  const R = 64, W = 30, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = rows.map((r, i) => {
    const len = total ? r.v / total * C : 0;
    const s = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}" stroke-width="${W}" stroke-dasharray="${Math.max(0, len - 1.5)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 90 90)"/>`;
    acc += len; return s;
  }).join("");
  return `<svg viewBox="0 0 180 180" width="190" height="190" role="img" aria-label="Gráfica por categoría"><circle r="${R}" cx="90" cy="90" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${W}"/>${segs}<text x="90" y="88" text-anchor="middle" fill="#fff" font-family="JetBrains Mono, monospace" font-size="22">${int(total)}</text><text x="90" y="107" text-anchor="middle" fill="#C7D0E4" font-size="10">productos</text></svg>`;
}

function vInicio() {
  const rs = restockList();
  const outN = rs.filter(r => r.out).length, lowN = rs.length - outN;
  const urgent = urgentCount();
  const now = new Date();
  const today = totals(SALES.filter(s => inRange(s, rangeOf("dia", now))));
  const vis = [...P.values()].filter(p => !p.off);
  const valor = vis.reduce((a, p) => a + Math.max(0, p.s) * (p.p || 0), 0);

  // ventas por mes: este año vs año pasado
  const y = now.getFullYear();
  const cur = Array(12).fill(0), prev = Array(12).fill(0); let curN = 0;
  for (const s of SALES) {
    if (s.cx) continue;
    const d = new Date(s.f);
    if (d.getFullYear() === y) { cur[d.getMonth()] += s.tot; curN++; }
    else if (d.getFullYear() === y - 1) prev[d.getMonth()] += s.tot;
  }
  const totY = cur.reduce((a, b) => a + b, 0);
  const prevSame = prev.slice(0, now.getMonth() + 1).reduce((a, b) => a + b, 0);
  const pct = prevSame ? (totY - prevSame) / prevSame * 100 : null;
  const maxB = Math.max(...cur, ...prev, 1);
  const best = totY ? cur.indexOf(Math.max(...cur)) : -1;

  // por categoría
  const byCat = new Map();
  for (const r of rs) byCat.set(r.p.c, (byCat.get(r.p.c) || 0) + 1);
  const catRows = [...byCat.entries()].map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v);

  const top = rs.slice(0, 10);
  view.innerHTML = `
  ${tip("inicio", "Aquí ves de un vistazo lo que falta en la tienda. Toca <b>Productos por surtir</b> para abrir la lista de compras.")}
  <div class="kpis five">
    ${kpi({ icon: "cart", val: int(rs.length), label: "Productos por surtir", cls: "alert", go: "surtir" })}
    ${kpi({ icon: "ban", val: int(outN), label: "Agotados", act: "surtirFil", data: 'data-k="agotado"' })}
    ${kpi({ icon: "alert", val: int(lowN), label: "Con poco stock", act: "surtirFil", data: 'data-k="poco"' })}
    ${kpi({ icon: "receipt", val: money(today.tot), label: `Ventas de hoy (${int(today.n)})`, go: "ventas" })}
    ${kpi({ icon: "wallet", val: money(valor), label: "Valor del inventario", go: "inventario" })}
  </div>
  <div class="dash">
    <div class="card white d-chart">
      <div class="chart-head">
        <div><h3>Ventas por mes</h3><span class="big">${money(totY)}</span><small>Vendido en ${y} · ${plural(curN, "venta", "ventas")}${pct !== null ? ` · <span class="${pct >= 0 ? "up" : "down"}">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%</span> vs ${y - 1}` : ""}</small></div>
        <div class="keys"><span>${y}</span><span class="l">${y - 1}</span></div>
      </div>
      <div class="gwrap"><div class="gbars">${cur.map((v, i) => `<div class="g ${i === best ? "top" : ""}" title="${cap(MESES[i])}: ${money(v)} (${y - 1}: ${money(prev[i])})"><i style="height:${v / maxB * 100}%"></i><i class="l" style="height:${prev[i] / maxB * 100}%"></i></div>`).join("")}</div>
      <div class="glabels">${MES3.map(m => `<span>${m}</span>`).join("")}</div></div>
      ${urgent ? `<button class="banner" type="button" data-act="surtirFil" data-k="vende">${ic("alert", 16)}<span><b>${plural(urgent, "producto que sí se vende está agotado", "productos que sí se venden están agotados")}.</b> Ver lista para surtir</span></button>` : best >= 0 ? `<div class="banner">${ic("trophy", 16)}<span><b>${cap(MESES[best])}</b> es el mes con más ventas del año.</span></div>` : ""}
    </div>
    <div class="dark-card dside">
      <h3 style="font-weight:500">Por surtir por categoría</h3>
      <span class="big">${int(rs.length)}</span> <small>productos</small>
      <div class="donut-wrap">${donut(catRows, rs.length)}</div>
      <ul class="legend">${catRows.map((r, i) => `<li><span class="sw" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>${esc(r.l)}<span class="v">${(r.v / rs.length * 100).toFixed(0)}% <small>(${int(r.v)})</small></span></li>`).join("") || `<li>Todo está surtido</li>`}</ul>
      <button class="btn pri" type="button" data-go="surtir" style="width:100%;margin-top:14px">${ic("truck")} Abrir lista para surtir</button>
    </div>
    <div class="card white d-table">
      <div class="head" style="margin-bottom:10px"><h3>Recomendación de surtido</h3><button class="btn sm" type="button" data-go="surtir">Ver todo ${ic("arrow", 15)}</button></div>
      ${top.length ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Producto</th><th class="hs">Categoría</th><th class="n">Hay</th><th class="n hs">Mín.</th><th class="n">Vendió 30 d</th><th class="n">Comprar</th></tr></thead>
        <tbody>${top.map(r => `<tr><td class="cut"><button class="lnk" type="button" data-act="editProd" data-id="${r.p.id}" title="${esc(r.p.n)}">${esc(r.p.n)}</button></td><td class="hs">${esc(r.p.c)}</td><td class="n">${r.out ? `<span class="badge bad">0</span>` : int(r.p.s)}</td><td class="n hs">${int(r.min)}</td><td class="n">${int(r.sold)}</td><td class="n"><b>${int(buyQty(r))}</b></td></tr>`).join("")}</tbody>
      </table></div>` : empty("check", "No falta nada por surtir.")}
    </div>
  </div>`;
}

/* ================= SURTIR (lista de compras) ================= */
const SU = { fil: "todos", cat: "", q: "", tab: "pend", limit: 120 };
function vSurtir() {
  const rs = restockList();
  const marks = S.local.surtir;
  const words = norm(SU.q).split(/\s+/).filter(Boolean);
  const pass = r => (SU.fil === "todos" || (SU.fil === "agotado" && r.out) || (SU.fil === "poco" && !r.out) || (SU.fil === "vende" && r.sold90 > 0) || (SU.fil === "manual" && r.manual)) &&
    (!SU.cat || r.p.c === SU.cat) && words.every(w => r.p.key.includes(w));
  const pend = rs.filter(r => !isBought(r.p.id)), done = rs.filter(r => isBought(r.p.id));
  const list = (SU.tab === "pend" ? pend : done).filter(pass);
  const gasto = pend.reduce((a, r) => a + (r.p.k || 0) * buyQty(r), 0);
  const cuenta = k => pend.filter(r => k === "todos" || (k === "agotado" && r.out) || (k === "poco" && !r.out) || (k === "vende" && r.sold90 > 0) || (k === "manual" && r.manual)).length;

  const groups = new Map();
  for (const r of list.slice(0, SU.limit)) { if (!groups.has(r.p.c)) groups.set(r.p.c, []); groups.get(r.p.c).push(r); }

  view.innerHTML = `
  ${tip("surtir", "Esta es tu <b>lista para ir con el proveedor</b>. Salen los productos agotados y los que tienen poco. Ajusta cuántos comprar, marca con la palomita lo que ya compraste y al regresar toca <b>Sumar al inventario</b>.")}
  <div class="kpis four scroll-m">
    ${kpi({ icon: "ban", val: int(rs.filter(r => r.out).length), label: "Agotados", cls: "alert" })}
    ${kpi({ icon: "alert", val: int(rs.filter(r => !r.out).length), label: "Con poco stock" })}
    ${kpi({ icon: "check", val: int(done.length), label: "Ya comprados", cls: "good" })}
    ${kpi({ icon: "wallet", val: money(gasto), label: "Costo aprox. por comprar" })}
  </div>
  <div class="row wrap" style="margin-bottom:12px;justify-content:space-between">
    <div class="seg"><button type="button" class="${SU.tab === "pend" ? "on" : ""}" data-act="suTab" data-k="pend">Por comprar (${int(pend.length)})</button><button type="button" class="${SU.tab === "done" ? "on" : ""}" data-act="suTab" data-k="done">Ya compré (${int(done.length)})</button></div>
    <div class="row"><button class="btn sm" type="button" data-act="suAgregar">${ic("plus", 15)} Agregar producto</button><button class="btn sm" type="button" data-act="suExport">${ic("download", 15)} Excel</button></div>
  </div>
  <div class="search" style="margin-bottom:10px">${ic("search")}<input id="sq" class="input" type="search" placeholder="Buscar en la lista…" value="${esc(SU.q)}" autocomplete="off"></div>
  <div class="chips scroll" style="margin-bottom:8px">
    ${[["todos", "Todo"], ["agotado", "Agotados"], ["poco", "Poco stock"], ["vende", "Se venden"], ["manual", "Agregados por mí"]].map(([k, t]) => `<button class="chip ${SU.fil === k ? "on" : ""}" type="button" data-act="suFil" data-k="${k}">${t} <span class="mono">${int(cuenta(k))}</span></button>`).join("")}
  </div>
  <div class="chips scroll">
    <button class="chip ${!SU.cat ? "on" : ""}" type="button" data-act="suCat" data-k="">Todas las categorías</button>
    ${categorias().map(c => `<button class="chip ${SU.cat === c ? "on" : ""}" type="button" data-act="suCat" data-k="${esc(c)}">${esc(c)}</button>`).join("")}
  </div>
  <div id="suList">${!list.length ? empty(SU.tab === "pend" ? "check" : "cart", SU.tab === "pend" ? "No hay nada pendiente con este filtro." : "Todavía no marcas nada como comprado.") :
    [...groups.entries()].map(([c, rows]) => `<div class="group-t"><span>${esc(c)}</span><span class="mono">${rows.length}</span></div><div class="list">${rows.map(surtirItem).join("")}</div>`).join("") +
    (list.length > SU.limit ? `<div style="text-align:center;margin-top:14px"><button class="btn" type="button" data-act="suMas">Ver más (${int(list.length - SU.limit)})</button></div>` : "")}
  </div>
  <div class="action-bar">
    <button class="btn share" type="button" data-act="suShare">${ic("share")} Compartir</button>
    <button class="btn ${done.length ? "dark" : ""}" type="button" data-act="suRegistrar" ${done.length ? "" : "disabled"}>${ic("check")} Sumar al inventario (${int(done.length)})</button>
  </div>`;
  const sq = $("#sq");
  sq.addEventListener("input", () => { const pos = sq.selectionStart; SU.q = sq.value; SU.limit = 120; vSurtir(); const n = $("#sq"); n.focus(); n.setSelectionRange(pos, pos); });
  $$("[data-sqid]").forEach(inp => inp.addEventListener("change", () => {
    const v = Math.max(1, Math.round(parseMoney(inp.value) || 1));
    setMark(inp.dataset.sqid, { q: v }); vSurtir();
  }));
}
function surtirItem(r) {
  const p = r.p, done = isBought(p.id);
  const stockB = r.out ? `<span class="badge bad">Agotado</span>` : `<span class="badge warn">Hay ${int(p.s)}</span>`;
  const salesB = r.sold ? `<span class="badge pri">${ic("trend")} Vendió ${int(r.sold)} en 30 días</span>` : r.sold90 ? `<span class="badge">Vendió ${int(r.sold90)} en 90 días</span>` : `<span>Sin ventas recientes</span>`;
  return `<div class="surtir-item ${done ? "done" : ""}">
    <button class="tick" type="button" data-act="suTick" data-id="${p.id}" aria-label="${done ? "Desmarcar" : "Marcar como comprado"}">${ic("check")}</button>
    <div><div class="nm">${esc(p.n)}</div><div class="meta">${stockB}<span>Mín. ${int(r.min)}</span>${salesB}${p.k ? `<span>Costo ${money(p.k)}</span>` : ""}${r.manual ? `<span class="badge">Agregado por ti</span>` : ""}</div></div>
    <div class="buy"><small>Comprar</small>
      <span class="row" style="gap:8px"><span class="qty"><button type="button" data-act="suQ" data-id="${p.id}" data-d="-1" aria-label="Menos">${ic("minus", 16)}</button><input inputmode="numeric" data-sqid="${p.id}" value="${buyQty(r)}" aria-label="Cantidad a comprar"><button type="button" data-act="suQ" data-id="${p.id}" data-d="1" aria-label="Más">${ic("plus", 16)}</button></span>
      <small>${esc(p.u.toLowerCase())}</small></span>
    </div>
  </div>`;
}
function setMark(id, patch) {
  const m = S.local.surtir[id] || {};
  Object.assign(m, patch);
  S.local.surtir[id] = m; saveLocal();
}
function shoppingText() {
  const rs = restockList().filter(r => !isBought(r.p.id));
  const by = new Map();
  for (const r of rs) { if (!by.has(r.p.c)) by.set(r.p.c, []); by.get(r.p.c).push(r); }
  let t = `Lista para surtir · Papelería Yebra\n${cap(fechaLarga(new Date()))}\n`;
  for (const [c, rows] of by) t += `\n${c.toUpperCase()}\n` + rows.map(r => `- ${buyQty(r)} ${r.p.u.toLowerCase()} ${r.p.n}${r.out ? " (agotado)" : ` (hay ${r.p.s})`}`).join("\n") + "\n";
  return t;
}

/* ================= VENDER ================= */
let cart = [];
let query = "";
const saveCart = () => { S.local.cart = cart; saveLocal(); };
const cartTotal = () => r2(cart.reduce((a, l) => a + l.q * l.p, 0));
const cartCount = () => cart.reduce((a, l) => a + (l.fixed ? 1 : l.q), 0);

function vVender() {
  view.innerHTML = `
  ${tip("vender", "<b>Así se vende:</b> 1) Busca el producto o toca un servicio. 2) Revisa la cuenta. 3) Toca <b>Cobrar</b>, escoge quién vendió y cómo pagó. La hora se pone sola.")}
  <div class="pos">
    <section>
      <div class="search">${ic("search")}<input id="q" class="input" type="search" placeholder="Busca un producto o servicio: cuaderno, copia, foamy…" autocomplete="off" enterkeyhint="search" value="${esc(query)}"></div>
      <div id="results" class="results"></div>
      <div id="svcs" class="svc-groups"></div>
      <div style="margin-top:14px"><button class="btn" type="button" data-act="libre">${ic("plus")} Vender algo que no está en la lista</button></div>
    </section>
    <aside class="ticket card desk" id="ticket"></aside>
  </div>
  <button class="cart-bar" id="cartBar" type="button" data-act="verTicket" hidden></button>`;
  const q = $("#q");
  q.addEventListener("input", () => { query = q.value; paintResults(); });
  q.addEventListener("keydown", e => { if (e.key === "Enter") { const first = $("#results [data-act]"); if (first) first.click(); } });
  paintServices(); paintResults(); paintTicket();
  if (matchMedia("(pointer:fine)").matches) q.focus();
}

function searchProducts(q, limit = 40) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const p of P.values()) if (!p.off && words.every(w => p.key.includes(w))) out.push(p);
  const w0 = words[0];
  out.sort((a, b) => (b.key.startsWith(w0) - a.key.startsWith(w0)) || ((b.s > 0) - (a.s > 0)) || a.n.localeCompare(b.n, "es"));
  return out.slice(0, limit);
}

function paintResults() {
  const box = $("#results"); if (!box) return;
  if (!query.trim()) {
    const top = topSold(8);
    box.innerHTML = top.length ? `<small style="font-weight:500">Lo que más se vende:</small><div class="chips">${top.map(p => `<button class="chip" type="button" data-act="addProd" data-id="${p.id}">${esc(p.n)}</button>`).join("")}</div>` : "";
    return;
  }
  const words = norm(query).split(/\s+/).filter(Boolean);
  const svcs = CFG.servicios.filter(s => words.every(w => norm(s.n + " " + s.g).includes(w)));
  const prods = searchProducts(query);
  if (!prods.length && !svcs.length) {
    box.innerHTML = empty("search", `No encontré “${esc(query)}”.<br><button class="btn" style="margin-top:10px" type="button" data-act="libre">${ic("plus")} Venderlo de todos modos</button>`);
    return;
  }
  box.innerHTML = svcs.map(s => `<button class="res" type="button" data-act="addSvc" data-id="${s.id}"><span class="sic">${ic(svcIcon(s))}</span><span class="grow"><span class="nm">${esc(s.n)}</span><br><span class="meta">Servicio · ${esc(s.g)}</span></span><span class="pr">${s.tipo === "pieza" && s.p ? money(s.p) : ""}</span><span class="add">${ic("plus")}</span></button>`).join("") +
    prods.map(p => {
      const st = p.s <= 0 ? `<span class="badge bad">Agotado</span>` : p.s <= stockMin(p) ? `<span class="badge warn">Quedan ${int(p.s)}</span>` : `<span class="badge">Hay ${int(p.s)}</span>`;
      return `<button class="res" type="button" data-act="addProd" data-id="${p.id}"><span class="grow"><span class="nm">${esc(p.n)}</span><br><span class="meta">${esc(p.c)} · ${st}</span></span><span class="pr">${p.p ? money(p.p) : `<span class="badge warn">Sin precio</span>`}</span><span class="add">${ic("plus")}</span></button>`;
    }).join("");
}

function paintServices() {
  const groups = {};
  for (const s of CFG.servicios) (groups[s.g] ||= []).push(s);
  $("#svcs").innerHTML = Object.entries(groups).map(([g, list]) => `
    <div class="svc-group"><h3>${esc(g)}</h3><div class="svc-grid">${list.map(s => `
      <button class="svc" type="button" data-act="addSvc" data-id="${s.id}"><span class="si">${ic(svcIcon(s))}</span><span class="t">${esc(s.n)}</span><span class="p">${s.tipo === "pieza" ? (s.p ? `<span class="mono">${money(s.p)}</span> c/u` : "") : s.tipo === "pago" ? "Monto + comisión" : "Precio variable"}</span></button>`).join("")}
    </div></div>`).join("");
}

function ticketHTML() {
  if (!cart.length) return `<h2>Venta actual</h2>${empty("cart", "Todavía no hay nada.<br>Busca un producto o toca un servicio.")}`;
  return `<h2>Venta actual <button class="btn sm bad" type="button" data-act="vaciar">Vaciar</button></h2>
  <div class="lines">${cart.map((l, i) => `
    <div class="line">
      <div class="d">${esc(l.n)}</div><div class="sub">${money(l.q * l.p)}</div>
      <div class="ctl">
        ${l.fixed ? `<span class="muted" style="font-size:.82rem">1 servicio</span>` : `<span class="qty"><button type="button" data-act="qty" data-i="${i}" data-d="-1" aria-label="Menos">${ic("minus", 16)}</button><input inputmode="numeric" data-qi="${i}" value="${l.q}" aria-label="Cantidad"><button type="button" data-act="qty" data-i="${i}" data-d="1" aria-label="Más">${ic("plus", 16)}</button></span>`}
        ${l.fixed ? "" : `<button class="price-edit" type="button" data-act="editPrice" data-i="${i}" title="Cambiar precio">${money(l.p)} c/u ${ic("pencil")}</button>`}
        <button class="rm" type="button" data-act="quitar" data-i="${i}">Quitar</button>
      </div>
    </div>`).join("")}</div>
  <div class="total"><span>Total (${int(cartCount())})</span><b>${money(cartTotal())}</b></div>
  <button class="btn ok big" type="button" data-act="cobrar">Cobrar ${money(cartTotal())}</button>`;
}

function bindTicket(root) {
  $$("[data-qi]", root).forEach(inp => inp.addEventListener("change", () => {
    const l = cart[+inp.dataset.qi]; l.q = Math.max(1, Math.round(parseMoney(inp.value) || 1));
    saveCart(); paintTicket();
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
    bar.innerHTML = `<span class="t"><small>${plural(cartCount(), "artículo", "artículos")}</small><b>${money(cartTotal())}</b></span><span class="go">Ver y cobrar ${ic("chevR", 16)}</span>`;
  }
}

function addLine(line) {
  const same = !line.fixed && cart.find(l => !l.fixed && l.p === line.p && (line.pid ? l.pid === line.pid : l.sid === line.sid && l.n === line.n));
  if (same) same.q += line.q; else cart.push(line);
  saveCart(); paintTicket();
  toast(`Agregado: ${line.n}`, 1400);
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
    if ($("#pps", m).checked) { await addOp({ t: "prod", pid: p.id, x: { p: r2(v) } }); paintResults(); }
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
      <p class="muted" style="font-size:.84rem">El monto del recibo no es ganancia; la ganancia es solo tu comisión.</p>
      <div class="note pri" id="stot">Total a cobrar <span class="num">$0.00</span></div>`;
  } else {
    body = `<label class="f"><span>¿Qué es? (descripción)</span><input class="input" id="sd" placeholder="${s.g === "Trabajos escolares" ? "Ej. maqueta del sistema solar" : "Ej. 2 copias certificadas"}" autofocus></label>
      <div class="grid2" style="margin-top:12px">
        <label class="f"><span>Precio al cliente</span><input class="input money" id="sp" inputmode="decimal" value="${s.p || ""}" placeholder="$0.00"></label>
        <label class="f"><span>Lo que te costó (opcional)</span><input class="input money" id="sk" inputmode="decimal" placeholder="$0.00"></label>
      </div>
      <p class="muted" style="font-size:.84rem">“Lo que te costó” sirve para calcular la ganancia (material, pago del trámite, etc.).</p>`;
  }
  const m = openModal(`${mh(esc(s.n))}${body}
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="sok">Agregar a la venta</button></div>`);
  const upd = () => { const t = $("#stot .num", m); if (t) t.textContent = money((parseMoney($("#sm", m).value) || 0) + (parseMoney($("#sc", m).value) || 0)); };
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
    <div class="sumbox" style="margin-bottom:16px"><div class="r"><span>${plural(cartCount(), "artículo o servicio", "artículos o servicios")}</span><b>${money(sub)}</b></div></div>
    <div class="step-t"><span class="n">1</span>¿Quién hizo la venta?</div>
    <div class="chips" id="sellers">${sellers.map(n => `<button class="chip ${n === st.v ? "on" : ""}" type="button" data-seller="${esc(n)}">${ic("user", 15)} ${esc(n)}</button>`).join("")}</div>
    <input class="input" id="sellerIn" placeholder="${sellers.length ? "O escribe otro nombre" : "Escribe tu nombre"}" value="${sellers.includes(st.v) ? "" : esc(st.v)}" style="margin-top:8px" autocomplete="name">
    <div class="step-t" style="margin-top:18px"><span class="n">2</span>¿Cómo paga?</div>
    <div class="pay-opts">
      <button class="pay-opt on" type="button" data-m="ef">${ic("cash")}Efectivo</button>
      <button class="pay-opt" type="button" data-m="tj">${ic("card")}Tarjeta</button>
      <button class="pay-opt" type="button" data-m="mx">${ic("split")}Las dos</button>
    </div>
    <div id="payFields" style="margin-top:14px"></div>
    <div id="paySum" style="margin-top:14px"></div>
    <p class="muted row" style="font-size:.82rem;margin:10px 0 0;gap:6px">${ic("clock", 15)} La fecha y la hora se guardan solas (${fechaLarga(new Date())}, ${hora(new Date())})</p>
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Regresar</button><button class="btn ok" type="button" id="payOk">${ic("check")} Registrar venta</button></div>`);

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
    const cardPart = st.m === "tj" ? sub : st.m === "mx" ? Math.min(sub, Math.max(0, parseMoney(st.tj) || 0)) : 0;
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
    if (c.comAuto > 0) h += `<label class="check" style="margin-bottom:10px"><input type="checkbox" id="comOn" ${st.comOn ? "checked" : ""}> Cobrar comisión por tarjeta (${money(c.comAuto)}): el pago con tarjeta es menor a ${money(CFG.com.min)}</label>`;
    h += `<div class="sumbox">
      <div class="r"><span>Productos y servicios</span><span>${money(sub)}</span></div>
      ${c.com ? `<div class="r"><span>Comisión por tarjeta</span><span>${money(c.com)}</span></div>` : ""}
      <div class="r tot"><span>Total</span><span>${money(c.tot)}</span></div>
      ${st.m !== "ef" ? `<div class="r"><span class="row" style="gap:6px">${ic("card", 16)} Tarjeta</span><b>${money(c.tj)}</b></div>` : ""}
      ${st.m !== "tj" ? `<div class="r"><span class="row" style="gap:6px">${ic("cash", 16)} Efectivo</span><b>${money(c.ef)}</b></div>` : ""}
    </div>`;
    if (st.m !== "ef" && c.tj > 0) h += `<div class="note pri">${ic("card")} Cobra en la terminal <span class="num">${money(c.tj)}</span></div>`;
    if (st.m === "mx" && !(parseMoney(st.tj) > 0)) h += `<div class="note bad">${ic("alert")} Escribe cuánto paga con tarjeta</div>`;
    if (st.m === "mx" && parseMoney(st.tj) >= sub) h += `<div class="note bad">${ic("alert")} Si paga todo con tarjeta, elige “Tarjeta”</div>`;
    if (c.rec !== null && st.m !== "tj") h += c.cam >= 0 ? `<div class="note ok">${ic("cash")} Cambio a entregar <span class="num">${money(c.cam)}</span></div>` : `<div class="note bad">${ic("alert")} Faltan <span class="num">${money(-c.cam)}</span></div>`;
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
    openModal(`<div class="done-ic">${ic("check")}</div><h2 style="text-align:center">Venta registrada</h2>
      <p style="text-align:center" class="muted">${hora(op.f)} · vendió ${esc(v)}</p>
      <div class="sumbox"><div class="r tot" style="border:none;margin:0;padding:0"><span>Total</span><span>${money(op.tot)}</span></div>
      ${op.tj ? `<div class="r"><span>Tarjeta</span><span>${money(op.tj)}</span></div>` : ""}
      ${op.ef ? `<div class="r"><span>Efectivo</span><span>${money(op.ef)}</span></div>` : ""}
      ${op.rec ? `<div class="r"><span>Pagó en efectivo con</span><span>${money(op.rec)}</span></div><div class="r"><b>Cambio</b><b>${money(op.cam)}</b></div>` : ""}</div>
      ${low.length ? `<div class="note bad" style="font-size:.88rem;font-weight:500;align-items:flex-start">${ic("alert")}<span>Se está acabando: ${low.map(it => `${esc(it.n)} (quedan ${int(P.get(it.pid).s)})`).join(", ")}. Ya aparece en Surtir.</span></div>` : ""}
      <div class="mf"><button class="btn pri big" type="button" data-act="nuevaVenta">${ic("cart")} Nueva venta</button></div>`, { onClose: () => go("vender") });
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
  ${tip("inv", "<b>Inventario:</b> cuántas piezas hay de cada cosa. Cuando llegue mercancía toca <b>Entrada</b>. Para cambiar precio o nombre toca <b>Editar</b>. Las ventas se descuentan solas.")}
  <div class="kpis four">
    ${kpi({ icon: "box", val: int(n.todos), label: "Productos" })}
    ${kpi({ icon: "layers", val: int(vis.reduce((a, p) => a + Math.max(0, p.s), 0)), label: "Piezas en tienda" })}
    ${kpi({ icon: "wallet", val: money(valor), label: "Valor a precio de venta", cls: "blue" })}
    ${kpi({ icon: "tag", val: money(valorCosto), label: "Valor a costo (donde hay costo)" })}
  </div>
  <div class="head"><div class="search grow" style="min-width:220px">${ic("search")}<input id="iq" class="input" type="search" placeholder="Buscar en el inventario…" value="${esc(INV.q)}" autocomplete="off"></div>
    <div class="row wrap"><button class="btn" type="button" data-act="exportInv">${ic("download")} Excel</button><button class="btn pri" type="button" data-act="nuevoProd">${ic("plus")} Producto nuevo</button></div></div>
  <div class="chips scroll" style="margin-bottom:8px">
    ${[["todos", "Todos"], ["poco", "Poco stock"], ["agotado", "Agotados"], ["sinprecio", "Sin precio"], ["sincosto", "Sin costo"], ["ocultos", "Ocultos"]].map(([k, t]) => `<button class="chip ${INV.fil === k ? "on" : ""}" type="button" data-act="invFil" data-k="${k}">${t} <span class="mono">${int(n[k])}</span></button>`).join("")}
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
  $("#invList").innerHTML = !total ? empty("box", "No hay productos con ese filtro.") : `
    <small>${plural(total, "producto", "productos")}</small>
    <div class="list" style="margin-top:8px">${list.map(p => {
      const low = p.s <= 0 ? "bad" : p.s <= stockMin(p) ? "warn" : "ok";
      const inList = S.local.surtir[p.id]?.manual;
      return `<div class="prod">
        <div><div class="nm">${esc(p.n)}</div>
          <div class="meta"><span class="badge pri">${esc(p.c)}</span><span>${esc(p.u)}</span>${p.k ? `<span>Costo ${money(p.k)}</span>` : ""}${p.o ? `<span title="${esc(p.o)}">Nota: ${esc(p.o.length > 50 ? p.o.slice(0, 50) + "…" : p.o)}</span>` : ""}</div></div>
        <div class="stock"><span class="badge ${low}" style="font-size:.92rem">${int(p.s)}</span><small>existencia</small></div>
        <div class="stock">${p.p ? money(p.p) : `<span class="badge warn">Sin precio</span>`}<small>precio</small></div>
        <div class="acts"><button class="btn sm" type="button" data-act="entrada" data-id="${p.id}">${ic("plus", 15)} Entrada</button><button class="btn sm" type="button" data-act="editProd" data-id="${p.id}">${ic("pencil", 15)} Editar</button><button class="icon-btn" type="button" data-act="aSurtir" data-id="${p.id}" title="${inList ? "Quitar de la lista para surtir" : "Agregar a la lista para surtir"}" style="${inList ? "color:var(--pri);border-color:var(--pri)" : ""}">${ic("truck", 17)}</button></div>
      </div>`;
    }).join("")}</div>
    ${total > INV.limit ? `<div style="text-align:center;margin-top:14px"><button class="btn" type="button" data-act="invMas">Ver más (${int(total - INV.limit)} restantes)</button></div>` : ""}`;
}

function prodModal(p) {
  const isNew = !p;
  p = p || { id: uid("n"), n: "", c: INV.cat || "Papelería", u: "PZA", s: 0, p: 0, k: 0, o: "", min: null, off: false };
  const cats = categorias();
  const UNITS = ["PZA", "PQT", "CAJA", "METRO", "HOJA", "PLANILLA", "ROLLO", "JUEGO"];
  const m = openModal(`${mh(isNew ? "Producto nuevo" : "Editar producto")}
    <div class="stack">
      <label class="f"><span>Nombre</span><input class="input" id="pn" value="${esc(p.n)}" placeholder="Ej. Cuaderno profesional Scribe 100 hojas" autofocus></label>
      <div class="grid2">
        <label class="f"><span>Precio de venta</span><input class="input money" id="pp" inputmode="decimal" value="${p.p || ""}" placeholder="$0.00"></label>
        <label class="f"><span>Costo por pieza</span><input class="input money" id="pk" inputmode="decimal" value="${p.k || ""}" placeholder="$0.00"></label>
      </div>
      <div class="grid2">
        <label class="f"><span>Existencia (piezas que hay)</span><input class="input money" id="ps" inputmode="numeric" value="${p.s}"></label>
        <label class="f"><span>Mínimo (avisar al llegar a)</span><input class="input money" id="pmin" inputmode="numeric" value="${p.min ?? ""}" placeholder="${CFG.stockMin}"></label>
      </div>
      <div class="grid2">
        <label class="f"><span>Categoría</span><select class="select" id="pc">${cats.map(c => `<option ${c === p.c ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__new">Nueva categoría…</option></select></label>
        <label class="f"><span>Unidad</span><select class="select" id="pu">${UNITS.concat(UNITS.includes(p.u) ? [] : [p.u]).map(u => `<option ${u === p.u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></label>
      </div>
      <label class="f"><span>Nota (opcional)</span><input class="input" id="po" value="${esc(p.o)}" placeholder="Ej. 2 piezas por $7"></label>
      ${isNew ? "" : `<label class="check"><input type="checkbox" id="poff" ${p.off ? "checked" : ""}> Ocultar (ya no se vende, no sale al buscar ni en Surtir)</label>`}
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
    closeModal(); toast(isNew ? "Producto agregado" : "Cambios guardados");
    if (isNew) INV.q = n;
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
    <div class="note pri" id="enew">Quedarán <span class="num">${int(p.s)}</span></div>
    <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="eok">Sumar al inventario</button></div>`);
  const eq = $("#eq", m);
  eq.addEventListener("input", () => { $("#enew .num", m).textContent = int(p.s + (Math.round(parseMoney(eq.value)) || 0)); });
  const ok = async () => {
    const q = Math.round(parseMoney(eq.value));
    if (!(q > 0)) return toast("Escribe cuántas llegaron");
    const k = parseMoney($("#ek", m).value);
    await addOp({ t: "entrada", pid: p.id, q, k: k > 0 ? r2(k) : 0, v: S.local.lastSeller || "" });
    if (S.local.surtir[p.id]) { delete S.local.surtir[p.id]; saveLocal(); }
    closeModal(); toast(`+${q} ${p.n}`); VIEWS[current]();
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
    label = `${a.getDate()} ${MES3[a.getMonth()].toLowerCase()} – ${e.getDate()} ${MES3[e.getMonth()].toLowerCase()} ${e.getFullYear()}`;
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
  const pay = s.pago === "mx" ? `<span class="badge pri">${ic("cash")} ${money(s.ef)} + ${ic("card")} ${money(s.tj)}</span>` : s.pago === "tj" ? `<span class="badge pri">${ic("card")} Tarjeta</span>` : `<span class="badge ok">${ic("cash")} Efectivo</span>`;
  return `<div class="sale ${s.cx ? "cx" : ""}">
    <div class="hd"><b class="row mono" style="gap:6px;font-weight:500">${ic("clock", 15)} ${hora(s.f)}</b><span class="badge">${ic("user")} ${esc(s.v)}</span>${pay}${s.com ? `<span class="badge warn">Comisión ${money(s.com)}</span>` : ""}${s.cx ? `<span class="badge bad">Cancelada${s.cxv ? " por " + esc(s.cxv) : ""}</span>` : ""}<span class="tt">${money(s.tot)}</span></div>
    <table>${s.items.map(it => `<tr><td class="q">${int(it.q)} ×</td><td style="width:100%">${esc(it.n)}<br><small class="mono">${money(it.p)} c/u</small></td><td class="r">${money(it.q * it.p)}</td></tr>`).join("")}</table>
    ${!s.cx ? `<div style="text-align:right;margin-top:6px"><button class="btn sm bad" type="button" data-act="cancelarVenta" data-id="${s.id}">Cancelar venta</button></div>` : s.cxm ? `<small>Motivo: ${esc(s.cxm)}</small>` : ""}
  </div>`;
}

function vVentas() {
  const r = rangeOf(H.mode, H.ref);
  const sellers = vendedores();
  const list = SALES.filter(s => inRange(s, r) && (!H.vend || s.v === H.vend)).sort((x, y) => new Date(y.f) - new Date(x.f));
  const t = totals(list);
  const resumen = tt => `<small>${plural(tt.n, "venta", "ventas")} · efectivo <span class="mono">${money(tt.ef)}</span> · tarjeta <span class="mono">${money(tt.tj)}</span></small>`;
  let body = "";
  if (!list.length) body = empty("receipt", `No hay ventas ${H.mode === "dia" ? "este día" : "en este periodo"}.`);
  else if (H.mode === "dia") {
    const per = {};
    for (const s of list) if (!s.cx) { const v = per[s.v] ||= { tot: 0, ef: 0, tj: 0, n: 0 }; v.tot += s.tot; v.ef += s.ef; v.tj += s.tj; v.n++; }
    body = `<div class="card corte" style="margin-bottom:14px"><h3 style="margin-bottom:6px">Corte de caja por vendedor</h3>
      ${Object.entries(per).map(([v, x]) => `<div class="r"><b class="grow" style="font-weight:500">${esc(v)} <small>(${plural(x.n, "venta", "ventas")})</small></b><small>Efectivo</small><span>${money(x.ef)}</span><small>Tarjeta</small><span>${money(x.tj)}</span><b class="mono">${money(x.tot)}</b></div>`).join("")}</div>
      <div class="list">${list.map(saleCard).join("")}</div>`;
  } else if (H.mode === "anio") {
    const byM = Array.from({ length: 12 }, () => []);
    for (const s of list) byM[new Date(s.f).getMonth()].push(s);
    body = `<div class="list">${byM.map((ls, i) => ({ ls, i })).filter(x => x.ls.length).reverse().map(({ ls, i }) => {
      const tt = totals(ls);
      return `<button class="mrow" type="button" data-act="verMes" data-m="${i}">${ic("calendar")} ${cap(MESES[i])} ${resumen(tt)}<span class="tt">${money(tt.tot)}</span>${ic("chevR")}</button>`;
    }).join("")}</div>`;
  } else {
    const byD = new Map();
    for (const s of list) { const k = dayKey(s.f); if (!byD.has(k)) byD.set(k, []); byD.get(k).push(s); }
    body = [...byD.values()].map((ls, i) => {
      const tt = totals(ls);
      return `<details class="day" ${i === 0 ? "open" : ""}><summary><span class="chev">${ic("chevR")}</span>${cap(fechaLarga(ls[0].f))} ${resumen(tt)}<span class="tt">${money(tt.tot)}</span></summary><div class="list">${ls.map(saleCard).join("")}</div></details>`;
    }).join("");
  }
  view.innerHTML = `
  ${tip("ventas", "<b>Historial:</b> elige Día, Semana, Mes o Año y muévete con las flechas. Arriba ves cuánto entró en efectivo y en tarjeta (sirve para el corte de caja).")}
  <div class="row wrap" style="margin-bottom:14px;gap:10px">
    <div class="seg">${[["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["anio", "Año"]].map(([k, tt]) => `<button type="button" class="${H.mode === k ? "on" : ""}" data-act="hMode" data-k="${k}">${tt}</button>`).join("")}</div>
    <div class="datenav"><button class="icon-btn" type="button" data-act="hMove" data-d="-1" aria-label="Anterior">${ic("chevL")}</button><b>${r.label}</b><button class="icon-btn" type="button" data-act="hMove" data-d="1" aria-label="Siguiente">${ic("chevR")}</button></div>
    <button class="btn sm" type="button" data-act="hHoy">Hoy</button>
    ${sellers.length ? `<select class="select" id="hv" style="width:auto;min-height:38px"><option value="">Todos los vendedores</option>${sellers.map(v => `<option ${v === H.vend ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : ""}
    <button class="btn sm" type="button" data-act="exportVentas" style="margin-left:auto">${ic("download", 15)} Excel</button>
  </div>
  <div class="kpis six">
    ${kpi({ icon: "receipt", val: money(t.tot), label: "Total vendido", cls: "blue" })}
    ${kpi({ icon: "list", val: int(t.n), label: "Número de ventas" })}
    ${kpi({ icon: "cash", val: money(t.ef), label: "Efectivo" })}
    ${kpi({ icon: "card", val: money(t.tj), label: "Tarjeta" })}
    ${kpi({ icon: "tag", val: money(t.com), label: "Comisiones de tarjeta" })}
    ${kpi({ icon: "trend", val: money(t.gan + t.com), label: "Ganancia estimada", cls: "good" })}
  </div>
  ${body}`;
  const hv = $("#hv"); if (hv) hv.onchange = () => { H.vend = hv.value; vVentas(); };
}

/* ================= ESTADÍSTICAS ================= */
const E = { per: "mes", year: new Date().getFullYear() };
function hbars(rows, fmt = money, cls = "") {
  const max = Math.max(...rows.map(r => r.v), 1);
  return `<div class="hbars">${rows.map(r => `<div class="hb ${cls}"><span class="lb" title="${esc(r.l)}">${esc(r.l)}</span><span class="vl">${fmt(r.v)}${r.x ? ` <small>${r.x}</small>` : ""}</span><span class="tr"><i style="width:${Math.max(1.5, r.v / max * 100)}%"></i></span></div>`).join("")}</div>`;
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

  const prod = new Map(), serv = new Map(), cat = new Map(), seller = new Map(), horas = Array(24).fill(0);
  for (const s of list) {
    seller.set(s.v, (seller.get(s.v) || 0) + s.tot);
    horas[new Date(s.f).getHours()] += s.tot;
    for (const it of s.items) {
      const amount = it.p * it.q;
      if (it.pid) {
        const x = prod.get(it.pid) || { l: P.get(it.pid)?.n || it.n, q: 0, v: 0, g: 0 };
        x.q += it.q; x.v += amount; if (it.k > 0) x.g += (it.p - it.k) * it.q;
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

  const ys = SALES.filter(s => !s.cx && new Date(s.f).getFullYear() === E.year);
  const months = Array(12).fill(0), monthsN = Array(12).fill(0);
  for (const s of ys) { const mm = new Date(s.f).getMonth(); months[mm] += s.tot; monthsN[mm]++; }
  const prevY = Array(12).fill(0);
  for (const s of SALES) if (!s.cx && new Date(s.f).getFullYear() === E.year - 1) prevY[new Date(s.f).getMonth()] += s.tot;
  const maxM = Math.max(...months), maxB = Math.max(...months, ...prevY, 1);
  const best = maxM > 0 ? months.indexOf(maxM) : -1;
  const conVentas = months.map((v, i) => ({ v, i })).filter(x => x.v > 0);
  const worst = conVentas.length > 1 ? conVentas.sort((a, b) => a.v - b.v)[0] : null;
  const years = [...new Set(SALES.map(s => new Date(s.f).getFullYear()).concat([now.getFullYear()]))].sort();
  const horasRows = horas.map((v, h) => ({ v, h })).filter(x => x.v > 0);
  const noData = `<p class="muted">Sin datos en este periodo.</p>`;

  view.innerHTML = `
  ${tip("stats", "<b>Estadísticas:</b> elige el periodo arriba. La <b>ganancia</b> se calcula con el costo de cada producto; si a un producto le falta el costo, agrégalo en Inventario → Editar.")}
  <div class="head"><div class="seg">${[["mes", "Este mes"], ["mesant", "Mes pasado"], ["anio", "Año"], ["todo", "Todo"]].map(([k, tt]) => `<button type="button" class="${E.per === k ? "on" : ""}" data-act="ePer" data-k="${k}">${tt}</button>`).join("")}</div>
    <small>Periodo: <b>${r.label}</b></small></div>
  <div class="kpis six">
    ${kpi({ icon: "receipt", val: money(t.tot), label: "Vendido", cls: "blue" })}
    ${kpi({ icon: "tag", val: money(costo), label: "Costo de lo vendido" })}
    ${kpi({ icon: "trend", val: money(t.gan + t.com), label: "Ganancia", cls: "good" })}
    ${kpi({ icon: "chart", val: margen.toFixed(1) + "%", label: "Margen de ganancia", cls: "good" })}
    ${kpi({ icon: "list", val: int(t.n), label: "Ventas" })}
    ${kpi({ icon: "cart", val: money(t.n ? t.tot / t.n : 0), label: "Ticket promedio" })}
  </div>
  ${t.sinCosto > 0 ? `<div class="info">${ic("info")}<div><span class="mono">${money(t.sinCosto)}</span> de lo vendido son productos <b>sin costo registrado</b>; no entran en la ganancia ni en el margen. Agrégales el costo en Inventario → filtro “Sin costo”.</div></div>` : ""}
  <div class="charts">
    <div class="card white wide">
      <div class="chart-head"><div><h3>Ventas por mes</h3><span class="big">${money(months.reduce((a, b) => a + b, 0))}</span><small>Año ${E.year}</small></div>
        <div class="row"><div class="keys"><span>${E.year}</span><span class="l">${E.year - 1}</span></div>
        <div class="datenav"><button class="icon-btn" type="button" data-act="eYear" data-d="-1" ${years[0] >= E.year ? "disabled" : ""} aria-label="Año anterior">${ic("chevL")}</button><button class="icon-btn" type="button" data-act="eYear" data-d="1" ${E.year >= now.getFullYear() ? "disabled" : ""} aria-label="Año siguiente">${ic("chevR")}</button></div></div></div>
      ${best >= 0 ? `<div class="highlight"><span class="hi">${ic("trophy")}</span><div><b>${cap(MESES[best])} fue el mes con más ventas</b><br><small><span class="mono">${money(maxM)}</span> en ${plural(monthsN[best], "venta", "ventas")}${worst ? ` · el mes más bajo fue ${MESES[worst.i]} (<span class="mono">${money(worst.v)}</span>)` : ""}</small></div></div>` : `<p class="muted">Aún no hay ventas en ${E.year}.</p>`}
      <div class="gwrap"><div class="gbars">${months.map((v, i) => `<div class="g ${i === best ? "top" : ""}" title="${cap(MESES[i])}: ${money(v)} (${E.year - 1}: ${money(prevY[i])})"><i style="height:${v / maxB * 100}%"></i><i class="l" style="height:${prevY[i] / maxB * 100}%"></i></div>`).join("")}</div>
      <div class="glabels">${MES3.map(m => `<span>${m}</span>`).join("")}</div></div>
    </div>
    <div class="card white"><h3 style="margin-bottom:8px">Productos más vendidos</h3>${mas.length ? `<ol class="rank">${mas.map(x => `<li><span class="n" title="${esc(x.l)}">${esc(x.l)}</span><span class="v">${int(x.q)} pzas</span><small>${money(x.v)}</small></li>`).join("")}</ol>` : noData}</div>
    <div class="card white"><h3 style="margin-bottom:8px">Productos que menos se venden</h3>${menos.length ? `<ol class="rank">${menos.map(x => `<li><span class="n" title="${esc(x.l)}">${esc(x.l)}</span><span class="v">${int(x.q)} pzas</span><small>${money(x.v)}</small></li>`).join("")}</ol>` : noData}
      <p style="margin:12px 0 0"><button class="btn sm" type="button" data-act="sinVenta">Ver ${int(sinVenta.length)} productos con existencia que no se vendieron</button></p></div>
    <div class="card white"><h3 style="margin-bottom:12px">Lo que más ganancia deja</h3>${ganancia.length ? hbars(ganancia.map(x => ({ l: x.l, v: x.g })), money, "g") : noData}</div>
    <div class="card white"><h3 style="margin-bottom:12px">Servicios más pedidos</h3>${serv.size ? hbars([...serv.values()].sort((a, b) => b.v - a.v).slice(0, 10).map(x => ({ l: x.l, v: x.v, x: `(${int(x.q)})` })), money, "alt") : noData}</div>
    <div class="card white"><h3 style="margin-bottom:12px">Ventas por categoría</h3>${cat.size ? hbars([...cat.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }))) : noData}</div>
    <div class="card white"><h3 style="margin-bottom:12px">Efectivo y tarjeta</h3>${t.n ? hbars([{ l: "Efectivo", v: t.ef, x: `${(t.ef / t.tot * 100).toFixed(0)}%` }, { l: "Tarjeta", v: t.tj, x: `${(t.tj / t.tot * 100).toFixed(0)}%` }, { l: "Comisiones cobradas", v: t.com }]) : noData}</div>
    <div class="card white"><h3 style="margin-bottom:12px">Ventas por vendedor</h3>${seller.size ? hbars([...seller.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }))) : noData}</div>
    <div class="card white"><h3 style="margin-bottom:12px">Horas con más ventas</h3>${horasRows.length ? hbars(horasRows.map(x => ({ l: `${x.h % 12 || 12}:00 ${x.h < 12 ? "am" : "pm"}`, v: x.v }))) : noData}</div>
  </div>`;
  ACT._sinVenta = sinVenta;
}

/* ================= AJUSTES ================= */
function vAjustes() {
  const conectado = !!S.local.url;
  view.innerHTML = `
  <div class="head"><span></span><button class="btn" type="button" data-act="ayuda">${ic("help")} Cómo se usa la app</button></div>
  <div class="charts">
    <div class="card white wide">
      <h3 class="row" style="gap:8px">${ic("cloud")} Celular y computadora juntos</h3>
      <p class="muted" style="margin:6px 0 12px">${conectado ? `Conectada a Google Sheets. Las ventas que hagas aquí se ven en los otros equipos.${S.sync.last ? " Última vez: " + hora(S.sync.last) + "." : ""}` : `Ahora las ventas se guardan <b>solo en este equipo</b>. Conéctala a una hoja de Google nueva y vacía (solo sirve como “nube”) para ver lo mismo en el celular y en la computadora (y no perder nada si se borra el navegador). <a href="https://github.com/ivannnavarro/papeleria-yebra/blob/main/GUIA.md#2-conectar-celular-y-computadora-muy-recomendado" target="_blank" rel="noopener">Ver cómo hacerlo (5 minutos)</a>.`}</p>
      <div class="grid2">
        <label class="f"><span>Dirección de la hoja (termina en /exec)</span><input class="input" id="su" value="${esc(S.local.url)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
        <label class="f"><span>Clave</span><input class="input" id="sk" value="${esc(S.local.clave)}" placeholder="La misma que pusiste en la hoja"></label>
      </div>
      <div class="row wrap" style="margin-top:12px"><button class="btn pri" type="button" data-act="conectar">${conectado ? "Guardar cambios" : "Conectar"}</button>${conectado ? `<button class="btn" type="button" data-act="syncAhora">${ic("refresh")} Sincronizar ahora</button><button class="btn bad" type="button" data-act="desconectar">Desconectar</button>` : ""}</div>
      ${S.pending.length ? `<p class="muted" style="margin:10px 0 0">${plural(S.pending.length, "movimiento guardado", "movimientos guardados")} en este equipo${conectado ? " esperando subir" : ""}.</p>` : ""}
    </div>
    <div class="card white">
      <h3 class="row" style="gap:8px">${ic("user")} Vendedores</h3>
      <p class="muted" style="margin:6px 0 12px">Salen como botones al cobrar, para no escribir el nombre cada vez.</p>
      <div class="chips" style="margin-bottom:10px">${CFG.vendedores.length ? CFG.vendedores.map(v => `<span class="chip">${esc(v)} <button type="button" class="x" data-act="quitarVend" data-v="${esc(v)}" aria-label="Quitar">${ic("x", 14)}</button></span>`).join("") : `<small>Todavía no hay vendedores.</small>`}</div>
      <div class="row"><input class="input" id="nv" placeholder="Nombre"><button class="btn pri" type="button" data-act="agregarVend">Agregar</button></div>
    </div>
    <div class="card white">
      <h3 class="row" style="gap:8px">${ic("card")} Comisión por pagar con tarjeta</h3>
      <p class="muted" style="margin:6px 0 12px">Se cobra sola cuando lo que se paga con tarjeta es menor al mínimo. Al cobrar se puede quitar si no aplica.</p>
      <div class="grid2">
        <label class="f"><span>Si el pago con tarjeta es menor a</span><input class="input money" id="cmin" inputmode="decimal" value="${CFG.com.min}"></label>
        <label class="f"><span>Cobrar</span><div class="row"><input class="input money" id="cval" inputmode="decimal" value="${CFG.com.val}" style="flex:1"><select class="select" id="ctipo" style="width:auto"><option value="fijo" ${CFG.com.tipo === "fijo" ? "selected" : ""}>pesos</option><option value="pct" ${CFG.com.tipo === "pct" ? "selected" : ""}>%</option></select></div></label>
      </div>
      <label class="f" style="margin-top:12px"><span>Mínimo de piezas: avisar para surtir cuando queden</span><input class="input money" id="smin" inputmode="numeric" value="${CFG.stockMin}"></label>
      <div style="margin-top:12px"><button class="btn pri" type="button" data-act="guardarCom">Guardar</button></div>
    </div>
    <div class="card white wide">
      <div class="head" style="margin-bottom:6px"><h3 class="row" style="gap:8px">${ic("printer")} Servicios y precios</h3><button class="btn sm pri" type="button" data-act="nuevoServ">${ic("plus", 15)} Agregar servicio</button></div>
      <p class="muted" style="margin:0 0 12px">“Precio fijo” cobra por pieza (copias, impresiones). “Precio variable” pregunta el precio cada vez (maquetas, trámites). “Pago de servicio” pide el monto del recibo y tu comisión (luz, agua, recargas).</p>
      <div class="list">${CFG.servicios.map(s => `<div class="prod"><div class="row"><span class="sic" style="width:32px;height:32px;border-radius:50%;background:var(--pri-soft);color:var(--pri);display:flex;align-items:center;justify-content:center">${ic(svcIcon(s), 16)}</span><div><div class="nm">${esc(s.n)}</div><div class="meta"><span class="badge pri">${esc(s.g)}</span><span>${s.tipo === "pieza" ? "Precio fijo" : s.tipo === "pago" ? "Pago de servicio" : "Precio variable"}</span></div></div></div>
        <div class="stock">${s.tipo === "pieza" ? money(s.p) : s.tipo === "pago" ? `+${money(s.cargo || 0)}` : s.p ? money(s.p) : "—"}</div><div></div>
        <div class="acts"><button class="btn sm" type="button" data-act="editServ" data-id="${s.id}">${ic("pencil", 15)} Editar</button></div></div>`).join("")}</div>
    </div>
    <div class="card white wide">
      <h3 class="row" style="gap:8px">${ic("download")} Respaldo</h3>
      <p class="muted" style="margin:6px 0 12px">Descarga una copia de todas las ventas y cambios. Si algún día cambias de equipo, la puedes cargar aquí.</p>
      <div class="row wrap"><button class="btn" type="button" data-act="respaldo">${ic("download")} Descargar respaldo</button><label class="btn">${ic("upload")} Cargar respaldo<input type="file" id="rf" accept=".json,application/json" hidden></label></div>
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
      rebuild(); syncSoon(200); toast(`Respaldo cargado: ${nuevos.length} movimientos nuevos`); vAjustes();
    } catch (err) { toast("Ese archivo no es un respaldo válido"); }
  };
}

function servModal(s) {
  const isNew = !s;
  s = s || { id: uid("s"), g: "Trabajos escolares", n: "", tipo: "variable", p: 0, k: 0, cargo: 0 };
  const grupos = [...new Set(CFG.servicios.map(x => x.g))];
  const cur = svcIcon(s);
  const m = openModal(`${mh(isNew ? "Servicio nuevo" : "Editar servicio")}
    <div class="stack">
      <label class="f"><span>Nombre</span><input class="input" id="vn" value="${esc(s.n)}" autofocus></label>
      <div class="grid2">
        <label class="f"><span>Grupo</span><input class="input" id="vg" value="${esc(s.g)}" list="vgl"><datalist id="vgl">${grupos.map(g => `<option value="${esc(g)}">`).join("")}</datalist></label>
        <label class="f"><span>Ícono</span><select class="select" id="vi">${ICON_CHOICES.map(([k, t]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      </div>
      <label class="f"><span>Tipo de precio</span><select class="select" id="vt">
        <option value="pieza" ${s.tipo === "pieza" ? "selected" : ""}>Precio fijo por pieza (copias, impresiones)</option>
        <option value="variable" ${s.tipo === "variable" ? "selected" : ""}>Precio variable, se escribe al vender</option>
        <option value="pago" ${s.tipo === "pago" ? "selected" : ""}>Pago de servicio (monto + comisión)</option></select></label>
      <div class="grid2">
        <label class="f" id="vpL"><span>Precio</span><input class="input money" id="vp" inputmode="decimal" value="${s.p || ""}"></label>
        <label class="f" id="vkL"><span>Costo por pieza (opcional)</span><input class="input money" id="vk" inputmode="decimal" value="${s.k || ""}"></label>
        <label class="f" id="vcL"><span>Comisión que cobras</span><input class="input money" id="vc" inputmode="decimal" value="${s.cargo || 0}"></label>
      </div>
    </div>
    <div class="mf">${isNew ? "" : `<button class="btn bad" type="button" id="vdel">${ic("trash")} Borrar</button>`}<button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="vok">Guardar</button></div>`);
  const tog = () => { const t = $("#vt", m).value; $("#vpL", m).hidden = t === "pago"; $("#vkL", m).hidden = t !== "pieza"; $("#vcL", m).hidden = t !== "pago"; };
  $("#vt", m).onchange = tog; tog();
  $("#vok", m).onclick = async () => {
    const n = $("#vn", m).value.trim(); if (!n) return toast("Escribe el nombre");
    const x = { ...s, n, ic: $("#vi", m).value, g: $("#vg", m).value.trim() || "Otros", tipo: $("#vt", m).value, p: r2(parseMoney($("#vp", m).value) || 0), k: r2(parseMoney($("#vk", m).value) || 0), cargo: r2(parseMoney($("#vc", m).value) || 0) };
    delete x.e;
    if (x.tipo === "pieza" && !(x.p > 0)) return toast("Escribe el precio");
    const list = isNew ? [...CFG.servicios, x] : CFG.servicios.map(z => z.id === s.id ? x : z);
    await setCfg({ servicios: list }); closeModal(); toast("Servicio guardado"); vAjustes();
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
  const step = (icon, t, d) => `<div class="guide-step"><span class="gi">${ic(icon)}</span><div><b>${t}</b>${d}</div></div>`;
  openModal(`${mh(first ? "Bienvenido a Papelería Yebra" : "Cómo se usa")}
    ${step("home", "Inicio", "Resumen: lo que falta en la tienda, ventas de hoy y del año.")}
    ${step("cart", "Vender", "Busca lo que lleva el cliente y tócalo. Para copias, impresiones, trámites, pagos de luz/agua, recargas o maquetas toca el botón del servicio. Luego <b>Cobrar</b>: quién vendió y cómo paga (efectivo, tarjeta o las dos). La hora se guarda sola.")}
    ${step("truck", "Surtir", `La lista para ir con el proveedor: agotados y con poco stock, con cuántos comprar. Marca lo que compraste y al regresar toca <b>Sumar al inventario</b>.`)}
    ${step("box", "Inventario", "Cada venta descuenta las piezas. Aquí cambias precios y registras la mercancía que llega.")}
    ${step("receipt", "Ventas", "Lo vendido por día, semana, mes o año, en efectivo y en tarjeta. Si hubo un error, cancela la venta y las piezas regresan.")}
    ${step("chart", "Estadísticas", "Ganancia, margen, lo que más y menos se vende y el mes con más ventas.")}
    <div class="mf"><button class="btn pri big" type="button" data-act="cerrar">${first ? "Empezar" : "Entendido"}</button></div>`, { wide: true });
}

/* ================= acciones (botones) ================= */
const ACT = {
  cerrar: () => closeModal(),
  tipOff: el => { S.local.tips[el.dataset.id] = 1; saveLocal(); el.closest(".tip").remove(); },
  ayuda: () => ayuda(false),
  masMenu: () => {
    const item = (id, sub) => { const s = SECCIONES.find(x => x.id === id); return `<button type="button" data-go="${id}"><span class="gi">${ic(s.ic)}</span><span class="grow">${s.t}<small>${sub}</small></span>${ic("chevR")}</button>`; };
    openModal(`${mh("Más")}<div class="menu-list">
      ${item("inventario", "Productos, precios y existencias")}
      ${item("estadisticas", "Ganancias, lo más y menos vendido")}
      ${item("ajustes", "Vendedores, servicios, conexión y respaldo")}
      <button type="button" data-act="ayuda"><span class="gi">${ic("help")}</span><span class="grow">Cómo se usa<small>Guía rápida</small></span>${ic("chevR")}</button>
    </div>`);
  },

  addProd: el => {
    const p = P.get(el.dataset.id); if (!p) return;
    if (!p.p) return askPriceForProduct(p);
    const inCart = cart.filter(l => l.pid === p.id).reduce((a, l) => a + l.q, 0);
    addLine({ pid: p.id, n: p.n, q: 1, p: p.p, k: p.k || 0, cat: p.c });
    if (inCart + 1 > p.s) setTimeout(() => toast(`En inventario hay ${int(Math.max(0, p.s))}. Se vende igual; revisa el inventario.`, 3200), 1500);
  },
  addSvc: el => { const s = CFG.servicios.find(x => x.id === el.dataset.id); if (s) serviceModal(s); },
  libre: () => {
    const m = openModal(`${mh("Vender algo que no está en la lista")}
      <label class="f"><span>¿Qué es?</span><input class="input" id="ld" value="${esc(query)}" autofocus></label>
      <div class="grid2" style="margin-top:12px"><label class="f"><span>Cantidad</span><input class="input money" id="lq" inputmode="numeric" value="1"></label>
      <label class="f"><span>Precio c/u</span><input class="input money" id="lp" inputmode="decimal" placeholder="$0.00"></label></div>
      <p class="muted" style="font-size:.84rem">Si lo vas a vender seguido, mejor dalo de alta en Inventario → Producto nuevo.</p>
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
  verTicket: () => { openModal(`<div class="ticket-modal"></div><div class="mf" style="margin-top:6px"><button class="btn" type="button" data-act="cerrar">Seguir agregando</button></div>`); paintTicket(); },
  cobrar: () => { if ($("#modal .ticket-modal")) closeModal(); cobrar(); },
  nuevaVenta: () => closeModal(),

  surtirFil: el => { SU.fil = el.dataset.k; SU.tab = "pend"; go("surtir"); },
  suTab: el => { SU.tab = el.dataset.k; SU.limit = 120; vSurtir(); },
  suFil: el => { SU.fil = el.dataset.k; SU.limit = 120; vSurtir(); },
  suCat: el => { SU.cat = el.dataset.k; SU.limit = 120; vSurtir(); },
  suMas: () => { SU.limit += 150; vSurtir(); },
  suTick: el => { const id = el.dataset.id; setMark(id, { ok: !isBought(id) }); vSurtir(); },
  suQ: el => {
    const id = el.dataset.id, r = restockList().find(x => x.p.id === id); if (!r) return;
    setMark(id, { q: Math.max(1, buyQty(r) + +el.dataset.d) });
    const inp = $(`[data-sqid="${id}"]`); if (inp) inp.value = S.local.surtir[id].q;
  },
  suShare: async () => {
    const text = shoppingText();
    try {
      if (navigator.share) { await navigator.share({ title: "Lista para surtir", text }); return; }
      await navigator.clipboard.writeText(text); toast("Lista copiada. Pégala en WhatsApp o en una nota.");
    } catch (e) { if (e && e.name !== "AbortError") { try { await navigator.clipboard.writeText(text); toast("Lista copiada"); } catch (_) { download("lista-surtir.txt", text, "text/plain;charset=utf-8"); } } }
  },
  suExport: () => {
    const rows = [["Comprar", "Unidad", "Producto", "Categoría", "Hay", "Mínimo", "Vendidos 30 días", "Costo", "Ya comprado"]];
    for (const r of restockList()) rows.push([buyQty(r), r.p.u, r.p.n, r.p.c, r.p.s, r.min, r.sold, r.p.k || "", isBought(r.p.id) ? "Sí" : ""]);
    download(`surtir-yebra-${dayKey(new Date())}.csv`, csv(rows));
  },
  suAgregar: () => {
    const m = openModal(`${mh("Agregar a la lista para surtir")}
      <p class="muted" style="margin-top:0">Para comprar algo que todavía no se acaba.</p>
      <div class="search">${ic("search")}<input id="saq" class="input" type="search" placeholder="Buscar producto…" autofocus autocomplete="off"></div>
      <div id="sares" class="results"></div>`);
    const q = $("#saq", m);
    const paint = () => {
      const res = searchProducts(q.value, 25);
      $("#sares", m).innerHTML = res.map(p => `<button class="res" type="button" data-act="aSurtir" data-id="${p.id}" data-close="1"><span class="grow"><span class="nm">${esc(p.n)}</span><br><span class="meta">${esc(p.c)} · Hay ${int(p.s)}</span></span><span class="add">${ic("plus")}</span></button>`).join("");
    };
    q.addEventListener("input", paint);
  },
  aSurtir: el => {
    const id = el.dataset.id, cur = S.local.surtir[id];
    if (cur?.manual && !el.dataset.close) { delete cur.manual; if (!cur.ok && cur.q == null) delete S.local.surtir[id]; saveLocal(); toast("Quitado de la lista para surtir"); }
    else { setMark(id, { manual: true }); toast("Agregado a la lista para surtir"); }
    saveLocal();
    if (el.dataset.close) { closeModal(); vSurtir(); } else if (current === "inventario") paintInv();
  },
  suRegistrar: () => {
    const rows = restockList().filter(r => isBought(r.p.id));
    if (!rows.length) return;
    const m = openModal(`${mh("Sumar compras al inventario")}
      <p class="muted" style="margin-top:0">Revisa cuántas piezas llegaron de cada producto. El costo es opcional.</p>
      <div class="list">${rows.map(r => `<div class="prod" style="grid-template-columns:1fr"><div class="nm">${esc(r.p.n)}</div>
        <div class="grid2"><label class="f"><span>Piezas que llegaron</span><input class="input money" data-rq="${r.p.id}" inputmode="numeric" value="${buyQty(r)}"></label>
        <label class="f"><span>Costo por pieza</span><input class="input money" data-rk="${r.p.id}" inputmode="decimal" placeholder="${r.p.k ? money(r.p.k) : "$0.00"}"></label></div></div>`).join("")}</div>
      <div class="mf"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn dark" type="button" id="rok">${ic("check")} Sumar al inventario</button></div>`, { wide: true });
    $("#rok", m).onclick = async () => {
      let n = 0;
      for (const r of rows) {
        const q = Math.round(parseMoney($(`[data-rq="${r.p.id}"]`, m).value));
        const k = parseMoney($(`[data-rk="${r.p.id}"]`, m).value);
        if (q > 0) { await addOp({ t: "entrada", pid: r.p.id, q, k: k > 0 ? r2(k) : 0, v: S.local.lastSeller || "", origen: "surtir" }); n++; }
        delete S.local.surtir[r.p.id];
      }
      saveLocal(); closeModal(); toast(`Listo: ${plural(n, "producto sumado", "productos sumados")} al inventario`); SU.tab = "pend"; vSurtir();
    };
  },

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
      <p>Venta de las <b>${hora(s.f)}</b> por <b class="mono">${money(s.tot)}</b> (vendió ${esc(s.v)}).<br>Los productos regresan al inventario y la venta deja de contar.</p>
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
    const url = $("#su").value.trim(), clave = $("#sk").value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return toast("La dirección debe empezar con https://script.google.com/");
    if (!clave) return toast("Escribe la clave");
    toast("Probando conexión…", 8000);
    try { await call({ desde: 0, ops: [], soloProbar: true }, url, clave); }
    catch (e) { return toast("No se pudo conectar: " + (String(e.message).includes("clave") ? "la clave no coincide" : "revisa la dirección")); }
    S.local.url = url; S.local.clave = clave; await saveLocal();
    S.serverOps = []; await store.set("serverOps", []);
    toast("Conectada. Subiendo y bajando ventas…");
    await sync(); vAjustes();
  },
  desconectar: async () => {
    if (!confirm("¿Desconectar de Google Sheets? Este equipo dejará de ver las ventas de los otros.")) return;
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
    toast("Guardado"); vAjustes();
  },
  nuevoServ: () => servModal(null),
  editServ: el => servModal(CFG.servicios.find(s => s.id === el.dataset.id)),
  respaldo: () => download(`respaldo-papeleria-yebra-${dayKey(new Date())}.json`, JSON.stringify({ app: "papeleria-yebra", fecha: new Date().toISOString(), serverOps: S.serverOps, pending: S.pending }), "application/json")
};

const VIEWS = { inicio: vInicio, vender: vVender, surtir: vSurtir, inventario: vInventario, ventas: vVentas, estadisticas: vEstadisticas, ajustes: vAjustes };

/* ================= arranque ================= */
(async function start() {
  const [serverOps, pending, local] = await Promise.all([store.get("serverOps"), store.get("pending"), store.get("local")]);
  S.serverOps = serverOps || []; S.pending = pending || [];
  Object.assign(S.local, local || {});
  S.local.surtir ||= {};
  if (!S.local.device) { S.local.device = uid("eq"); saveLocal(); }
  cart = Array.isArray(S.local.cart) ? S.local.cart : [];
  rebuild();
  $("#helpBtn").innerHTML = ic("help");
  $("#helpBtn").onclick = () => ayuda(false);
  $("#syncBtn").onclick = () => S.local.url ? sync(true) : go("ajustes");
  const h = location.hash.slice(1);
  go(VIEWS[h] ? h : VIEWS[S.local.lastView] ? S.local.lastView : "inicio");
  paintSync();
  if (!S.local.welcomed) { S.local.welcomed = true; saveLocal(); ayuda(true); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  sync();
  setInterval(() => { if (document.visibilityState === "visible") sync(); }, 45000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
  addEventListener("online", () => sync());
  addEventListener("hashchange", () => { const x = location.hash.slice(1); if (VIEWS[x] && x !== current) go(x); });
})();
