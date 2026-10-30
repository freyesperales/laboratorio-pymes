import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const R = createRequire(import.meta.url)('./logica.js');

// Estados con cadencia 2/5/10
const base = { nombre: 'Ana Pérez', ultimo: '2026-10-20', toques: 0 };
assert.equal(R.estado(base, '2026-10-21').clave, 'pendiente');
assert.equal(R.estado(base, '2026-10-22').clave, 'hoy');
let e = R.estado(base, '2026-10-25');
assert.equal(e.clave, 'atrasado'); assert.equal(e.diasTarde, 3); assert.equal(e.proximo, '2026-10-22');
assert.equal(R.estado({ ...base, toques: 1 }, '2026-10-25').clave, 'hoy');
assert.equal(R.estado({ ...base, toques: 2 }, '2026-10-30').clave, 'hoy');
assert.equal(R.estado({ ...base, toques: 3 }, '2026-12-30').clave, 'enfriado');
assert.equal(R.estado({ ...base, resultado: 'ganado' }, '2026-12-30').clave, 'ganado');
assert.equal(R.estado({ ...base, ultimo: '2026-02-31' }, '2026-10-30').clave, 'error');
// cruce de mes y año
assert.equal(R.estado({ ultimo: '2026-12-30', toques: 1 }, '2027-01-04').clave, 'hoy');

// Orden: atrasado (más tarde primero) < hoy < pendiente < enfriado
const lista = [
  { nombre: 'A', ultimo: '2026-10-29', toques: 0 }, // pendiente
  { nombre: 'B', ultimo: '2026-10-28', toques: 0 }, // hoy
  { nombre: 'C', ultimo: '2026-10-20', toques: 0 }, // atrasado 8
  { nombre: 'D', ultimo: '2026-10-26', toques: 0 }, // atrasado 2
  { nombre: 'E', ultimo: '2026-09-01', toques: 3 }, // enfriado
];
assert.deepEqual(R.ordenar(lista, '2026-10-30').map(x => x.c.nombre), ['C', 'D', 'B', 'A', 'E']);

// Teléfonos
assert.equal(R.telefono('+56 9 9996 8482'), '56999968482');
assert.equal(R.telefono('00 34 612 345 678'), '34612345678');
assert.equal(R.telefono('612 345 678', '34'), '34612345678');
assert.equal(R.telefono('34612345678', '34'), '34612345678');
assert.equal(R.telefono('123'), '');
assert.equal(R.telefono(''), '');

// Mensajes: cambian según el toque
assert.match(R.mensaje({ nombre: 'Ana Pérez', tema: 'la cotización', toques: 0 }), /^Hola Ana, .*la cotización/);
assert.match(R.mensaje({ nombre: 'Ana', tema: 'x', toques: 1 }), /retomo/);
assert.match(R.mensaje({ nombre: 'Ana', tema: 'x', toques: 9 }), /último mensaje/);
assert.match(R.mensaje({ nombre: '', tema: '', toques: 0 }), /^Hola, .*lo que hablamos/);
const url = R.enlaceWa({ telefono: '+56 9 1234 5678' }, 'Hola ñandú & más');
assert.ok(url.startsWith('https://wa.me/56912345678?text='));
assert.equal(decodeURIComponent(url.split('text=')[1]), 'Hola ñandú & más');
assert.equal(R.enlaceWa({ telefono: 'abc' }, 'x'), '');

// CSV ida y vuelta, con comillas, punto y coma y saltos de línea
const orig = [{ nombre: 'Luis "El Jefe"; SA', telefono: '+34 612 345 678', tema: 'reforma\ncocina', ultimo: '2026-10-01', toques: 2, resultado: '' }];
const rt = R.parseCsv('﻿' + R.aCsv(orig));
assert.deepEqual(rt.errores, []); assert.deepEqual(rt.contactos, orig);
// Separador coma y errores por fila
const p = R.parseCsv('nombre,ultimo,tema\nAna,2026-10-01,cotización\n,2026-10-01,x\nBeto,31/10/2026,y\n');
assert.equal(p.contactos.length, 1); assert.equal(p.errores.length, 2);
assert.match(p.errores[1], /Beto/);
assert.equal(R.parseCsv('foo,bar\n1,2').contactos.length, 0);
assert.equal(R.parseCsv('').errores.length, 1);
console.log('Retoma: todas las pruebas pasan');
