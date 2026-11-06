import { createRequire } from 'module';
import assert from 'assert';
const A = createRequire(import.meta.url)('./logica.js');
let n = 0; const t = (nombre, f) => { f(); n++; console.log('ok', nombre); };

t('rellena variables', () => {
  const r = A.rellenar('Hola de {negocio}, {horario}', { negocio: 'Café Sol', horario: 'L-V 9 a 18' });
  assert.equal(r.texto, 'Hola de Café Sol, L-V 9 a 18'); assert.deepEqual(r.faltan, []);
});
t('marca lo que falta, sin duplicar', () => {
  const r = A.rellenar('{horario} y {horario} en {direccion}', { horario: '  ' });
  assert.deepEqual(r.faltan, ['horario', 'direccion']);
  assert.ok(r.texto.includes('[completa: horario]'));
});
t('no interpreta HTML ni variables desconocidas como código', () => {
  const r = A.rellenar('{x}', { x: '<b>' }); assert.ok(r.faltan.includes('x') || r.texto === '<b>');
});
t('plantillas por rubro incluyen las generales', () => {
  const b = A.plantillasDe('belleza').map(p => p.id);
  assert.ok(b.includes('hola') && b.includes('cita') && !b.includes('menu'));
});
t('todos los rubros caben en el límite de 50', () => {
  Object.keys(A.RUBROS).forEach(r => assert.ok(A.plantillasDe(r).filter(p => p.tipo === 'rapida').length <= A.LIMITE));
});
t('atajos de plantillas únicos por rubro y válidos', () => {
  Object.keys(A.RUBROS).forEach(r => {
    const s = A.plantillasDe(r).filter(p => p.tipo === 'rapida').map(p => p.atajo);
    assert.equal(new Set(s).size, s.length, r);
    s.forEach(x => assert.equal(A.normalizarAtajo(x), x));
  });
});
t('textos de plantilla usan solo variables conocidas', () => {
  A.PLANTILLAS.forEach(p => (p.texto.match(/\{(\w+)\}/g) || []).forEach(v => assert.ok(A.CAMPOS[v.slice(1, -1)], p.id + ' ' + v)));
});
t('normaliza atajos', () => {
  assert.equal(A.normalizarAtajo('/Ubicación aquí!'), 'ubicacionaqui');
  assert.equal(A.normalizarAtajo(null), '');
});
t('valida repetidos, vacíos y exceso', () => {
  const e = [{ atajo: 'a', texto: 'x', activo: true }, { atajo: 'a', texto: 'y', activo: true }, { atajo: '', texto: 'z', activo: true }, { atajo: 'b', texto: ' ', activo: true }, { atajo: 'c', texto: 'no', activo: false }];
  assert.equal(A.validar(e).length, 3);
  const mucho = Array.from({ length: 51 }, (_, i) => ({ atajo: 'k' + i, texto: 'x', activo: true }));
  assert.ok(A.validar(mucho).some(p => p.includes('máximo')));
  assert.deepEqual(A.validar([{ atajo: 'ok', texto: 'x', activo: true }]), []);
});
t('exporta texto sin bienvenida ni inactivas', () => {
  const s = A.exportarTexto([{ tipo: 'rapida', atajo: 'a', texto: 'uno', activo: true }, { tipo: 'bienvenida', atajo: '', texto: 'b', activo: true }, { tipo: 'rapida', atajo: 'c', texto: 'x', activo: false }]);
  assert.equal(s, '/a\nuno');
});
t('CSV escapa comillas y saltos', () => {
  const c = A.aCsv([{ tipo: 'rapida', atajo: 'a', texto: 'dijo "hola"\nadiós', activo: true }]);
  assert.ok(c.includes('"dijo ""hola""\nadiós"'));
});
console.log(n + ' pruebas pasaron');
