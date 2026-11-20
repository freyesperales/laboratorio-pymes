import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const T = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nom, f) => { f(); n++; console.log('ok', nom); };
const codigos = (rv, nivel) => rv.alertas.filter(a => !nivel || a.nivel === nivel).map(a => a.codigo);

// Horas y fechas
t('hora HH:MM válida e inválida', () => { assert.equal(T.hm('07:30'), 450); assert.equal(T.hm('24:00'), 1440); assert.equal(T.hm('25:00'), null); assert.equal(T.hm('7.30'), null); });
t('formato de horas', () => { assert.equal(T.fmtH(450), '7 h 30'); assert.equal(T.fmtH(480), '8 h'); assert.equal(T.aHM(1500), '01:00'); });
t('suma de días y día de la semana', () => { assert.equal(T.sumarDias('2026-11-30', 1), '2026-12-01'); assert.equal(T.diaSemana('2026-11-23'), 0); assert.equal(T.diaSemana('2026-11-22'), 6); });
t('lunes de cualquier fecha', () => { assert.equal(T.lunesDe('2026-11-18'), '2026-11-16'); assert.equal(T.lunesDe('2026-11-22'), '2026-11-16'); });
t('fecha imposible se rechaza', () => { assert.equal(T.esFecha('2026-02-30'), false); assert.equal(T.esFecha('2026-02-28'), true); });

// Turnos
t('duración con colación', () => { const d = T.duracionTurno({ inicio: '07:30', fin: '16:00', colacion: 30 }); assert.equal(d.bruto, 510); assert.equal(d.efectivo, 480); assert.equal(d.cruza, false); });
t('turno nocturno cruza medianoche', () => { const d = T.duracionTurno({ inicio: '22:00', fin: '06:00', colacion: 0 }); assert.equal(d.bruto, 480); assert.equal(d.cruza, true); });
t('validación de turno', () => {
  assert.deepEqual(T.validarTurno({ nombre: 'A', inicio: '08:00', fin: '16:00', colacion: 30 }), []);
  assert.ok(T.validarTurno({ nombre: '', inicio: '8', fin: '16:00' }).length >= 2);
  assert.ok(T.validarTurno({ nombre: 'X', inicio: '08:00', fin: '09:00', colacion: 60 }).some(m => /colación/.test(m)));
});

// Perfiles
t('perfiles chilenos y español', () => {
  assert.equal(T.PERFILES.cl42.promedioSemanal, 42); assert.equal(T.PERFILES.cl40.promedioSemanal, 40);
  assert.equal(T.PERFILES.es40.maxDiario, 9); assert.equal(T.PERFILES.es40.descansoEntreJornadas, 12);
});
t('ajustes del usuario sobre el perfil', () => {
  const e = T.estadoVacio('2026-11-18'); e.ajustes = { maxDiario: 12, descansoEntreJornadas: '' };
  const r = T.reglas(e); assert.equal(r.maxDiario, 12); assert.equal(r.descansoEntreJornadas, null); assert.equal(r.promedioSemanal, 42);
});

// Estado y grilla
function base(perfil, semanas) {
  const e = T.estadoVacio('2026-11-23'); e.perfil = perfil || 'cl42';
  if (semanas) T.cambiarSemanas(e, semanas);
  e.turnos = [{ id: 'a', nombre: 'Día', inicio: '09:00', fin: '18:00', colacion: 60 }, { id: 'l', nombre: 'Largo', inicio: '08:00', fin: '20:00', colacion: 60 },
    { id: 'n', nombre: 'Noche', inicio: '22:00', fin: '06:00', colacion: 0 }, { id: 'c', nombre: 'Cierre', inicio: '14:00', fin: '23:00', colacion: 0 }];
  e.equipo = [{ id: 'p', nombre: 'Ana', rol: '', horasContrato: '' }];
  return e;
}
t('estado vacío empieza en lunes', () => { const e = T.estadoVacio('2026-11-19'); assert.equal(e.inicio, '2026-11-16'); assert.equal(e.semanas, 1); });
t('asignar y leer celda', () => { const e = base(); T.asignar(e, 'p', 3, 'a'); assert.equal(T.celda(e, 'p', 3), 'a'); assert.equal(T.celda(e, 'p', 2), null); assert.equal(e.grilla.p.length, 7); });
t('ampliar el ciclo copia la primera semana', () => { const e = base(); T.asignar(e, 'p', 0, 'a'); T.cambiarSemanas(e, 3); assert.equal(e.grilla.p.length, 21); assert.equal(T.celda(e, 'p', 7), 'a'); assert.equal(T.celda(e, 'p', 14), 'a'); });
t('reducir el ciclo recorta', () => { const e = base(null, 2); T.asignar(e, 'p', 10, 'a'); T.cambiarSemanas(e, 1); assert.equal(e.grilla.p.length, 7); });
t('el ciclo se limita a 1-4 semanas', () => { const e = base(); T.cambiarSemanas(e, 9); assert.equal(e.semanas, 4); T.cambiarSemanas(e, 0); assert.equal(e.semanas, 1); });
t('copiar semana', () => { const e = base(null, 2); T.asignar(e, 'p', 1, 'a'); T.copiarSemana(e, 0); assert.equal(T.celda(e, 'p', 8), 'a'); });
t('quitar turno limpia la grilla', () => { const e = base(); T.asignar(e, 'p', 0, 'a'); T.quitarTurno(e, 'a'); assert.equal(T.celda(e, 'p', 0), null); assert.equal(e.turnos.length, 3); });
t('quitar persona', () => { const e = base(); T.asignar(e, 'p', 0, 'a'); T.quitarPersona(e, 'p'); assert.equal(e.equipo.length, 0); assert.equal(e.grilla.p, undefined); });

