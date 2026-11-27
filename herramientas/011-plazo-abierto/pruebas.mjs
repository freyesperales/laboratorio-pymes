import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const P = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nom, f) => { f(); n++; console.log('ok', nom); };
const HOY = '2026-11-27';
const CL = Object.assign(P.tiendaVacia(), { pais: 'CL', nombre: 'Prueba', confirmacion: true });
const ES = Object.assign(P.tiendaVacia(), { pais: 'ES', nombre: 'Prueba', informa: true });
const ped = (c = {}) => Object.assign(P.pedidoVacio(HOY), { numero: '1', fechaCompra: '2026-11-20', fechaRecepcion: '2026-11-24', monto: 10000 }, c);
const cods = r => r.alertas.map(a => a.codigo);

// Fechas
t('fechas válidas e imposibles', () => { assert.ok(P.esFecha('2027-02-28')); assert.ok(!P.esFecha('2027-02-29')); assert.ok(!P.esFecha('27-11-2026')); });
t('sumar días y cruzar año', () => { assert.equal(P.sumar('2026-12-25', 10), '2027-01-04'); assert.equal(P.diasEntre('2026-11-27', '2026-12-07'), 10); });
t('sumar meses ajusta fin de mes', () => { assert.equal(P.sumarMeses('2026-08-31', 6), '2027-02-28'); assert.equal(P.sumarMeses('2027-11-30', 3), '2028-02-29'); assert.equal(P.sumarMeses('2026-11-24', 36), '2029-11-24'); });
t('lunes de la semana', () => { assert.equal(P.lunesDe('2026-11-27'), '2026-11-23'); assert.equal(P.lunesDe('2026-11-29'), '2026-11-23'); assert.equal(P.lunesDe('2026-11-30'), '2026-11-30'); });
t('fecha larga en español', () => { assert.equal(P.fechaLarga('2026-11-27'), 'viernes 27 de noviembre de 2026'); assert.equal(P.fechaCorta('2026-12-07'), '07-12-2026'); });
t('leer fechas de planillas y tiendas', () => {
  assert.equal(P.leerFecha('2026-11-27 10:31:44 -0300'), '2026-11-27');
  assert.equal(P.leerFecha('27/11/2026'), '2026-11-27');
  assert.equal(P.leerFecha('7-1-27'), '2027-01-07');
  assert.equal(P.leerFecha('2026/2/30'), null);
  assert.equal(P.leerFecha(''), '');
});
t('montos con formato de Chile, España y tiendas', () => {
  assert.equal(P.num('$ 12.990'), 12990); assert.equal(P.num('1.234,50 €'), 1234.5); assert.equal(P.num('12990.00'), 12990);
  assert.equal(P.num('12,99'), 12.99); assert.equal(P.num('1,299,000'), 1299000); assert.equal(P.num('abc'), null); assert.equal(P.num(''), null);
});
t('dinero por país', () => { assert.equal(P.dinero(12990, 'CL'), '$ 12.990'); assert.match(P.dinero(1234.5, 'ES'), /1\.?234,50 €/); assert.equal(P.dinero(null, 'CL'), '—'); });

