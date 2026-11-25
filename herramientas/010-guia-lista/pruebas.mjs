import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const G = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nom, f) => { f(); n++; console.log('ok', nom); };
const HOY = '2026-11-23';
const cod = (d, nivel) => G.revisar(d).alertas.filter(a => !nivel || a.nivel === nivel).map(a => a.codigo);
// Despacho completo y correcto, base de las pruebas
const base = (cambios = {}) => Object.assign(G.despachoVacio(HOY), {
  nombre: 'Prueba', tipo: 1, dirOrigen: 'Calle Uno 100', cmnaOrigen: 'Maipú', dirDest: 'Calle Dos 200', cmnaDest: 'Rancagua',
  rutTrans: '76.123.456-0', rutChofer: '12.345.678-5', nombreChofer: 'Rosa Fuentes', patente: 'KXTR42',
  items: [{ nombre: 'Tablero', desc: '', cant: '10', unidad: 'UN', precio: '8990', peso: '100', volumen: '' }]
}, cambios);

// Utilidades
t('fechas válidas e imposibles', () => { assert.ok(G.esFecha('2027-01-31')); assert.ok(!G.esFecha('2027-02-30')); assert.ok(!G.esFecha('31-01-2027')); });
t('horas', () => { assert.ok(G.esHora('08:30')); assert.ok(!G.esHora('24:00')); assert.ok(!G.esHora('8:30')); });
t('días entre fechas y fecha chilena', () => { assert.equal(G.diasEntre('2026-11-23', '2027-01-31'), 69); assert.equal(G.fechaCL('2027-05-01'), '01-05-2027'); assert.equal(G.sumar('2026-12-31', 1), '2027-01-01'); });
t('números con formato chileno', () => { assert.equal(G.num('12.500'), 12500); assert.equal(G.num('1.234,5'), 1234.5); assert.equal(G.num('$ 8990'), 8990); assert.equal(G.num('abc'), null); assert.equal(G.num(''), null); assert.equal(G.num('2.5'), 2.5); });

// RUT
t('dígito verificador del RUT', () => { assert.equal(G.dvRut('12345678'), '5'); assert.equal(G.dvRut('76123456'), '0'); assert.equal(G.dvRut('11111111'), '1'); });
t('RUT con K y con cero', () => { let k = null, z = null; for (let i = 10000000; i < 10000200; i++) { const d = G.dvRut(i); if (d === 'K' && !k) k = i; if (d === '0' && !z) z = i; } assert.ok(G.rutValido(k + '-k')); assert.ok(G.rutValido(z + '-0')); assert.ok(!G.rutValido(k + '-1')); });
t('RUT válido con puntos, guion o sin formato', () => { assert.ok(G.rutValido('12.345.678-5')); assert.ok(G.rutValido('123456785')); assert.ok(!G.rutValido('12.345.678-9')); assert.ok(!G.rutValido('')); assert.ok(!G.rutValido('abc')); });
t('formato de RUT', () => { assert.equal(G.formatoRut('12.345.678-5'), '12345678-5'); assert.equal(G.formatoRut(' 76123456 0 '), '76123456-0'); });

// Patente
t('patentes habituales', () => { assert.ok(G.patenteHabitual('KXTR42')); assert.ok(G.patenteHabitual('hj-4521')); assert.ok(G.patenteHabitual('KX·TR·42')); assert.ok(G.patenteHabitual('ABC123')); assert.ok(!G.patenteHabitual('12345')); assert.ok(!G.patenteHabitual('KXTR4')); });
t('limpieza de patente', () => { assert.equal(G.limpiarPatente(' kx-tr.42 '), 'KXTR42'); });

