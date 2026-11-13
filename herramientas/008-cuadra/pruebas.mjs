import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const C = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nom, f) => { f(); n++; console.log('ok', nom); };

// Montos en formatos hispanos y anglos
t('monto chileno con punto de miles', () => assert.equal(C.leerMonto('$ 1.234.567'), 1234567));
t('monto español con coma decimal', () => assert.equal(C.leerMonto('1.234,56 €'), 1234.56));
t('monto anglo', () => assert.equal(C.leerMonto('1,234.56'), 1234.56));
t('monto negativo y entre paréntesis', () => { assert.equal(C.leerMonto('-12.500'), -12500); assert.equal(C.leerMonto('(3.000)'), -3000); });
t('monto con decimal forzado', () => assert.equal(C.leerMonto('12.500', ','), 12500));
t('monto vacío o texto', () => { assert.equal(C.leerMonto(''), null); assert.equal(C.leerMonto('n/a'), null); });

// Fechas
t('fecha día primero', () => { assert.equal(C.leerFecha('02/11/2026'), '2026-11-02'); assert.equal(C.leerFecha('2-11-26'), '2026-11-02'); });
t('fecha ISO y con mes en texto', () => { assert.equal(C.leerFecha('2026-11-13 10:22'), '2026-11-13'); assert.equal(C.leerFecha('13 nov 2026'), '2026-11-13'); assert.equal(C.leerFecha('5 de diciembre de 2026'), '2026-12-05'); });
t('fecha imposible se rechaza', () => { assert.equal(C.leerFecha('31/02/2026'), null); assert.equal(C.leerFecha('hola'), null); });

// CSV
t('separador punto y coma con títulos antes de la tabla', () => {
  const tb = C.leerCSV(C.EJ_CARTOLA);
  assert.equal(tb.separador, ';'); assert.deepEqual(tb.cabecera, ['Fecha', 'Descripción', 'Cargos', 'Abonos', 'Saldo']);
  assert.equal(tb.filas.length, 10); assert.equal(tb.omitidas, 2);
});
t('comillas con comas y comillas dobles', () => {
  const tb = C.leerCSV('a,b\n"x, y","di ""hola"""\n');
  assert.deepEqual(tb.filas[0], ['x, y', 'di "hola"']);
});
t('BOM y fin de línea Windows', () => { const tb = C.leerCSV('﻿Fecha;Monto\r\n01/11/2026;100\r\n'); assert.equal(tb.cabecera[0], 'Fecha'); assert.equal(tb.filas.length, 1); });

// Columnas
t('adivina columnas de cartola con cargos y abonos', () => {
  const m = C.adivinarColumnas(C.leerCSV(C.EJ_CARTOLA).cabecera);
  assert.deepEqual([m.fecha, m.glosa, m.cargo, m.abono], [0, 1, 2, 3]); assert.equal(m.monto, undefined);
});
t('adivina columnas de pedidos', () => {
  const m = C.adivinarColumnas(C.leerCSV(C.EJ_PEDIDOS).cabecera);
  assert.deepEqual([m.id, m.fecha, m.cliente, m.monto], [0, 1, 2, 4]);
});

// Datos de ejemplo
const tc = C.leerCSV(C.EJ_CARTOLA), tp = C.leerCSV(C.EJ_PEDIDOS);
const movs = C.aMovimientos(tc, C.adivinarColumnas(tc.cabecera)).lista;
const peds = C.aPedidos(tp, C.adivinarColumnas(tp.cabecera)).lista;
t('movimientos: abonos positivos y cargos negativos', () => {
  assert.equal(movs.length, 10); assert.equal(movs[0].monto, 24990); assert.equal(movs[1].monto, -45000);
});
t('pedidos leídos con referencia', () => { assert.equal(peds.length, 9); assert.equal(peds[0].ref, '1041'); assert.equal(peds[0].monto, 24990); });
t('filas ilegibles se reportan, no se inventan', () => {
  const r = C.aPedidos(C.leerCSV('Fecha,Total\nayer,100\n01/11/2026,abc\n01/11/2026,500'), { fecha: 0, monto: 1 });
  assert.equal(r.lista.length, 1); assert.equal(r.errores.length, 2);
});

