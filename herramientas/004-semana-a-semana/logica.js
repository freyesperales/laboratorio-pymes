/* Semana a Semana · lógica pura (sin DOM). Fechas ISO "AAAA-MM-DD", calculadas en UTC. */
(function (raiz) {
  'use strict';
  var DIA = 86400000;

  function aMs(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!m) return NaN;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(ms);
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return NaN;
    return ms;
  }
  function aIso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function sumaDias(iso, n) { return aIso(aMs(iso) + n * DIA); }

  /* Lunes de la semana de una fecha. */
  function lunesDe(iso) {
    var ms = aMs(iso);
    if (isNaN(ms)) return null;
    var dow = new Date(ms).getUTCDay(); // 0 domingo
    return aIso(ms - ((dow + 6) % 7) * DIA);
  }

  /* Número (0-based) de semana de una fecha respecto al lunes de inicio; null si cae fuera. */
  function indiceSemana(fecha, inicio, semanas) {
    var f = aMs(fecha), i = aMs(inicio);
    if (isNaN(f) || isNaN(i)) return null;
    var idx = Math.floor((f - i) / (7 * DIA));
    return idx >= 0 && idx < semanas ? idx : null;
  }

  /* Convierte texto a número: acepta "1.234,56", "1,234.56", "1234", "$ 1.500". */
  function numero(txt) {
    if (typeof txt === 'number') return isFinite(txt) ? txt : NaN;
    var s = String(txt == null ? '' : txt).replace(/[^\d.,\-]/g, '');
    if (!s || s === '-') return NaN;
    var ult = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    if (ult >= 0) {
      var dec = s.slice(ult + 1), ent = s.slice(0, ult).replace(/[.,]/g, '');
      // un solo separador con exactamente 3 dígitos detrás y sin otro separador = miles
      var cuenta = (s.match(/[.,]/g) || []).length;
      if (cuenta === 1 && dec.length === 3) return Number(s.replace(/[.,]/g, ''));
      return Number(ent + '.' + dec);
    }
    return Number(s);
  }

  /* Fechas en que ocurre un movimiento dentro del horizonte.
     mov: {fecha, repite: 'una'|'semanal'|'quincenal'|'mensual', hasta?} */
  function ocurrencias(mov, inicio, semanas) {
    var fin = aMs(inicio) + semanas * 7 * DIA - DIA; // último día del horizonte
    var hasta = mov.hasta ? aMs(mov.hasta) : fin;
    if (isNaN(hasta) || hasta > fin) hasta = fin;
    var f0 = aMs(mov.fecha);
    if (isNaN(f0)) return [];
    var out = [], rep = mov.repite || 'una';
    if (rep === 'una') { if (f0 <= hasta) out.push(aIso(f0)); return out; }
    if (rep === 'semanal' || rep === 'quincenal') {
      var paso = (rep === 'semanal' ? 7 : 14) * DIA;
      for (var t = f0, n = 0; t <= hasta && n < 2000; t += paso, n++) out.push(aIso(t));
      return out;
    }
    if (rep === 'mensual') {
      var d0 = new Date(f0), dia = d0.getUTCDate();
      for (var k = 0; k < 60; k++) {
        var y = d0.getUTCFullYear(), m = d0.getUTCMonth() + k;
        var ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        var t2 = Date.UTC(y, m, Math.min(dia, ultimo)); // 31 → último día del mes
        if (t2 > hasta) break;
        out.push(aIso(t2));
      }
      return out;
    }
    return [];
  }

  /* Proyecta el flujo semana a semana.
     movs: [{concepto, tipo:'cobro'|'pago', monto, fecha, repite, hasta, probabilidad?}]
     devuelve {semanas:[{n, desde, hasta, cobros, pagos, neto, inicial, final, detalle:[...]}], ...resumen} */
  function proyectar(saldoInicial, movs, inicio, semanas, opciones) {
    opciones = opciones || {};
    var ini = lunesDe(inicio);
    if (!ini) throw new Error('La fecha de inicio no es válida.');
    semanas = semanas || 13;
    var minimo = Number(opciones.minimo) || 0;
    var filas = [];
    for (var i = 0; i < semanas; i++) {
      filas.push({ n: i + 1, desde: sumaDias(ini, i * 7), hasta: sumaDias(ini, i * 7 + 6), cobros: 0, pagos: 0, neto: 0, inicial: 0, final: 0, detalle: [] });
    }
    (movs || []).forEach(function (m) {
      var monto = numero(m.monto);
      if (!isFinite(monto) || monto === 0) return;
      var prob = m.probabilidad == null || m.probabilidad === '' ? 1 : Math.min(1, Math.max(0, Number(m.probabilidad)));
      ocurrencias(m, ini, semanas).forEach(function (f) {
        var idx = indiceSemana(f, ini, semanas);
        if (idx === null) return;
        var v = Math.abs(monto) * (m.tipo === 'cobro' ? prob : 1);
        if (m.tipo === 'cobro') filas[idx].cobros += v; else filas[idx].pagos += v;
        filas[idx].detalle.push({ concepto: m.concepto || '(sin nombre)', tipo: m.tipo, monto: v, fecha: f });
      });
    });
    var saldo = Number(saldoInicial) || 0;
    var primeraNegativa = null, primeraBajoMinimo = null, peor = null;
    filas.forEach(function (f) {
      f.inicial = saldo;
      f.neto = f.cobros - f.pagos;
      f.final = saldo + f.neto;
      saldo = f.final;
      if (primeraNegativa === null && f.final < 0) primeraNegativa = f.n;
      if (primeraBajoMinimo === null && f.final < minimo) primeraBajoMinimo = f.n;
      if (peor === null || f.final < peor.final) peor = f;
    });
    return {
      inicio: ini, semanas: filas, primeraNegativa: primeraNegativa, primeraBajoMinimo: primeraBajoMinimo,
      saldoMinimo: peor ? peor.final : saldoInicial, semanaMinima: peor ? peor.n : null,
      saldoFinal: filas.length ? filas[filas.length - 1].final : saldoInicial,
      totalCobros: filas.reduce(function (a, f) { return a + f.cobros; }, 0),
      totalPagos: filas.reduce(function (a, f) { return a + f.pagos; }, 0)
    };
  }

  /* Cuánto falta cobrar adelantado (o recortar) para no pasar del mínimo: déficit máximo. */
  function faltante(resultado, minimo) {
    var m = Number(minimo) || 0;
    return Math.max(0, m - resultado.saldoMinimo);
  }

  function escCsv(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function aCsv(resultado) {
    var l = [['Semana', 'Desde', 'Hasta', 'Saldo inicial', 'Cobros', 'Pagos', 'Saldo final'].join(';')];
    resultado.semanas.forEach(function (f) {
      l.push([f.n, f.desde, f.hasta, f.inicial.toFixed(2), f.cobros.toFixed(2), f.pagos.toFixed(2), f.final.toFixed(2)].map(escCsv).join(';'));
    });
    return l.join('\n');
  }

  var api = { aMs: aMs, aIso: aIso, lunesDe: lunesDe, sumaDias: sumaDias, indiceSemana: indiceSemana, numero: numero, ocurrencias: ocurrencias, proyectar: proyectar, faltante: faltante, aCsv: aCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.Flujo = api;
})(typeof window !== 'undefined' ? window : this);