// Diagnóstico
t('diagnóstico incompleto', () => { assert.equal(G.diagnostico({}).aplica, null); });
t('boleta, feria libre y retiro en tienda quedan fuera', () => {
  assert.equal(G.diagnostico({ documento: 'boleta', traslado: 'propio' }).aplica, false);
  const f = G.diagnostico({ documento: 'guia', traslado: 'propio', feria: true }); assert.equal(f.aplica, false); assert.deepEqual(f.citas, ['14°']);
  const r = G.diagnostico({ documento: 'factura', traslado: 'retira-cliente' }); assert.equal(r.aplica, false); assert.deepEqual(r.citas, ['15°']);
});
t('flota propia o externo con datos: autogestionado', () => {
  assert.equal(G.diagnostico({ documento: 'guia', traslado: 'propio' }).modalidad, 'autogestionado');
  assert.equal(G.diagnostico({ documento: 'factura', traslado: 'externo-con-datos' }).modalidad, 'autogestionado');
});
t('externo sin datos y courier: tercerizado', () => {
  const a = G.diagnostico({ documento: 'guia', traslado: 'externo-sin-datos' }); assert.equal(a.modalidad, 'tercerizado'); assert.ok(!a.citas.includes('12°'));
  const c = G.diagnostico({ documento: 'guia', traslado: 'courier' }); assert.equal(c.modalidad, 'tercerizado'); assert.ok(c.citas.includes('12°'));
});
t('trámite sectorial: régimen especial', () => { const d = G.diagnostico({ documento: 'guia', traslado: 'propio', sectorial: true }); assert.equal(d.modalidad, 'especial'); assert.ok(d.citas.includes('11°')); });
t('todo caso que aplica recuerda informar el modelo', () => { for (const tr of ['propio', 'externo-sin-datos', 'courier']) assert.ok(G.diagnostico({ documento: 'guia', traslado: tr }).acciones.some(a => /31 de enero de 2027/.test(a))); });

// Tipos de traslado (anexo)
t('doce tipos de traslado del anexo', () => { assert.equal(G.TRASLADOS.length, 12); assert.equal(G.traslado(10).n, 'Traslado de tercerizado'); assert.equal(G.traslado(11).venta, true); assert.equal(G.traslado(12).venta, false); assert.equal(G.traslado(99), null); });