const res = C.conciliar(movs, peds, { hoy: '2026-11-13' });
const par = id => res.pares.find(x => x.pedidos.includes(id));
t('referencia en la glosa', () => { assert.ok(C.refEnGlosa('1043', 'TRANSF DE PEDRO RAMIREZ PEDIDO 1043')); assert.ok(!C.refEnGlosa('104', 'PEDIDO 1043')); });
t('parecido de nombres ignora tildes', () => assert.equal(C.parecido('María José Soto', 'TRANSF DE MARIA JOSE SOTO'), 1));
t('monto exacto con nombre: confianza alta', () => { const x = par('p1041'); assert.equal(x.tipo, 'exacto'); assert.equal(x.confianza, 'alta'); });
t('monto exacto con número de pedido', () => assert.match(par('p1043').motivo, /menciona el pedido/));
t('pago agrupado de dos pedidos', () => { const x = par('p1045'); assert.equal(x.tipo, 'agrupado'); assert.deepEqual(x.pedidos.sort(), ['p1045', 'p1046']); });
t('comisión del enlace de pago detectada', () => { const x = par('p1044'); assert.equal(x.tipo, 'comision'); assert.equal(x.diferencia, -660); });
t('pedidos sin cobro quedan pendientes con días', () => {
  assert.deepEqual(res.pendientes.map(p => p.ref).sort(), ['1042', '1049']);
  assert.equal(res.pendientes.find(p => p.ref === '1042').diasEsperando, 11);
});
t('abonos sin respaldo: depósito y transferencia repetida', () => {
  const g = res.sinRespaldo.map(m => m.glosa); assert.equal(g.length, 2);
  assert.ok(g.includes('DEPOSITO EFECTIVO')); assert.ok(g.includes('TRANSF DE CAMILA ROJAS'));
});
t('duplicado detectado', () => assert.equal(res.duplicados.length, 1));
t('resumen cuadra', () => {
  const r = res.resumen;
  assert.equal(r.pedidos, 9); assert.equal(r.conciliados, 7); assert.equal(r.porcentaje, 78);
  assert.equal(r.totalPendiente, 54490); assert.equal(r.totalSinRespaldo, 52990); assert.equal(r.comisiones, 660); assert.equal(r.cargosIgnorados, 2);
  assert.equal(r.totalCobrado + r.totalPendiente, r.totalPedidos);
});
t('fuera de la ventana de fechas no se une', () => {
  const r = C.conciliar([{ id: 'm1', fecha: '2026-12-30', monto: 100, glosa: 'x' }], [{ id: 'p1', ref: '1', fecha: '2026-11-01', monto: 100, cliente: 'x' }]);
  assert.equal(r.pares.length, 0);
});
t('empate real queda para revisar', () => {
  const r = C.conciliar([{ id: 'm1', fecha: '2026-11-02', monto: 5000, glosa: 'TRANSF' }],
    [{ id: 'pa', ref: 'a', fecha: '2026-11-02', monto: 5000, cliente: 'Ana' }, { id: 'pb', ref: 'b', fecha: '2026-11-02', monto: 5000, cliente: 'Beto' }]);
  assert.equal(r.pares[0].confianza, 'revisar');
});
t('unión manual manda y el rechazo no se repite', () => {
  const r1 = C.conciliar(movs, peds, { hoy: '2026-11-13' }, [{ mov: 'm8', pedidos: ['p1042'] }]);
  assert.equal(r1.pares.find(x => x.mov === 'm8').tipo, 'manual');
  const r2 = C.conciliar(movs, peds, { hoy: '2026-11-13' }, [], ['m2|p1041']);
  assert.ok(!r2.pares.some(x => x.mov === 'm2' && x.pedidos.includes('p1041')));
});
t('informe CSV con BOM, punto y coma y sin fórmulas', () => {
  const csv = C.informeCSV(res, movs, peds);
  assert.ok(csv.startsWith('﻿estado;pedido')); assert.match(csv, /pendiente;1042/);
  assert.equal(C.aCSV([['=HYPERLINK("x")', -5]]), '﻿"\'=HYPERLINK(""x"")";-5');
});
t('respaldo JSON valida y rechaza', () => {
  const o = C.validarEstado(JSON.parse(JSON.stringify({ app: 'cuadra', movs, peds })));
  assert.equal(o.opciones.comision, 5);
  assert.throws(() => C.validarEstado({ app: 'otra' }), /no es un respaldo/);
  assert.throws(() => C.validarEstado({ app: 'cuadra', movs: [{ monto: 'x', fecha: '2026-11-01' }], peds: [] }), /inválido/);
});

console.log(`\n${n} pruebas pasaron`);
