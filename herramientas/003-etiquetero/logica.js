(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Etiquetero = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ALIAS = {
    fb: 'facebook', face: 'facebook', facebook: 'facebook', 'facebook_ads': 'facebook',
    ig: 'instagram', insta: 'instagram', instagram: 'instagram',
    wa: 'whatsapp', wsp: 'whatsapp', whats: 'whatsapp', whatsapp: 'whatsapp',
    goog: 'google', google: 'google', gmb: 'google_business',
    yt: 'youtube', youtube: 'youtube', tt: 'tiktok', tik_tok: 'tiktok', tiktok: 'tiktok',
    li: 'linkedin', linkedin: 'linkedin', tw: 'twitter', x: 'twitter', twitter: 'twitter',
    mail: 'email', correo: 'email', email: 'email', 'e_mail': 'email'
  };
  var MEDIOS = ['social', 'cpc', 'email', 'organico', 'referral', 'qr', 'display', 'afiliado'];
  var CAMPOS = ['fuente', 'medio', 'campana', 'contenido', 'termino'];
  var PARAMS = { fuente: 'utm_source', medio: 'utm_medium', campana: 'utm_campaign', contenido: 'utm_content', termino: 'utm_term' };

  // minúsculas, sin tildes, solo a-z 0-9 y guion bajo
  function normalizar(s) {
    s = String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    s = s.replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return s;
  }
  function normalizarFuente(s) {
    var n = normalizar(s);
    return ALIAS[n] || n;
  }
  function laxa(s) { return normalizar(s).replace(/_/g, ''); }

  function limpiarUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return { error: 'Escribe la dirección de la página a la que llevará el enlace.' };
    if (/\s/.test(u)) return { error: 'La dirección no puede tener espacios.' };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
      if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(u)) return { error: 'Solo se aceptan direcciones http o https.' };
      u = 'https://' + u;
    }
    var o;
    try { o = new URL(u); } catch (e) { return { error: 'La dirección no es válida. Ejemplo: https://tutienda.com/oferta' }; }
    if (o.protocol !== 'http:' && o.protocol !== 'https:') return { error: 'Solo se aceptan direcciones http o https.' };
    if (!/\./.test(o.hostname) && o.hostname !== 'localhost') return { error: 'La dirección no parece completa (falta el dominio, por ejemplo .com).' };
    return { url: o };
  }

  // datos: {url, fuente, medio, campana, contenido, termino}
  function construir(d) {
    var errores = [], avisos = [];
    var r = limpiarUrl(d.url);
    if (r.error) errores.push(r.error);
    var v = {};
    CAMPOS.forEach(function (c) { v[c] = c === 'fuente' ? normalizarFuente(d[c]) : normalizar(d[c]); });
    if (!v.fuente) errores.push('Falta la fuente: de dónde viene la visita (por ejemplo instagram).');
    if (!v.medio) errores.push('Falta el medio: el tipo de canal (por ejemplo social o email).');
    if (!v.campana) errores.push('Falta el nombre de la campaña (por ejemplo oferta_verano).');
    if (errores.length) return { errores: errores, avisos: avisos };
    var o = r.url;
    if (o.searchParams.has('utm_source') || o.searchParams.has('utm_medium') || o.searchParams.has('utm_campaign'))
      avisos.push('La dirección ya traía etiquetas utm: las reemplacé por las nuevas.');
    Object.keys(PARAMS).forEach(function (c) { o.searchParams.delete(PARAMS[c]); });
    CAMPOS.forEach(function (c) { if (v[c]) o.searchParams.append(PARAMS[c], v[c]); });
    if (d.medio && normalizar(d.medio) !== v.medio) avisos.push('Normalicé el medio a «' + v.medio + '».');
    if (d.fuente && String(d.fuente).trim() !== v.fuente) avisos.push('Normalicé la fuente a «' + v.fuente + '».');
    if (d.campana && String(d.campana).trim() !== v.campana) avisos.push('Normalicé la campaña a «' + v.campana + '».');
    if (v.medio === 'cpc' && !v.termino && v.fuente === 'google') avisos.push('En anuncios de búsqueda de Google suele añadirse el término (la palabra clave).');
    if (o.href.length > 2000) avisos.push('El enlace supera 2000 caracteres: algunos sistemas lo cortarán.');
    return { errores: [], avisos: avisos, valores: v, enlace: o.href };
  }

  function clave(e) { return [e.url, e.fuente, e.medio, e.campana, e.contenido || '', e.termino || ''].join('|'); }

  // Compara una entrada nueva con el historial. Devuelve avisos de duplicados y de nombres casi iguales.
  function revisarHistorial(nueva, historial) {
    var avisos = [];
    var k = clave(nueva);
    if (historial.some(function (h) { return clave(h) === k; })) avisos.push('Ya tienes guardado exactamente este enlace.');
    ['fuente', 'medio', 'campana'].forEach(function (c) {
      var vistos = {};
      historial.forEach(function (h) { if (h[c] && h[c] !== nueva[c] && laxa(h[c]) === laxa(nueva[c])) vistos[h[c]] = 1; });
      Object.keys(vistos).forEach(function (n) { avisos.push('En tu historial ya usaste «' + n + '» y ahora «' + nueva[c] + '» (' + c.replace('campana', 'campaña') + '): en Google Analytics cuentan como dos cosas distintas.'); });
    });
    return avisos;
  }

  function resumen(historial) {
    var por = {};
    historial.forEach(function (h) {
      var k = h.campana; por[k] = por[k] || { campana: k, enlaces: 0, fuentes: {} };
      por[k].enlaces++; por[k].fuentes[h.fuente] = 1;
    });
    return Object.keys(por).sort().map(function (k) { var p = por[k]; return { campana: k, enlaces: p.enlaces, fuentes: Object.keys(p.fuentes).sort() }; });
  }

  function esc(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  var COLS = ['fecha', 'url', 'fuente', 'medio', 'campana', 'contenido', 'termino', 'enlace'];
  function aCsv(historial) {
    var l = [COLS.join(',')];
    historial.forEach(function (h) { l.push(COLS.map(function (c) { return esc(h[c]); }).join(',')); });
    return l.join('\r\n');
  }
  function filasCsv(t) {
    var filas = [], fila = [], cur = '', q = false, i, ch;
    t = String(t).replace(/^﻿/, '');
    for (i = 0; i < t.length; i++) {
      ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { fila.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; fila.push(cur); filas.push(fila); fila = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || fila.length) { fila.push(cur); filas.push(fila); }
    return filas.filter(function (f) { return f.some(function (x) { return x.trim() !== ''; }); });
  }
  function parseCsv(texto) {
    var filas = filasCsv(texto), entradas = [], errores = [];
    if (!filas.length) return { entradas: [], errores: ['El archivo está vacío.'] };
    var enc = filas[0].map(function (x) { return normalizar(x); });
    if (enc.indexOf('url') < 0 || enc.indexOf('campana') < 0) return { entradas: [], errores: ['No reconozco el archivo: debe tener las columnas url, fuente, medio y campana (exporta uno desde Etiquetero).'] };
    filas.slice(1).forEach(function (f, i) {
      var d = {}; enc.forEach(function (c, j) { d[c] = (f[j] || '').trim(); });
      var r = construir(d);
      if (r.errores.length) errores.push('Fila ' + (i + 2) + ': ' + r.errores[0]);
      else { var e = { fecha: d.fecha || '', url: d.url }; CAMPOS.forEach(function (c) { e[c] = r.valores[c]; }); e.enlace = r.enlace; entradas.push(e); }
    });
    return { entradas: entradas, errores: errores };
  }

  return { MEDIOS: MEDIOS, ALIAS: ALIAS, normalizar: normalizar, normalizarFuente: normalizarFuente, construir: construir, revisarHistorial: revisarHistorial, resumen: resumen, aCsv: aCsv, parseCsv: parseCsv };
});
