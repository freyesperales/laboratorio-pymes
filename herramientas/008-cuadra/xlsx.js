/* Cuadra · lector de Excel (.xlsx) propio, sin librerías externas.
   Un .xlsx es un ZIP con XML adentro: aquí se lee el ZIP, se descomprime con la función
   que entrega quien llama (DecompressionStream en el navegador, zlib en Node) y se arma
   la primera hoja como una lista de filas. Las fechas salen como AAAA-MM-DD y los números como número. */
(function (root) {
  'use strict';

  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }
  var dec = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
  function texto(bytes) { return dec.decode(bytes); }

  // Tipo de archivo por sus primeros bytes (no por la extensión, que los bancos a veces mienten).
  function tipoArchivo(b) {
    if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'zip';
    if (b.length >= 4 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'xls-antiguo';
    var ini = texto(b.subarray(0, Math.min(b.length, 512))).replace(/^﻿/, '').trim().toLowerCase();
    if (ini[0] === '<' && /<(html|table|!doctype|\?xml|meta|head)/.test(ini)) return 'html';
    return 'texto';
  }

  // Índice del ZIP (directorio central). Devuelve {nombre: {metodo, tam, ini}}.
  function indiceZip(b) {
    var fin = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) { if (u32(b, i) === 0x06054b50) { fin = i; break; } }
    if (fin < 0) throw new Error('El archivo no es un Excel válido (no encontré su índice interno).');
    var n = u16(b, fin + 10), p = u32(b, fin + 16), out = {};
    for (var k = 0; k < n; k++) {
      if (u32(b, p) !== 0x02014b50) throw new Error('El Excel está dañado.');
      var metodo = u16(b, p + 10), tam = u32(b, p + 20), ln = u16(b, p + 28), le = u16(b, p + 30), lc = u16(b, p + 32), off = u32(b, p + 42);
      var nombre = texto(b.subarray(p + 46, p + 46 + ln));
      var ini = off + 30 + u16(b, off + 26) + u16(b, off + 28);
      out[nombre] = { metodo: metodo, tam: tam, ini: ini };
      p += 46 + ln + le + lc;
    }
    return out;
  }

  function entidades(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (_, e) {
      var l = e.toLowerCase();
      if (l === 'amp') return '&'; if (l === 'lt') return '<'; if (l === 'gt') return '>'; if (l === 'quot') return '"'; if (l === 'apos') return "'";
      var cp = l[1] === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10);
      return isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : '';
    });
  }
  // Une todo el texto de los <t> de un trozo (cubre texto con formato enriquecido).
  function textoDeT(xml) {
    var s = '', re = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>|<(?:\w+:)?t(?:\s[^>]*)?\/>/g, m;
    while ((m = re.exec(xml))) s += m[1] ? entidades(m[1]) : '';
    return s;
  }
  function attr(tag, nombre) { var m = tag.match(new RegExp('\\s' + nombre + '="([^"]*)"')); return m ? entidades(m[1]) : null; }
  function columna(ref) { var m = /^([A-Z]+)/.exec(ref || ''), n = 0; if (!m) return -1; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }

  var FECHAS_FIJAS = { 14: 1, 15: 1, 16: 1, 17: 1, 22: 1, 27: 1, 30: 1, 36: 1, 50: 1, 57: 1 };
  function esFormatoFecha(cod) {
    var c = String(cod).replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '').toLowerCase();
    return /[dy]/.test(c) || /m{3,}/.test(c);
  }
  // Para cada estilo de celda (índice s="..."), ¿es una fecha?
  function estilosFecha(xml) {
    if (!xml) return [];
    var propios = {}, m, re = /<(?:\w+:)?numFmt\s[^>]*>/g;
    while ((m = re.exec(xml))) propios[attr(m[0], 'numFmtId')] = attr(m[0], 'formatCode') || '';
    var bloque = (xml.match(/<(?:\w+:)?cellXfs[\s\S]*?<\/(?:\w+:)?cellXfs>/) || [''])[0], out = [];
    re = /<(?:\w+:)?xf\b[^>]*>/g;
    while ((m = re.exec(bloque))) {
      var id = +attr(m[0], 'numFmtId') || 0;
      out.push(!!FECHAS_FIJAS[id] || (propios[id] != null && esFormatoFecha(propios[id])));
    }
    return out;
  }
  function serialAFecha(n, de1904) {
    var ms = Date.UTC(1899, 11, 30) + Math.round((n + (de1904 ? 1462 : 0)) * 864e5);
    var f = new Date(ms); if (isNaN(f)) return null;
    return f.toISOString().slice(0, 10);
  }

  // Lee la hoja como filas. inflar(Uint8Array) -> Promise<Uint8Array> (deflate «raw»).
  function leerXLSX(bytes, inflar) {
    try { return leerXLSX_(bytes, inflar); } catch (e) { return Promise.reject(e); }
  }
  function leerXLSX_(bytes, inflar) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var idx = indiceZip(b);
    function sacar(nombre) {
      var e = idx[nombre]; if (!e) return Promise.resolve(null);
      var datos = b.subarray(e.ini, e.ini + e.tam);
      if (e.metodo === 0) return Promise.resolve(texto(datos));
      if (e.metodo !== 8) return Promise.reject(new Error('El Excel usa una compresión que no conozco.'));
      return Promise.resolve(inflar(datos)).then(function (r) { return texto(r instanceof Uint8Array ? r : new Uint8Array(r)); });
    }
    return Promise.all([sacar('xl/workbook.xml'), sacar('xl/_rels/workbook.xml.rels'), sacar('xl/sharedStrings.xml'), sacar('xl/styles.xml')]).then(function (r) {
      var libro = r[0] || '', rels = r[1] || '';
      if (!r[0]) throw new Error('El archivo es un ZIP pero no un Excel (.xlsx).');
      var hoja = 'xl/worksheets/sheet1.xml', nombreHoja = '';
      var h1 = libro.match(/<(?:\w+:)?sheet\s[^>]*>/);
      if (h1) {
        nombreHoja = attr(h1[0], 'name') || '';
        var rid = attr(h1[0], 'r:id');
        var rel = rid && rels.match(new RegExp('<Relationship\\s[^>]*Id="' + rid + '"[^>]*>'));
        var destino = rel && attr(rel[0], 'Target');
        if (destino) hoja = destino.charAt(0) === '/' ? destino.slice(1) : 'xl/' + destino.replace(/^\.\//, '');
      }
      var hojas = (libro.match(/<(?:\w+:)?sheet\s/g) || []).length;
      var de1904 = /date1904="(1|true)"/.test(libro);
      var compartidos = [];
      if (r[2]) { var m, re = /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>|<(?:\w+:)?si\s*\/>/g; while ((m = re.exec(r[2]))) compartidos.push(m[1] ? textoDeT(m[1]) : ''); }
      var fechas = estilosFecha(r[3]);
      return sacar(hoja).then(function (xml) {
        if (!xml) throw new Error('No encontré la primera hoja del Excel.');
        return { filas: filasDeHoja(xml, compartidos, fechas, de1904), hoja: nombreHoja, hojas: hojas };
      });
    });
  }

  function filasDeHoja(xml, compartidos, fechas, de1904) {
    var filas = [], mf, reF = /<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g, siguiente = 0;
    while ((mf = reF.exec(xml))) {
      var nr = +attr(' ' + mf[1], 'r'); var i = nr ? nr - 1 : siguiente; siguiente = i + 1;
      if (i > 200000) break;
      var fila = [], mc, reC = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, col = 0;
      while ((mc = reC.exec(mf[2]))) {
        var at = ' ' + mc[1], cuerpo = mc[2] || '';
        var ref = attr(at, 'r'), c = ref ? columna(ref) : col; col = c + 1;
        if (c < 0 || c > 1000) continue;
        var t = attr(at, 't') || 'n', s = +attr(at, 's') || 0;
        var vm = cuerpo.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/), v = vm ? entidades(vm[1]) : null, val = '';
        if (t === 's') val = v != null ? (compartidos[+v] || '') : '';
        else if (t === 'inlineStr') val = textoDeT(cuerpo);
        else if (t === 'str') val = v || '';
        else if (t === 'b') val = v === '1' ? 'VERDADERO' : 'FALSO';
        else if (t === 'e') val = '';
        else if (v != null && v !== '') {
          var n = +v;
          if (!isFinite(n)) val = v;
          else if (fechas[s]) val = serialAFecha(n, de1904) || v;
          else val = Math.round(n * 1e6) / 1e6;
        }
        while (fila.length < c) fila.push('');
        fila[c] = typeof val === 'string' ? val.trim() : val;
      }
      while (filas.length < i) filas.push([]);
      filas[i] = fila;
    }
    return filas;
  }

  var api = { tipoArchivo: tipoArchivo, leerXLSX: leerXLSX, indiceZip: indiceZip, esFormatoFecha: esFormatoFecha, serialAFecha: serialAFecha, columna: columna };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CuadraXLSX = api;
})(this);