// Revisión
t('despacho completo queda listo', () => { const r = G.revisar(base()); assert.equal(r.errores, 0); assert.equal(r.avisos, 0); assert.ok(r.listo); assert.equal(G.situacion(base()), 'lista'); });
t('despacho vacío acumula los errores de fondo', () => { const c = cod(G.despachoVacio(HOY), 'error'); for (const k of ['origen', 'origen-comuna', 'destino', 'destino-comuna', 'nombreChofer-falta', 'rutChofer-falta', 'rutTrans-falta', 'patente-falta', 'sin-items']) assert.ok(c.includes(k), k); });
t('RUT inválido de chofer y transportista', () => { const c = cod(base({ rutChofer: '12345678-9', rutTrans: '1-1' }), 'error'); assert.ok(c.includes('rutChofer-forma')); assert.ok(c.includes('rutTrans-forma')); });
t('patente rara es aviso, no error', () => { const r = G.revisar(base({ patente: 'X1' })); assert.ok(r.listo); assert.ok(r.alertas.some(a => a.codigo === 'patente-forma' && a.nivel === 'aviso')); });
t('nombre de chofer incompleto es aviso', () => { assert.ok(cod(base({ nombreChofer: 'Rosa' }), 'aviso').includes('nombreChofer-forma')); });
t('datos diferidos: lista pero pendiente', () => {
  const d = base({ rutChofer: 'Diferido', nombreChofer: 'diferido', patente: 'Sin Dato' }), r = G.revisar(d);
  assert.ok(r.listo); assert.deepEqual(r.diferidos, ['nombreChofer', 'rutChofer', 'patente']); assert.equal(G.situacion(d), 'pendiente');
  assert.ok(r.alertas.some(a => a.codigo === 'diferidos'));
});
t('fecha de salida diferida', () => { const r = G.revisar(base({ fchSalida: 'Sin Dato' })); assert.ok(r.listo); assert.ok(r.diferidos.includes('fchSalida')); });
t('salida antes de la emisión es aviso', () => { assert.ok(cod(base({ fchSalida: '2026-11-20' }), 'aviso').includes('salida-antes')); });
t('hora mal escrita', () => { assert.ok(cod(base({ hraSalida: '8.30' }), 'error').includes('hora')); assert.ok(!cod(base({ hraSalida: '' })).includes('hora')); });
t('más de un día exige tipo prolongado', () => {
  assert.ok(cod(base({ fchLlegada: '2026-11-25' }), 'error').includes('prolongado-tipo'));
  const ok = base({ tipo: 11, fchLlegada: '2026-11-25', motivo: 'Distancia: 680 km' }); assert.ok(G.revisar(ok).listo);
});
t('traslado prolongado sin llegada o sin motivo', () => { const c = cod(base({ tipo: 12, items: [{ nombre: 'A', cant: '1', unidad: 'UN', precio: '', peso: '1' }] }), 'error'); assert.ok(c.includes('prolongado-llegada')); assert.ok(c.includes('prolongado-motivo')); });
t('llegada anterior a la salida', () => { assert.ok(cod(base({ fchLlegada: '2026-11-20' }), 'error').includes('llegada-antes')); });
t('entregas parciales exigen ventas por efectuar', () => { assert.ok(cod(base({ parcial: true }), 'error').includes('parcial-tipo')); assert.ok(!cod(base({ parcial: true, tipo: 2 })).includes('parcial-tipo')); });
t('venta sin precio es error', () => { assert.ok(cod(base({ items: [{ nombre: 'A', cant: '1', unidad: 'UN', precio: '', peso: '1' }] }), 'error').includes('precio-venta')); });
t('no venta sin precio pide motivo', () => {
  const it = [{ nombre: 'A', cant: '1', unidad: 'UN', precio: '', peso: '1' }];
  assert.ok(cod(base({ tipo: 5, items: it }), 'error').includes('precio-motivo'));
  assert.ok(G.revisar(base({ tipo: 5, items: it, motivo: 'De bodega a sucursal' })).listo);
});
t('líneas: nombre, cantidad y precio inválido', () => {
  const c = cod(base({ items: [{ nombre: '', cant: '0', unidad: '', precio: 'x', peso: '' }] }));
  for (const k of ['item-nombre', 'item-cantidad', 'item-unidad', 'item-precio-malo', 'peso']) assert.ok(c.includes(k), k);
});
t('líneas vacías se ignoran', () => { const d = base(); d.items.push(G.itemVacio()); assert.ok(G.revisar(d).listo); assert.equal(G.revisar(d).avisos, 0); });
t('régimen especial baja a aviso los datos de transporte', () => {
  const d = base({ sectorial: true, rutChofer: '', nombreChofer: '', patente: '', rutTrans: '', dirDest: '', cmnaDest: '' }), r = G.revisar(d);
  assert.ok(r.listo); assert.ok(r.avisos >= 4);
  assert.ok(cod(base({ sectorial: true, dirOrigen: '' }), 'error').includes('origen'));
});
t('guía tercerizada exige referencia completa', () => {
  const c = cod(base({ tipo: 10 }), 'error'); for (const k of ['gdt-ref-tipo', 'gdt-ref-folio', 'gdt-ref-fecha', 'gdt-ref-rut']) assert.ok(c.includes(k), k);
  const ok = base({ tipo: 10, items: [G.itemVacio()], ref: { tipo: '52', folio: '1234', fecha: '2026-11-22', razon: 'Completa datos de transporte', rutOtr: '77777777-7' } });
  const r = G.revisar(ok); assert.ok(r.listo); assert.ok(r.alertas.some(a => a.codigo === 'gdt-sin-detalle'));
});
t('guía tercerizada no admite diferidos ni factura', () => {
  const d = base({ tipo: 10, documento: 'factura', patente: 'Diferido', ref: { tipo: '52', folio: '1', fecha: '2026-11-22', rutOtr: '77777777-7' } }), c = cod(d, 'error');
  assert.ok(c.includes('gdt-diferidos')); assert.ok(c.includes('gdt-documento'));
});
t('referencia incompleta en una guía normal', () => { assert.ok(cod(base({ ref: { tipo: '52', folio: '', fecha: '', razon: '', rutOtr: '1-1' } })).includes('ref-incompleta')); });
t('cada alerta cita un resolutivo o el anexo', () => { for (const a of G.revisar(G.despachoVacio(HOY)).alertas) assert.ok(a.cita, a.codigo); });

// Seguimiento
t('completar datos diferidos', () => {
  const d = base({ patente: 'Diferido' });
  assert.equal(G.completar(d, { via: 'gdt', folio: '', fecha: '' }).ok, false);
  assert.equal(G.completar(d, { via: 'gdt', folio: '998', fecha: '2026-11-24' }).ok, true); assert.equal(G.situacion(d), 'completada');
  assert.equal(G.completar(base(), { via: 'interoperabilidad', fecha: '2026-11-24' }).ok, true);
  assert.equal(G.completar(base(), { via: 'otra', folio: '1', fecha: '2026-11-24' }).ok, false);
});
t('con errores es borrador', () => { assert.equal(G.situacion(base({ dirOrigen: '' })), 'borrador'); });