// Revisión Chile
t('Chile: 5 días de 8 h no da errores', () => { const e = base(); for (let d = 0; d < 5; d++) T.asignar(e, 'p', d, 'a'); const rv = T.revisar(e); assert.equal(rv.errores, 0); assert.equal(rv.personas[0].porSemana[0], 2400); });
t('Chile: 6 días de 8 h pasan de 42 h', () => { const e = base(); for (let d = 0; d < 6; d++) T.asignar(e, 'p', d, 'a'); assert.ok(codigos(T.revisar(e), 'error').includes('semanal')); });
t('Chile: día de 11 h pasa de 10', () => { const e = base(); T.asignar(e, 'p', 0, 'l'); assert.ok(codigos(T.revisar(e), 'error').includes('diario')); });
t('Chile: 7 días supera el máximo de 6', () => { const e = base(); e.turnos.push({ id: 'm', nombre: 'Media', inicio: '10:00', fin: '15:00', colacion: 0 }); for (let d = 0; d < 7; d++) T.asignar(e, 'p', d, 'm'); assert.ok(codigos(T.revisar(e), 'error').includes('dias-max')); });
t('Chile: jornada completa en 4 días da aviso', () => { const e = base(); e.equipo[0].horasContrato = 42; for (let d = 0; d < 4; d++) T.asignar(e, 'p', d, 'a'); assert.ok(codigos(T.revisar(e), 'aviso').includes('dias-min')); });
t('Chile ciclo: semana de 46 h pasa el tope de 45', () => {
  const e = base(null, 2); for (let d = 0; d < 5; d++) T.asignar(e, 'p', d, d < 3 ? 'a' : 'l'); // 8+8+8+11+11 = 46
  const c = codigos(T.revisar(e), 'error'); assert.ok(c.includes('tope-ciclo')); assert.ok(!c.includes('promedio'));
});
t('Chile ciclo: promedio sobre 42 h', () => { const e = base(null, 2); for (let d = 0; d < 14; d++) if (d % 7 < 5) T.asignar(e, 'p', d, d % 7 < 4 ? 'a' : 'l'); /* 8*4+11 = 43 */ const c = codigos(T.revisar(e), 'error'); assert.ok(c.includes('promedio')); });
t('Chile ciclo: 44 y 40 h promedian 42 sin error', () => {
  const e = base(null, 2); e.turnos.push({ id: 'x', nombre: 'Extendido', inicio: '08:00', fin: '18:00', colacion: 60 }); // 9 h
  for (let d = 0; d < 5; d++) T.asignar(e, 'p', d, d < 4 ? 'x' : 'a'); // 9*4+8 = 44
  for (let d = 7; d < 12; d++) T.asignar(e, 'p', d, 'a'); // 40
  const rv = T.revisar(e); assert.equal(rv.errores, 0); assert.equal(rv.personas[0].promedio, 42 * 60);
});
t('Chile ciclo: tres semanas seguidas en 45 h', () => {
  const e = base(null, 4); e.turnos.push({ id: 'k', nombre: 'Nueve', inicio: '08:00', fin: '17:00', colacion: 0 }); // 9 h
  for (let w = 0; w < 3; w++) for (let d = 0; d < 5; d++) T.asignar(e, 'p', w * 7 + d, 'k'); // 45 h x3, semana 4 libre
  assert.ok(codigos(T.revisar(e), 'error').includes('racha'));
});
t('solape de turnos se detecta', () => { const e = base(); T.asignar(e, 'p', 0, 'n'); T.asignar(e, 'p', 1, 'a'); /* noche termina 06:00 del día 1; día 1 empieza 09:00: no se pisan */ assert.ok(!codigos(T.revisar(e)).includes('solape'));
  e.turnos.push({ id: 'z', nombre: 'Madrugada', inicio: '05:00', fin: '09:00', colacion: 0 }); T.asignar(e, 'p', 1, 'z'); assert.ok(codigos(T.revisar(e), 'error').includes('solape')); });

