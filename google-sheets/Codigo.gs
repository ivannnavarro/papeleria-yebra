/**
 * Papelería Yebra — conexión con Google Sheets.
 * Pega este código en tu hoja: Extensiones → Apps Script. Instrucciones en GUIA.md, paso 2.
 *
 * Guarda cada venta y cada cambio del inventario en la pestaña "APP_Movimientos"
 * (no la edites a mano) y además escribe las ventas, fáciles de leer, en "APP_Ventas".
 */

// Cambia esta clave por una tuya. La misma la escribes en la app (Ajustes → Celular y computadora juntos).
const CLAVE = 'cambia-esta-clave';

const HOJA_MOV = 'APP_Movimientos';
const HOJA_VENTAS = 'APP_Ventas';

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return salida({ ok: false, error: 'datos' }); }
  if (String(req.clave) !== CLAVE) return salida({ ok: false, error: 'clave' });

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = SpreadsheetApp.getActive();
    const mov = hoja(ss, HOJA_MOV, ['#', 'id', 'fecha', 'tipo', 'equipo', 'datos (no editar)']);
    let ultima = mov.getLastRow();
    const ids = ultima > 1 ? mov.getRange(2, 2, ultima - 1, 1).getValues().map(r => String(r[0])) : [];
    const yaEsta = new Set(ids);

    const nuevas = (req.ops || []).filter(o => o && o.id && !yaEsta.has(String(o.id)));
    if (nuevas.length) {
      const filas = nuevas.map((o, i) => [ultima + i, o.id, new Date(o.f), o.t, o.d || req.dispositivo || '', JSON.stringify(o)]);
      mov.getRange(ultima + 1, 1, filas.length, 6).setValues(filas);
      escribirVentas(ss, nuevas);
      ultima = mov.getLastRow();
    }

    const total = ultima - 1;
    const desde = Math.max(0, Math.min(Number(req.desde) || 0, total));
    let ops = [];
    if (!req.soloProbar && total > desde) {
      ops = mov.getRange(2 + desde, 6, total - desde, 1).getValues().map(r => JSON.parse(r[0]));
    }
    return salida({ ok: true, total: req.soloProbar ? desde : total, ops });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return salida({ ok: true, app: 'Papelería Yebra', mensaje: 'La conexión funciona. Pega esta dirección en la app.' });
}

function escribirVentas(ss, ops) {
  const sh = hoja(ss, HOJA_VENTAS, ['Fecha', 'Hora', 'Vendedor', 'Cantidad', 'Descripción', 'Precio', 'Subtotal', 'Total venta', 'Efectivo', 'Tarjeta', 'Comisión tarjeta', 'Estado', 'Folio']);
  const filas = [];
  ops.forEach(o => {
    if (o.t === 'venta') {
      const f = new Date(o.f);
      o.items.forEach((it, i) => filas.push([
        Utilities.formatDate(f, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd'),
        Utilities.formatDate(f, ss.getSpreadsheetTimeZone(), 'HH:mm'),
        o.v, it.q, it.n, it.p, it.p * it.q,
        i ? '' : o.tot, i ? '' : o.ef, i ? '' : o.tj, i ? '' : o.com, '', o.id
      ]));
    } else if (o.t === 'cancelar') {
      const data = sh.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) if (data[r][12] === o.venta) sh.getRange(r + 1, 12).setValue('Cancelada por ' + (o.v || ''));
    }
  });
  if (filas.length) sh.getRange(sh.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
}

function hoja(ss, nombre, encabezados) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