// Salidas
t('campos con etiquetas del anexo', () => {
  const F = G.campos(base({ rutChofer: 'diferido', patenteCarro: 'jk-2314' })), v = tag => F.find(f => f.tag === tag).valor;
  assert.equal(v('IndTraslado'), '1 · Operación constituye venta'); assert.equal(v('RUTTrans'), '76123456-0'); assert.equal(v('RUTChofer'), 'Diferido');
  assert.equal(v('Patente'), 'KXTR42'); assert.equal(v('PatenteCarro'), 'JK2314'); assert.equal(v('NmbItem'), 'Tablero'); assert.equal(v('QtyItem'), '10');
  assert.ok(/Peso: 100 kg/.test(v('DscItem')));
});
t('hoja de datos omite campos vacíos', () => { const h = G.hoja(base()); assert.ok(/\[DirOrigen\]: Calle Uno 100/.test(h)); assert.ok(!/HraSalida/.test(h)); assert.ok(!/TpoDocRef/.test(h)); });
t('mensaje al transportista solo si faltan datos', () => {
  assert.equal(G.pedirDatos(base()), '');
  const m = G.pedirDatos(base({ nombreChofer: 'Diferido', rutChofer: '', patente: 'Sin Dato' }), { nombre: 'Mi Empresa' });
  assert.ok(/Nombre del chofer/.test(m)); assert.ok(/RUT del chofer/.test(m)); assert.ok(/Patente/.test(m)); assert.ok(!/RUT del transportista/.test(m)); assert.ok(/Maipú → Rancagua/.test(m)); assert.ok(/Mi Empresa/.test(m));
});

// CSV
t('exportación CSV con BOM, punto y coma y fórmulas neutralizadas', () => {
  const csv = G.despachosCSV([base({ nombre: '=SUMA(A1)', motivo: 'uno; dos "tres"' })]);
  assert.equal(csv.charCodeAt(0), 0xfeff); const f = G.leerCSV(csv);
  assert.equal(f.length, 2); assert.equal(f[1][0], "'=SUMA(A1)"); assert.equal(f[1][f[0].indexOf('motivo')], 'uno; dos "tres"'); assert.equal(f[1][f[0].indexOf('situacion')], 'lista');
});
t('lector CSV con comas, comillas y saltos', () => { const f = G.leerCSV('a,b\r\n"x, y","lin\nea"\r\n\r\n'); assert.deepEqual(f, [['a', 'b'], ['x, y', 'lin\nea']]); });
t('libreta por CSV', () => {
  const o = G.leerLibretaCSV('Tipo;Nombre;RUT;Patente;Carro;Dirección;Comuna\nchofer;Rosa Fuentes;12.345.678-5;;;;\nvehículo;Camión;;kx-tr-42;;;\ntransportista;Ruta Larga;77777777-7;;;;\ndireccion;Bodega;;;;Calle 1;Maipú\nchofer;Malo;1-1;;;;\nbarco;x;;;;;');
  assert.equal(o.choferes.length, 1); assert.equal(o.choferes[0].rut, '12345678-5'); assert.equal(o.vehiculos[0].patente, 'KXTR42');
  assert.equal(o.transportistas.length, 1); assert.equal(o.direcciones[0].comuna, 'Maipú'); assert.equal(o.errores.length, 2);
});
t('libreta sin columna tipo o vacía', () => { assert.equal(G.leerLibretaCSV('nombre;rut\nA;1').errores.length, 1); assert.equal(G.leerLibretaCSV('').errores.length, 1); });

// Fechas clave
t('hitos con días restantes', () => { const h = G.hitos(HOY); assert.equal(h.length, 3); assert.ok(h[0].vencido); assert.equal(h[1].faltan, 69); assert.equal(h[2].faltan, 159); });
t('calendario .ics con los dos plazos futuros', () => { const c = G.ics(); assert.equal((c.match(/BEGIN:VEVENT/g) || []).length, 2); assert.ok(/DTSTART;VALUE=DATE:20270131/.test(c)); assert.ok(/DTSTART;VALUE=DATE:20270501/.test(c)); assert.ok(/\r\n/.test(c)); });