// Chile: retracto
t('Chile: 10 días corridos desde la recepción', () => {
  const r = P.calcularPedido(ped(), CL, HOY);
  assert.equal(r.retracto.fin, '2026-12-04'); assert.equal(r.retracto.estado, 'abierto'); assert.equal(r.retracto.diasRestantes, 7); assert.equal(r.retracto.alargado, false);
});
t('Chile: sin confirmación escrita el plazo sube a 90 días', () => {
  const r = P.calcularPedido(ped(), Object.assign({}, CL, { confirmacion: false }), HOY);
  assert.equal(r.retracto.fin, '2027-02-22'); assert.ok(r.retracto.alargado); assert.ok(cods(r).includes('alargado'));
});
t('Chile: el pedido puede corregir lo que dice la tienda', () => {
  assert.equal(P.calcularPedido(ped({ paso: 'no' }), CL, HOY).retracto.dias, 90);
  assert.equal(P.calcularPedido(ped({ paso: 'si' }), Object.assign({}, CL, { confirmacion: false }), HOY).retracto.dias, 10);
});
t('Chile: el plazo vencido queda cerrado', () => {
  const r = P.calcularPedido(ped({ fechaCompra: '2026-11-01', fechaRecepcion: '2026-11-05' }), CL, HOY);
  assert.equal(r.retracto.fin, '2026-11-15'); assert.equal(r.retracto.estado, 'cerrado');
});
t('Chile: último día hoy avisa que vence hoy', () => {
  const r = P.calcularPedido(ped({ fechaCompra: '2026-11-15', fechaRecepcion: '2026-11-17' }), CL, HOY);
  assert.equal(r.retracto.diasRestantes, 0); assert.equal(r.retracto.estado, 'abierto'); assert.ok(r.alertas.some(a => a.codigo === 'cierra-pronto' && /hoy/.test(a.texto)));
});
t('Chile: sin recepción el plazo no empieza', () => {
  const r = P.calcularPedido(ped({ fechaRecepcion: '' }), CL, HOY);
  assert.equal(r.retracto.estado, 'sin-iniciar'); assert.ok(cods(r).includes('sin-recepcion')); assert.equal(r.garantia.fin, '');
});
t('Chile: servicio cuenta desde la contratación', () => {
  const r = P.calcularPedido(ped({ tipo: 'servicio', fechaRecepcion: '' }), CL, HOY);
  assert.equal(r.retracto.inicio, '2026-11-20'); assert.equal(r.retracto.fin, '2026-11-30'); assert.equal(r.garantia.aplica, false);
});
t('Chile: presencial sin acceso al producto sí tiene retracto', () => {
  assert.equal(P.calcularPedido(ped({ canal: 'presencial-sin-acceso' }), CL, HOY).retracto.estado, 'abierto');
  assert.equal(P.calcularPedido(ped({ canal: 'presencial' }), CL, HOY).retracto.estado, 'no-aplica');
});
t('Chile: exclusiones con su aviso', () => {
  const r = P.calcularPedido(ped({ exclusion: 'a-medida' }), CL, HOY);
  assert.equal(r.retracto.estado, 'excluido'); assert.ok(cods(r).includes('exclusion-informada'));
  assert.ok(cods(P.calcularPedido(ped({ exclusion: 'uso-personal' }), CL, HOY)).includes('reglamento'));
  assert.ok(cods(P.calcularPedido(ped({ exclusion: 'servicio-excluido' }), CL, HOY)).includes('exclusion-bien'));
  assert.ok(cods(P.calcularPedido(ped({ exclusion: 'precinto-higiene' }), CL, HOY)).includes('exclusion-desconocida'));
});
t('Chile: garantía legal de 6 meses o la mayor', () => {
  assert.equal(P.calcularPedido(ped(), CL, HOY).garantia.fin, '2027-05-24');
  assert.equal(P.calcularPedido(ped({ garantiaMeses: 12 }), CL, HOY).garantia.fin, '2027-11-24');
  assert.equal(P.calcularPedido(ped({ garantiaMeses: 3 }), CL, HOY).garantia.fin, '2027-05-24');
  assert.equal(P.calcularPedido(ped({ exclusion: 'perecible' }), CL, HOY).garantia.fin, '2026-12-01');
});
t('Chile: retracto pedido da 45 días para devolver el dinero', () => {
  const r = P.calcularPedido(ped({ fechaRetracto: '2026-11-26' }), CL, HOY);
  assert.equal(r.retracto.estado, 'ejercido'); assert.equal(r.reembolso.antesDe, '2027-01-10'); assert.ok(r.reembolso.dentroDePlazo); assert.ok(cods(r).includes('reembolso-pendiente'));
});
t('Chile: retracto fuera de plazo', () => {
  const r = P.calcularPedido(ped({ fechaCompra: '2026-11-01', fechaRecepcion: '2026-11-05', fechaRetracto: '2026-11-20' }), CL, HOY);
  assert.equal(r.reembolso.dentroDePlazo, false); assert.ok(cods(r).includes('fuera-de-plazo'));
});
t('Chile: reembolso vencido es un error', () => {
  const r = P.calcularPedido(ped({ fechaRecepcion: '2026-09-01', fechaCompra: '2026-08-30', fechaRetracto: '2026-09-05' }), CL, HOY);
  assert.ok(r.alertas.some(a => a.codigo === 'reembolso-vencido' && a.nivel === 'error'));
  assert.ok(!cods(P.calcularPedido(ped({ fechaRecepcion: '2026-09-01', fechaCompra: '2026-08-30', fechaRetracto: '2026-09-05', reembolsado: true }), CL, HOY)).includes('reembolso-vencido'));
});

