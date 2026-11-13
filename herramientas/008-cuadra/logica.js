/* Cuadra · lógica pura (sin DOM). Navegador (global Cuadra) y Node. */
(function (root) {
  'use strict';

  // ---------- Texto ----------
  function normalizar(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9ñ]+/g, ' ').trim();
  }
  var VACIAS = 'de del la las el los y e en a al por para con transf transferencia transferencias abono abonos pago pagos deposito recibida recibido desde cta cte cuenta vista rut ref spa ltda sa sl s l'.split(' ');
  function palabras(s) {
    return normalizar(s).split(' ').filter(function (w) { return w.length > 1 && VACIAS.indexOf(w) < 0 && !/^\d+$/.test(w); });
  }
  // Parecido entre el nombre del cliente y la glosa del banco (0 a 1).
  function parecido(nombre, glosa) {
    var a = palabras(nombre), b = palabras(glosa);
    if (!a.length || !b.length) return 0;
    var hit = 0;
    a.forEach(function (w) {
      if (b.some(function (x) { return x === w || (w.length >= 4 && x.length >= 4 && (x.indexOf(w) === 0 || w.indexOf(x) === 0)); })) hit++;
    });
    return hit / a.length;
  }

  // ---------- CSV ----------
  function detectarSeparador(texto) {
    // Mira hasta 30 líneas: gana el separador que aparece la misma cantidad de veces en más líneas
    // (así los títulos que ponen los bancos antes de la tabla no confunden).
    var lineas = String(texto).replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 30);
    var cand = [';', ',', '\t', '|'], mejor = ',', max = 0;
    cand.forEach(function (c) {
      var veces = {};
      lineas.forEach(function (linea) {
        var n = 0, enComillas = false;
        for (var i = 0; i < linea.length; i++) { var ch = linea[i]; if (ch === '"') enComillas = !enComillas; else if (ch === c && !enComillas) n++; }
        if (n) veces[n] = (veces[n] || 0) + 1;
      });
      Object.keys(veces).forEach(function (k) { var s = veces[k] * 100 + +k; if (s > max) { max = s; mejor = c; } });
    });
    return mejor;
  }
  function leerCSV(texto, sep) {
    texto = String(texto == null ? '' : texto).replace(/^﻿/, '');
    sep = sep || detectarSeparador(texto);
    var filas = [], fila = [], campo = '', q = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (q) {
        if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += c;
      } else if (c === '"') q = true;
      else if (c === sep) { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); campo = '';
        if (fila.some(function (x) { return x.trim() !== ''; })) filas.push(fila);
        fila = [];
      } else campo += c;
    }
    fila.push(campo);
    if (fila.some(function (x) { return x.trim() !== ''; })) filas.push(fila);
    filas = filas.map(function (f) { return f.map(function (x) { return x.trim(); }); });
    // Muchos bancos ponen líneas de título antes de la tabla: la cabecera es la primera fila con el ancho más común.
    var anchos = {}; filas.forEach(function (f) { anchos[f.length] = (anchos[f.length] || 0) + 1; });
    var ancho = +Object.keys(anchos).sort(function (x, y) { return anchos[y] - anchos[x] || y - x; })[0] || 0;
    var ini = filas.findIndex(function (f) { return f.length === ancho; });
    if (ini < 0) return { cabecera: [], filas: [], separador: sep, omitidas: 0 };
    return { cabecera: filas[ini], filas: filas.slice(ini + 1).filter(function (f) { return f.length >= ancho - 1; }), separador: sep, omitidas: ini };
  }

  // ---------- Números y fechas ----------
  // Lee montos como «$ 1.234.567», «-12.500,50», «(3.000)», «1,234.56», «CLP 15000».
  function leerMonto(s, decimal) {
    if (typeof s === 'number') return isFinite(s) ? s : null;
    var t = String(s == null ? '' : s).trim();
    if (!t) return null;
    var neg = /^\(.*\)$/.test(t) || /-/.test(t.replace(/\d-\d/g, ''));
    t = t.replace(/[^\d.,]/g, '');
    if (!/\d/.test(t)) return null;
    var dec = decimal || 'auto';
    if (dec === 'auto') {
      var p = t.lastIndexOf('.'), c = t.lastIndexOf(',');
      if (p >= 0 && c >= 0) dec = p > c ? '.' : ',';
      else if (c >= 0) dec = /,\d{1,2}$/.test(t) && (t.match(/,/g) || []).length === 1 ? ',' : 'ninguno';
      else if (p >= 0) dec = /\.\d{1,2}$/.test(t) && (t.match(/\./g) || []).length === 1 ? '.' : 'ninguno';
      else dec = 'ninguno';
    }
    var limpio;
    if (dec === ',') limpio = t.replace(/\./g, '').replace(',', '.');
    else if (dec === '.') limpio = t.replace(/,/g, '');
    else limpio = t.replace(/[.,]/g, '');
    var n = parseFloat(limpio);
    if (!isFinite(n)) return null;
    n = Math.round(n * 100) / 100;
    return neg ? -n : n;
  }
  var MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, jan: 1, apr: 4, aug: 8, dec: 12 };
  function iso(a, m, d) {
    if (a < 100) a += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    var f = new Date(Date.UTC(a, m - 1, d));
    if (f.getUTCMonth() !== m - 1) return null;
    return f.toISOString().slice(0, 10);
  }
  // Fechas hispanas: día primero. También AAAA-MM-DD y «13 nov 2026».
  function leerFecha(s) {
    var t = String(s == null ? '' : s).trim().toLowerCase();
    if (!t) return null;
    var m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
    if (m) return iso(+m[3], +m[2], +m[1]);
    m = t.match(/^(\d{1,2})[\s\-\/.]+(?:de\s+)?([a-z]{3})[a-z]*\.?[\s\-\/.]+(?:de\s+)?(\d{2,4})/);
    if (m && MESES[m[2]]) return iso(+m[3], MESES[m[2]], +m[1]);
    return null;
  }
  function dias(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }

  // ---------- Columnas ----------
  var PISTAS = {
    fecha: /fecha|date|dia\b|f\.? ?(contable|operacion|movimiento)/,
    monto: /^(monto|importe|valor|total|amount|cantidad)|monto|importe|total/,
    abono: /abono|haber|ingreso|deposito|credito|entrada/,
    cargo: /cargo|debe|egreso|giro|debito|salida/,
    glosa: /glosa|descrip|detalle|concepto|movimiento|referencia|comentario|observ/,
    cliente: /cliente|nombre|comprador|razon social|destinatario|contacto/,
    id: /^(n|nro|num|numero|id|pedido|orden|folio|venta|boleta|factura)\b|pedido|orden|folio|n[°º]/
  };
  function adivinarColumnas(cabecera) {
    var n = cabecera.map(normalizar), mapa = {};
    ['abono', 'cargo', 'fecha', 'glosa', 'cliente', 'id', 'monto'].forEach(function (k) {
      var i = n.findIndex(function (h, j) { return PISTAS[k].test(h) && Object.keys(mapa).every(function (x) { return mapa[x] !== j; }); });
      if (i >= 0) mapa[k] = i;
    });
    return mapa;
  }

  // ---------- Movimientos y pedidos ----------
  function aMovimientos(tabla, mapa, decimal) {
    var errores = [], out = [];
    tabla.filas.forEach(function (f, i) {
      var fecha = leerFecha(f[mapa.fecha]);
      var monto = null;
      if (mapa.abono != null || mapa.cargo != null) {
        var ab = mapa.abono != null ? leerMonto(f[mapa.abono], decimal) : null;
        var ca = mapa.cargo != null ? leerMonto(f[mapa.cargo], decimal) : null;
        if (ab) monto = Math.abs(ab); else if (ca) monto = -Math.abs(ca);
      }
      if (monto == null && mapa.monto != null) monto = leerMonto(f[mapa.monto], decimal);
      if (!fecha || monto == null) { errores.push('Fila ' + (i + 1) + ': ' + (!fecha ? 'fecha ilegible' : 'monto ilegible')); return; }
      out.push({ id: 'm' + (i + 1), fecha: fecha, monto: monto, glosa: mapa.glosa != null ? f[mapa.glosa] || '' : '' });
    });
    return { lista: out, errores: errores };
  }
  function aPedidos(tabla, mapa, decimal) {
    var errores = [], out = [], vistos = {};
    tabla.filas.forEach(function (f, i) {
      var fecha = leerFecha(f[mapa.fecha]);
      var monto = mapa.monto != null ? leerMonto(f[mapa.monto], decimal) : null;
      if (!fecha || monto == null || monto <= 0) { errores.push('Fila ' + (i + 1) + ': ' + (!fecha ? 'fecha ilegible' : 'monto ilegible o cero')); return; }
      var ref = mapa.id != null && f[mapa.id] ? String(f[mapa.id]) : String(i + 1);
      var id = 'p' + ref; while (vistos[id]) id += '·'; vistos[id] = 1;
      out.push({ id: id, ref: ref, fecha: fecha, monto: monto, cliente: mapa.cliente != null ? f[mapa.cliente] || '' : '' });
    });
    return { lista: out, errores: errores };
  }

  // ---------- Conciliación ----------
  var OPC = { antes: 3, despues: 10, comision: 5 };
  function refEnGlosa(ref, glosa) {
    var r = normalizar(ref).replace(/\s/g, '');
    if (r.length < 3) return false;
    return new RegExp('(^|[^a-z0-9])' + r.replace(/[^a-z0-9]/g, '') + '($|[^a-z0-9])').test(normalizar(glosa));
  }
  function puntaje(mov, ped, o) {
    var d = dias(ped.fecha, mov.fecha);
    if (d < -o.antes || d > o.despues) return null;
    var ref = refEnGlosa(ped.ref, mov.glosa) ? 1 : 0;
    var nom = parecido(ped.cliente, mov.glosa);
    var cerca = 1 - Math.min(Math.abs(d), 15) / 15;
    return { total: ref * 3 + nom * 2 + cerca, ref: ref, nom: nom, d: d };
  }
  function motivo(p) {
    var m = [];
    if (p.ref) m.push('la glosa menciona el pedido');
    if (p.nom >= 0.5) m.push('el nombre coincide');
    m.push(p.d === 0 ? 'mismo día' : (Math.abs(p.d) + (Math.abs(p.d) === 1 ? ' día ' : ' días ') + (p.d > 0 ? 'después' : 'antes')));
    return m.join(', ');
  }
  function igual(a, b) { return Math.abs(a - b) < 0.005; }

  /* manual: [{mov, pedidos:[...]}] fijados por la persona; rechazos: ['movId|pedId'] que no se deben volver a proponer. */
  function conciliar(movs, peds, opciones, manual, rechazos) {
    var o = Object.assign({}, OPC, opciones || {});
    var rech = {}; (rechazos || []).forEach(function (k) { rech[k] = 1; });
    var abonos = movs.filter(function (m) { return m.monto > 0; });
    var usadoM = {}, usadoP = {}, pares = [];
    var porId = {}; peds.forEach(function (p) { porId[p.id] = p; });
    var movId = {}; abonos.forEach(function (m) { movId[m.id] = m; });

    (manual || []).forEach(function (x) {
      if (!movId[x.mov] || usadoM[x.mov]) return;
      var ps = x.pedidos.filter(function (id) { return porId[id] && !usadoP[id]; });
      if (!ps.length) return;
      usadoM[x.mov] = 1; ps.forEach(function (id) { usadoP[id] = 1; });
      var suma = ps.reduce(function (s, id) { return s + porId[id].monto; }, 0);
      pares.push({ mov: x.mov, pedidos: ps, tipo: 'manual', confianza: 'alta', diferencia: Math.round((movId[x.mov].monto - suma) * 100) / 100, motivo: 'unido a mano' });
    });

    function candidatos(filtro) {
      var c = [];
      abonos.forEach(function (m) {
        if (usadoM[m.id]) return;
        peds.forEach(function (p) {
          if (usadoP[p.id] || rech[m.id + '|' + p.id] || !filtro(m, p)) return;
          var s = puntaje(m, p, o); if (s) c.push({ m: m, p: p, s: s });
        });
      });
      return c.sort(function (a, b) { return b.s.total - a.s.total || a.m.fecha.localeCompare(b.m.fecha); });
    }

    // 1) Monto exacto. Se asigna de mayor a menor puntaje; si hay empate real, queda como «revisar».
    var c1 = candidatos(function (m, p) { return igual(m.monto, p.monto); });
    c1.forEach(function (x) {
      if (usadoM[x.m.id] || usadoP[x.p.id]) return;
      var rivales = c1.filter(function (y) { return y !== x && !usadoM[y.m.id] && !usadoP[y.p.id] && (y.m === x.m || y.p === x.p) && Math.abs(y.s.total - x.s.total) < 0.05; });
      usadoM[x.m.id] = 1; usadoP[x.p.id] = 1;
      var conf = x.s.ref || x.s.nom >= 0.5 ? 'alta' : (rivales.length ? 'revisar' : 'media');
      pares.push({ mov: x.m.id, pedidos: [x.p.id], tipo: 'exacto', confianza: conf, diferencia: 0,
        motivo: 'mismo monto, ' + motivo(x.s) + (rivales.length ? '; hay otro pedido igual: revisa' : '') });
    });

    // 2) Un pago que cubre varios pedidos del mismo cliente (hasta 4).
    abonos.forEach(function (m) {
      if (usadoM[m.id]) return;
      var libres = peds.filter(function (p) {
        if (usadoP[p.id] || rech[m.id + '|' + p.id] || p.monto >= m.monto) return false;
        var s = puntaje(m, p, o); return s && (s.nom >= 0.5 || s.ref);
      }).slice(0, 12);
      var mejor = null;
      (function buscar(i, elegidos, suma) {
        if (mejor) return;
        if (elegidos.length >= 2 && igual(suma, m.monto)) { mejor = elegidos.slice(); return; }
        if (elegidos.length === 4 || suma > m.monto + 0.005) return;
        for (var j = i; j < libres.length; j++) { elegidos.push(libres[j]); buscar(j + 1, elegidos, suma + libres[j].monto); elegidos.pop(); }
      })(0, [], 0);
      if (mejor) {
        usadoM[m.id] = 1; mejor.forEach(function (p) { usadoP[p.id] = 1; });
        pares.push({ mov: m.id, pedidos: mejor.map(function (p) { return p.id; }), tipo: 'agrupado', confianza: 'media', diferencia: 0,
          motivo: 'un solo pago suma ' + mejor.length + ' pedidos del mismo cliente' });
      }
    });

    // 3) Llegó menos por comisión del medio de pago (dentro del % de tolerancia), o un poco más.
    var c3 = candidatos(function (m, p) {
      var dif = p.monto - m.monto;
      return dif > 0 && dif <= p.monto * o.comision / 100;
    });
    c3.forEach(function (x) {
      if (usadoM[x.m.id] || usadoP[x.p.id]) return;
      if (!(x.s.ref || x.s.nom >= 0.5) && Math.abs(x.s.d) > 3) return;
      usadoM[x.m.id] = 1; usadoP[x.p.id] = 1;
      var dif = Math.round((x.m.monto - x.p.monto) * 100) / 100;
      pares.push({ mov: x.m.id, pedidos: [x.p.id], tipo: 'comision', confianza: x.s.ref || x.s.nom >= 0.5 ? 'media' : 'revisar', diferencia: dif,
        motivo: 'llegó ' + Math.round(-dif / x.p.monto * 1000) / 10 + ' % menos (¿comisión?), ' + motivo(x.s) });
    });

    // Duplicados: mismo día, mismo monto y misma glosa en la cartola.
    var vistos = {}, duplicados = [];
    abonos.forEach(function (m) {
      var k = m.fecha + '|' + m.monto + '|' + normalizar(m.glosa);
      if (vistos[k]) duplicados.push({ mov: m.id, igualA: vistos[k] }); else vistos[k] = m.id;
    });

    var sinRespaldo = abonos.filter(function (m) { return !usadoM[m.id]; });
    var pendientes = peds.filter(function (p) { return !usadoP[p.id]; });
    var hoy = o.hoy || new Date().toISOString().slice(0, 10);
    pendientes.forEach(function (p) { p.diasEsperando = Math.max(0, dias(p.fecha, hoy)); });
    function suma(l, f) { return Math.round(l.reduce(function (s, x) { return s + f(x); }, 0) * 100) / 100; }
    var cobrado = suma(pares, function (x) { return x.pedidos.reduce(function (s, id) { return s + porId[id].monto; }, 0); });
    return {
      pares: pares, sinRespaldo: sinRespaldo, pendientes: pendientes, duplicados: duplicados,
      resumen: {
        pedidos: peds.length, conciliados: peds.length - pendientes.length,
        porcentaje: peds.length ? Math.round((peds.length - pendientes.length) / peds.length * 100) : 0,
        totalPedidos: suma(peds, function (p) { return p.monto; }), totalCobrado: cobrado,
        totalPendiente: suma(pendientes, function (p) { return p.monto; }),
        totalSinRespaldo: suma(sinRespaldo, function (m) { return m.monto; }),
        comisiones: suma(pares, function (x) { return x.diferencia < 0 ? -x.diferencia : 0; }),
        revisar: pares.filter(function (x) { return x.confianza === 'revisar'; }).length,
        cargosIgnorados: movs.length - abonos.length
      }
    };
  }

  // ---------- Exportación ----------
  function celda(v) {
    if (typeof v === 'number') return String(v);
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
    return /[";\n\r,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function aCSV(filas) { return '﻿' + filas.map(function (f) { return f.map(celda).join(';'); }).join('\r\n'); }
  function informeCSV(res, movs, peds) {
    var M = {}, P = {}; movs.forEach(function (m) { M[m.id] = m; }); peds.forEach(function (p) { P[p.id] = p; });
    var filas = [['estado', 'pedido', 'fecha_pedido', 'cliente', 'monto_pedido', 'fecha_banco', 'glosa_banco', 'monto_banco', 'diferencia', 'confianza', 'motivo']];
    res.pares.forEach(function (x) {
      var m = M[x.mov];
      x.pedidos.forEach(function (id, i) {
        var p = P[id];
        filas.push(['cobrado', p.ref, p.fecha, p.cliente, p.monto, m.fecha, m.glosa, i === 0 ? m.monto : '', i === 0 ? x.diferencia : '', x.confianza, x.motivo]);
      });
    });
    res.pendientes.forEach(function (p) { filas.push(['pendiente', p.ref, p.fecha, p.cliente, p.monto, '', '', '', '', '', p.diasEsperando + ' días esperando']); });
    res.sinRespaldo.forEach(function (m) { filas.push(['sin respaldo', '', '', '', '', m.fecha, m.glosa, m.monto, '', '', 'abono sin pedido asociado']); });
    return aCSV(filas);
  }

  // ---------- Estado guardado ----------
  function validarEstado(o) {
    if (!o || typeof o !== 'object' || o.app !== 'cuadra') throw new Error('El archivo no es un respaldo de Cuadra.');
    ['movs', 'peds'].forEach(function (k) { if (!Array.isArray(o[k])) throw new Error('Falta la lista «' + k + '» en el respaldo.'); });
    o.manual = Array.isArray(o.manual) ? o.manual : [];
    o.rechazos = Array.isArray(o.rechazos) ? o.rechazos : [];
    o.opciones = Object.assign({}, OPC, o.opciones || {});
    o.fuentes = o.fuentes && typeof o.fuentes === 'object' ? o.fuentes : {};
    o.moneda = typeof o.moneda === 'string' ? o.moneda : 'CLP';
    o.movs.forEach(function (m) { if (typeof m.monto !== 'number' || !leerFecha(m.fecha)) throw new Error('Movimiento inválido en el respaldo.'); });
    o.peds.forEach(function (p) { if (typeof p.monto !== 'number' || !leerFecha(p.fecha)) throw new Error('Pedido inválido en el respaldo.'); });
    return o;
  }

  // ---------- Ejemplo ----------
  var EJ_CARTOLA = [
    'Banco Ejemplo · Cartola de cuenta corriente',
    'Período: 01/11/2026 al 12/11/2026',
    '',
    'Fecha;Descripción;Cargos;Abonos;Saldo',
    '02/11/2026;TRANSF DE MARIA JOSE SOTO;;24.990;524.990',
    '03/11/2026;PAGO PROVEEDOR CAJAS;45.000;;479.990',
    '03/11/2026;TRANSF DE PEDRO RAMIREZ PEDIDO 1043;;18.500;498.490',
    '04/11/2026;ABONO LINK DE PAGO 1044;;31.340;529.830',
    '05/11/2026;TRANSF DE ANA LUCIA PEREZ;;51.980;581.810',
    '06/11/2026;TRANSF DE CAMILA ROJAS;;12.990;594.800',
    '06/11/2026;TRANSF DE CAMILA ROJAS;;12.990;607.790',
    '07/11/2026;DEPOSITO EFECTIVO;;40.000;647.790',
    '09/11/2026;TRANSF DE JUAN TORRES;;15.000;662.790',
    '10/11/2026;COMISION MANTENCION;4.990;;657.800'
  ].join('\n');
  var EJ_PEDIDOS = [
    'N° pedido,Fecha,Cliente,Canal,Total',
    '1041,01-11-2026,María José Soto,Instagram,"$24.990"',
    '1042,02-11-2026,Luis Fernández,WhatsApp,"$32.000"',
    '1043,02-11-2026,Pedro Ramírez,WhatsApp,"$18.500"',
    '1044,03-11-2026,Carla Muñoz,Tienda web,"$32.000"',
    '1045,04-11-2026,Ana Lucía Pérez,Instagram,"$25.990"',
    '1046,04-11-2026,Ana Lucía Pérez,Instagram,"$25.990"',
    '1047,05-11-2026,Camila Rojas,WhatsApp,"$12.990"',
    '1048,08-11-2026,Juan Torres,WhatsApp,"$15.000"',
    '1049,10-11-2026,Sofía Vidal,Instagram,"$22.490"'
  ].join('\n');

  var api = {
    normalizar: normalizar, palabras: palabras, parecido: parecido,
    detectarSeparador: detectarSeparador, leerCSV: leerCSV, leerMonto: leerMonto, leerFecha: leerFecha, dias: dias,
    adivinarColumnas: adivinarColumnas, aMovimientos: aMovimientos, aPedidos: aPedidos, refEnGlosa: refEnGlosa,
    conciliar: conciliar, informeCSV: informeCSV, aCSV: aCSV, validarEstado: validarEstado,
    OPC: OPC, EJ_CARTOLA: EJ_CARTOLA, EJ_PEDIDOS: EJ_PEDIDOS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cuadra = api;
})(this);