// Respaldo
t('el ejemplo es un estado válido y enseña los tres casos', () => {
  const e = G.ejemplo(HOY); assert.deepEqual(G.validarEstado(e), []);
  assert.deepEqual(e.despachos.map(G.situacion), ['lista', 'borrador', 'lista']);
  for (const c of e.choferes) assert.ok(G.rutValido(c.rut)); for (const x of e.transportistas) assert.ok(G.rutValido(x.rut)); for (const v of e.vehiculos) assert.ok(G.patenteHabitual(v.patente));
});
t('ida y vuelta por JSON', () => { const e = G.ejemplo(HOY), v = G.normalizar(JSON.parse(JSON.stringify(e))); assert.deepEqual(v.despachos.map(G.situacion), e.despachos.map(G.situacion)); assert.equal(v.choferes.length, 2); assert.equal(v.despachos[2].patenteCarro, 'JK2314'); });
t('respaldo ajeno se rechaza', () => { assert.ok(G.validarEstado(null).length); assert.ok(G.validarEstado([]).length); assert.ok(G.validarEstado({ despachos: [] }).length); assert.ok(G.validarEstado(Object.assign(G.estadoVacio(), { despachos: [{}] })).length); });
t('normalizar limpia tipos extraños', () => {
  const o = G.estadoVacio(); o.despachos = [{ id: 5, tipo: 'x', parcial: 'sí', items: [], ref: null, completado: { via: 'gdt', folio: 7, fecha: '2026-11-24' } }]; o.choferes = [null, { nombre: 5 }];
  const v = G.normalizar(o); assert.equal(v.despachos[0].tipo, 1); assert.equal(v.despachos[0].parcial, true); assert.equal(v.despachos[0].items.length, 1); assert.equal(v.despachos[0].completado.folio, '7'); assert.equal(v.choferes.length, 1); assert.equal(v.choferes[0].nombre, '5');
});

// =================== Fase 2 ===================
// Fechas y tipos escritos a mano
t('fechas en formato chileno', () => { assert.equal(G.leerFecha('02-12-2026'), '2026-12-02'); assert.equal(G.leerFecha('2/12/2026'), '2026-12-02'); assert.equal(G.leerFecha('2026-12-02'), '2026-12-02'); assert.equal(G.leerFecha('31-02-2026'), ''); assert.equal(G.leerFecha('mañana'), ''); });
t('hora con segundos (formato del XML)', () => { assert.ok(G.esHora('08:30:00')); assert.ok(!G.esHora('08:30:60')); });
t('tipo de traslado por número o por nombre', () => { assert.equal(G.leerTipo('5'), 5); assert.equal(G.leerTipo('Traslados internos'), 5); assert.equal(G.leerTipo('12 · Traslado prolongado, no venta'), 12); assert.equal(G.leerTipo('99'), null); assert.equal(G.leerTipo(''), null); });
t('documento por código o por nombre', () => { assert.equal(G.leerDocumento('52'), 'guia'); assert.equal(G.leerDocumento('Guía de despacho'), 'guia'); assert.equal(G.leerDocumento('33'), 'factura'); assert.equal(G.leerDocumento(''), 'guia'); assert.equal(G.leerDocumento('boleta'), null); });

// Carga en lote
t('la plantilla de despachos se carga sola: 2 despachos, 3 líneas', () => {
  const o = G.leerDespachosCSV(G.plantillaDespachosCSV(), HOY);
  assert.deepEqual(o.errores, []); assert.equal(o.filas, 3); assert.equal(o.despachos.length, 2);
  const [a, b] = o.despachos;
  assert.equal(a.items.length, 2); assert.equal(a.fchEmis, '2026-12-02'); assert.equal(a.rutChofer, '12345678-5'); assert.equal(G.situacion(a), 'lista');
  assert.equal(b.tipo, 5); assert.equal(b.fchSalida, 'Diferido'); assert.equal(b.patente, 'Diferido'); assert.equal(G.situacion(b), 'pendiente');
});
t('lote con encabezados DTE, coma y comillas', () => {
  const csv = 'NmbItem,QtyItem,CmnaDest,DirDest,CmnaOrigen,DirOrigen,RUTTrans,RUTChofer,NombreChofer,Patente,PrcItem,PesoKg\n"Saco cemento, 25 kg",10,Talca,Calle 1,Maipú,Bodega 2,76.123.456-0,12.345.678-5,Ana Díaz,ab-cd12,5200,250';
  const o = G.leerDespachosCSV(csv, HOY); assert.deepEqual(o.errores, []); assert.equal(o.despachos.length, 1);
  const d = o.despachos[0]; assert.equal(d.items[0].nombre, 'Saco cemento, 25 kg'); assert.equal(d.patente, 'ABCD12'); assert.equal(d.rutTrans, '76123456-0'); assert.equal(d.fchEmis, HOY);
});
t('lote: avisa tipo desconocido, fecha rara y datos que no calzan en el mismo despacho', () => {
  const csv = 'nombre;tipo;fecha emision;destino;patente;producto;cantidad\nP1;teletransporte;32-13-2026;Calle 1;KXTR42;A;1\nP1;;;Calle 2;HJ4521;B;2';
  const o = G.leerDespachosCSV(csv, HOY); assert.equal(o.despachos.length, 1); assert.equal(o.despachos[0].items.length, 2);
  assert.equal(o.avisos.length, 4); assert.ok(o.avisos.some(a => /teletransporte/.test(a))); assert.ok(o.avisos.some(a => /32-13-2026/.test(a))); assert.ok(o.avisos.some(a => /dirDest/.test(a)));
});
t('lote: archivo vacío o sin columnas conocidas', () => { assert.ok(G.leerDespachosCSV('', HOY).errores.length); assert.ok(G.leerDespachosCSV('a;b\n1;2', HOY).errores.length); });
t('lote: una fila sin nombre es un despacho propio', () => { const o = G.leerDespachosCSV('producto;cantidad;destino\nA;1;X\nB;2;Y', HOY); assert.equal(o.despachos.length, 2); assert.equal(o.despachos[1].nombre, 'Despacho de la fila 3'); });
t('lote: fórmulas de planilla no se ejecutan al exportar', () => { const d = base({ nombre: '=HYPERLINK("x")' }); assert.ok(G.despachosCSV([d]).includes("'=HYPERLINK")); });

