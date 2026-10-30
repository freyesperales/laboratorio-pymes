(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Retoma = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var DIA = 86400000;
  var CADENCIA = [2, 5, 10]; // días de espera tras el contacto 0, 1 y 2

  function aDias(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(t);
    if (d.getUTCMonth() !== +m[2] - 1) return null; // 31 de febrero, etc.
    return Math.round(t / DIA);
  }
  function aIso(dias) {
    return new Date(dias * DIA).toISOString().slice(0, 10);
  }

  // Devuelve estado del seguimiento de un contacto respecto de "hoy" (YYYY-MM-DD)
  function estado(c, hoy, cadencia) {
    cadencia = cadencia || CADENCIA;
    if (c.resultado === 'ganado' || c.resultado === 'perdido') return { clave: c.resultado, diasTarde: 0, proximo: null };
    var u = aDias(c.ultimo), h = aDias(hoy);
    if (u === null || h === null) return { clave: 'error', diasTarde: 0, proximo: null };
    var n = Math.max(0, parseInt(c.toques, 10) || 0);
    if (n >= cadencia.length) return { clave: 'enfriado', diasTarde: h - u, proximo: null };
    var prox = u + cadencia[n];
    if (prox < h) return { clave: 'atrasado', diasTarde: h - prox, proximo: aIso(prox) };
    if (prox === h) return { clave: 'hoy', diasTarde: 0, proximo: aIso(prox) };
    return { clave: 'pendiente', diasTarde: 0, proximo: aIso(prox) };
  }

  var ORDEN = { atrasado: 0, hoy: 1, pendiente: 2, enfriado: 3, ganado: 4, perdido: 5, error: 6 };
  function ordenar(lista, hoy, cadencia) {
    return lista.map(function (c) { return { c: c, e: estado(c, hoy, cadencia) }; }).sort(function (a, b) {
      if (ORDEN[a.e.clave] !== ORDEN[b.e.clave]) return ORDEN[a.e.clave] - ORDEN[b.e.clave];
      if (a.e.clave === 'atrasado') return b.e.diasTarde - a.e.diasTarde;
      return String(a.e.proximo || '').localeCompare(String(b.e.proximo || ''));
    });
  }

  // Deja solo dígitos; si falta el prefijo del país, lo agrega. Devuelve '' si no es válido.
  function telefono(tel, prefijo) {
    var d = String(tel || '').replace(/[^\d]/g, '');
    d = d.replace(/^00/, '');
    if (!d) return '';
    prefijo = String(prefijo || '').replace(/[^\d]/g, '');
    if (prefijo && d.indexOf(prefijo) !== 0) d = prefijo + d.replace(/^0+/, '');
    return d.length >= 8 && d.length <= 15 ? d : '';
  }

  var MENSAJES = [
    'Hola {nombre}, ¿cómo estás? Te escribo por {tema}. ¿Pudiste revisarlo? Si tienes alguna duda, te ayudo con gusto.',
    'Hola {nombre}, retomo nuestra conversación sobre {tema}. ¿Sigue siendo algo que te interesa? Si cambió algo, cuéntame y lo ajustamos.',
    'Hola {nombre}, último mensaje de mi parte sobre {tema}, para no insistir. Si más adelante lo necesitas, aquí estoy. ¡Gracias por tu tiempo!'
  ];
  function mensaje(c, plantillas) {
    plantillas = plantillas && plantillas.length ? plantillas : MENSAJES;
    var n = Math.min(Math.max(0, parseInt(c.toques, 10) || 0), plantillas.length - 1);
    var nombre = String(c.nombre || '').trim().split(/\s+/)[0] || '';
    var tema = String(c.tema || '').trim() || 'lo que hablamos';
    return plantillas[n].replace(/\{nombre\}/g, nombre).replace(/\{tema\}/g, tema).replace(/Hola ,/g, 'Hola,');
  }
  function enlaceWa(c, texto, prefijo) {
    var t = telefono(c.telefono, prefijo);
    if (!t) return '';
    return 'https://wa.me/' + t + '?text=' + encodeURIComponent(texto);
  }

  // CSV ---------------------------------------------------------
  var COLS = ['nombre', 'telefono', 'tema', 'ultimo', 'toques', 'resultado'];
  function csvCampo(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
  function aCsv(lista) {
    return [COLS.join(';')].concat(lista.map(function (c) {
      return COLS.map(function (k) { return csvCampo(c[k]); }).join(';');
    })).join('\n');
  }
  function parseCsv(texto) {
    texto = String(texto || '').replace(/^﻿/, '');
    var filas = [], fila = [], campo = '', q = false, sep = null;
    var primera = texto.split(/\r?\n/)[0] || '';
    sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ',';
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (q) {
        if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); campo = '';
        if (fila.some(function (x) { return x.trim() !== ''; })) filas.push(fila);
        fila = [];
      } else campo += ch;
    }
    fila.push(campo);
    if (fila.some(function (x) { return x.trim() !== ''; })) filas.push(fila);
    if (!filas.length) return { contactos: [], errores: ['El archivo está vacío.'] };
    var cab = filas[0].map(function (x) { return x.trim().toLowerCase(); });
    var idx = {};
    COLS.forEach(function (k) { idx[k] = cab.indexOf(k); });
    var errores = [];
    if (idx.nombre < 0 || idx.ultimo < 0) return { contactos: [], errores: ['Faltan las columnas "nombre" y "ultimo" (fecha AAAA-MM-DD) en la primera fila.'] };
    var contactos = [];
    filas.slice(1).forEach(function (f, i) {
      var c = {};
      COLS.forEach(function (k) { c[k] = idx[k] >= 0 ? (f[idx[k]] || '').trim() : ''; });
      if (!c.nombre) { errores.push('Fila ' + (i + 2) + ': falta el nombre.'); return; }
      if (aDias(c.ultimo) === null) { errores.push('Fila ' + (i + 2) + ' (' + c.nombre + '): fecha "' + c.ultimo + '" no válida; usa AAAA-MM-DD.'); return; }
      c.toques = Math.max(0, parseInt(c.toques, 10) || 0);
      if (c.resultado !== 'ganado' && c.resultado !== 'perdido') c.resultado = '';
      contactos.push(c);
    });
    return { contactos: contactos, errores: errores };
  }

  return { CADENCIA: CADENCIA, MENSAJES: MENSAJES, aDias: aDias, aIso: aIso, estado: estado, ordenar: ordenar, telefono: telefono, mensaje: mensaje, enlaceWa: enlaceWa, aCsv: aCsv, parseCsv: parseCsv };
});
