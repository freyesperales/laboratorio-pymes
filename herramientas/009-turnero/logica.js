/* Turnero · lógica pura (sin DOM). Navegador (global Turnero) y Node. */
(function (root) {
  'use strict';

  var DIA = 1440; // minutos
  var NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var NOMBRES_DIA_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  // ---------- Perfiles de reglas (fuentes en INVESTIGACION.md) ----------
  // null = la regla no se revisa en ese perfil.
  var PERFILES = {
    cl42: {
      nombre: 'Chile · 42 horas (desde el 26-04-2026)', pais: 'CL',
      promedioSemanal: 42, topeSemanaCiclo: 45, maxSemanasSeguidasSobrePromedio: 2,
      maxDiario: 10, minDias: 5, maxDias: 6, descansoEntreJornadas: null,
      descansoSemanalHoras: null, pausaSiMasDe: null, pausaMin: null, maxExtraDiaria: 2, maxExtraSemanal: 12, maxExtraAnual: null,
      nota: 'Ley 21.561 y Código del Trabajo (arts. 22 bis, 28 y 31). El promedio se calcula en el ciclo de hasta 4 semanas.'
    },
    cl40: {
      nombre: 'Chile · 40 horas (desde el 26-04-2028)', pais: 'CL',
      promedioSemanal: 40, topeSemanaCiclo: 45, maxSemanasSeguidasSobrePromedio: 2,
      maxDiario: 10, minDias: 5, maxDias: 6, descansoEntreJornadas: null,
      descansoSemanalHoras: null, pausaSiMasDe: null, pausaMin: null, maxExtraDiaria: 2, maxExtraSemanal: 12, maxExtraAnual: null,
      nota: 'Última etapa de la Ley 21.561. Puedes adelantarla de forma voluntaria.'
    },
    es40: {
      nombre: 'España · 40 horas (Estatuto de los Trabajadores)', pais: 'ES',
      promedioSemanal: 40, topeSemanaCiclo: null, maxSemanasSeguidasSobrePromedio: null,
      maxDiario: 9, minDias: null, maxDias: null, descansoEntreJornadas: 12,
      descansoSemanalHoras: 36, pausaSiMasDe: 6, pausaMin: 15, maxExtraDiaria: null, maxExtraSemanal: null, maxExtraAnual: 80,
      nota: 'Arts. 34, 35 y 37 del Estatuto. El promedio legal es anual; Turnero lo controla en el ciclo, que es más estricto. Tu convenio puede cambiar el tope diario.'
    }
  };
  var FECHA_40H_CL = '2028-04-26';

  // ---------- Utilidades ----------
  function hm(s) { // '07:30' -> 450
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null;
    return h * 60 + mi;
  }
  function aHM(min) {
    min = ((Math.round(min) % DIA) + DIA) % DIA;
    return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  }
  function horas(min) { return Math.round(min / 6) / 10; } // 1 decimal
  function fmtH(min) {
    var h = Math.floor(Math.abs(min) / 60), m = Math.round(Math.abs(min) % 60);
    return (min < 0 ? '-' : '') + h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
  }
  function sumarDias(iso, n) {
    var p = iso.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function diaSemana(iso) { // 0 = lunes
    var p = iso.split('-').map(Number);
    return (new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() + 6) % 7;
  }
  function lunesDe(iso) { return sumarDias(iso, -diaSemana(iso)); }
  function fechaCorta(iso) { return iso.slice(8, 10) + '-' + iso.slice(5, 7); }
  function esFecha(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  var cont = 0;
  function id(pref) { cont++; return (pref || 'x') + Date.now().toString(36) + cont.toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  // ---------- Turnos ----------
  // Duración bruta en minutos (cruza medianoche si fin <= inicio) y horas efectivas (menos colación).
  function duracionTurno(t) {
    var a = hm(t.inicio), b = hm(t.fin);
    if (a == null || b == null) return null;
    var bruto = b > a ? b - a : b + DIA - a;
    var col = Math.max(0, +t.colacion || 0);
    return { bruto: bruto, efectivo: Math.max(0, bruto - col), colacion: col, cruza: b <= a };
  }
  function validarTurno(t) {
    var e = [];
    if (!t || !String(t.nombre || '').trim()) e.push('El turno necesita un nombre.');
    if (hm(t && t.inicio) == null) e.push('Hora de inicio inválida (usa HH:MM).');
    if (hm(t && t.fin) == null) e.push('Hora de término inválida (usa HH:MM).');
    var d = t && duracionTurno(t);
    if (d && d.colacion >= d.bruto) e.push('La colación no puede durar lo mismo o más que el turno.');
    if (d && d.bruto > 16 * 60) e.push('El turno dura más de 16 horas: revisa las horas.');
    return e;
  }

  // ---------- Estado ----------
  function estadoVacio(hoyIso) {
    return {
      version: 1, perfil: 'cl42', ajustes: {}, semanas: 1,
      inicio: lunesDe(hoyIso || new Date().toISOString().slice(0, 10)),
      negocio: '', equipo: [], turnos: [], grilla: {}, cobertura: [0, 0, 0, 0, 0, 0, 0],
      real: {}, comp: {}, pactoExtrasHasta: '', tolerancia: 0, metodoExtra: ''
    };
  }
  function reglas(est) {
    var base = PERFILES[est.perfil] || PERFILES.cl42, r = {};
    Object.keys(base).forEach(function (k) { r[k] = base[k]; });
    var aj = est.ajustes || {};
    Object.keys(aj).forEach(function (k) { if (k in base && typeof base[k] !== 'string' && aj[k] !== '' && aj[k] !== undefined) r[k] = aj[k] === null ? null : +aj[k]; });
    return r;
  }
  function totalDias(est) { return 7 * est.semanas; }
  function celda(est, pid, d) { var f = est.grilla[pid]; return f && f[d] ? f[d] : null; }
  function asignar(est, pid, d, tid) {
    if (!est.grilla[pid]) est.grilla[pid] = [];
    while (est.grilla[pid].length < totalDias(est)) est.grilla[pid].push(null);
    est.grilla[pid][d] = tid || null;
  }
  function cambiarSemanas(est, n) {
    n = Math.max(1, Math.min(4, Math.round(+n) || 1));
    var antes = est.semanas;
    est.semanas = n;
    Object.keys(est.grilla).forEach(function (pid) {
      var f = est.grilla[pid] || [];
      var nueva = [];
      for (var d = 0; d < 7 * n; d++) nueva.push(d < 7 * antes ? (f[d] || null) : (f[d % 7] || null));
      est.grilla[pid] = nueva;
    });
  }
  function copiarSemana(est, desde) {
    Object.keys(est.grilla).forEach(function (pid) {
      for (var w = 0; w < est.semanas; w++) if (w !== desde)
        for (var k = 0; k < 7; k++) asignar(est, pid, w * 7 + k, celda(est, pid, desde * 7 + k));
    });
  }
  function turnoPorId(est, tid) { for (var i = 0; i < est.turnos.length; i++) if (est.turnos[i].id === tid) return est.turnos[i]; return null; }
  function quitarTurno(est, tid) {
    est.turnos = est.turnos.filter(function (t) { return t.id !== tid; });
    Object.keys(est.grilla).forEach(function (pid) { est.grilla[pid] = (est.grilla[pid] || []).map(function (x) { return x === tid ? null : x; }); });
  }
  function quitarPersona(est, pid) {
    est.equipo = est.equipo.filter(function (p) { return p.id !== pid; });
    delete est.grilla[pid];
    if (est.real) delete est.real[pid];
    if (est.comp) delete est.comp[pid];
  }

  // Intervalos de trabajo de una persona dentro del ciclo, en minutos desde el inicio del ciclo.
  function intervalos(est, pid) {
    var out = [];
    for (var d = 0; d < totalDias(est); d++) {
      var t = turnoPorId(est, celda(est, pid, d));
      if (!t) continue;
      var du = duracionTurno(t);
      if (!du) continue;
      var a = d * DIA + hm(t.inicio);
      out.push({ dia: d, ini: a, fin: a + du.bruto, efectivo: du.efectivo, colacion: du.colacion, bruto: du.bruto, turno: t });
    }
    return out;
  }

  // ---------- Revisión ----------
  function nombreDia(est, d) {
    var f = sumarDias(est.inicio, d);
    return NOMBRES_DIA[d % 7] + ' ' + fechaCorta(f);
  }
  function revisar(est) {
    var r = reglas(est), S = est.semanas, L = totalDias(est) * DIA;
    var alertas = [], personas = [];
    function alerta(nivel, pid, nombre, codigo, texto, dia) { alertas.push({ nivel: nivel, persona: pid, nombre: nombre, codigo: codigo, texto: texto, dia: dia == null ? null : dia }); }

    est.equipo.forEach(function (p) {
      var iv = intervalos(est, p.id);
      var porSemana = [], diasSemana = [];
      for (var w = 0; w < S; w++) { porSemana.push(0); diasSemana.push(0); }
      iv.forEach(function (x) { var w = Math.floor(x.dia / 7); porSemana[w] += x.efectivo; diasSemana[w]++; });
      var total = porSemana.reduce(function (a, b) { return a + b; }, 0);
      var prom = S ? total / S : 0;
      var contrato = +p.horasContrato > 0 ? +p.horasContrato * 60 : null;
      var completa = contrato == null ? true : contrato >= r.promedioSemanal * 60;
      var n0 = alertas.length;

      // Diario
      if (r.maxDiario != null) iv.forEach(function (x) {
        if (x.efectivo > r.maxDiario * 60) alerta('error', p.id, p.nombre, 'diario', p.nombre + ' trabaja ' + fmtH(x.efectivo) + ' el ' + nombreDia(est, x.dia) + ': supera el máximo de ' + r.maxDiario + ' h diarias.', x.dia);
      });
      // Pausa (España)
      if (r.pausaSiMasDe != null) iv.forEach(function (x) {
        if (x.bruto > r.pausaSiMasDe * 60 && x.colacion < r.pausaMin) alerta('aviso', p.id, p.nombre, 'pausa', 'El turno del ' + nombreDia(est, x.dia) + ' de ' + p.nombre + ' pasa de ' + r.pausaSiMasDe + ' h seguidas sin una pausa de al menos ' + r.pausaMin + ' minutos.', x.dia);
      });
      // Semanal
      for (var w = 0; w < S; w++) {
        var hw = porSemana[w], et = 'semana ' + (w + 1) + ' (desde el ' + fechaCorta(sumarDias(est.inicio, w * 7)) + ')';
        if (S === 1 && hw > r.promedioSemanal * 60) alerta('error', p.id, p.nombre, 'semanal', p.nombre + ' suma ' + fmtH(hw) + ' en la semana: supera las ' + r.promedioSemanal + ' h.', w * 7);
        if (S > 1 && r.topeSemanaCiclo != null && hw > r.topeSemanaCiclo * 60) alerta('error', p.id, p.nombre, 'tope-ciclo', p.nombre + ' suma ' + fmtH(hw) + ' en la ' + et + ': en un ciclo, ninguna semana puede pasar de ' + r.topeSemanaCiclo + ' h ordinarias.', w * 7);
        if (r.maxDias != null && diasSemana[w] > r.maxDias) alerta('error', p.id, p.nombre, 'dias-max', p.nombre + ' trabaja ' + diasSemana[w] + ' días en la ' + et + ': el máximo es ' + r.maxDias + '.', w * 7);
        if (r.minDias != null && completa && diasSemana[w] > 0 && diasSemana[w] < r.minDias) alerta('aviso', p.id, p.nombre, 'dias-min', p.nombre + ' tiene jornada completa repartida en ' + diasSemana[w] + ' días en la ' + et + ': la ley pide repartirla en ' + r.minDias + ' o ' + r.maxDias + ' días, salvo pacto especial.', w * 7);
      }
      // Promedio del ciclo
      if (S > 1 && prom > r.promedioSemanal * 60 + 0.5) alerta('error', p.id, p.nombre, 'promedio', p.nombre + ' promedia ' + fmtH(prom) + ' semanales en el ciclo: supera las ' + r.promedioSemanal + ' h.', null);
      // Semanas seguidas sobre el promedio (cíclico)
      if (S > 1 && r.maxSemanasSeguidasSobrePromedio != null && r.topeSemanaCiclo != null) {
        var racha = 0, peor = 0;
        for (var i = 0; i < 2 * S; i++) { if (porSemana[i % S] >= r.topeSemanaCiclo * 60) { racha++; peor = Math.max(peor, racha); } else racha = 0; }
        peor = Math.min(peor, S);
        if (peor > r.maxSemanasSeguidasSobrePromedio) alerta('error', p.id, p.nombre, 'racha', p.nombre + ' queda ' + peor + ' semanas seguidas en el tope de ' + r.topeSemanaCiclo + ' h: el máximo son ' + r.maxSemanasSeguidasSobrePromedio + '.', null);
      }
      // Descanso entre jornadas (cíclico: el ciclo se repite)
      if (r.descansoEntreJornadas != null && iv.length) {
        for (var j = 0; j < iv.length; j++) {
          var cur = iv[j], sig = j + 1 < iv.length ? iv[j + 1] : { ini: iv[0].ini + L, dia: iv[0].dia };
          var gap = sig.ini - cur.fin;
          if (iv.length === 1 && gap >= L - cur.bruto) continue;
          if (gap < 0) alerta('error', p.id, p.nombre, 'solape', 'Los turnos de ' + p.nombre + ' del ' + nombreDia(est, cur.dia) + ' y del ' + nombreDia(est, sig.dia % totalDias(est)) + ' se pisan.', cur.dia);
          else if (gap < r.descansoEntreJornadas * 60) alerta('error', p.id, p.nombre, 'entre-jornadas', p.nombre + ' descansa solo ' + fmtH(gap) + ' entre el turno del ' + nombreDia(est, cur.dia) + ' y el siguiente: el mínimo es ' + r.descansoEntreJornadas + ' h.', cur.dia);
        }
      }
      // Solapes en cualquier perfil
      if (r.descansoEntreJornadas == null) for (var k = 0; k + 1 < iv.length; k++) if (iv[k + 1].ini < iv[k].fin) alerta('error', p.id, p.nombre, 'solape', 'Los turnos de ' + p.nombre + ' del ' + nombreDia(est, iv[k].dia) + ' y del ' + nombreDia(est, iv[k + 1].dia) + ' se pisan.', iv[k].dia);
      // Descanso semanal continuo (España)
      if (r.descansoSemanalHoras != null && iv.length) {
        var gaps = [];
        for (var g = 0; g < iv.length; g++) {
          var a = iv[g].fin, b = g + 1 < iv.length ? iv[g + 1].ini : iv[0].ini + L;
          gaps.push([a, b]); gaps.push([a - L, b - L]);
        }
        for (var w2 = 0; w2 < S; w2++) {
          var ws = w2 * 7 * DIA, we = ws + 7 * DIA;
          var ok = gaps.some(function (x) { return x[1] - x[0] >= r.descansoSemanalHoras * 60 && x[1] > ws && x[0] < we; });
          if (!ok) alerta('aviso', p.id, p.nombre, 'descanso-semanal', p.nombre + ' no tiene ' + r.descansoSemanalHoras + ' h seguidas de descanso en la semana ' + (w2 + 1) + ' (día y medio; tu convenio puede acumularlo en 14 días).', w2 * 7);
        }
      }
      // Horas de contrato
      if (contrato != null && iv.length && Math.abs(prom - contrato) >= 30) alerta('info', p.id, p.nombre, 'contrato', p.nombre + ' tiene ' + fmtH(prom) + ' planificadas por semana y su contrato dice ' + fmtH(contrato) + ' (' + (prom > contrato ? 'sobran ' : 'faltan ') + fmtH(Math.abs(prom - contrato)) + ').', null);

      var mias = alertas.slice(n0);
      personas.push({
        id: p.id, nombre: p.nombre, rol: p.rol || '', porSemana: porSemana, dias: diasSemana, promedio: prom, total: total,
        contrato: contrato, errores: mias.filter(function (a) { return a.nivel === 'error'; }).length,
        avisos: mias.filter(function (a) { return a.nivel === 'aviso'; }).length
      });
    });

    // Cobertura mínima por día
    var cobertura = [];
    for (var d = 0; d < totalDias(est); d++) {
      var n = est.equipo.filter(function (p) { return !!turnoPorId(est, celda(est, p.id, d)); }).length;
      var min = +(est.cobertura || [])[d % 7] || 0;
      cobertura.push({ dia: d, personas: n, minimo: min });
      if (min && n < min) alerta('aviso', null, '', 'cobertura', 'El ' + nombreDia(est, d) + ' hay ' + n + (n === 1 ? ' persona' : ' personas') + ' y necesitas ' + min + '.', d);
    }
    // Transición chilena a 40 h
    if (est.perfil === 'cl42') {
      var finCiclo = sumarDias(est.inicio, totalDias(est) - 1);
      if (finCiclo >= FECHA_40H_CL) alerta('info', null, '', 'transicion', 'Este ciclo llega al ' + fechaCorta(finCiclo) + '-' + finCiclo.slice(0, 4) + ': desde el 26-04-2028 la jornada en Chile es de 40 horas. Cambia el perfil a «Chile · 40 horas».', null);
    }
    if (!est.equipo.length) alerta('info', null, '', 'vacio', 'Agrega a tu equipo para empezar.', null);
    else if (!est.turnos.length) alerta('info', null, '', 'vacio', 'Crea al menos un turno (por ejemplo «Apertura 08:00 a 16:30»).', null);

    var orden = { error: 0, aviso: 1, info: 2 };
    alertas.sort(function (a, b) { return orden[a.nivel] - orden[b.nivel] || (a.dia == null ? 99 : a.dia) - (b.dia == null ? 99 : b.dia); });
    return {
      reglas: r, alertas: alertas, personas: personas, cobertura: cobertura,
      errores: alertas.filter(function (a) { return a.nivel === 'error'; }).length,
      avisos: alertas.filter(function (a) { return a.nivel === 'aviso'; }).length,
      horasTotales: personas.reduce(function (s, p) { return s + p.total; }, 0)
    };
  }

  // ---------- Rebaja sin acuerdo (Dictamen 253/21 DT, 16-04-2026) ----------
  // Devuelve cuántos minutos rebajar y en cuántos días, según los días de la jornada.
  function rebajaSinAcuerdo(diasJornada) {
    if (+diasJornada === 5) return { total: 120, cortes: [60, 60], texto: 'Rebaja 1 hora al final de la jornada en 2 días distintos (2 horas a la semana).' };
    if (+diasJornada === 6) return { total: 120, cortes: [50, 50, 20], texto: 'Rebaja 50 minutos al final de la jornada en 2 días distintos y 20 minutos en un tercer día (2 horas a la semana).' };
    return null;
  }

  // ---------- Salidas ----------
  function textoWhatsApp(est, semana) {
    var w = semana || 0, out = [];
    var tit = (est.negocio ? est.negocio + ' · ' : '') + 'Turnos semana del ' + fechaCorta(sumarDias(est.inicio, w * 7)) + ' al ' + fechaCorta(sumarDias(est.inicio, w * 7 + 6));
    out.push('*' + tit + '*');
    for (var k = 0; k < 7; k++) {
      var d = w * 7 + k, lineas = [], libres = [];
      est.equipo.forEach(function (p) {
        var t = turnoPorId(est, celda(est, p.id, d));
        if (t) lineas.push({ ini: hm(t.inicio), txt: p.nombre + ' ' + t.inicio + '–' + t.fin + ' (' + t.nombre + ')' });
        else libres.push(p.nombre);
      });
      lineas.sort(function (a, b) { return a.ini - b.ini; });
      out.push('');
      out.push('*' + NOMBRES_DIA[k] + ' ' + fechaCorta(sumarDias(est.inicio, d)) + '*');
      if (lineas.length) lineas.forEach(function (l) { out.push('• ' + l.txt); }); else out.push('• Cerrado o sin turnos');
      if (libres.length && lineas.length) out.push('Libre: ' + libres.join(', '));
    }
    return out.join('\n');
  }
  function csvCampo(v) { v = v == null ? '' : String(v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function aCSV(filas, sep) { sep = sep || ';'; return '\uFEFF' + filas.map(function (f) { return f.map(csvCampo).join(sep); }).join('\r\n') + '\r\n'; }
  function grillaCSV(est) {
    var filas = [['Persona', 'Rol', 'Fecha', 'Día', 'Turno', 'Inicio', 'Término', 'Colación (min)', 'Horas efectivas']];
    est.equipo.forEach(function (p) {
      for (var d = 0; d < totalDias(est); d++) {
        var t = turnoPorId(est, celda(est, p.id, d)), f = sumarDias(est.inicio, d);
        if (!t) { filas.push([p.nombre, p.rol || '', f, NOMBRES_DIA_LARGO[d % 7], 'Libre', '', '', '', '0']); continue; }
        var du = duracionTurno(t);
        filas.push([p.nombre, p.rol || '', f, NOMBRES_DIA_LARGO[d % 7], t.nombre, t.inicio, t.fin, String(du.colacion), String(horas(du.efectivo)).replace('.', ',')]);
      }
    });
    return aCSV(filas);
  }
  function resumenCSV(est) {
    var rv = revisar(est), filas = [['Persona', 'Rol'].concat(rv.personas.length ? rv.personas[0].porSemana.map(function (_, i) { return 'Semana ' + (i + 1) + ' (h)'; }) : []).concat(['Promedio semanal (h)', 'Contrato (h)', 'Errores', 'Avisos'])];
    rv.personas.forEach(function (p) {
      filas.push([p.nombre, p.rol].concat(p.porSemana.map(function (m) { return String(horas(m)).replace('.', ','); }))
        .concat([String(horas(p.promedio)).replace('.', ','), p.contrato == null ? '' : String(horas(p.contrato)).replace('.', ','), String(p.errores), String(p.avisos)]));
    });
    return aCSV(filas);
  }
  // Calendario .ics de una persona, repitiendo el ciclo hasta cubrir `semanasTotales`.
  function ics(est, pid, semanasTotales) {
    var p = est.equipo.filter(function (x) { return x.id === pid; })[0];
    if (!p) return '';
    var n = Math.max(est.semanas, Math.min(26, +semanasTotales || est.semanas));
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Laboratorio Pymes//Turnero//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + escICS('Turnos de ' + p.nombre)];
    var sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    for (var d = 0; d < n * 7; d++) {
      var t = turnoPorId(est, celda(est, pid, d % totalDias(est)));
      if (!t) continue;
      var du = duracionTurno(t), f = sumarDias(est.inicio, d), a = hm(t.inicio);
      var ff = du.cruza ? sumarDias(f, 1) : f;
      L.push('BEGIN:VEVENT', 'UID:' + pid + '-' + f + '@turnero', 'DTSTAMP:' + sello,
        'DTSTART:' + f.replace(/-/g, '') + 'T' + aHM(a).replace(':', '') + '00',
        'DTEND:' + ff.replace(/-/g, '') + 'T' + aHM(a + du.bruto).replace(':', '') + '00',
        'SUMMARY:' + escICS('Turno ' + t.nombre + (est.negocio ? ' · ' + est.negocio : '')),
        'DESCRIPTION:' + escICS('Colación: ' + du.colacion + ' min. Horas efectivas: ' + horas(du.efectivo) + '.'), 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  function escICS(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }

  // ---------- Importación de equipo desde CSV (nombre;rol;horas) ----------
  function leerEquipoCSV(txt) {
    var lineas = String(txt || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lineas.length) return { equipo: [], omitidas: 0 };
    var sep = (lineas[0].match(/;/g) || []).length >= (lineas[0].match(/,/g) || []).length ? ';' : ',';
    var out = [], omit = 0;
    lineas.forEach(function (l, i) {
      var c = l.split(sep).map(function (x) { return x.trim().replace(/^"|"$/g, ''); });
      if (i === 0 && /nombre/i.test(c[0])) return;
      if (!c[0]) { omit++; return; }
      var h = parseFloat(String(c[2] || '').replace(',', '.'));
      out.push({ id: id('p'), nombre: c[0].slice(0, 60), rol: (c[1] || '').slice(0, 40), horasContrato: isFinite(h) && h > 0 ? h : '' });
    });
    return { equipo: out, omitidas: omit };
  }

  // ---------- Fase 2 · Lo trabajado (planificado contra real) ----------
  // est.real[pid][fecha] = { inicio, fin, colacion, nota, plan } o { ausente: true, nota, plan }
  // `plan` es una copia del turno planificado al registrar: cambiar la grilla después no reescribe el pasado.
  function diasEntre(a, b) {
    var p = a.split('-').map(Number), q = b.split('-').map(Number);
    return Math.round((Date.UTC(q[0], q[1] - 1, q[2]) - Date.UTC(p[0], p[1] - 1, p[2])) / 864e5);
  }
  function diaDelCiclo(est, fecha) { var L = totalDias(est), n = diasEntre(est.inicio, fecha); return ((n % L) + L) % L; }
  function planDe(est, pid, fecha) { // el ciclo se repite hacia adelante y hacia atrás
    var t = turnoPorId(est, celda(est, pid, diaDelCiclo(est, fecha)));
    if (!t || !duracionTurno(t)) return null;
    return { nombre: t.nombre, inicio: t.inicio, fin: t.fin, colacion: Math.max(0, +t.colacion || 0) };
  }
  function minPlan(plan) { var d = plan && duracionTurno(plan); return d ? d.efectivo : 0; }
  function registro(est, pid, fecha) { var r = est.real && est.real[pid]; return r && r[fecha] ? r[fecha] : null; }
  function validarMarca(m) {
    if (!m || typeof m !== 'object') return ['Falta el registro.'];
    if (m.ausente) return [];
    var e = [];
    if (hm(m.inicio) == null) e.push('Hora de entrada inválida (usa HH:MM).');
    if (hm(m.fin) == null) e.push('Hora de salida inválida (usa HH:MM).');
    if (e.length) return e;
    var d = duracionTurno(m);
    if (d.colacion >= d.bruto) e.push('La colación no puede durar lo mismo o más que la jornada.');
    if (d.bruto > 16 * 60) e.push('Hay más de 16 horas entre la entrada y la salida: revisa las horas.');
    return e;
  }
  function marcar(est, pid, fecha, m) {
    if (!esFecha(fecha)) return ['Fecha inválida.'];
    if (!est.equipo.some(function (p) { return p.id === pid; })) return ['Persona desconocida.'];
    var e = validarMarca(m); if (e.length) return e;
    if (!est.real) est.real = {};
    if (!est.real[pid]) est.real[pid] = {};
    var previo = est.real[pid][fecha];
    var reg = m.ausente ? { ausente: true } : { inicio: aHM(hm(m.inicio)), fin: aHM(hm(m.fin)), colacion: Math.max(0, Math.round(+m.colacion) || 0) };
    reg.nota = String(m.nota || '').slice(0, 120);
    reg.plan = previo && 'plan' in previo ? previo.plan : planDe(est, pid, fecha);
    est.real[pid][fecha] = reg;
    return [];
  }
  function quitarMarca(est, pid, fecha) { if (est.real && est.real[pid]) delete est.real[pid][fecha]; }
  // Qué pasó un día: plan, real, diferencia y estado.
  function diaReal(est, pid, fecha) {
    var reg = registro(est, pid, fecha), plan = reg ? (reg.plan || null) : planDe(est, pid, fecha);
    var planMin = minPlan(plan), realMin = 0, estado, tol = Math.max(0, +est.tolerancia || 0);
    if (!reg) estado = plan ? 'sin-registro' : 'libre';
    else if (reg.ausente) estado = plan ? 'ausente' : 'libre';
    else {
      var d = duracionTurno(reg); realMin = d ? d.efectivo : 0;
      if (plan && Math.abs(realMin - planMin) <= tol) realMin = planMin;
      estado = !plan ? 'libre-trabajado' : realMin === planMin ? 'segun-plan' : realMin > planMin ? 'mas' : 'menos';
    }
    return { fecha: fecha, plan: plan, reg: reg, planMin: planMin, realMin: realMin, dif: reg ? realMin - planMin : 0, estado: estado, nota: reg ? reg.nota || '' : '' };
  }
  // Copia el plan como real en los días planificados que aún no tienen registro. Devuelve cuántos creó.
  function precargar(est, desde, hasta, pids) {
    var n = 0;
    est.equipo.forEach(function (p) {
      if (pids && pids.indexOf(p.id) < 0) return;
      for (var f = desde; f <= hasta; f = sumarDias(f, 1)) {
        if (registro(est, p.id, f)) continue;
        var pl = planDe(est, p.id, f);
        if (pl && !marcar(est, p.id, f, pl).length) n++;
      }
    });
    return n;
  }
  function metodoExtra(est) {
    if (est.metodoExtra === 'diario' || est.metodoExtra === 'semanal') return est.metodoExtra;
    return reglas(est).pais === 'ES' ? 'diario' : 'semanal';
  }
  // Semana de lunes a domingo: lo trabajado contra la jornada de esa semana (los atrasos y las
  // salidas tardías se compensan dentro de la misma semana, como calcula la Dirección del Trabajo).
  // Base: en un ciclo de varias semanas, lo planificado para esa semana; si no, las horas de contrato o las del perfil.
  function semanaReal(est, p, lunes) {
    var plan = 0, real = 0, reg = 0;
    for (var k = 0; k < 7; k++) { var x = diaReal(est, p.id, sumarDias(lunes, k)); plan += x.planMin; real += x.realMin; if (x.reg) reg++; }
    var r = reglas(est), contrato = +p.horasContrato > 0 ? +p.horasContrato * 60 : null;
    var base = est.semanas > 1 && plan > 0 ? plan : (contrato != null ? contrato : r.promedioSemanal * 60);
    return { lunes: lunes, plan: plan, real: real, base: base, registros: reg, extra: Math.max(0, real - base) };
  }
  // Horas extra entre dos fechas según el método (diario: sobre lo planificado cada día; semanal: semanas que terminan en el rango).
  function extrasEntre(est, p, desde, hasta) {
    var regs = (est.real && est.real[p.id]) || {}, fechas = Object.keys(regs), total = 0;
    if (metodoExtra(est) === 'diario') {
      fechas.forEach(function (f) { if (f >= desde && f <= hasta) total += Math.max(0, diaReal(est, p.id, f).dif); });
      return total;
    }
    var vistos = {};
    fechas.forEach(function (f) {
      var l = lunesDe(f), dom = sumarDias(l, 6);
      if (vistos[l] || dom < desde || dom > hasta) return;
      vistos[l] = 1; total += semanaReal(est, p, l).extra;
    });
    return total;
  }
  function finDeMes(mes) { var p = mes.split('-').map(Number); return mes + '-' + String(new Date(Date.UTC(p[0], p[1], 0)).getUTCDate()).padStart(2, '0'); }
  function esMes(s) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s)); }
  function sumarMes(mes, n) { var p = mes.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1 + n, 1)); return d.toISOString().slice(0, 7); }
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function nombreMes(mes) { return MESES[+mes.slice(5, 7) - 1] + ' de ' + mes.slice(0, 4); }
  function fechaLarga(f) { return NOMBRES_DIA[diaSemana(f)] + ' ' + fechaCorta(f); }
  function compensadas(est, pid, mes) { var c = est.comp && est.comp[pid]; return c && +c[mes] > 0 ? +c[mes] : 0; }
  function compensadasAnio(est, pid, anio) {
    var c = (est.comp && est.comp[pid]) || {}, t = 0;
    Object.keys(c).forEach(function (m) { if (m.slice(0, 4) === String(anio) && +c[m] > 0) t += +c[m]; });
    return t;
  }

  // Informe de un mes ('AAAA-MM'). `hoyIso` sirve para no contar como pendientes los días que aún no llegan.
  function informeMes(est, mes, hoyIso) {
    var r = reglas(est), desde = mes + '-01', hasta = finDeMes(mes), anio = mes.slice(0, 4), metodo = metodoExtra(est);
    var alertas = [], personas = [], primer = null;
    // Los días anteriores al primer registro del equipo no cuentan como pendientes.
    Object.keys(est.real || {}).forEach(function (pid) { Object.keys(est.real[pid] || {}).forEach(function (f) { if (!primer || f < primer) primer = f; }); });
    function alerta(nivel, p, codigo, texto, fecha) { alertas.push({ nivel: nivel, persona: p.id, nombre: p.nombre, codigo: codigo, texto: texto, fecha: fecha || null }); }
    est.equipo.forEach(function (p) {
      var n0 = alertas.length, dias = [], t = { planMin: 0, realMin: 0, trabajados: 0, ausencias: 0, sinRegistro: 0, libresTrabajados: 0 };
      var contrato = +p.horasContrato > 0 ? +p.horasContrato * 60 : null, ultimaExtra = null;
      for (var f = desde; f <= hasta; f = sumarDias(f, 1)) {
        var x = diaReal(est, p.id, f);
        dias.push(x); t.realMin += x.realMin; if (x.reg) t.planMin += x.planMin;
        if (x.estado === 'ausente') t.ausencias++;
        else if (x.estado === 'sin-registro') { if (primer && f >= primer && (!hoyIso || f <= hoyIso)) t.sinRegistro++; }
        else if (x.reg && !x.reg.ausente) { t.trabajados++; if (x.estado === 'libre-trabajado') t.libresTrabajados++; }
        if (x.dif > 0) ultimaExtra = f;
        // Tope de horas extra en un día planificado (el día libre trabajado se avisa aparte)
        if (r.maxExtraDiaria != null && x.plan && x.dif > r.maxExtraDiaria * 60)
          alerta('error', p, 'extra-diaria', p.nombre + ' trabajó ' + fmtH(x.dif) + ' más de lo planificado el ' + fechaLarga(f) + ': el máximo son ' + r.maxExtraDiaria + ' horas extra por día.', f);
        if (r.maxExtraDiaria != null && r.maxDiario != null && x.realMin > (r.maxDiario + r.maxExtraDiaria) * 60)
          alerta('error', p, 'diario-real', p.nombre + ' trabajó ' + fmtH(x.realMin) + ' el ' + fechaLarga(f) + ': supera las ' + r.maxDiario + ' h ordinarias más ' + r.maxExtraDiaria + ' extra.', f);
        if (x.estado === 'libre-trabajado')
          alerta('aviso', p, 'libre-trabajado', p.nombre + ' trabajó ' + fmtH(x.realMin) + ' el ' + fechaLarga(f) + ', que era su día libre: revisa su descanso de la semana.', f);
      }
      // Descanso entre jornadas reales y solapes (mira también el día anterior al mes)
      var regs = [];
      for (var g = sumarDias(desde, -1); g <= hasta; g = sumarDias(g, 1)) {
        var rg = registro(est, p.id, g); if (!rg || rg.ausente) continue;
        var du = duracionTurno(rg); if (!du) continue;
        var a = diasEntre(desde, g) * DIA + hm(rg.inicio);
        regs.push({ fecha: g, ini: a, fin: a + du.bruto });
      }
      for (var j = 0; j + 1 < regs.length; j++) {
        var gap = regs[j + 1].ini - regs[j].fin;
        if (gap < 0) alerta('error', p, 'solape-real', 'Los registros de ' + p.nombre + ' del ' + fechaLarga(regs[j].fecha) + ' y del ' + fechaLarga(regs[j + 1].fecha) + ' se pisan: revisa las horas.', regs[j + 1].fecha);
        else if (r.descansoEntreJornadas != null && gap < r.descansoEntreJornadas * 60)
          alerta('error', p, 'entre-jornadas-real', p.nombre + ' descansó ' + fmtH(gap) + ' entre la salida del ' + fechaLarga(regs[j].fecha) + ' y la entrada siguiente: el mínimo es ' + r.descansoEntreJornadas + ' h.', regs[j + 1].fecha);
      }
      // Semanas que terminan en el mes (las horas extra se pagan en el mes en que termina la semana)
      var semanas = [];
      for (var l = lunesDe(desde); sumarDias(l, 6) <= hasta; l = sumarDias(l, 7)) {
        var s = semanaReal(est, p, l); semanas.push(s);
        if (r.maxExtraSemanal != null && s.extra > r.maxExtraSemanal * 60)
          alerta('error', p, 'extra-semanal', p.nombre + ' suma ' + fmtH(s.extra) + ' extra en la semana del ' + fechaCorta(l) + ': el criterio de la Dirección del Trabajo es un máximo de ' + r.maxExtraSemanal + ' horas extra por semana.', l);
      }
      var extraMes = metodo === 'diario'
        ? dias.reduce(function (acc, x) { return acc + (x.reg ? Math.max(0, x.dif) : 0); }, 0)
        : semanas.reduce(function (acc, s) { return acc + s.extra; }, 0);
      var comp = compensadas(est, p.id, mes);
      var extraAnio = Math.max(0, extrasEntre(est, p, anio + '-01-01', anio + '-12-31') - compensadasAnio(est, p.id, anio));
      if (r.maxExtraAnual != null) {
        if (extraAnio > r.maxExtraAnual * 60) alerta('error', p, 'extra-anual', p.nombre + ' lleva ' + fmtH(extraAnio) + ' extra en ' + anio + ': supera el tope de ' + r.maxExtraAnual + ' horas al año.', null);
        else if (extraAnio >= r.maxExtraAnual * 48) alerta('aviso', p, 'extra-anual', p.nombre + ' lleva ' + fmtH(extraAnio) + ' extra en ' + anio + ': ya pasó el 80 % del tope de ' + r.maxExtraAnual + ' horas al año.', null);
      }
      if (r.pais === 'ES' && extraMes > 0 && contrato != null && contrato < r.promedioSemanal * 60)
        alerta('aviso', p, 'parcial-extra', p.nombre + ' tiene contrato a tiempo parcial y suma ' + fmtH(extraMes) + ' sobre lo planificado: a tiempo parcial no se hacen horas extraordinarias (salvo fuerza mayor); solo horas complementarias pactadas.', null);
      if (r.pais === 'CL' && extraMes > 0 && (!esFecha(est.pactoExtrasHasta) || (ultimaExtra && est.pactoExtrasHasta < ultimaExtra)))
        alerta('aviso', p, 'pacto', p.nombre + ' suma ' + fmtH(extraMes) + ' extra en ' + nombreMes(mes) + ' y no hay un pacto de horas extra vigente anotado: se pactan por escrito, por un máximo de 3 meses renovables.', null);
      if (t.sinRegistro) alerta('info', p, 'sin-registro', p.nombre + ' tiene ' + t.sinRegistro + (t.sinRegistro === 1 ? ' día planificado' : ' días planificados') + ' sin registrar en ' + nombreMes(mes) + '.', null);
      var mias = alertas.slice(n0);
      personas.push({
        id: p.id, nombre: p.nombre, rol: p.rol || '', contrato: contrato, dias: dias, semanas: semanas,
        planMin: t.planMin, realMin: t.realMin, dif: t.realMin - t.planMin, trabajados: t.trabajados, ausencias: t.ausencias,
        sinRegistro: t.sinRegistro, libresTrabajados: t.libresTrabajados, extraMes: extraMes, compensadas: comp, extraAnio: extraAnio,
        errores: mias.filter(function (a) { return a.nivel === 'error'; }).length, avisos: mias.filter(function (a) { return a.nivel === 'aviso'; }).length
      });
    });
    var orden = { error: 0, aviso: 1, info: 2 };
    alertas.sort(function (a, b) { return orden[a.nivel] - orden[b.nivel] || String(a.fecha || '9').localeCompare(String(b.fecha || '9')); });
    function suma(k) { return personas.reduce(function (s, p) { return s + p[k]; }, 0); }
    return {
      primerRegistro: primer, mes: mes, desde: desde, hasta: hasta, metodo: metodo, reglas: r, personas: personas, alertas: alertas,
      planMin: suma('planMin'), realMin: suma('realMin'), extraMes: suma('extraMes'), sinRegistro: suma('sinRegistro'), ausencias: suma('ausencias'),
      errores: alertas.filter(function (a) { return a.nivel === 'error'; }).length, avisos: alertas.filter(function (a) { return a.nivel === 'aviso'; }).length
    };
  }
  var ESTADOS = { 'sin-registro': 'Sin registrar', libre: 'Libre', ausente: 'No vino', 'segun-plan': 'Según lo planificado', mas: 'Más de lo planificado', menos: 'Menos de lo planificado', 'libre-trabajado': 'Trabajó en día libre' };
  function hDec(min) { return String(Math.round(min / 0.6) / 100).replace('.', ','); } // horas con 2 decimales y coma
  function detalleMesCSV(est, mes, pid, hoyIso) {
    var inf = informeMes(est, mes, hoyIso), filas = [['Persona', 'Cargo', 'Fecha', 'Día', 'Turno planificado', 'Inicio plan', 'Término plan', 'Entrada', 'Salida', 'Colación (min)', 'Horas planificadas', 'Horas trabajadas', 'Diferencia (h)', 'Estado', 'Nota']];
    inf.personas.forEach(function (p) {
      if (pid && p.id !== pid) return;
      p.dias.forEach(function (x) {
        if (!x.reg && (x.estado === 'libre' || !inf.primerRegistro || x.fecha < inf.primerRegistro || (hoyIso && x.fecha > hoyIso))) return;
        var g = x.reg && !x.reg.ausente ? x.reg : null;
        filas.push([p.nombre, p.rol, x.fecha, NOMBRES_DIA_LARGO[diaSemana(x.fecha)], x.plan ? x.plan.nombre : 'Libre', x.plan ? x.plan.inicio : '', x.plan ? x.plan.fin : '',
          g ? g.inicio : '', g ? g.fin : '', g ? String(g.colacion) : '', hDec(x.planMin), hDec(x.realMin), x.reg ? hDec(x.dif) : '', ESTADOS[x.estado], x.nota]);
      });
    });
    return aCSV(filas);
  }
  function informeMesCSV(est, mes, hoyIso) {
    var inf = informeMes(est, mes, hoyIso);
    var filas = [['Persona', 'Cargo', 'Mes', 'Días trabajados', 'Ausencias', 'Días sin registrar', 'Horas planificadas', 'Horas trabajadas', 'Diferencia (h)',
      'Horas extra del mes (' + (inf.metodo === 'diario' ? 'sobre lo planificado cada día' : 'sobre la jornada de cada semana') + ')', 'Compensadas con descanso (h)', 'Horas extra del año, sin las compensadas', 'Incumplimientos', 'Avisos']];
    inf.personas.forEach(function (p) {
      filas.push([p.nombre, p.rol, mes, String(p.trabajados), String(p.ausencias), String(p.sinRegistro), hDec(p.planMin), hDec(p.realMin), hDec(p.dif), hDec(p.extraMes), hDec(p.compensadas), hDec(p.extraAnio), String(p.errores), String(p.avisos)]);
    });
    return aCSV(filas);
  }

  // ---------- Importación de marcas desde CSV (por ejemplo, exportadas de un reloj control) ----------
  function partirCSV(linea, sep) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < linea.length; i++) {
      var c = linea[i];
      if (q) { if (c === '"') { if (linea[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }
  function plano(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function aISO(s) {
    s = String(s || '').trim();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s), iso = null;
    if (m) iso = m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    else if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(s))) iso = m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    return iso && esFecha(iso) ? iso : null;
  }
  function aHora(s) { var m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(s || '').trim()); return m && hm(m[1] + ':' + m[2]) != null ? m[1].padStart(2, '0') + ':' + m[2] : null; }
  function leerMarcasCSV(est, txt) {
    var lineas = String(txt || '').replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    var marcas = [], errores = [];
    if (!lineas.length) return { marcas: marcas, errores: ['No hay líneas para leer.'] };
    var sep = (lineas[0].match(/;/g) || []).length >= (lineas[0].match(/,/g) || []).length ? ';' : ',';
    var col = { fecha: 0, persona: 1, entrada: 2, salida: 3, colacion: 4, nota: 5 }, ini = 0;
    var cab = partirCSV(lineas[0], sep).map(plano);
    if (cab.some(function (c) { return c === 'fecha' || c === 'persona' || c === 'nombre'; })) {
      ini = 1; col = { fecha: -1, persona: -1, entrada: -1, salida: -1, colacion: -1, nota: -1 };
      cab.forEach(function (c, i) {
        if (/^fecha/.test(c)) col.fecha = i;
        else if (/^(persona|nombre|trabajador|empleado)/.test(c)) col.persona = i;
        else if (/^(entrada|inicio)/.test(c)) col.entrada = i;
        else if (/^(salida|termino|fin)/.test(c)) col.salida = i;
        else if (/^(colacion|pausa|descanso)/.test(c)) col.colacion = i;
        else if (/^(nota|observacion|comentario)/.test(c)) col.nota = i;
      });
      if (col.fecha < 0 || col.persona < 0 || col.entrada < 0 || col.salida < 0) return { marcas: [], errores: ['La cabecera necesita las columnas fecha, persona, entrada y salida.'] };
    }
    var porNombre = {};
    est.equipo.forEach(function (p) { porNombre[plano(p.nombre)] = p.id; });
    for (var i = ini; i < lineas.length; i++) {
      var c = partirCSV(lineas[i], sep), n = i + 1;
      var f = aISO(c[col.fecha]), pid = porNombre[plano(c[col.persona])], a = aHora(c[col.entrada]), b = aHora(c[col.salida]);
      if (!f) { errores.push('Línea ' + n + ': fecha no reconocida («' + (c[col.fecha] || '') + '»). Usa AAAA-MM-DD o DD-MM-AAAA.'); continue; }
      if (!pid) { errores.push('Línea ' + n + ': «' + (c[col.persona] || '') + '» no está en tu equipo.'); continue; }
      if (!a || !b) { errores.push('Línea ' + n + ': entrada o salida no reconocida (usa HH:MM).'); continue; }
      var colMin = col.colacion >= 0 ? parseInt(c[col.colacion], 10) : NaN;
      var m = { inicio: a, fin: b, colacion: isFinite(colMin) && colMin > 0 ? colMin : 0, nota: col.nota >= 0 ? (c[col.nota] || '') : '' };
      var ev = validarMarca(m);
      if (ev.length) { errores.push('Línea ' + n + ': ' + ev.join(' ')); continue; }
      marcas.push({ pid: pid, fecha: f, marca: m });
    }
    return { marcas: marcas, errores: errores };
  }
  function aplicarMarcas(est, marcas) { var n = 0; marcas.forEach(function (x) { if (!marcar(est, x.pid, x.fecha, x.marca).length) n++; }); return n; }

  // Completa los campos de la fase 2 en respaldos de la fase 1 y descarta registros dañados.
  function normalizar(est) {
    if (!est.real || typeof est.real !== 'object' || Array.isArray(est.real)) est.real = {};
    if (!est.comp || typeof est.comp !== 'object' || Array.isArray(est.comp)) est.comp = {};
    if (!esFecha(est.pactoExtrasHasta)) est.pactoExtrasHasta = '';
    est.tolerancia = Math.max(0, Math.min(30, Math.round(+est.tolerancia) || 0));
    if (est.metodoExtra !== 'diario' && est.metodoExtra !== 'semanal') est.metodoExtra = '';
    var ids = {}; (est.equipo || []).forEach(function (p) { ids[p.id] = 1; });
    Object.keys(est.real).forEach(function (pid) {
      var r = est.real[pid];
      if (!ids[pid] || !r || typeof r !== 'object') { delete est.real[pid]; return; }
      Object.keys(r).forEach(function (f) { if (!esFecha(f) || validarMarca(r[f]).length) delete r[f]; });
    });
    Object.keys(est.comp).forEach(function (pid) { if (!ids[pid]) delete est.comp[pid]; });
    return est;
  }

  // ---------- Respaldo ----------
  function validarEstado(o) {
    var e = [];
    if (!o || typeof o !== 'object') return ['El archivo no es un respaldo de Turnero.'];
    if (o.version !== 1) e.push('Versión de respaldo desconocida.');
    if (!PERFILES[o.perfil]) e.push('Perfil de reglas desconocido.');
    if (!(o.semanas >= 1 && o.semanas <= 4)) e.push('El ciclo debe tener de 1 a 4 semanas.');
    if (!esFecha(o.inicio)) e.push('Fecha de inicio inválida.');
    if (!Array.isArray(o.equipo) || !Array.isArray(o.turnos) || typeof o.grilla !== 'object' || !o.grilla) e.push('Faltan el equipo, los turnos o la grilla.');
    else {
      o.turnos.forEach(function (t, i) { validarTurno(t).forEach(function (m) { e.push('Turno ' + (i + 1) + ': ' + m); }); });
      o.equipo.forEach(function (p, i) { if (!p || !p.id || !String(p.nombre || '').trim()) e.push('Persona ' + (i + 1) + ' sin nombre.'); });
    }
    if (o.real != null && (typeof o.real !== 'object' || Array.isArray(o.real))) e.push('El registro de lo trabajado está dañado.');
    return e;
  }

  // ---------- Ejemplo: cafetería con 6 personas, ciclo de 2 semanas ----------
  function ejemplo(hoyIso) {
    var est = estadoVacio(hoyIso);
    est.negocio = 'Café del Puerto'; est.semanas = 2; est.perfil = 'cl42';
    est.cobertura = [2, 2, 2, 2, 3, 3, 2];
    est.turnos = [
      { id: 'tA', nombre: 'Apertura', inicio: '07:30', fin: '16:00', colacion: 30, color: '#0f766e' },
      { id: 'tC', nombre: 'Cierre', inicio: '12:30', fin: '21:00', colacion: 30, color: '#7c3aed' },
      { id: 'tM', nombre: 'Media', inicio: '10:00', fin: '15:00', colacion: 0, color: '#b45309' },
      { id: 'tL', nombre: 'Largo', inicio: '08:00', fin: '20:00', colacion: 60, color: '#b91c1c' }
    ];
    est.equipo = [
      { id: 'p1', nombre: 'Ana', rol: 'Encargada', horasContrato: 42 },
      { id: 'p2', nombre: 'Benjamín', rol: 'Barista', horasContrato: 42 },
      { id: 'p3', nombre: 'Carla', rol: 'Barista', horasContrato: 42 },
      { id: 'p4', nombre: 'Diego', rol: 'Cocina', horasContrato: 42 },
      { id: 'p5', nombre: 'Elena', rol: 'Caja', horasContrato: 20 },
      { id: 'p6', nombre: 'Felipe', rol: 'Apoyo fin de semana', horasContrato: 20 }
    ];
    var A = 'tA', C = 'tC', M = 'tM', G = 'tL', _ = null;
    est.grilla = {
      p1: [A, A, A, A, A, _, _, A, A, A, A, A, _, _],
      p2: [C, C, _, C, C, C, _, C, C, _, C, C, C, _],
      p3: [_, A, C, C, _, A, A, _, A, C, C, _, A, A],
      p4: [A, _, A, A, G, G, _, A, _, A, A, G, G, _], // semana con 2 días largos: pasa de 10 h y de 45 h
      p5: [M, M, M, M, _, _, _, M, M, M, M, _, _, _],
      p6: [_, _, _, _, _, M, M, _, _, _, _, _, M, M]
    };
    // La semana anterior ya está registrada, con desvíos para ver el informe del mes.
    var l0 = sumarDias(est.inicio, -7);
    precargar(est, l0, sumarDias(l0, 6));
    marcar(est, 'p4', l0, { inicio: '07:30', fin: '18:45', colacion: 30, nota: 'Inventario' });
    marcar(est, 'p2', sumarDias(l0, 1), { inicio: '12:30', fin: '21:40', colacion: 30, nota: 'Cierre con evento' });
    marcar(est, 'p5', sumarDias(l0, 2), { ausente: true, nota: 'Permiso' });
    marcar(est, 'p3', l0, { inicio: '10:00', fin: '14:00', colacion: 0, nota: 'Cubrió una ausencia' });
    marcar(est, 'p1', sumarDias(l0, 4), { inicio: '07:30', fin: '15:00', colacion: 30, nota: 'Salió antes' });
    est.pactoExtrasHasta = sumarDias(est.inicio, 60);
    return est;
  }

  var api = {
    PERFILES: PERFILES, NOMBRES_DIA: NOMBRES_DIA, FECHA_40H_CL: FECHA_40H_CL,
    hm: hm, aHM: aHM, horas: horas, fmtH: fmtH, sumarDias: sumarDias, diaSemana: diaSemana, lunesDe: lunesDe, fechaCorta: fechaCorta, esFecha: esFecha, id: id,
    duracionTurno: duracionTurno, validarTurno: validarTurno, estadoVacio: estadoVacio, reglas: reglas, totalDias: totalDias,
    celda: celda, asignar: asignar, cambiarSemanas: cambiarSemanas, copiarSemana: copiarSemana, turnoPorId: turnoPorId,
    quitarTurno: quitarTurno, quitarPersona: quitarPersona, intervalos: intervalos, nombreDia: nombreDia,
    revisar: revisar, rebajaSinAcuerdo: rebajaSinAcuerdo, textoWhatsApp: textoWhatsApp, aCSV: aCSV, grillaCSV: grillaCSV,
    resumenCSV: resumenCSV, ics: ics, leerEquipoCSV: leerEquipoCSV, validarEstado: validarEstado, ejemplo: ejemplo,
    // Fase 2
    ESTADOS: ESTADOS, diasEntre: diasEntre, diaDelCiclo: diaDelCiclo, planDe: planDe, registro: registro, validarMarca: validarMarca,
    marcar: marcar, quitarMarca: quitarMarca, diaReal: diaReal, precargar: precargar, metodoExtra: metodoExtra, semanaReal: semanaReal,
    extrasEntre: extrasEntre, finDeMes: finDeMes, esMes: esMes, sumarMes: sumarMes, nombreMes: nombreMes, fechaLarga: fechaLarga,
    compensadas: compensadas, informeMes: informeMes, detalleMesCSV: detalleMesCSV, informeMesCSV: informeMesCSV,
    leerMarcasCSV: leerMarcasCSV, aplicarMarcas: aplicarMarcas, normalizar: normalizar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Turnero = api;
})(this);