// España: desistimiento
t('España: 14 días naturales desde la recepción', () => {
  const r = P.calcularPedido(ped(), ES, HOY);
  assert.equal(r.retracto.fin, '2026-12-08'); assert.equal(r.retracto.finPrudente, '2026-12-08'); assert.equal(r.retracto.diasRestantes, 11);
});
t('España: si el último día es fin de semana, fecha prudente el lunes', () => {
  const r = P.calcularPedido(ped({ fechaRecepcion: '2026-11-22' }), ES, HOY); // 22 + 14 = domingo 6-12
  assert.equal(r.retracto.fin, '2026-12-06'); assert.equal(r.retracto.finPrudente, '2026-12-07'); assert.ok(cods(r).includes('fin-de-semana'));
  const s = P.calcularPedido(ped({ fechaRecepcion: '2026-11-21' }), ES, HOY); // sábado 5-12
  assert.equal(s.retracto.finPrudente, '2026-12-07');
});
t('España: sin información el plazo se alarga 12 meses', () => {
  const r = P.calcularPedido(ped(), Object.assign({}, ES, { informa: false }), HOY);
  assert.equal(r.retracto.fin, '2027-12-08'); assert.ok(r.retracto.alargado); assert.ok(cods(r).includes('alargado'));
});
t('España: la tienda física no tiene desistimiento', () => {
  assert.equal(P.calcularPedido(ped({ canal: 'presencial' }), ES, HOY).retracto.estado, 'no-aplica');
  assert.equal(P.calcularPedido(ped({ canal: 'presencial-sin-acceso' }), ES, HOY).retracto.estado, 'no-aplica');
});
t('España: excepciones del art. 103', () => {
  const r = P.calcularPedido(ped({ exclusion: 'precinto-higiene' }), ES, HOY);
  assert.equal(r.retracto.estado, 'excluido'); assert.match(r.retracto.cita, /103 e/);
});
t('España: reembolso en 14 días y devolución del cliente en 14', () => {
  const r = P.calcularPedido(ped({ fechaRetracto: '2026-11-26' }), ES, HOY);
  assert.equal(r.reembolso.antesDe, '2026-12-10'); assert.equal(r.reembolso.devolucionCliente, '2026-12-10');
  assert.ok(r.alertas.some(a => a.codigo === 'reembolso-pendiente' && /retenerlo/.test(a.texto)));
});
t('España: reembolso vencido menciona el doble', () => {
  const r = P.calcularPedido(ped({ fechaRetracto: '2026-11-10', fechaRecepcion: '2026-11-05', fechaCompra: '2026-11-01' }), ES, HOY);
  assert.ok(r.alertas.some(a => a.codigo === 'reembolso-vencido' && /doble/.test(a.texto)));
});
t('España: garantía de 3 años, 2 en digital, segunda mano pactada', () => {
  assert.equal(P.calcularPedido(ped(), ES, HOY).garantia.fin, '2029-11-24');
  assert.equal(P.calcularPedido(ped({ tipo: 'digital', fechaRecepcion: '' }), ES, HOY).garantia.fin, '2028-11-20');
  assert.equal(P.calcularPedido(ped({ segundaMano: true, garantiaMeses: 12 }), ES, HOY).garantia.fin, '2027-11-24');
  const m = P.calcularPedido(ped({ segundaMano: true, garantiaMeses: 6 }), ES, HOY);
  assert.equal(m.garantia.fin, '2027-11-24'); assert.ok(cods(m).includes('garantia-minima'));
});

// Validaciones
t('errores de fecha y monto', () => {
  const r = P.calcularPedido(ped({ fechaCompra: '2026-13-01', monto: '' }), CL, HOY);
  assert.ok(cods(r).includes('fecha-compra')); assert.ok(cods(r).includes('monto'));
  assert.ok(cods(P.calcularPedido(ped({ fechaRecepcion: '2026-11-10' }), CL, HOY)).includes('recepcion-antes'));
  assert.ok(cods(P.calcularPedido(ped({ monto: -5 }), CL, HOY)).includes('monto-negativo'));
});