// Rutas frecuentes
t('ruta: guarda lo fijo y deja en blanco cantidades y pesos', () => {
  const r = G.rutaDesde(base({ patenteCarro: 'JK2314' }), 'Maipú → Rancagua');
  assert.equal(r.nombre, 'Maipú → Rancagua'); assert.equal(r.patente, 'KXTR42'); assert.equal(r.items[0].cant, ''); assert.equal(r.items[0].peso, ''); assert.equal(r.items[0].precio, '8990');
  const d = G.despachoDesdeRuta(r, '2026-12-03');
  assert.equal(d.fchEmis, '2026-12-03'); assert.equal(d.fchSalida, '2026-12-03'); assert.equal(d.patenteCarro, 'JK2314'); assert.equal(d.nombre, 'Maipú → Rancagua · 03-12-2026'); assert.notEqual(d.id, r.id);
  assert.ok(cod(d, 'error').includes('item-cantidad'));
  d.items[0].cant = '5'; d.items[0].peso = '50'; assert.equal(G.situacion(d), 'lista');
});
t('ruta con datos diferidos los conserva', () => { const r = G.rutaDesde(base({ patente: 'Diferido', rutChofer: 'Sin Dato', nombreChofer: 'Diferido' })); const d = G.despachoDesdeRuta(r, HOY); d.items[0].cant = '1'; assert.equal(G.situacion(d), 'pendiente'); });
t('rutas viajan en el respaldo y los respaldos viejos (sin rutas) se aceptan', () => {
  const e = G.ejemplo(HOY); e.rutas = [G.rutaDesde(e.despachos[0], 'R1')];
  const v = G.normalizar(JSON.parse(JSON.stringify(e))); assert.equal(v.rutas.length, 1); assert.equal(v.rutas[0].nombre, 'R1');
  const viejo = JSON.parse(JSON.stringify(G.ejemplo(HOY))); delete viejo.rutas; assert.deepEqual(G.validarEstado(viejo), []); assert.deepEqual(G.normalizar(viejo).rutas, []);
  assert.ok(G.validarEstado(Object.assign(G.estadoVacio(), { rutas: 'x' })).length);
});