// Revisión España
t('España: 9 h diarias máximo', () => { const e = base('es40'); e.turnos.push({ id: 'd', nombre: 'Diez', inicio: '08:00', fin: '18:00', colacion: 0 }); T.asignar(e, 'p', 0, 'd'); assert.ok(codigos(T.revisar(e), 'error').includes('diario')); });
t('España: cierre y apertura sin 12 h de descanso', () => { const e = base('es40'); T.asignar(e, 'p', 0, 'c'); T.asignar(e, 'p', 1, 'a'); /* 23:00 -> 09:00 = 10 h */ assert.ok(codigos(T.revisar(e), 'error').includes('entre-jornadas')); });
t('España: el ciclo se repite (domingo a lunes)', () => { const e = base('es40'); T.asignar(e, 'p', 6, 'c'); T.asignar(e, 'p', 0, 'a'); assert.ok(codigos(T.revisar(e), 'error').includes('entre-jornadas')); });
t('España: pausa de 15 min si pasa de 6 h', () => { const e = base('es40'); T.asignar(e, 'p', 0, 'c'); /* 9 h sin pausa */ assert.ok(codigos(T.revisar(e), 'aviso').includes('pausa')); });
t('España: sin día y medio de descanso', () => {
  const e = base('es40'); e.turnos.push({ id: 'm', nombre: 'Media', inicio: '10:00', fin: '15:00', colacion: 0 });
  for (let d = 0; d < 7; d++) T.asignar(e, 'p', d, 'm'); assert.ok(codigos(T.revisar(e), 'aviso').includes('descanso-semanal'));
});
t('España: con sábado y domingo libres cumple descanso', () => { const e = base('es40'); for (let d = 0; d < 5; d++) T.asignar(e, 'p', d, 'a'); const rv = T.revisar(e); assert.ok(!codigos(rv).includes('descanso-semanal')); assert.equal(rv.errores, 0); });

// Otras alertas
t('cobertura mínima por día', () => { const e = base(); e.cobertura = [2, 0, 0, 0, 0, 0, 0]; T.asignar(e, 'p', 0, 'a'); assert.ok(codigos(T.revisar(e), 'aviso').includes('cobertura')); });
t('horas de contrato distintas a las planificadas', () => { const e = base(); e.equipo[0].horasContrato = 42; for (let d = 0; d < 4; d++) T.asignar(e, 'p', d, 'a'); assert.ok(codigos(T.revisar(e), 'info').includes('contrato')); });
t('aviso de transición a 40 h en 2028', () => { const e = base(); e.inicio = '2028-04-24'; assert.ok(codigos(T.revisar(e), 'info').includes('transicion')); e.inicio = '2026-11-23'; assert.ok(!codigos(T.revisar(e)).includes('transicion')); });
t('alertas ordenadas: errores primero', () => { const rv = T.revisar(T.ejemplo('2026-11-18')); const niv = rv.alertas.map(a => a.nivel); assert.equal(niv[0], 'error'); assert.ok(niv.lastIndexOf('error') < niv.indexOf('info')); });

// Rebaja sin acuerdo (Dictamen 253/21)
t('rebaja sin acuerdo', () => { assert.deepEqual(T.rebajaSinAcuerdo(5).cortes, [60, 60]); assert.deepEqual(T.rebajaSinAcuerdo(6).cortes, [50, 50, 20]); assert.equal(T.rebajaSinAcuerdo(4), null); });

// Ejemplo
t('el ejemplo trae errores reales para mostrar', () => {
  const rv = T.revisar(T.ejemplo('2026-11-18'));
  assert.equal(rv.personas.length, 6); const c = codigos(rv, 'error');
  assert.ok(c.includes('diario')); assert.ok(c.includes('tope-ciclo')); assert.ok(c.includes('promedio'));
  assert.ok(rv.personas.find(p => p.nombre === 'Ana').errores === 0);
});

