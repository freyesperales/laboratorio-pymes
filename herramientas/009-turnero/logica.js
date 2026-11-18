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
      descansoSemanalHoras: null, pausaSiMasDe: null, pausaMin: null, maxExtraDiaria: 2,
      nota: 'Ley 21.561 y Código del Trabajo (arts. 22 bis, 28 y 31). El promedio se calcula en el ciclo de hasta 4 semanas.'
    },
    cl40: {
      nombre: 'Chile · 40 horas (desde el 26-04-2028)', pais: 'CL',
      promedioSemanal: 40, topeSemanaCiclo: 45, maxSemanasSeguidasSobrePromedio: 2,
      maxDiario: 10, minDias: 5, maxDias: 6, descansoEntreJornadas: null,
      descansoSemanalHoras: null, pausaSiMasDe: null, pausaMin: null, maxExtraDiaria: 2,
      nota: 'Última etapa de la Ley 21.561. Puedes adelantarla de forma voluntaria.'
    },
    es40: {
      nombre: 'España · 40 horas (Estatuto de los Trabajadores)', pais: 'ES',
      promedioSemanal: 40, topeSemanaCiclo: null, maxSemanasSeguidasSobrePromedio: null,
      maxDiario: 9, minDias: null, maxDias: null, descansoEntreJornadas: 12,
      descansoSemanalHoras: 36, pausaSiMasDe: 6, pausaMin: 15, maxExtraDiaria: null,
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
      negocio: '', equipo: [], turnos: [], grilla: {}, cobertura: [0, 0, 0, 0, 0, 0, 0]
    };
  }
  function reglas(est) {
    var base = PERFILES[est.perfil] || PERFILES.cl42, r = {};
    Object.keys(base).forEach(function (k) { r[k] = base[k]; });
    var aj = est.ajustes || {};
    Object.keys(aj).forEach(function (k) { if (k in base && aj[k] !== '' && aj[k] !== undefined) r[k] = aj[k] === null ? null : +aj[k]; });
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
    return est;
  }

  var api = {
    PERFILES: PERFILES, NOMBRES_DIA: NOMBRES_DIA, FECHA_40H_CL: FECHA_40H_CL,
    hm: hm, aHM: aHM, horas: horas, fmtH: fmtH, sumarDias: sumarDias, diaSemana: diaSemana, lunesDe: lunesDe, fechaCorta: fechaCorta, esFecha: esFecha, id: id,
    duracionTurno: duracionTurno, validarTurno: validarTurno, estadoVacio: estadoVacio, reglas: reglas, totalDias: totalDias,
    celda: celda, asignar: asignar, cambiarSemanas: cambiarSemanas, copiarSemana: copiarSemana, turnoPorId: turnoPorId,
    quitarTurno: quitarTurno, quitarPersona: quitarPersona, intervalos: intervalos, nombreDia: nombreDia,
    revisar: revisar, rebajaSinAcuerdo: rebajaSinAcuerdo, textoWhatsApp: textoWhatsApp, aCSV: aCSV, grillaCSV: grillaCSV,
    resumenCSV: resumenCSV, ics: ics, leerEquipoCSV: leerEquipoCSV, validarEstado: validarEstado, ejemplo: ejemplo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Turnero = api;
})(this);
