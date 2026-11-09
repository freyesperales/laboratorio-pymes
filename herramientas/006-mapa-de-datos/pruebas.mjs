import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const M = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nom, f) => { f(); n++; console.log('ok', nom); };

t('puntaje vacío = 0, por empezar', () => { const p = M.puntaje({}); assert.equal(p.puntaje, 0); assert.equal(p.nivel, 'Por empezar'); assert.equal(p.pendientes.length, 10); });
t('puntaje todo sí = 100', () => { const r = {}; M.DIAG.forEach(d => r[d.id] = 'si'); const p = M.puntaje(r); assert.equal(p.puntaje, 100); assert.equal(p.pendientes.length, 0); });
t('puntaje parcial y orden por prioridad', () => { const r = {}; M.DIAG.forEach(d => r[d.id] = 'si'); r.aviso = 'no'; r.retencion = 'parcial'; const p = M.puntaje(r); assert.equal(p.pendientes[0].id, 'aviso'); assert.ok(p.puntaje < 100 && p.puntaje > 80); });
t('validarRegistro', () => { assert.equal(M.validarRegistro(M.nuevoRegistro({})).length, 3); assert.equal(M.validarRegistro(M.nuevoRegistro({ datos: 'a', finalidad: 'b', donde: 'c' })).length, 0); });
t('alertas', () => { const a = M.alertas([M.nuevoRegistro({ datos: 'x', finalidad: 'y', donde: 'z', base: 'Consentimiento', sensible: true, terceros: 'Mailchimp' })]); assert.equal(a.length, 4); });
t('CSV ida y vuelta con comas, comillas y saltos', () => {
  const inv = [M.nuevoRegistro({ datos: 'nombre, "apodo"\nteléfono', finalidad: 'despacho', donde: 'Excel', sensible: true, categoria: 'Clientes', base: 'Contrato' })];
  const back = M.deCSV(M.aCSV(inv));
  assert.equal(back.length, 1); assert.equal(back[0].datos, inv[0].datos); assert.equal(back[0].sensible, true);
});
t('CSV con BOM y CRLF', () => { const csv = '﻿categoria,datos,finalidad\r\nClientes,nombre,venta\r\n'; const r = M.deCSV(csv); assert.equal(r[0].datos, 'nombre'); assert.equal(r[0].base, 'Otra'); });
t('CSV inválido falla con mensaje', () => { assert.throws(() => M.deCSV('a,b\n1,2'), /Falta la columna/); assert.throws(() => M.deCSV(''), /vacío/); });
t('categoría desconocida pasa a Otros', () => { assert.equal(M.deCSV('categoria,datos,finalidad\nXyz,a,b')[0].categoria, 'Otros'); });
t('fechas: límite y fin de mes/año bisiesto', () => { assert.equal(M.sumarDias('2026-11-09', 30), '2026-12-09'); assert.equal(M.sumarDias('2028-02-28', 1), '2028-02-29'); assert.equal(M.sumarDias('2026-12-31', 1), '2027-01-01'); });
t('estado de solicitud', () => {
  const s = M.nuevaSolicitud({ persona: 'Ana', tipo: 'Acceso', recibida: '2026-11-01' });
  assert.equal(s.limite, '2026-12-01'); assert.equal(s.plazoDias, 30);
  assert.equal(M.estadoSolicitud(s, '2026-11-09').clave, 'ok');
  assert.equal(M.estadoSolicitud(s, '2026-11-27').clave, 'urgente');
  assert.equal(M.estadoSolicitud(s, '2026-12-05').clave, 'vencida');
  assert.equal(M.estadoSolicitud({ ...s, resuelta: true }, '2030-01-01').clave, 'resuelta');
});
t('solicitud inválida', () => { assert.throws(() => M.nuevaSolicitud({ persona: '', tipo: 'Acceso', recibida: '2026-01-01' })); assert.throws(() => M.nuevaSolicitud({ persona: 'a', tipo: 'X', recibida: '2026-01-01' })); assert.throws(() => M.nuevaSolicitud({ persona: 'a', tipo: 'Acceso', recibida: '01/01/2026' })); });
t('plazo editable', () => { assert.equal(M.nuevaSolicitud({ persona: 'a', tipo: 'Acceso', recibida: '2026-01-01', plazoDias: 10 }).limite, '2026-01-11'); });
t('respuesta modelo incluye fechas', () => { const s = M.nuevaSolicitud({ persona: 'Ana', tipo: 'Supresión', recibida: '2026-11-01' }); const r = M.respuestaModelo(s, { nombre: 'Café Sur' }); assert.match(r, /2026-12-01/); assert.match(r, /Café Sur/); });
t('política incluye terceros únicos y aviso legal', () => {
  const inv = [M.nuevoRegistro({ datos: 'correo', finalidad: 'boletín', donde: 'Mailchimp', terceros: 'Mailchimp, Google' , plazo: '2 años'}), M.nuevoRegistro({ datos: 'nombre', finalidad: 'venta', donde: 'x', terceros: 'Google' })];
  const p = M.generarPolitica({ nombre: 'Café Sur', contacto: 'a@b.cl' }, inv, '2026-11-09');
  assert.match(p, /Mailchimp, Google\./); assert.match(p, /no reemplaza asesoría legal/); assert.match(p, /2 años/);
});
t('política vacía no rompe', () => { assert.match(M.generarPolitica({}, [], ''), /Completa el inventario/); });
t('exportar/importar JSON', () => {
  const est = { empresa: { nombre: 'X' }, respuestas: { aviso: 'si' }, inventario: [M.nuevoRegistro({ datos: 'a', finalidad: 'b', donde: 'c' })], solicitudes: [M.nuevaSolicitud({ persona: 'P', tipo: 'Acceso', recibida: '2026-11-01' })] };
  const back = M.importarTodo(M.exportarTodo(est));
  assert.equal(back.empresa.nombre, 'X'); assert.equal(back.inventario.length, 1); assert.equal(back.solicitudes[0].limite, '2026-12-01');
  assert.throws(() => M.importarTodo('no json'), /JSON/); assert.throws(() => M.importarTodo('{"a":1}'), /no corresponde/);
});
console.log('\n' + n + ' pruebas pasaron');
