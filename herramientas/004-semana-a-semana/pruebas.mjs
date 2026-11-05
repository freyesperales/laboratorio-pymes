import { createRequire } from 'module';
import assert from 'assert/strict';
const F = createRequire(import.meta.url)('./logica.js');
let ok = 0;
const t = (n, f) => { f(); ok++; console.log('✓', n); };

t('lunesDe devuelve el lunes', () => {
  assert.equal(F.lunesDe('2026-11-05'), '2026-11-02'); // jueves
  assert.equal(F.lunesDe('2026-11-08'), '2026-11-02'); // domingo
  assert.equal(F.lunesDe('2026-11-02'), '2026-11-02');
  assert.equal(F.lunesDe('basura'), null);
});
t('fechas inválidas', () => { assert.ok(isNaN(F.aMs('2026-02-30'))); assert.ok(isNaN(F.aMs(''))); });
t('número en varios formatos', () => {
  assert.equal(F.numero('1.234,56'), 1234.56);
  assert.equal(F.numero('1,234.56'), 1234.56);
  assert.equal(F.numero('$ 1.500'), 1500);
  assert.equal(F.numero('2500'), 2500);
  assert.equal(F.numero('12,5'), 12.5);
  assert.ok(isNaN(F.numero('abc')));
});
t('índice de semana', () => {
  assert.equal(F.indiceSemana('2026-11-02', '2026-11-02', 13), 0);
  assert.equal(F.indiceSemana('2026-11-09', '2026-11-02', 13), 1);
  assert.equal(F.indiceSemana('2026-11-01', '2026-11-02', 13), null);
  assert.equal(F.indiceSemana('2027-02-01', '2026-11-02', 13), null); // semana 14
});
t('ocurrencias semanal y quincenal', () => {
  assert.equal(F.ocurrencias({ fecha: '2026-11-02', repite: 'semanal' }, '2026-11-02', 13).length, 13);
  assert.equal(F.ocurrencias({ fecha: '2026-11-02', repite: 'quincenal' }, '2026-11-02', 13).length, 7);
});
t('mensual ajusta fin de mes', () => {
  const o = F.ocurrencias({ fecha: '2026-01-31', repite: 'mensual' }, '2026-01-26', 13);
  assert.deepEqual(o.slice(0, 3), ['2026-01-31', '2026-02-28', '2026-03-31']);
});
t('hasta limita la repetición', () => {
  assert.equal(F.ocurrencias({ fecha: '2026-11-02', repite: 'semanal', hasta: '2026-11-16' }, '2026-11-02', 13).length, 3);
});
t('proyección simple y primera semana negativa', () => {
  const r = F.proyectar(1000, [
    { concepto: 'Venta', tipo: 'cobro', monto: 500, fecha: '2026-11-03', repite: 'una' },
    { concepto: 'Alquiler', tipo: 'pago', monto: 800, fecha: '2026-11-10', repite: 'una' },
    { concepto: 'Sueldos', tipo: 'pago', monto: 900, fecha: '2026-11-17', repite: 'una' }
  ], '2026-11-05', 13);
  assert.equal(r.inicio, '2026-11-02');
  assert.equal(r.semanas[0].final, 1500);
  assert.equal(r.semanas[1].final, 700);
  assert.equal(r.semanas[2].final, -200);
  assert.equal(r.primeraNegativa, 3);
  assert.equal(r.saldoMinimo, -200);
  assert.equal(r.saldoFinal, -200);
});
t('saldo nunca negativo → null', () => {
  const r = F.proyectar(100, [{ tipo: 'pago', monto: 10, fecha: '2026-11-03' }], '2026-11-02', 13);
  assert.equal(r.primeraNegativa, null);
});
t('probabilidad reduce solo los cobros', () => {
  const r = F.proyectar(0, [
    { tipo: 'cobro', monto: 1000, fecha: '2026-11-03', probabilidad: 0.5 },
    { tipo: 'pago', monto: 1000, fecha: '2026-11-03', probabilidad: 0.5 }
  ], '2026-11-02', 13);
  assert.equal(r.semanas[0].cobros, 500);
  assert.equal(r.semanas[0].pagos, 1000);
});
t('movimientos fuera del horizonte o inválidos se ignoran', () => {
  const r = F.proyectar(0, [
    { tipo: 'cobro', monto: 100, fecha: '2025-01-01' },
    { tipo: 'cobro', monto: 'x', fecha: '2026-11-03' },
    { tipo: 'cobro', monto: 100, fecha: 'no' }
  ], '2026-11-02', 13);
  assert.equal(r.totalCobros, 0);
});
t('recurrente mensual suma 3 en 13 semanas', () => {
  const r = F.proyectar(0, [{ tipo: 'pago', monto: 100, fecha: '2026-11-05', repite: 'mensual' }], '2026-11-02', 13);
  assert.equal(r.totalPagos, 300);
});
t('monto con formato local', () => {
  const r = F.proyectar(0, [{ tipo: 'cobro', monto: '1.250,50', fecha: '2026-11-03' }], '2026-11-02', 13);
  assert.equal(r.totalCobros, 1250.5);
});
t('faltante respecto al mínimo', () => {
  const r = F.proyectar(100, [{ tipo: 'pago', monto: 400, fecha: '2026-11-03' }], '2026-11-02', 13, { minimo: 200 });
  assert.equal(r.primeraBajoMinimo, 1);
  assert.equal(F.faltante(r, 200), 500);
});
t('CSV neutraliza fórmulas', () => {
  const r = F.proyectar(0, [], '2026-11-02', 2);
  assert.ok(F.aCsv(r).split('\n').length === 3);
});
console.log(`\n${ok} pruebas OK`);
