import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const L = require('./logica.js');
const cerca = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

// Caso simple: costo 100, margen 40 %, sin IVA ni comisiones => 166,67
let r = L.precioParaMargen({ costo: 100, margen: 40, iva: 0, comision: 0, otros: 0, descuento: 0, envio: 0, comisionFija: 0 });
cerca(r.precioLista, 166.67); cerca(r.margen, 40);

// Con IVA 19 %: el margen se calcula sobre el neto, el cliente paga neto * 1,19
r = L.precioParaMargen({ costo: 100, margen: 40, iva: 19, comision: 0, otros: 0, descuento: 0, envio: 0, comisionFija: 0 });
cerca(r.neto, 166.67); cerca(r.precioLista, 198.33);

// Ida y vuelta con todo activado: el margen resultante debe ser el pedido
const o = { costo: 12.5, margen: 30, iva: 21, comision: 3.5, comisionFija: 0.25, otros: 1, descuento: 15, envio: 2 };
r = L.precioParaMargen(o);
const v = L.margenDesdePrecio({ ...o, precio: r.precioLista });
cerca(v.margen, 30, 1e-6); cerca(v.ganancia, r.ganancia, 1e-6);
assert.ok(r.ganancia > 0);

// Precio redondeado hacia arriba nunca baja el margen
const red = L.redondear(r.precioLista, '90');
assert.ok(red >= r.precioLista && red - r.precioLista < 1);
assert.equal(Math.round((red % 1) * 100), 90);
assert.equal(L.redondear(10.2, 'entero'), 11);
assert.equal(L.redondear(10, 'entero'), 10);
cerca(L.redondear(10.95, '99'), 11.99 - 1 + 0, 1); 
assert.ok(L.margenDesdePrecio({ ...o, precio: red }).margen >= 30);

// Se vende con pérdida
const p = L.margenDesdePrecio({ costo: 100, iva: 21, comision: 5, precio: 110 });
assert.ok(p.ganancia < 0 && p.margen < 0);

// Errores
assert.throws(() => L.precioParaMargen({ costo: 10, margen: 70, iva: 21, comision: 20, otros: 10 }), /no hay precio/);
assert.throws(() => L.precioParaMargen({ costo: 10, margen: 10, descuento: 100 }), /descuento/);
assert.throws(() => L.margenDesdePrecio({ costo: 10, precio: 0 }), /mayor que cero/);

// Coma decimal
cerca(L.num('12,5'), 12.5); assert.equal(L.num('abc'), 0);
console.log('Todas las pruebas pasaron.');
