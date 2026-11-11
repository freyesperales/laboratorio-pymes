/* Cerebro Pyme · lógica pura (sin DOM). Navegador (global CerebroPyme) y Node. */
(function (root) {
  'use strict';

  var DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var PAGOS = ['Efectivo', 'Transferencia', 'Tarjeta de débito', 'Tarjeta de crédito', 'Enlace de pago', 'Mercado Pago', 'Bizum'];

  var PARO = ('a al algo de del el la las lo los un una unos unas y o u en es son se que por para con sin su sus mi mis tu tus ' +
    'me te le les nos ya hay si no pero como mas muy este esta esto ese esa eso ser estar tener tienen tiene tienes ' +
    'puedo puede pueden quiero quisiera queria saber hola buenas buenos dias tardes noches favor gracias ' +
    'ustedes usted vosotros ahi aqui alli cual cuales quien').split(' ');

  // Grupos de sinónimos: cada palabra se reduce a su palabra clave.
  var GRUPOS = {
    horario: 'horario horarios hora horas abren abre abrir abierto abiertos abierta cierran cierra cerrar cerrado atienden atiende atencion apertura cierre dias dia domingo sabado feriado feriados',
    ubicacion: 'direccion ubicacion ubicados ubicado donde queda quedan local tienda sucursal mapa llegar comuna ciudad calle',
    pago: 'pago pagos pagar pagan tarjeta tarjetas transferencia transferencias efectivo credito debito medios cuotas bizum',
    envio: 'envio envios enviar envian despacho despachos despachar delivery reparto repartos domicilio entrega entregas entregan entregar llega llegan demora demoran plazo',
    retiro: 'retiro retirar retiran recoger recojo pasar buscar',
    precio: 'precio precios cuesta cuestan costo costos valor valores vale cuanto cuanta tarifa tarifas sale',
    cambio: 'cambio cambios cambiar devolucion devoluciones devolver reembolso reembolsos retracto',
    garantia: 'garantia garantias falla fallas defecto defectuoso',
    comprobante: 'boleta boletas factura facturas comprobante comprobantes rut nif',
    contacto: 'contacto contactar whatsapp telefono fono celular correo email mail escribir llamar hablar',
    oferta: 'oferta ofertas descuento descuentos promocion promociones cupon',
    que: 'venden vende hacen hace ofrecen ofrece servicio servicios producto productos rubro'
  };
  var CANON = {};
  Object.keys(GRUPOS).forEach(function (g) { GRUPOS[g].split(' ').forEach(function (w) { CANON[w] = g; }); });

  function normalizar(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function raiz(w) {
    if (CANON[w]) return CANON[w];
    if (w.length > 4 && /es$/.test(w)) w = w.slice(0, -2); else if (w.length > 3 && /s$/.test(w)) w = w.slice(0, -1);
    return CANON[w] || w;
  }
  function tokens(s) {
    var out = [], seen = {};
    normalizar(s).split(' ').forEach(function (w) {
      if (!w || PARO.indexOf(w) >= 0 || w.length < 2) return;
      var r = raiz(w);
      if (!seen[r]) { seen[r] = 1; out.push(r); }
    });
    return out;
  }

  /* ---------- Modelo ---------- */
  function ficha(p) {
    p = p || {};
    var f = {
      negocio: Object.assign({ nombre: '', rubro: '', pais: 'Chile', descripcion: '', direccion: '', ciudad: '', whatsapp: '', web: '', correo: '' }, p.negocio),
      horarios: DIAS.map(function (d, i) { var h = (p.horarios || [])[i] || {}; return { dia: d, abierto: !!h.abierto, desde: h.desde || '09:00', hasta: h.hasta || '18:00' }; }),
      horarioNota: p.horarioNota || '',
      pagos: Array.isArray(p.pagos) ? p.pagos.slice() : [],
      pagosOtros: p.pagosOtros || '',
      envio: Object.assign({ hace: false, zonas: '', plazo: '', costo: '', retiro: false, retiroDonde: '' }, p.envio),
      politicas: Object.assign({ cambios: '', garantia: '', comprobante: '' }, p.politicas),
      productos: (p.productos || []).map(function (x) { return { nombre: String(x.nombre || ''), precio: String(x.precio || ''), desc: String(x.desc || '') }; }),
      faq: (p.faq || []).map(function (x) { return { p: String(x.p || ''), r: String(x.r || ''), claves: String(x.claves || '') }; }),
      huecos: Array.isArray(p.huecos) ? p.huecos.slice() : []
    };
    return f;
  }

  function hh(t) { return String(t || '').slice(0, 5); }
  function horarioTexto(f) {
    var grupos = [], i, h, clave, ult;
    for (i = 0; i < 7; i++) {
      h = f.horarios[i];
      clave = h.abierto ? hh(h.desde) + '–' + hh(h.hasta) : 'cerrado';
      ult = grupos[grupos.length - 1];
      if (ult && ult.clave === clave) ult.fin = i; else grupos.push({ clave: clave, ini: i, fin: i });
    }
    if (!f.horarios.some(function (x) { return x.abierto; })) return '';
    var partes = grupos.map(function (g) {
      var n = g.ini === g.fin ? DIAS[g.ini].toLowerCase() : DIAS[g.ini].toLowerCase() + ' a ' + DIAS[g.fin].toLowerCase();
      return n + ': ' + (g.clave === 'cerrado' ? 'cerrado' : g.clave);
    });
    var t = partes.join('; ');
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return t + (f.horarioNota ? '. ' + f.horarioNota.replace(/\.$/, '') : '') + '.';
  }
  function lista(arr) { if (arr.length <= 1) return arr.join(''); return arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1]; }
  function pagosTexto(f) {
    var a = f.pagos.slice(); if (f.pagosOtros.trim()) a.push(f.pagosOtros.trim());
    return a.length ? 'Aceptamos ' + lista(a.map(function (x) { return x.charAt(0).toLowerCase() + x.slice(1); })) + '.' : '';
  }
  function dirTexto(f) {
    var n = f.negocio, d = [n.direccion, n.ciudad].filter(function (x) { return x.trim(); }).join(', ');
    return d ? 'Estamos en ' + d + '.' : '';
  }
  function contactoTexto(f) {
    var n = f.negocio, a = [];
    if (n.whatsapp.trim()) a.push('WhatsApp ' + n.whatsapp.trim());
    if (n.correo.trim()) a.push('correo ' + n.correo.trim());
    if (n.web.trim()) a.push('web ' + n.web.trim());
    return a.length ? 'Puedes escribirnos por ' + lista(a) + '.' : '';
  }
  function envioTexto(f) {
    var e = f.envio, a = [];
    if (!e.hace) return '';
    a.push('Hacemos envíos' + (e.zonas.trim() ? ' a ' + e.zonas.trim() : '') + '.');
    if (e.plazo.trim()) a.push('Plazo estimado: ' + e.plazo.trim() + '.');
    if (e.costo.trim()) a.push('Costo: ' + e.costo.trim() + '.');
    return a.join(' ');
  }
  function retiroTexto(f) {
    var e = f.envio; if (!e.retiro) return '';
    return 'Puedes retirar tu pedido' + (e.retiroDonde.trim() ? ' en ' + e.retiroDonde.trim() : ' en nuestro local') + '.';
  }

  /* Entradas de conocimiento: auto-generadas desde la ficha + preguntas propias. */
  function entradas(f) {
    var out = [], n = f.negocio;
    function add(id, p, r, claves, campo) { if (r && String(r).trim()) out.push({ id: id, origen: 'auto', p: p, r: String(r).trim(), claves: claves, campo: campo }); }
    add('que', '¿Qué venden o qué servicios ofrecen?', n.descripcion, 'venden servicios productos rubro ofrecen', 'Descripción del negocio');
    add('horario', '¿Cuál es el horario de atención?', horarioTexto(f), 'horario hora abren cierran atienden abierto domingo sábado feriados', 'Horarios');
    add('ubicacion', '¿Dónde están ubicados?', dirTexto(f), 'dirección ubicación dónde queda local tienda', 'Dirección y ciudad');
    add('contacto', '¿Cómo los contacto?', contactoTexto(f), 'contacto whatsapp teléfono correo escribir', 'WhatsApp, correo o web');
    add('pago', '¿Qué medios de pago aceptan?', pagosTexto(f), 'pago pagar tarjeta transferencia efectivo cuotas', 'Medios de pago');
    add('envio', '¿Hacen envíos?', envioTexto(f), 'envío despacho delivery entrega domicilio demora plazo', 'Envíos');
    add('retiro', '¿Puedo retirar en el local?', retiroTexto(f), 'retiro retirar recoger pasar buscar', 'Retiro en local');
    add('cambio', '¿Cómo funcionan los cambios y devoluciones?', f.politicas.cambios, 'cambio devolución devolver reembolso', 'Cambios y devoluciones');
    add('garantia', '¿Tienen garantía?', f.politicas.garantia, 'garantía falla defecto', 'Garantía');
    add('comprobante', '¿Emiten boleta o factura?', f.politicas.comprobante, 'boleta factura comprobante rut', 'Boleta o factura');
    f.productos.forEach(function (x, i) {
      if (!x.nombre.trim()) return;
      var r = x.nombre.trim() + (x.precio.trim() ? ': ' + x.precio.trim() : '') + (x.desc.trim() ? '. ' + x.desc.trim() : '') + '.';
      out.push({ id: 'prod' + i, origen: 'producto', p: '¿Cuánto cuesta ' + x.nombre.trim() + '?', r: r.replace(/\.\.$/, '.'), claves: 'precio cuesta valor ' + x.nombre, campo: 'Productos' });
    });
    f.faq.forEach(function (x, i) {
      if (x.p.trim() && x.r.trim()) out.push({ id: 'faq' + i, origen: 'propia', p: x.p.trim(), r: x.r.trim(), claves: x.claves, campo: 'Preguntas propias' });
    });
    return out;
  }

  /* ---------- Búsqueda local (sin IA, sin red) ---------- */
  var UMBRAL = 2;
  function buscar(ents, pregunta) {
    var q = tokens(pregunta);
    if (!q.length) return { respondida: false, mejor: null, puntaje: 0, alternativas: [] };
    var res = ents.map(function (e) {
      var tc = tokens(e.claves), tp = tokens(e.p), tr = tokens(e.r), s = 0, m = 0;
      q.forEach(function (w) {
        if (tc.indexOf(w) >= 0) { s += 2; m++; } else if (tp.indexOf(w) >= 0) { s += 1.5; m++; } else if (tr.indexOf(w) >= 0) { s += 0.5; m += 0.5; }
      });
      return { e: e, s: s, ok: s >= UMBRAL && m / q.length >= 0.5 };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    var top = res[0], bueno = !!top && top.ok;
    return {
      respondida: bueno,
      mejor: bueno ? top.e : null,
      puntaje: top ? top.s : 0,
      alternativas: res.slice(bueno ? 1 : 0, 3).map(function (x) { return x.e; })
    };
  }

  /* Preguntas típicas de clientes: miden qué tan completa está la ficha. */
  var TIPICAS = [
    ['¿A qué hora abren?', 'horario'], ['¿Abren los domingos?', 'horario'], ['¿Dónde están?', 'ubicacion'], ['¿Cuál es su dirección?', 'ubicacion'],
    ['¿Cómo puedo pagar?', 'pago'], ['¿Aceptan tarjeta?', 'pago'], ['¿Hacen despacho a domicilio?', 'envio'], ['¿Cuánto demora el envío?', 'envio'],
    ['¿Puedo retirar en tienda?', 'retiro'], ['¿Se puede cambiar o devolver?', 'cambio'], ['¿Tienen garantía?', 'garantia'], ['¿Dan boleta o factura?', 'comprobante'],
    ['¿Cuál es su WhatsApp?', 'contacto'], ['¿Qué venden?', 'que']
  ];
  function cobertura(f) {
    var ents = entradas(f), falta = [], ok = 0;
    TIPICAS.forEach(function (t) {
      var r = buscar(ents, t[0]);
      if (r.respondida) ok++; else falta.push({ pregunta: t[0], id: t[1] });
    });
    var campos = {};
    falta.forEach(function (x) { campos[x.id] = true; });
    var ayuda = {
      horario: 'Marca los días que abres y sus horas.', ubicacion: 'Completa dirección y ciudad.', pago: 'Marca los medios de pago.',
      envio: 'Indica si haces envíos, zonas y plazo.', retiro: 'Indica si se puede retirar en el local.', cambio: 'Escribe tu política de cambios y devoluciones.',
      garantia: 'Escribe tu garantía (o «sin garantía adicional»).', comprobante: 'Indica si emites boleta o factura.', contacto: 'Agrega WhatsApp, correo o web.', que: 'Describe qué vendes en una o dos frases.'
    };
    return { total: TIPICAS.length, respondidas: ok, porcentaje: Math.round(ok / TIPICAS.length * 100), faltan: falta, pasos: Object.keys(campos).map(function (k) { return ayuda[k]; }) };
  }

  /* ---------- Salidas ---------- */
  function documento(f) {
    var n = f.negocio, ents = entradas(f), L = [];
    L.push('# Documento de conocimiento: ' + (n.nombre || 'Mi negocio'));
    L.push('Rubro: ' + (n.rubro || 'sin indicar') + ' · País: ' + n.pais);
    L.push('Instrucción sugerida: responde solo con lo que está en este documento. Si no sabes algo, di que consultarás con el equipo y ofrece el contacto.');
    L.push('');
    ents.forEach(function (e) { L.push('## ' + e.p); L.push(e.r); L.push(''); });
    return L.join('\n').trim() + '\n';
  }
  function atajo(e) { return '/' + (e.id.indexOf('prod') === 0 ? 'precio' + e.id.slice(4) : e.id.indexOf('faq') === 0 ? 'pregunta' + (+e.id.slice(3) + 1) : e.id); }
  function respuestasRapidas(f) {
    var nom = f.negocio.nombre || 'nuestro negocio';
    var ents = entradas(f).filter(function (e) { return e.origen !== 'producto'; });
    var res = [{ atajo: '/hola', texto: '¡Hola! Gracias por escribir a ' + nom + '. ¿En qué podemos ayudarte?' }];
    ents.forEach(function (e) { res.push({ atajo: atajo(e), texto: e.r }); });
    return res;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function faqHtml(f) {
    var ents = entradas(f).filter(function (e) { return e.origen !== 'producto'; });
    return '<section class="preguntas-frecuentes">\n  <h2>Preguntas frecuentes</h2>\n' + ents.map(function (e) {
      return '  <details>\n    <summary>' + esc(e.p) + '</summary>\n    <p>' + esc(e.r) + '</p>\n  </details>';
    }).join('\n') + '\n</section>\n';
  }
  var ISO = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function jsonld(f) {
    var n = f.negocio, ents = entradas(f).filter(function (e) { return e.origen !== 'producto'; });
    var g = [];
    var local = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: n.nombre || 'Mi negocio' };
    if (n.descripcion.trim()) local.description = n.descripcion.trim();
    if (n.web.trim()) local.url = n.web.trim();
    if (n.correo.trim()) local.email = n.correo.trim();
    if (n.direccion.trim() || n.ciudad.trim()) local.address = { '@type': 'PostalAddress', streetAddress: n.direccion.trim(), addressLocality: n.ciudad.trim(), addressCountry: n.pais };
    var open = f.horarios.map(function (h, i) { return h.abierto ? { '@type': 'OpeningHoursSpecification', dayOfWeek: ISO[i], opens: hh(h.desde), closes: hh(h.hasta) } : null; }).filter(Boolean);
    if (open.length) local.openingHoursSpecification = open;
    g.push(local);
    if (ents.length) g.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: ents.map(function (e) { return { '@type': 'Question', name: e.p, acceptedAnswer: { '@type': 'Answer', text: e.r } }; }) });
    return '<script type="application/ld+json">\n' + JSON.stringify(g, null, 2).replace(/</g, '\\u003c') + '\n</script>\n';
  }
  function textoFichaGoogle(f) {
    var n = f.negocio, t = [];
    if (n.descripcion.trim()) t.push(n.descripcion.trim());
    var e = envioTexto(f); if (e) t.push(e);
    var p = pagosTexto(f); if (p) t.push(p);
    var c = contactoTexto(f); if (c) t.push(c);
    var s = t.join(' ');
    return { texto: s, largo: s.length };
  }

  /* ---------- Importar y exportar ---------- */
  function exportarTodo(f) { return JSON.stringify({ app: 'cerebro-pyme', version: 1, ficha: f }, null, 2); }
  function importarTodo(txt) {
    var o;
    try { o = JSON.parse(String(txt).replace(/^﻿/, '')); } catch (e) { throw new Error('El archivo no es un JSON válido.'); }
    if (!o || o.app !== 'cerebro-pyme' || !o.ficha || typeof o.ficha !== 'object') throw new Error('Este archivo no es un respaldo de Cerebro Pyme.');
    return ficha(o.ficha);
  }
  function csvCelda(s) { s = String(s == null ? '' : s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function faqACSV(f) {
    var filas = [['pregunta', 'respuesta', 'palabras_clave']];
    f.faq.forEach(function (x) { filas.push([x.p, x.r, x.claves]); });
    return '﻿' + filas.map(function (r) { return r.map(csvCelda).join(','); }).join('\r\n') + '\r\n';
  }
  function parseCSV(t) {
    var filas = [], fila = [], c = '', q = false, i, ch;
    t = String(t).replace(/^﻿/, '');
    for (i = 0; i < t.length; i++) {
      ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { fila.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; fila.push(c); c = ''; if (fila.some(function (x) { return x !== ''; })) filas.push(fila); fila = []; }
      else c += ch;
    }
    fila.push(c); if (fila.some(function (x) { return x !== ''; })) filas.push(fila);
    return filas;
  }
  function faqDeCSV(txt) {
    var filas = parseCSV(txt);
    if (!filas.length) throw new Error('El archivo CSV está vacío.');
    var cab = filas[0].map(function (x) { return normalizar(x).replace(/ /g, '_'); });
    var ip = cab.indexOf('pregunta'), ir = cab.indexOf('respuesta'), ik = cab.indexOf('palabras_clave');
    if (ip < 0 || ir < 0) throw new Error('Falta la columna «pregunta» o «respuesta».');
    return filas.slice(1).map(function (r) { return { p: (r[ip] || '').trim(), r: (r[ir] || '').trim(), claves: ik >= 0 ? (r[ik] || '').trim() : '' }; })
      .filter(function (x) { return x.p && x.r; });
  }

  function ejemplo() {
    var h = []; for (var i = 0; i < 7; i++) h.push({ abierto: i < 6, desde: i === 5 ? '10:00' : '09:00', hasta: i === 5 ? '14:00' : '18:30' });
    return ficha({
      negocio: { nombre: 'Café Ejemplo', rubro: 'Cafetería y pastelería', pais: 'Chile', descripcion: 'Café de especialidad, pastelería casera y tortas por encargo.', direccion: 'Calle Falsa 123, local 4', ciudad: 'Valparaíso', whatsapp: '', web: 'ejemplo.cl', correo: 'hola@ejemplo.cl' },
      horarios: h, horarioNota: 'Domingos y feriados cerrado',
      pagos: ['Efectivo', 'Transferencia', 'Tarjeta de débito'], pagosOtros: '',
      envio: { hace: true, zonas: 'Valparaíso y Viña del Mar', plazo: 'el mismo día si pides antes de las 12:00', costo: 'desde $2.500 según la comuna', retiro: true, retiroDonde: 'el local, con tu nombre y número de pedido' },
      politicas: { cambios: 'Si tu pedido llega dañado, avísanos el mismo día con una foto y lo reponemos.', garantia: 'Sin garantía adicional; reponemos productos en mal estado.', comprobante: 'Entregamos boleta electrónica por correo o WhatsApp; factura bajo pedido.' },
      productos: [{ nombre: 'Torta de chocolate (12 porciones)', precio: '$24.000', desc: 'Con 48 horas de anticipación' }, { nombre: 'Café americano', precio: '$2.200', desc: '' }],
      faq: [{ p: '¿Hacen tortas sin gluten?', r: 'Sí, una torta sin gluten requiere 72 horas de anticipación.', claves: 'celiaco gluten sin gluten' }]
    });
  }

  root.CerebroPyme = {
    DIAS: DIAS, PAGOS: PAGOS, TIPICAS: TIPICAS, UMBRAL: UMBRAL,
    normalizar: normalizar, tokens: tokens, ficha: ficha, horarioTexto: horarioTexto, pagosTexto: pagosTexto, entradas: entradas,
    buscar: buscar, cobertura: cobertura, documento: documento, respuestasRapidas: respuestasRapidas, faqHtml: faqHtml, jsonld: jsonld,
    textoFichaGoogle: textoFichaGoogle, exportarTodo: exportarTodo, importarTodo: importarTodo, faqACSV: faqACSV, faqDeCSV: faqDeCSV, ejemplo: ejemplo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CerebroPyme;
})(typeof window !== 'undefined' ? window : globalThis);
