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

console.log(`\n${n} pruebas pasaron`);