// Salidas
t('texto para WhatsApp', () => {
  const e = T.ejemplo('2026-11-18'), s = T.textoWhatsApp(e, 0);
  assert.ok(s.startsWith('*Café del Puerto · Turnos semana del 16-11 al 22-11*')); assert.ok(s.includes('*Lun 16-11*')); assert.ok(s.includes('• Ana 07:30–16:00 (Apertura)')); assert.ok(/Libre: .*Felipe/.test(s));
});
t('CSV de la grilla con BOM y punto y coma', () => {
  const s = T.grillaCSV(T.ejemplo('2026-11-18')); assert.ok(s.startsWith('﻿Persona;Rol;Fecha')); assert.equal(s.trim().split('\r\n').length, 1 + 6 * 14); assert.ok(s.includes('Ana;Encargada;2026-11-16;lunes;Apertura;07:30;16:00;30;8'));
});
t('CSV escapa comillas y separadores', () => { assert.equal(T.aCSV([['a;b', 'di "x"']]), '﻿"a;b";"di ""x"""\r\n'); });
t('resumen CSV por persona', () => { const s = T.resumenCSV(T.ejemplo('2026-11-18')); assert.ok(s.includes('Semana 1 (h);Semana 2 (h);Promedio semanal (h)')); assert.ok(s.includes('Diego;Cocina;46;46;46;42;')); });
t('calendario ICS con turno nocturno', () => {
  const e = base(); T.asignar(e, 'p', 0, 'n'); const s = T.ics(e, 'p', 2);
  assert.ok(s.includes('BEGIN:VCALENDAR')); assert.equal((s.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(s.includes('DTSTART:20261123T220000')); assert.ok(s.includes('DTEND:20261124T060000'));
});
t('importar equipo desde CSV', () => {
  const r = T.leerEquipoCSV('﻿Nombre;Rol;Horas\nAna;Caja;42\nLuis;Cocina;20,5\n;;\n');
  assert.equal(r.equipo.length, 2); assert.equal(r.equipo[1].horasContrato, 20.5); assert.equal(r.equipo[0].rol, 'Caja'); assert.equal(r.omitidas, 1);
});
t('respaldo: valida y rechaza', () => {
  const e = T.ejemplo('2026-11-18'); assert.deepEqual(T.validarEstado(JSON.parse(JSON.stringify(e))), []);
  assert.ok(T.validarEstado({}).length > 0); assert.ok(T.validarEstado(Object.assign({}, e, { perfil: 'xx' })).length > 0);
  assert.ok(T.validarEstado(Object.assign({}, e, { inicio: '2026-13-01' })).length > 0);
});

// ---------- Fase 2: lo trabajado ----------
const mini = (perfil = 'cl42') => {
  const e = T.estadoVacio('2026-11-16'); e.perfil = perfil;
  e.turnos = [{ id: 't8', nombre: 'Día', inicio: '09:00', fin: '18:00', colacion: 60 }];
  e.equipo = [{ id: 'a', nombre: 'Ana', rol: 'Caja', horasContrato: 40 }];
  e.grilla = { a: ['t8', 't8', 't8', 't8', 't8', null, null] };
  return e;
};
const cods = (inf, nivel) => inf.alertas.filter(a => !nivel || a.nivel === nivel).map(a => a.codigo);
const BOM = String.fromCharCode(0xFEFF), CRLF = String.fromCharCode(13, 10);

t('días entre fechas y día del ciclo, hacia adelante y hacia atrás', () => {
  assert.equal(T.diasEntre('2026-11-16', '2026-12-01'), 15); assert.equal(T.diasEntre('2026-11-16', '2026-11-09'), -7);
  const e = T.ejemplo('2026-11-18'); // ciclo de 14 días desde el 16-11
  assert.equal(T.diaDelCiclo(e, '2026-11-16'), 0); assert.equal(T.diaDelCiclo(e, '2026-11-30'), 0);
  assert.equal(T.diaDelCiclo(e, '2026-11-09'), 7); assert.equal(T.diaDelCiclo(e, '2026-11-15'), 13);
});
t('plan de una fecha cualquiera', () => {
  const e = mini();
  assert.equal(T.planDe(e, 'a', '2026-12-02').inicio, '09:00'); // miércoles
  assert.equal(T.planDe(e, 'a', '2026-12-05'), null); // sábado
  assert.equal(T.planDe(e, 'a', '2026-10-05').nombre, 'Día'); // lunes anterior al inicio
});
t('marcar valida la jornada', () => {
  const e = mini();
  assert.deepEqual(T.marcar(e, 'a', '2026-11-16', { inicio: '09:00', fin: '18:30', colacion: 60 }), []);
  assert.ok(T.marcar(e, 'zz', '2026-11-16', { inicio: '09:00', fin: '18:00' }).length);
  assert.ok(T.marcar(e, 'a', '2026-02-30', { inicio: '09:00', fin: '18:00' }).length);
  assert.ok(T.marcar(e, 'a', '2026-11-17', { inicio: '9', fin: '18:00' }).length);
  assert.ok(T.marcar(e, 'a', '2026-11-17', { inicio: '09:00', fin: '10:00', colacion: 60 }).some(m => /colación/.test(m)));
  assert.ok(T.marcar(e, 'a', '2026-11-17', { inicio: '06:00', fin: '23:30', colacion: 0 }).some(m => /16 horas/.test(m)));
  assert.equal(T.registro(e, 'a', '2026-11-17'), null);
});
t('estados de un día: plan contra real', () => {
  const e = mini(), est = f => T.diaReal(e, 'a', f).estado;
  assert.equal(est('2026-11-16'), 'sin-registro'); assert.equal(est('2026-11-21'), 'libre');
  T.marcar(e, 'a', '2026-11-16', { inicio: '09:00', fin: '18:00', colacion: 60 }); assert.equal(est('2026-11-16'), 'segun-plan');
  T.marcar(e, 'a', '2026-11-17', { inicio: '09:00', fin: '19:30', colacion: 60 }); assert.equal(est('2026-11-17'), 'mas'); assert.equal(T.diaReal(e, 'a', '2026-11-17').dif, 90);
  T.marcar(e, 'a', '2026-11-18', { inicio: '10:00', fin: '18:00', colacion: 60 }); assert.equal(est('2026-11-18'), 'menos'); assert.equal(T.diaReal(e, 'a', '2026-11-18').dif, -60);
  T.marcar(e, 'a', '2026-11-19', { ausente: true, nota: 'Permiso' }); assert.equal(est('2026-11-19'), 'ausente'); assert.equal(T.diaReal(e, 'a', '2026-11-19').dif, -480);
  T.marcar(e, 'a', '2026-11-21', { inicio: '10:00', fin: '14:00', colacion: 0 }); assert.equal(est('2026-11-21'), 'libre-trabajado'); assert.equal(T.diaReal(e, 'a', '2026-11-21').realMin, 240);
  T.quitarMarca(e, 'a', '2026-11-16'); assert.equal(est('2026-11-16'), 'sin-registro');
});
t('jornada real que cruza la medianoche', () => {
  const e = mini(); T.marcar(e, 'a', '2026-11-16', { inicio: '22:00', fin: '06:00', colacion: 30 });
  assert.equal(T.diaReal(e, 'a', '2026-11-16').realMin, 450);
});
t('cambiar la grilla después no reescribe lo ya registrado', () => {
  const e = mini(); T.marcar(e, 'a', '2026-11-16', { inicio: '09:00', fin: '18:00', colacion: 60 });
  T.asignar(e, 'a', 0, null); // el lunes pasa a ser libre en la grilla
  assert.equal(T.diaReal(e, 'a', '2026-11-16').estado, 'segun-plan'); assert.equal(T.diaReal(e, 'a', '2026-11-23').estado, 'libre');
  T.marcar(e, 'a', '2026-11-16', { inicio: '09:00', fin: '19:00', colacion: 60 }); // corregir el registro conserva el plan original
  assert.equal(T.diaReal(e, 'a', '2026-11-16').dif, 60);
});
t('tolerancia: pocos minutos no cuentan', () => {
  const e = mini(); T.marcar(e, 'a', '2026-11-16', { inicio: '08:57', fin: '18:02', colacion: 60 });
  assert.equal(T.diaReal(e, 'a', '2026-11-16').dif, 5); e.tolerancia = 5;
  assert.equal(T.diaReal(e, 'a', '2026-11-16').dif, 0); assert.equal(T.diaReal(e, 'a', '2026-11-16').estado, 'segun-plan');
});
t('precargar según lo planificado no pisa registros', () => {
  const e = mini(); T.marcar(e, 'a', '2026-11-17', { inicio: '09:00', fin: '20:00', colacion: 60 });
  assert.equal(T.precargar(e, '2026-11-16', '2026-11-22'), 4);
  assert.equal(T.registro(e, 'a', '2026-11-17').fin, '20:00'); assert.equal(T.registro(e, 'a', '2026-11-21'), null);
  assert.equal(T.precargar(e, '2026-11-16', '2026-11-22'), 0);
});
t('Chile: las horas extra se calculan por semana y los atrasos se compensan', () => {
  const e = mini(), p = e.equipo[0];
  assert.equal(T.metodoExtra(e), 'semanal');
  T.marcar(e, 'a', '2026-11-16', { inicio: '09:00', fin: '20:00', colacion: 60 }); // +2 h
  T.marcar(e, 'a', '2026-11-17', { inicio: '11:00', fin: '18:00', colacion: 60 }); // -2 h
  T.precargar(e, '2026-11-16', '2026-11-22');
  let s = T.semanaReal(e, p, '2026-11-16'); assert.equal(s.real, 2400); assert.equal(s.base, 2400); assert.equal(s.extra, 0);
  T.marcar(e, 'a', '2026-11-18', { inicio: '09:00', fin: '19:00', colacion: 60 }); // +1 h
  s = T.semanaReal(e, p, '2026-11-16'); assert.equal(s.extra, 60);
  assert.equal(T.extrasEntre(e, p, '2026-11-01', '2026-11-30'), 60);
});
t('base de la semana: contrato, perfil o lo planificado en un ciclo', () => {
  const e = mini(), p = e.equipo[0];
  p.horasContrato = ''; assert.equal(T.semanaReal(e, p, '2026-11-16').base, 42 * 60);
  p.horasContrato = 30; assert.equal(T.semanaReal(e, p, '2026-11-16').base, 30 * 60);
  const c = T.ejemplo('2026-11-18'), diego = c.equipo[3];
  assert.equal(T.semanaReal(c, diego, '2026-11-09').base, 46 * 60); // ciclo de 2 semanas: manda lo planificado
});
t('informe del ejemplo: extra por día sobre el tope, día libre trabajado y totales', () => {
  const e = T.ejemplo('2026-11-20'), inf = T.informeMes(e, '2026-11', '2026-11-20');
  assert.equal(inf.metodo, 'semanal'); assert.equal(inf.extraMes, 445); // Benjamín 0:40 + Carla 4:00 + Diego 2:45
  assert.ok(inf.alertas.some(a => a.codigo === 'extra-diaria' && a.nombre === 'Diego' && a.fecha === '2026-11-09'));
  assert.ok(inf.alertas.some(a => a.codigo === 'libre-trabajado' && a.nombre === 'Carla'));
  assert.ok(!cods(inf).includes('pacto'));
  const ana = inf.personas[0]; assert.equal(ana.trabajados, 5); assert.equal(ana.dif, -60); assert.equal(ana.extraMes, 0);
  const elena = inf.personas[4]; assert.equal(elena.ausencias, 1); assert.equal(elena.trabajados, 3);
});
t('la semana que cruza de mes se cuenta en el mes en que termina', () => {
  const e = mini(); e.pactoExtrasHasta = '2026-12-31';
  T.marcar(e, 'a', '2026-11-30', { inicio: '09:00', fin: '20:00', colacion: 60 }); // lunes, +2 h
  T.precargar(e, '2026-11-30', '2026-12-06');
  assert.equal(T.informeMes(e, '2026-11').personas[0].extraMes, 0);
  assert.equal(T.informeMes(e, '2026-12').personas[0].extraMes, 120);
});
t('pendientes: solo desde el primer registro y hasta hoy', () => {
  const e = mini(); T.marcar(e, 'a', '2026-11-18', { inicio: '09:00', fin: '18:00', colacion: 60 });
  const inf = T.informeMes(e, '2026-11', '2026-11-20');
  assert.equal(inf.personas[0].sinRegistro, 2); assert.equal(inf.personas[0].planMin, 480); assert.ok(cods(inf, 'info').includes('sin-registro'));
  assert.equal(T.informeMes(mini(), '2026-11', '2026-11-20').sinRegistro, 0);
});
t('Chile: topes de 2 horas extra por día, 12 por semana y pacto escrito', () => {
  const e = mini();
  T.marcar(e, 'a', '2026-11-16', { inicio: '09:00', fin: '23:00', colacion: 60 }); // 13 h
  T.precargar(e, '2026-11-16', '2026-11-22');
  let inf = T.informeMes(e, '2026-11');
  assert.ok(cods(inf, 'error').includes('extra-diaria')); assert.ok(cods(inf, 'error').includes('diario-real')); assert.ok(cods(inf, 'aviso').includes('pacto'));
  e.pactoExtrasHasta = '2026-11-10'; assert.ok(cods(T.informeMes(e, '2026-11')).includes('pacto')); // vencido
  e.pactoExtrasHasta = '2026-12-31'; assert.ok(!cods(T.informeMes(e, '2026-11')).includes('pacto'));
  const s = mini(); s.pactoExtrasHasta = '2026-12-31'; s.ajustes = { maxExtraDiaria: 4 };
  ['16', '17', '18', '19', '20'].forEach(d => T.marcar(s, 'a', '2026-11-' + d, { inicio: '09:00', fin: '21:00', colacion: 60 })); // +3 h diarias = 15 h
  inf = T.informeMes(s, '2026-11');
  assert.ok(cods(inf, 'error').includes('extra-semanal')); assert.ok(!cods(inf).includes('extra-diaria'));
  s.ajustes.maxExtraSemanal = null; assert.ok(!cods(T.informeMes(s, '2026-11')).includes('extra-semanal'));
});
t('España: por día, 80 horas al año y compensadas con descanso', () => {
  const e = mini('es40'), p = e.equipo[0]; e.inicio = '2026-01-05';
  assert.equal(T.metodoExtra(e), 'diario');
  let n = 0;
  for (let f = '2026-01-05'; n < 41; f = T.sumarDias(f, 1)) if (T.diaSemana(f) < 5) { T.marcar(e, 'a', f, { inicio: '09:00', fin: '20:00', colacion: 60 }); n++; }
  assert.equal(T.extrasEntre(e, p, '2026-01-01', '2026-12-31'), 82 * 60);
  let inf = T.informeMes(e, '2026-03');
  assert.equal(inf.personas[0].extraAnio, 82 * 60); assert.ok(inf.alertas.some(a => a.codigo === 'extra-anual' && a.nivel === 'error'));
  assert.ok(!cods(inf).includes('pacto')); assert.ok(!cods(inf).includes('extra-diaria'));
  e.comp = { a: { '2026-02': 180 } };
  inf = T.informeMes(e, '2026-03');
  assert.equal(inf.personas[0].extraAnio, 79 * 60); assert.ok(inf.alertas.some(a => a.codigo === 'extra-anual' && a.nivel === 'aviso'));
  assert.equal(T.informeMes(e, '2026-02').personas[0].compensadas, 180);
});
t('España: descanso real entre jornadas y tiempo parcial', () => {
  const e = mini('es40');
  T.marcar(e, 'a', '2026-11-16', { inicio: '14:00', fin: '23:00', colacion: 60 });
  T.marcar(e, 'a', '2026-11-17', { inicio: '08:00', fin: '17:00', colacion: 60 });
  let inf = T.informeMes(e, '2026-11');
  assert.ok(inf.alertas.some(a => a.codigo === 'entre-jornadas-real' && a.fecha === '2026-11-17')); assert.ok(!cods(inf).includes('parcial-extra'));
  e.equipo[0].horasContrato = 20; T.marcar(e, 'a', '2026-11-19', { inicio: '09:00', fin: '19:00', colacion: 60 });
  assert.ok(cods(T.informeMes(e, '2026-11'), 'aviso').includes('parcial-extra'));
});
t('registros que se pisan', () => {
  const e = mini();
  T.marcar(e, 'a', '2026-11-16', { inicio: '20:00', fin: '08:00', colacion: 0 }); T.marcar(e, 'a', '2026-11-17', { inicio: '07:00', fin: '15:00', colacion: 0 });
  assert.ok(cods(T.informeMes(e, '2026-11'), 'error').includes('solape-real'));
});
t('CSV del informe y del detalle', () => {
  const e = T.ejemplo('2026-11-20');
  const r = T.informeMesCSV(e, '2026-11', '2026-11-20'), l = r.split(CRLF);
  assert.ok(r.startsWith(BOM + 'Persona;Cargo;Mes;')); assert.equal(l.length, 8); assert.ok(/sobre la jornada de cada semana/.test(l[0]));
  assert.ok(l[4].startsWith('Diego;Cocina;2026-11;5;0;')); assert.ok(l[4].includes(';46;48,75;2,75;2,75;'));
  const d = T.detalleMesCSV(e, '2026-11'), dl = d.split(CRLF);
  assert.ok(dl.some(x => x.startsWith('Diego;Cocina;2026-11-09;lunes;Apertura;07:30;16:00;07:30;18:45;30;8;10,75;2,75;Más de lo planificado;Inventario')));
  assert.ok(dl.some(x => /Elena;Caja;2026-11-11;.*;No vino;Permiso/.test(x))); assert.ok(dl.some(x => /Carla;.*2026-11-09;lunes;Libre;;;10:00;14:00;0;0;4;4;Trabajó en día libre/.test(x)));
  const solo = T.detalleMesCSV(e, '2026-11', 'p1').split(CRLF).slice(1).filter(Boolean); assert.ok(solo.length && solo.every(x => x.startsWith('Ana;')));
});
t('importar marcas desde CSV, con y sin cabecera', () => {
  const e = T.ejemplo('2026-11-20');
  const a = T.leerMarcasCSV(e, ['Fecha;Trabajador;Entrada;Salida;Colación;Observación', '20-11-2026;benjamin;12:35:10;21:05;30;"Cierre; con evento"', '2026-11-20;Pedro;09:00;18:00;60', '31/02/2026;Ana;09:00;18:00;60', '20/11/2026;ANA;7:30;16:00;30', '2026-11-20;Carla;16:00;x;0'].join(CRLF));
  assert.equal(a.marcas.length, 2); assert.equal(a.errores.length, 3);
  assert.equal(a.marcas[0].pid, 'p2'); assert.equal(a.marcas[0].fecha, '2026-11-20'); assert.equal(a.marcas[0].marca.inicio, '12:35'); assert.equal(a.marcas[0].marca.nota, 'Cierre; con evento');
  assert.equal(a.marcas[1].marca.inicio, '07:30'); assert.ok(/Pedro/.test(a.errores[0])); assert.ok(/fecha/.test(a.errores[1]));
  assert.equal(T.aplicarMarcas(e, a.marcas), 2); assert.equal(T.registro(e, 'p2', '2026-11-20').fin, '21:05');
  const b = T.leerMarcasCSV(e, '2026-11-21,Felipe,10:00,15:00'); assert.equal(b.marcas.length, 1); assert.equal(b.marcas[0].marca.colacion, 0);
  assert.ok(T.leerMarcasCSV(e, ['fecha;entrada;salida', '2026-11-21;10:00;15:00'].join(CRLF)).errores[0].includes('cabecera')); assert.ok(T.leerMarcasCSV(e, '').errores.length);
});
t('respaldos: los de la fase 1 se completan y los registros dañados se descartan', () => {
  const v1 = T.ejemplo('2026-11-18'); delete v1.real; delete v1.comp; delete v1.pactoExtrasHasta; delete v1.tolerancia; delete v1.metodoExtra;
  assert.deepEqual(T.validarEstado(v1), []); const n = T.normalizar(v1);
  assert.deepEqual(n.real, {}); assert.deepEqual(n.comp, {}); assert.equal(n.tolerancia, 0); assert.equal(T.informeMes(n, '2026-11').extraMes, 0);
  const e = T.ejemplo('2026-11-18'); e.real.fantasma = { '2026-11-10': { inicio: '09:00', fin: '18:00' } }; e.real.p1['2026-99-99'] = { inicio: '09:00', fin: '18:00' }; e.real.p1['2026-11-12'] = { inicio: 'x' }; e.tolerancia = 999;
  T.normalizar(e); assert.equal(e.real.fantasma, undefined); assert.equal(e.real.p1['2026-99-99'], undefined); assert.equal(e.real.p1['2026-11-12'], undefined); assert.ok(e.real.p1['2026-11-09']); assert.equal(e.tolerancia, 30);
  assert.ok(T.validarEstado(Object.assign({}, e, { real: [] })).length);
  const ida = JSON.parse(JSON.stringify(e)); assert.deepEqual(T.validarEstado(ida), []); assert.equal(T.informeMes(T.normalizar(ida), '2026-11').extraMes, T.informeMes(e, '2026-11').extraMes);
});
t('quitar a una persona borra también sus jornadas', () => {
  const e = T.ejemplo('2026-11-18'); e.comp = { p4: { '2026-11': 60 } }; T.quitarPersona(e, 'p4');
  assert.equal(e.real.p4, undefined); assert.equal(e.comp.p4, undefined); assert.equal(T.informeMes(e, '2026-11').personas.length, 5);
});
t('meses: fin de mes, suma y nombre', () => {
  assert.equal(T.finDeMes('2028-02'), '2028-02-29'); assert.equal(T.sumarMes('2026-12', 1), '2027-01'); assert.equal(T.sumarMes('2026-01', -1), '2025-12');
  assert.equal(T.nombreMes('2026-11'), 'noviembre de 2026'); assert.ok(T.esMes('2026-11')); assert.ok(!T.esMes('2026-13'));
});
t('los ajustes no pueden cambiar el nombre ni el país del perfil', () => {
  const e = mini(); e.ajustes = { nombre: 5, pais: 3, maxExtraAnual: 100 };
  const r = T.reglas(e); assert.equal(r.pais, 'CL'); assert.ok(/Chile/.test(r.nombre)); assert.equal(r.maxExtraAnual, 100);
});

console.log(`\n${n} pruebas pasaron`);