// Informe mensual
t('informe del mes: conteos, abiertos, errores frecuentes y días para completar', () => {
  const e = G.ejemplo('2026-11-10'); const otro = base({ fchEmis: '2026-10-30', fchSalida: '2026-10-30' });
  const dif = base({ nombre: 'Dif', fchEmis: '2026-11-12', fchSalida: '2026-11-12', patente: 'Diferido' });
  const comp = base({ nombre: 'Comp', fchEmis: '2026-11-05', fchSalida: '2026-11-05', rutChofer: 'Diferido' }); G.completar(comp, { via: 'gdt', folio: '9', fecha: '2026-11-08' });
  const L = e.despachos.concat([otro, dif, comp]);
  assert.deepEqual(G.mesesCon(L), ['2026-11', '2026-10']);
  const I = G.informe(L, '2026-11', '2026-11-20');
  assert.equal(I.total, 5); assert.equal(I.titulo, 'noviembre de 2026');
  assert.deepEqual(I.situacion, { borrador: 1, pendiente: 1, lista: 2, completada: 1 });
  assert.equal(I.abiertos.length, 1); assert.equal(I.abiertos[0].dias, 8); assert.deepEqual(I.abiertos[0].faltan, ['patente']);
  assert.equal(I.diasCompletar, 3); assert.deepEqual(I.completadas, [{ nombre: 'gdt', cantidad: 1 }]);
  assert.equal(I.conDiferidos, 3);
  assert.ok(I.errores.some(x => x.codigo === 'prolongado-tipo'));
  assert.equal(I.rutas[0].nombre, 'Maipú → Rancagua');
  assert.equal(I.pesoKg, 520 + 610 + 750 + 100 + 100);
});
t('informe de un mes sin despachos', () => { const I = G.informe([], '2026-01', HOY); assert.equal(I.total, 0); assert.equal(I.diasCompletar, null); });

// Largos del formato DTE
t('largos del formato DTE: nombre del chofer, comuna y unidad', () => {
  const c = cod(base({ nombreChofer: 'María de los Ángeles Fernández Valenzuela', cmnaDest: 'Pedro Aguirre Cerda Norte Uno', items: [{ nombre: 'X', cant: '1', unidad: 'PALLET', precio: '1', peso: '1' }] }), 'aviso');
  assert.ok(c.includes('largo-nombreChofer')); assert.ok(c.includes('largo-cmnaDest')); assert.ok(c.includes('item-unidad-largo'));
  assert.ok(!cod(base(), 'aviso').some(x => /^largo/.test(x)));
});
t('códigos 10 a 12: aviso de que el XSD vigente llega al 9', () => { const d = base({ tipo: 12, fchLlegada: G.sumar(HOY, 2), motivo: 'Distancia' }); assert.ok(cod(d, 'info').includes('codigo-nuevo')); assert.ok(!cod(base(), 'info').includes('codigo-nuevo')); });

