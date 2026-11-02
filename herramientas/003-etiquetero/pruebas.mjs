import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const E = createRequire(import.meta.url)('./logica.js');

// normalización
assert.equal(E.normalizar('Oferta de Verano!'), 'oferta_de_verano');
assert.equal(E.normalizar('Spring-Sale'), E.normalizar('spring_sale'));
assert.equal(E.normalizar('Promoción Año Nuevo'), 'promocion_ano_nuevo');
assert.equal(E.normalizar(null), '');
assert.equal(E.normalizarFuente('FB'), 'facebook');
assert.equal(E.normalizarFuente('Insta'), 'instagram');
assert.equal(E.normalizarFuente('Correo'), 'email');
assert.equal(E.normalizarFuente('mi boletín'), 'mi_boletin');

// construcción básica
let r = E.construir({ url: 'tutienda.com/oferta', fuente: 'FB', medio: 'Social', campana: 'Oferta Verano' });
assert.deepEqual(r.errores, []);
assert.equal(r.enlace, 'https://tutienda.com/oferta?utm_source=facebook&utm_medium=social&utm_campaign=oferta_verano');
assert.ok(r.avisos.some(a => a.includes('facebook')));

// conserva parámetros y ancla existentes
r = E.construir({ url: 'https://x.com/p?id=7#precios', fuente: 'instagram', medio: 'social', campana: 'a', contenido: 'Reel 1' });
assert.equal(r.enlace, 'https://x.com/p?id=7&utm_source=instagram&utm_medium=social&utm_campaign=a&utm_content=reel_1#precios');

// reemplaza utm previas
r = E.construir({ url: 'https://x.com/?utm_source=viejo&utm_campaign=viejo', fuente: 'google', medio: 'cpc', campana: 'nueva', termino: 'zapatos rojos' });
assert.equal(r.enlace, 'https://x.com/?utm_source=google&utm_medium=cpc&utm_campaign=nueva&utm_term=zapatos_rojos');
assert.ok(r.avisos.some(a => a.includes('reemplacé')));

// errores
r = E.construir({ url: '', fuente: '', medio: '', campana: '' });
assert.equal(r.errores.length, 4);
assert.ok(E.construir({ url: 'hola mundo', fuente: 'a', medio: 'b', campana: 'c' }).errores[0].includes('espacios'));
assert.ok(E.construir({ url: 'javascript:alert(1)', fuente: 'a', medio: 'b', campana: 'c' }).errores.length > 0);
assert.ok(E.construir({ url: 'ftp://x.com', fuente: 'a', medio: 'b', campana: 'c' }).errores.length > 0);
assert.ok(E.construir({ url: 'tienda', fuente: 'a', medio: 'b', campana: 'c' }).errores[0].includes('dominio'));
assert.equal(E.construir({ url: 'localhost:3000/x', fuente: 'a', medio: 'b', campana: 'c' }).errores.length, 0);

// historial: duplicado exacto y nombres casi iguales
const base = { url: 'https://x.com/', fuente: 'facebook', medio: 'social', campana: 'oferta_verano', contenido: '', termino: '' };
assert.ok(E.revisarHistorial(base, [base]).some(a => a.includes('exactamente')));
const casi = { ...base, campana: 'ofertaverano' };
assert.ok(E.revisarHistorial(casi, [base]).some(a => a.includes('dos cosas distintas')));
assert.deepEqual(E.revisarHistorial({ ...base, campana: 'otra' }, [base]), []);

// resumen
const h = [base, { ...base, fuente: 'instagram' }, { ...base, campana: 'navidad' }];
const s = E.resumen(h);
assert.equal(s.length, 2); assert.equal(s[1].campana, 'oferta_verano'); assert.deepEqual(s[1].fuentes, ['facebook', 'instagram']);

// CSV ida y vuelta, con comas y comillas
const e1 = { fecha: '2026-11-02', url: 'https://x.com/a?b=1,2', fuente: 'google', medio: 'cpc', campana: 'c', contenido: 'u', termino: 'k', enlace: 'https://x.com/a?b=1%2C2&utm_source=google' };
const csv = E.aCsv([e1]);
const p = E.parseCsv('﻿' + csv);
assert.deepEqual(p.errores, []);
assert.equal(p.entradas.length, 1);
assert.equal(p.entradas[0].url, 'https://x.com/a?b=1,2');
assert.equal(p.entradas[0].fuente, 'google');
assert.equal(p.entradas[0].fecha, '2026-11-02');
assert.ok(E.parseCsv('hola').errores[0].includes('No reconozco'));
assert.ok(E.parseCsv('').errores.length);
const mal = E.parseCsv('url,fuente,medio,campana\r\nhttps://x.com,a,b,c\r\n,a,b,c');
assert.equal(mal.entradas.length, 1); assert.equal(mal.errores.length, 1); assert.ok(mal.errores[0].startsWith('Fila 3'));

console.log('Todas las pruebas pasan.');