// Dinero en juego
t('exposición: abierto, sin iniciar, firme y en devolución', () => {
  const lista = [
    ped({ monto: 10000 }),                                              // abierto hasta 04-12
    ped({ monto: 20000, fechaRecepcion: '' }),                          // sin iniciar
    ped({ monto: 30000, fechaRecepcion: '2026-11-01', fechaCompra: '2026-10-30' }), // cerrado = firme
    ped({ monto: 5000, canal: 'presencial' }),                          // no aplica = firme
    ped({ monto: 7000, fechaRetracto: '2026-11-26' }),                  // en devolución
    ped({ monto: '' })                                                   // sin monto
  ];
  const e = P.exposicion(lista, CL, HOY);
  assert.equal(e.abierto, 10000); assert.equal(e.sinIniciar, 20000); assert.equal(e.firme, 35000); assert.equal(e.enDevolucion, 7000); assert.equal(e.sinMonto, 1);
  assert.equal(e.semanas.length, 1); assert.equal(e.semanas[0].desde, '2026-11-30'); assert.equal(e.semanas[0].firmeAcumulado, 45000);
  assert.equal(e.ultimoCierre, '2026-12-04');
});
t('exposición: dinero que estaría firme sin el alargue', () => {
  const e = P.exposicion([ped({ monto: 9000, fechaCompra: '2026-11-08', fechaRecepcion: '2026-11-10', paso: 'no' }), ped({ monto: 1000, paso: 'no' })], CL, HOY);
  assert.equal(e.nAlargados, 2); assert.equal(e.porAlargue, 9000); assert.equal(e.abierto, 10000);
});
t('exposición: semanas ordenadas y acumuladas', () => {
  const e = P.exposicion([ped({ monto: 1, fechaRecepcion: '2026-12-10', fechaCompra: '2026-12-01' }), ped({ monto: 2 }), ped({ monto: 4, fechaRecepcion: '2026-12-01', fechaCompra: '2026-11-28' })], CL, HOY);
  assert.deepEqual(e.semanas.map(s => s.desde), ['2026-11-30', '2026-12-07', '2026-12-14']);
  assert.deepEqual(e.semanas.map(s => s.firmeAcumulado), [2, 6, 7]);
});

// CSV
t('leer CSV con punto y coma, comillas y saltos', () => {
  const c = P.leerCSV('﻿a;b\r\n"x;1";"di ""hola"""\n\n3;"línea\nnueva"');
  assert.equal(c.separador, ';'); assert.deepEqual(c.filas, [['a', 'b'], ['x;1', 'di "hola"'], ['3', 'línea\nnueva']]);
});
t('mapear encabezados en español e inglés', () => {
  const m = P.mapearEncabezados(['N° pedido', 'Cliente', 'Fecha de compra', 'Fecha de entrega', 'Total']);
  assert.deepEqual(m, { fechaRecepcion: 3, fechaCompra: 2, numero: 0, cliente: 1, monto: 4 });
  const s = P.mapearEncabezados(['Name', 'Email', 'Created at', 'Fulfilled at', 'Total']);
  assert.equal(s.numero, 0); assert.equal(s.cliente, 1); assert.equal(s.fechaCompra, 2); assert.equal(s.fechaRecepcion, 3); assert.equal(s.monto, 4);
});
t('importar ventas con errores por fila', () => {
  const r = P.importarVentas('pedido,cliente,fecha,entrega,total\n101,Ana,27/11/2026,30/11/2026,"$ 12.990"\n102,Luis,mañana,,5000\n103,Eva,2026-11-28,ayer,7.500');
  assert.equal(r.pedidos.length, 2); assert.equal(r.pedidos[0].fechaRecepcion, '2026-11-30'); assert.equal(r.pedidos[0].monto, 12990);
  assert.equal(r.pedidos[1].monto, 7500); assert.equal(r.pedidos[1].fechaRecepcion, '');
  assert.equal(r.errores.length, 2); assert.match(r.errores[0].texto, /Fila 3/);
});
t('importar suma productos del mismo pedido (formato Shopify)', () => {
  const r = P.importarVentas('Name,Email,Created at,Total\n#1001,a@x.cl,2026-11-27 10:00:00 -0300,10000\n#1001,a@x.cl,2026-11-27 10:00:00 -0300,5000\n#1002,b@x.cl,2026-11-27 11:00:00 -0300,3000');
  assert.equal(r.pedidos.length, 2); assert.equal(r.pedidos[0].monto, 15000);
});
t('importar sin columna de fecha avisa y no inventa', () => {
  const r = P.importarVentas('cliente,total\nAna,100'); assert.equal(r.pedidos.length, 0); assert.match(r.errores[0].texto, /fecha de compra/);
  assert.equal(P.importarVentas('solo').errores.length, 1);
});
t('exportar CSV con estado y avisos', () => {
  const csv = P.exportarCSV([ped({ cliente: 'Ana; "la del 3B"', paso: 'no' })], CL, HOY);
  const filas = P.leerCSV(csv).filas;
  assert.equal(filas[0][0], 'numero'); assert.equal(filas[1][1], 'Ana; "la del 3B"'); assert.equal(filas[1][8], 'Abierto'); assert.equal(filas[1][9], '2027-02-22'); assert.equal(filas[1][11], 'sí');
  assert.match(filas[1][14], /90 días/);
});
t('respaldo JSON ida y vuelta', () => {
  const est = { tienda: ES, pedidos: [ped({ cliente: 'Ana' })] };
  const r = P.leerRespaldo(P.respaldo(est));
  assert.equal(r.tienda.pais, 'ES'); assert.equal(r.pedidos[0].cliente, 'Ana');
  assert.throws(() => P.leerRespaldo('{"app":"otra","pedidos":[]}'), /no es un respaldo/);
  assert.throws(() => P.leerRespaldo('no json'), /JSON válido/);
  assert.equal(P.leerRespaldo('{"app":"plazo-abierto","tienda":{"pais":"AR"},"pedidos":[null]}').tienda.pais, 'CL');
});