// Lector de XML
t('XML: lector mínimo con espacios de nombres, CDATA, entidades y comentarios', () => {
  const r = G.parsearXML('<?xml version="1.0"?><!-- c --><a:R xmlns:a="u"><a:B x="1 &amp; 2">T &lt;1&gt; &#241;</a:B><C><![CDATA[<no>]]></C><D/></a:R>');
  const R = r.c[0]; assert.equal(R.n, 'R'); assert.equal(R.c[0].t, 'T <1> ñ'); assert.equal(R.c[0].a.x, '1 & 2'); assert.equal(R.c[1].t, '<no>'); assert.equal(R.c[2].n, 'D');
});
t('XML: mal formado, DOCTYPE y archivo vacío se rechazan con mensaje', () => {
  assert.throws(() => G.parsearXML('<a><b></a>'), /mal formado/); assert.throws(() => G.parsearXML('<a>'), /incompleto/);
  assert.throws(() => G.parsearXML('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><a>&e;</a>'), /DOCTYPE/); assert.throws(() => G.parsearXML('hola'), /no contiene/);
  assert.ok(G.leerXMLDTE('<a><b></a>', HOY).errores.length); assert.ok(G.leerXMLDTE('<Otro/>', HOY).errores[0].includes('Documento'));
});
t('XML de ejemplo: la guía cumple y la factura no', () => {
  const r = G.leerXMLDTE(G.xmlEjemplo(HOY), HOY); assert.deepEqual(r.errores, []); assert.equal(r.documentos.length, 2);
  const [g, f] = r.documentos;
  assert.equal(g.tipoDTE, 52); assert.equal(g.folio, '1041'); assert.ok(g.cumple, JSON.stringify(g.alertas)); assert.equal(g.despacho.hraSalida, '08:30'); assert.equal(g.despacho.items[0].peso, '520'); assert.equal(g.despacho.items[1].peso, '610');
  assert.equal(g.emisor.rut, '76123456-0'); assert.equal(g.receptor.nombre, 'Ferretería El Roble Ltda. (ejemplo)');
  assert.equal(f.tipoDTE, 33); assert.ok(!f.cumple);
  const c = f.alertas.map(a => a.codigo);
  for (const k of ['xml-monto', 'xml-factura-sin-ind', 'nombreChofer-falta', 'rutChofer-falta', 'patente-falta', 'prolongado-tipo']) assert.ok(c.includes(k), k);
  assert.equal(f.despacho.ref.tipo, '801'); assert.equal(f.despacho.ref.folio, 'OC-5531');
});
t('XML: guía sin IndTraslado ni Transporte', () => {
  const x = '<DTE><Documento><Encabezado><IdDoc><TipoDTE>52</TipoDTE><Folio>7</Folio><FchEmis>2026-11-20</FchEmis></IdDoc><Emisor><RUTEmisor>76123456-0</RUTEmisor><RznSoc>E</RznSoc><DirOrigen>A 1</DirOrigen><CmnaOrigen>Maipú</CmnaOrigen></Emisor><Receptor><RUTRecep>11111111-1</RUTRecep><RznSocRecep>R</RznSocRecep><DirRecep>Calle 9</DirRecep></Receptor></Encabezado><Detalle><NroLinDet>1</NroLinDet><NmbItem>X</NmbItem><QtyItem>1</QtyItem><PrcItem>10</PrcItem><MontoItem>10</MontoItem></Detalle></Documento></DTE>';
  const d = G.leerXMLDTE(x, HOY).documentos[0], c = d.alertas.map(a => a.codigo);
  assert.ok(c.includes('xml-indtraslado')); assert.ok(c.includes('xml-sin-transporte')); assert.ok(c.includes('xml-dir-receptor')); assert.ok(!c.includes('tipo'));
  assert.ok(d.alertas.find(a => a.codigo === 'salida').texto.includes('FchSalida'));
});
t('XML: datos diferidos y tipo 10 se reconocen', () => {
  const x = '<DTE><Documento><Encabezado><IdDoc><TipoDTE>52</TipoDTE><Folio>8</Folio><FchEmis>2026-11-20</FchEmis><IndTraslado>2</IndTraslado></IdDoc><Emisor><DirOrigen>A 1</DirOrigen><CmnaOrigen>Maipú</CmnaOrigen></Emisor><Transporte><Patente>Diferido</Patente><RUTTrans>77777777-7</RUTTrans><Chofer><RUTChofer>Diferido</RUTChofer><NombreChofer>Sin Dato</NombreChofer></Chofer><DirDest>B 2</DirDest><CmnaDest>Talca</CmnaDest><FchSalida>2026-11-20</FchSalida></Transporte></Encabezado><Detalle><NroLinDet>1</NroLinDet><NmbItem>X</NmbItem><DscItem>Peso: 12,5 kg</DscItem><QtyItem>1</QtyItem><UnmdItem>KG</UnmdItem><PrcItem>10</PrcItem><MontoItem>10</MontoItem></Detalle></Documento></DTE>';
  const d = G.leerXMLDTE(x, HOY).documentos[0]; assert.ok(d.cumple, JSON.stringify(d.alertas)); assert.deepEqual(d.diferidos.sort(), ['nombreChofer', 'patente', 'rutChofer']); assert.equal(d.despacho.items[0].peso, '12,5');
});
t('XML en ISO-8859-1 se decodifica bien', () => {
  const s = '<?xml version="1.0" encoding="ISO-8859-1"?><a>Maipú Ñuñoa</a>', bytes = Uint8Array.from(Array.from(s, ch => ch.charCodeAt(0)));
  assert.equal(G.parsearXML(G.decodificar(bytes)).c[0].t, 'Maipú Ñuñoa');
  assert.equal(G.parsearXML(G.decodificar(new TextEncoder().encode('<a>Ñuñoa</a>'))).c[0].t, 'Ñuñoa');
});
t('agregar desde XML no duplica folios', () => {
  const e = G.estadoVacio(), docs = G.leerXMLDTE(G.xmlEjemplo(HOY), HOY).documentos;
  assert.deepEqual(G.agregarDesdeXML(e, docs), { agregados: 2, repetidos: 0 }); assert.deepEqual(G.agregarDesdeXML(e, docs), { agregados: 0, repetidos: 2 });
  assert.equal(e.despachos[0].folio, '1041'); assert.equal(G.situacion(e.despachos[0]), 'lista'); assert.equal(G.situacion(e.despachos[1]), 'borrador');
  assert.deepEqual(G.validarEstado(JSON.parse(JSON.stringify(e))), []);
});

console.log(`\n${n} pruebas pasaron`);
