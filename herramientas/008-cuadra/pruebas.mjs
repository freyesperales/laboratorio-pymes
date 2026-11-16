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

// ================= Fase 2 =================
const X = createRequire(import.meta.url)('./xlsx.js');
const zlib = await import('node:zlib');
const fs = await import('node:fs');
const inflar = d => zlib.inflateRawSync(d);
const ta = async (nom, f) => { await f(); n++; console.log('ok', nom); };

// ZIP mínimo para fabricar Excel de prueba (deflate o sin compresión).
function zip(archivos, guardar = false) {
  const loc = [], cen = []; let off = 0;
  for (const [nombre, txt] of Object.entries(archivos)) {
    const datos = Buffer.from(txt, 'utf8'), comp = guardar ? datos : zlib.deflateRawSync(datos), nb = Buffer.from(nombre);
    const crc = zlib.crc32(datos), met = guardar ? 0 : 8;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(met, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(datos.length, 22); h.writeUInt16LE(nb.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(met, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(datos.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    loc.push(h, nb, comp); cen.push(c, nb); off += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(cen), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(cen.length / 2, 8); fin.writeUInt16LE(cen.length / 2, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...loc, cd, fin]));
}

t('tipo de archivo por contenido, no por extensión', () => {
  assert.equal(X.tipoArchivo(new Uint8Array([0x50, 0x4b, 3, 4, 0])), 'zip');
  assert.equal(X.tipoArchivo(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0])), 'xls-antiguo');
  assert.equal(X.tipoArchivo(new TextEncoder().encode('  <html><table><tr><td>Fecha</td></tr></table>')), 'html');
  assert.equal(X.tipoArchivo(new TextEncoder().encode('Fecha;Monto\n01/11/2026;5')), 'texto');
});
t('formatos de fecha de Excel', () => {
  assert.ok(X.esFormatoFecha('dd/mm/yyyy')); assert.ok(X.esFormatoFecha('[$-340A]d" de "mmmm" de "yyyy'));
  assert.ok(!X.esFormatoFecha('#,##0')); assert.ok(!X.esFormatoFecha('"$"#,##0;[Red]-"$"#,##0')); assert.ok(!X.esFormatoFecha('h:mm'));
  assert.equal(X.serialAFecha(46328), '2026-11-02'); assert.equal(X.serialAFecha(44866, true), '2026-11-02');
  assert.equal(X.columna('A1'), 0); assert.equal(X.columna('AB7'), 27);
});

// Cartola real generada con Excel (openpyxl): títulos arriba, fechas con formato, montos numéricos y una fila de saldo final.
const bytesEj = new Uint8Array(fs.readFileSync(new URL('./ejemplos/cartola-ejemplo.xlsx', import.meta.url)));
const xl = await X.leerXLSX(bytesEj, inflar);
const txl = C.tablaDesdeFilas(xl.filas);
await ta('Excel de banco: hoja, cabecera tras los títulos y fechas reales', () => {
  assert.equal(xl.hoja, 'Movimientos'); assert.equal(xl.hojas, 1);
  assert.deepEqual(txl.cabecera, ['Fecha', 'Descripción', 'Cargos', 'Abonos', 'Saldo']); assert.equal(txl.omitidas, 3);
  assert.equal(txl.filas[0][0], '2026-11-02'); assert.equal(txl.filas[0][3], 24990); assert.equal(txl.filas[0][2], '');
});
await ta('Excel y CSV dan los mismos movimientos y el mismo cuadre', () => {
  const mx = C.aMovimientos(txl, C.adivinarColumnas(txl.cabecera));
  assert.equal(mx.errores.length, 1, 'la fila «Saldo final» se informa como ilegible, no se inventa');
  assert.deepEqual(mx.lista.map(m => [m.fecha, m.monto, m.glosa]), movs.map(m => [m.fecha, m.monto, m.glosa]));
  assert.deepEqual(C.conciliar(mx.lista, peds, { hoy: '2026-11-13' }).resumen, res.resumen);
});
await ta('Excel a mano: texto en línea, texto enriquecido, entidades, celdas salteadas, 1904 y sin compresión', async () => {
  const hoja = '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="inlineStr"><is><t>Cartola</t></is></c></row>' +
    '<row r="3"><c r="A3" t="s"><v>0</v></c><c r="C3" t="s"><v>1</v></c><c r="D3" t="s"><v>2</v></c></row>' +
    '<row r="4"><c r="A4" s="1"><v>44866</v></c><c r="C4" t="s"><v>3</v></c><c r="D4" s="2"><v>1250.5</v></c></row>' +
    '<row r="5"><c r="A5" s="1"><v>44867</v></c><c r="C5" t="str"><v>PAGO &amp; CIA</v></c><c r="D5"><v>-300</v></c><c r="E5" t="b"><v>1</v></c></row>' +
    '</sheetData></worksheet>';
  const ss = '<sst><si><t>Fecha</t></si><si><r><t>Glo</t></r><r><t xml:space="preserve">sa</t></r></si><si><t>Monto</t></si><si><t>TRANSF &lt;ANA&gt; &#233;xito</t></si></sst>';
  const st = '<styleSheet><numFmts count="1"><numFmt numFmtId="165" formatCode="d/m/yy;@"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="165"/><xf numFmtId="4"/></cellXfs></styleSheet>';
  const libro = '<workbook><workbookPr date1904="1"/><sheets><sheet name="Hoja A" sheetId="1" r:id="rId9"/></sheets></workbook>';
  const rels = '<Relationships><Relationship Id="rId9" Type="x" Target="worksheets/datos.xml"/></Relationships>';
  for (const guardar of [false, true]) {
    const r = await X.leerXLSX(zip({ 'xl/workbook.xml': libro, 'xl/_rels/workbook.xml.rels': rels, 'xl/sharedStrings.xml': ss, 'xl/styles.xml': st, 'xl/worksheets/datos.xml': hoja }, guardar), inflar);
    assert.equal(r.hoja, 'Hoja A');
    const tb = C.tablaDesdeFilas(r.filas);
    assert.deepEqual(tb.cabecera, ['Fecha', '', 'Glosa', 'Monto']);
    assert.deepEqual(tb.filas[0], ['2026-11-02', '', 'TRANSF <ANA> éxito', 1250.5]);
    assert.deepEqual(tb.filas[1].slice(0, 4), ['2026-11-03', '', 'PAGO & CIA', -300]);
  }
});
await ta('ZIP que no es Excel y archivo dañado dan un error claro', async () => {
  await assert.rejects(X.leerXLSX(zip({ 'hola.txt': 'x' }), inflar), /no un Excel/);
  await assert.rejects(X.leerXLSX(new Uint8Array(40), inflar), /no es un Excel válido/);
});
t('tabla desde filas: rellena celdas vacías y descarta filas de una sola celda', () => {
  const tb = C.tablaDesdeFilas([['Reporte'], ['Fecha', 'Total', 'Cliente'], ['01/11/2026', 100], ['Nota al pie'], ['02/11/2026', 200, 'Ana']]);
  assert.equal(tb.omitidas, 1); assert.deepEqual(tb.filas, [['01/11/2026', 100, ''], ['02/11/2026', 200, 'Ana']]);
  assert.deepEqual(C.tablaDesdeFilas([['solo'], []]).cabecera, []);
});

// Canal
t('canal de venta leído de los pedidos', () => {
  assert.equal(C.adivinarColumnas(tp.cabecera).canal, 3);
  assert.deepEqual([...new Set(peds.map(p => p.canal))].sort(), ['Instagram', 'Tienda web', 'WhatsApp']);
  assert.equal(C.adivinarColumnas(['Fecha', 'Total', 'Medio de pago']).canal, 2);
});

// Perfiles
t('perfiles: se guardan por cabecera, se reconocen y cuentan usos', () => {
  let pf = C.guardarPerfil([], 'cartola', ['Fecha', 'Descripción', 'Abonos'], { fecha: 0, glosa: 1, abono: 2 }, ',', 'banco-x.xlsx');
  pf = C.guardarPerfil(pf, 'cartola', ['FECHA', 'Descripcion', 'abonos'], { fecha: 0, glosa: 1, abono: 2 }, ',', 'otro.csv');
  assert.equal(pf.length, 1); assert.equal(pf[0].usos, 2); assert.equal(pf[0].nombre, 'banco-x');
  assert.equal(C.buscarPerfil(pf, 'cartola', ['fecha', 'DESCRIPCIÓN', 'Abonos']).decimal, ',');
  assert.equal(C.buscarPerfil(pf, 'ventas', ['Fecha', 'Descripción', 'Abonos']), null);
});

// Reglas
t('reglas: validan, no se duplican y explican solo lo que quedó sin pedido', () => {
  assert.throws(() => C.agregarRegla([], 'ab', 'Otro ingreso'), /3 letras/);
  assert.throws(() => C.agregarRegla([], 'deposito', ''), /categoría/);
  let rg = C.agregarRegla([], 'Depósito efectivo', 'Aporte de socios');
  rg = C.agregarRegla(rg, 'deposito  EFECTIVO', 'Venta sin registrar');
  assert.deepEqual(rg, [{ texto: 'deposito efectivo', categoria: 'Venta sin registrar' }]);
  assert.equal(C.sugerirTextoRegla('DEPOSITO EFECTIVO 0012345'), 'deposito efectivo');
  // Una regla que calza con un cobro real no se lo quita al cuadre.
  const e = C.explicar(res, C.agregarRegla(rg, 'maria jose soto', 'Otro ingreso'));
  assert.equal(e.explicados.length, 1); assert.equal(e.explicados[0].categoria, 'Venta sin registrar');
  assert.equal(e.resumen.totalExplicado, 40000); assert.equal(e.resumen.totalSinRespaldo, 12990);
  assert.ok(e.pares.some(x => x.pedidos.includes('p1041')));
  assert.equal(C.reglaPara('TRANSF DEPOSITOS', [{ texto: 'deposito', categoria: 'x' }]), null, 'palabra completa');
});

// Informe mensual
const resE = C.explicar(res, [{ texto: 'deposito efectivo', categoria: 'Aporte de socios' }]);
const inf = C.informeMensual(resE, movs, peds);
t('informe mensual por canal: vendido, cobrado, pendiente, comisiones y días', () => {
  const f = c => inf.filas.find(x => x.canal === c);
  assert.deepEqual(inf.filas.map(x => x.mes + ' ' + x.canal), ['2026-11 Instagram', '2026-11 Tienda web', '2026-11 WhatsApp']);
  assert.deepEqual([f('Instagram').pedidos, f('Instagram').vendido, f('Instagram').cobrado, f('Instagram').pendiente], [4, 99460, 76970, 22490]);
  assert.deepEqual([f('WhatsApp').vendido, f('WhatsApp').cobrado, f('WhatsApp').pendiente, f('WhatsApp').porcentaje], [78490, 46490, 32000, 59]);
  assert.deepEqual([f('Tienda web').comisiones, f('Tienda web').diasCobro], [660, 1]);
  const m = inf.meses[0];
  assert.equal(m.vendido, res.resumen.totalPedidos); assert.equal(m.cobrado, res.resumen.totalCobrado);
  assert.equal(m.sinRespaldo, 12990); assert.deepEqual(m.explicado, { 'Aporte de socios': 40000 });
});
t('informe mensual en CSV y CSV del cuadre con canal y explicados', () => {
  const csv = C.informeMensualCSV(inf);
  assert.ok(csv.startsWith('﻿mes;canal;pedidos')); assert.match(csv, /2026-11;WhatsApp;4;78490;46490;32000;0;59;/);
  assert.match(csv, /2026-11;12990;Aporte de socios;40000/);
  const c2 = C.informeCSV(resE, movs, peds);
  assert.match(c2, /cobrado;1041;2026-11-01;María José Soto;Instagram;24990/); assert.match(c2, /explicado;.*DEPOSITO EFECTIVO;40000;;;Aporte de socios/);
});
t('pedidos sin canal caen en «Sin canal»', () => {
  const p = [{ id: 'p1', ref: '1', fecha: '2026-10-30', monto: 100, cliente: '' }];
  const i = C.informeMensual(C.explicar(C.conciliar([], p, { hoy: '2026-11-01' }), []), [], p);
  assert.deepEqual([i.filas[0].mes, i.filas[0].canal, i.filas[0].pendiente, i.filas[0].diasCobro], ['2026-10', 'Sin canal', 100, null]);
});
t('respaldo v2: perfiles y reglas se validan y uno viejo sigue sirviendo', () => {
  const o = C.validarEstado({ app: 'cuadra', movs, peds, perfiles: [{ lado: 'cartola', firma: 'a|b', mapa: { fecha: 0 } }, { lado: 'x' }], reglas: [{ texto: 'aporte', categoria: 'Aporte de socios' }, { texto: '' }] });
  assert.equal(o.perfiles.length, 1); assert.equal(o.reglas.length, 1);
  const v1 = C.validarEstado({ app: 'cuadra', movs, peds });
  assert.deepEqual([v1.perfiles, v1.reglas], [[], []]);
});

console.log(`\n${n} pruebas pasaron`);