// Textos
t('política de Chile con datos y alerta de confirmación', () => {
  const p = P.politica(Object.assign({}, CL, { correo: 'a@b.cl', confirmacion: false, diasExtra: 20 }));
  assert.match(p.texto, /30 días corridos/); assert.match(p.texto, /45 días/); assert.match(p.texto, /6 meses/); assert.match(p.texto, /a@b\.cl/); assert.match(p.texto, /90 días/);
  assert.match(P.politica(P.tiendaVacia()).texto, /\[correo\]/);
});
t('política de España con formulario y botón del 106 bis', () => {
  const p = P.politica(Object.assign({}, ES, { costoDevolucion: 'tienda' }));
  assert.match(p.texto, /14 días naturales/); assert.match(p.texto, /3 años/); assert.match(p.texto, /desistir del contrato aquí/); assert.match(p.texto, /Nosotros asumimos/);
  const f = P.formularioDesistimiento(Object.assign({}, ES, { nombre: 'Taller', direccion: 'Calle 1', correo: 'x@y.es' }));
  assert.match(f, /Taller, Calle 1, x@y\.es/); assert.match(f, /anexo B/);
});
t('mensaje de confirmación por país', () => {
  assert.match(P.mensajeConfirmacion(CL, ped({ cliente: 'Ana', numero: '7' })), /Hola Ana.*N° 7.*20-11-2026.*10 días corridos/);
  assert.match(P.mensajeConfirmacion(ES, ped()), /14 días naturales/);
});

// Ejemplo
t('ejemplo chileno y español calculan sin errores', () => {
  for (const pais of ['CL', 'ES']) {
    const ej = P.ejemplo(HOY, pais);
    assert.equal(ej.tienda.pais, pais); assert.equal(ej.pedidos.length, 10);
    const todos = ej.pedidos.map(p => P.calcularPedido(p, ej.tienda, HOY));
    assert.ok(todos.every(r => !r.alertas.some(a => a.nivel === 'error')), pais + ' sin errores');
    const estados = new Set(todos.map(r => r.retracto.estado));
    for (const e of ['abierto', 'cerrado', 'sin-iniciar', 'excluido', 'no-aplica', 'ejercido']) assert.ok(estados.has(e), pais + ' tiene ' + e);
    const ex = P.exposicion(ej.pedidos, ej.tienda, HOY);
    assert.ok(ex.abierto > 0 && ex.sinIniciar > 0 && ex.firme > 0 && ex.enDevolucion > 0);
  }
});

console.log(`\n${n} pruebas pasaron`);
