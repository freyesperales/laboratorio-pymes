import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const M = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nom, f) => { f(); n++; console.log('ok', nom); };

t('normalizar quita tildes y signos', () => assert.equal(M.normalizar('¿Cuánto CUESTA, el envío?'), 'cuanto cuesta el envio'));
t('tokens usan sinónimos', () => { assert.ok(M.tokens('¿A qué hora cierran?').includes('horario')); assert.ok(M.tokens('despachan a domicilio').includes('envio')); });
t('ficha vacía no genera entradas ni explota', () => { const f = M.ficha(); assert.equal(M.entradas(f).length, 0); assert.equal(M.cobertura(f).porcentaje, 0); });
t('horario agrupa días iguales', () => {
  const f = M.ejemplo();
  assert.equal(M.horarioTexto(f), 'Lunes a viernes: 09:00–18:30; sábado: 10:00–14:00; domingo: cerrado. Domingos y feriados cerrado.');
});
t('horario sin días abiertos queda vacío', () => assert.equal(M.horarioTexto(M.ficha()), ''));
t('pagos en lista natural', () => assert.equal(M.pagosTexto(M.ejemplo()), 'Aceptamos efectivo, transferencia y tarjeta de débito.'));
t('ejemplo cubre 100% de las preguntas típicas', () => { const c = M.cobertura(M.ejemplo()); assert.equal(c.porcentaje, 100); assert.equal(c.faltan.length, 0); });
t('sin contacto baja la cobertura y sugiere el paso', () => {
  const f = M.ejemplo(); f.negocio.correo = ''; f.negocio.web = ''; const c = M.cobertura(f);
  assert.equal(c.faltan.length, 1); assert.equal(c.faltan[0].id, 'contacto'); assert.ok(c.porcentaje < 100); assert.match(c.pasos[0], /WhatsApp/);
});
t('buscar responde horario', () => { const r = M.buscar(M.entradas(M.ejemplo()), 'hola, a que hora cierran hoy?'); assert.ok(r.respondida); assert.equal(r.mejor.id, 'horario'); });
t('buscar responde envío y retiro distinto', () => {
  const e = M.entradas(M.ejemplo());
  assert.equal(M.buscar(e, 'hacen despacho a domicilio').mejor.id, 'envio');
  assert.equal(M.buscar(e, 'puedo retirar en tienda').mejor.id, 'retiro');
});
t('buscar precio de producto', () => { const r = M.buscar(M.entradas(M.ejemplo()), 'cuanto vale la torta de chocolate'); assert.ok(r.respondida); assert.equal(r.mejor.id, 'prod0'); });
t('pregunta propia por palabras clave', () => { const r = M.buscar(M.entradas(M.ejemplo()), 'tienen algo para celiacos'); assert.ok(r.respondida); assert.equal(r.mejor.id, 'faq0'); });
t('pregunta sin respuesta queda como hueco', () => { const r = M.buscar(M.entradas(M.ejemplo()), 'aceptan mascotas en el local'); assert.equal(r.respondida, false); });
t('pregunta vacía o solo palabras vacías', () => { assert.equal(M.buscar(M.entradas(M.ejemplo()), '   ').respondida, false); assert.equal(M.buscar(M.entradas(M.ejemplo()), 'hola buenas').respondida, false); });
t('documento incluye nombre y respuestas', () => { const d = M.documento(M.ejemplo()); assert.match(d, /# Documento de conocimiento: Café Ejemplo/); assert.match(d, /Calle Falsa 123/); });
t('respuestas rápidas con atajos únicos', () => {
  const r = M.respuestasRapidas(M.ejemplo()); const a = r.map(x => x.atajo);
  assert.equal(new Set(a).size, a.length); assert.ok(a.includes('/hola') && a.includes('/horario'));
});
t('FAQ html escapa caracteres', () => {
  const f = M.ejemplo(); f.faq.push({ p: '¿<b>Hola</b> & "chao"?', r: 'x < y', claves: '' });
  const h = M.faqHtml(f); assert.ok(!h.includes('<b>Hola')); assert.match(h, /&lt;b&gt;Hola/);
});
t('JSON-LD válido, sin </script> inyectable', () => {
  const f = M.ejemplo(); f.faq.push({ p: 'p', r: '</script><img>', claves: '' });
  const s = M.jsonld(f); assert.equal((s.match(/<\/script>/g) || []).length, 1);
  const j = JSON.parse(s.replace(/^<script[^>]*>\n/, '').replace(/\n<\/script>\n$/, ''));
  assert.equal(j[0]['@type'], 'LocalBusiness'); assert.equal(j[1]['@type'], 'FAQPage'); assert.equal(j[0].openingHoursSpecification.length, 6);
});
t('texto para Google cuenta caracteres', () => { const g = M.textoFichaGoogle(M.ejemplo()); assert.equal(g.largo, g.texto.length); assert.ok(g.largo > 50); });
t('JSON ida y vuelta', () => { const f = M.ejemplo(); assert.deepEqual(M.importarTodo(M.exportarTodo(f)), f); });
t('importar JSON inválido falla con mensaje', () => { assert.throws(() => M.importarTodo('no'), /JSON válido/); assert.throws(() => M.importarTodo('{"a":1}'), /respaldo de Cerebro/); });
t('CSV ida y vuelta con comas, comillas y saltos', () => {
  const f = M.ficha({ faq: [{ p: '¿Hola, "qué" tal?', r: 'línea1\nlínea2, ok', claves: 'a b' }] });
  const back = M.faqDeCSV(M.faqACSV(f)); assert.equal(back.length, 1); assert.equal(back[0].p, f.faq[0].p); assert.equal(back[0].r, f.faq[0].r);
});
t('CSV con CRLF y sin columna de claves', () => { const r = M.faqDeCSV('pregunta,respuesta\r\nhola,chao\r\n'); assert.equal(r[0].r, 'chao'); assert.equal(r[0].claves, ''); });
t('CSV inválido falla', () => { assert.throws(() => M.faqDeCSV(''), /vacío/); assert.throws(() => M.faqDeCSV('a,b\n1,2'), /Falta la columna/); });
console.log(`\n${n} pruebas pasaron`);
