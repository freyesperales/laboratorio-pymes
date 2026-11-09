/* Mapa de Datos · lógica pura (sin DOM). Funciona en navegador (global MapaDatos) y en Node. */
(function (root) {
  'use strict';
  var PLAZO_ARCO_DEFECTO = 30; // días corridos; valor por defecto, sin verificar en fuente oficial: editable

  var CATEGORIAS = ['Clientes', 'Empleados', 'Proveedores', 'Postulantes', 'Visitantes web', 'Otros'];
  var BASES = ['Contrato', 'Consentimiento', 'Obligación legal', 'Interés legítimo', 'Otra'];

  var DIAG = [
    { id: 'inventario', texto: '¿Sabes qué datos personales guardas y dónde (hojas, WhatsApp, correo, sistema)?', peso: 3 },
    { id: 'finalidad', texto: '¿Cada dato que pides tiene un motivo claro (venta, despacho, remuneración)?', peso: 2 },
    { id: 'aviso', texto: '¿Tienes un aviso o política de privacidad visible donde recoges datos (web, formularios, local)?', peso: 3 },
    { id: 'consentimiento', texto: 'Cuando usas datos para algo extra (promociones, boletín), ¿pides permiso y puedes demostrarlo?', peso: 3 },
    { id: 'derechos', texto: '¿Hay una persona y un canal para atender solicitudes de acceso, rectificación o eliminación?', peso: 3 },
    { id: 'seguridad', texto: '¿Proteges equipos y cuentas (claves únicas, doble factor, respaldos)?', peso: 3 },
    { id: 'terceros', texto: '¿Sabes qué proveedores reciben datos de tus clientes (hosting, email, pagos, CRM)?', peso: 2 },
    { id: 'incidentes', texto: '¿Sabrías qué hacer y a quién avisar si se filtran datos (celular perdido, cuenta hackeada)?', peso: 2 },
    { id: 'retencion', texto: '¿Borras o archivas los datos que ya no necesitas?', peso: 1 },
    { id: 'equipo', texto: '¿Tu equipo sabe qué puede y qué no puede hacer con datos de clientes?', peso: 1 }
  ];
  // respuestas: id -> 'si' | 'parcial' | 'no'
  var VALOR = { si: 1, parcial: 0.5, no: 0 };

  var CONSEJOS = {
    inventario: 'Completa el inventario de esta herramienta: una fila por cada lugar donde guardas datos.',
    finalidad: 'Deja de pedir datos que no usas; anota la finalidad de cada uno en el inventario.',
    aviso: 'Genera tu política de privacidad en la pestaña «Política» y publícala en tu web y formularios.',
    consentimiento: 'Guarda evidencia del permiso (casilla sin marcar de antemano, fecha y texto aceptado).',
    derechos: 'Designa un responsable y un correo; usa la pestaña «Solicitudes» para llevar los plazos.',
    seguridad: 'Activa doble factor en correo, WhatsApp Business y redes; usa un gestor de claves.',
    terceros: 'Lista a tus proveedores en el inventario (campo «Terceros») y revisa sus condiciones de privacidad.',
    incidentes: 'Escribe un plan de una página: quién decide, a quién avisas y cómo cambias claves.',
    retencion: 'Define un plazo de conservación por tipo de dato y bórralo al vencer.',
    equipo: 'Haz una charla de 15 minutos con reglas simples: no compartir datos por chats personales.'
  };

  function puntaje(resp) {
    var total = 0, obtenido = 0, pendientes = [];
    DIAG.forEach(function (p) {
      total += p.peso;
      var r = resp && resp[p.id];
      var v = VALOR.hasOwnProperty(r) ? VALOR[r] : 0;
      obtenido += v * p.peso;
      if (v < 1) pendientes.push({ id: p.id, texto: p.texto, consejo: CONSEJOS[p.id], respondida: !!r, valor: v, peso: p.peso });
    });
    pendientes.sort(function (a, b) { return (b.peso * (1 - b.valor)) - (a.peso * (1 - a.valor)); });
    var pct = Math.round((obtenido / total) * 100);
    var nivel = pct >= 80 ? 'Bien encaminada' : pct >= 50 ? 'En camino' : 'Por empezar';
    return { puntaje: pct, nivel: nivel, pendientes: pendientes };
  }

  function nuevoRegistro(o) {
    o = o || {};
    return {
      id: o.id || ('r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      categoria: o.categoria || 'Clientes',
      datos: String(o.datos || '').trim(),
      finalidad: String(o.finalidad || '').trim(),
      base: o.base || 'Contrato',
      donde: String(o.donde || '').trim(),
      terceros: String(o.terceros || '').trim(),
      plazo: String(o.plazo || '').trim(),
      sensible: !!o.sensible
    };
  }

  function validarRegistro(r) {
    var e = [];
    if (!r.datos) e.push('Indica qué datos son (por ejemplo: nombre, teléfono, correo).');
    if (!r.finalidad) e.push('Indica para qué los usas.');
    if (!r.donde) e.push('Indica dónde se guardan.');
    if (CATEGORIAS.indexOf(r.categoria) < 0) e.push('Categoría no válida.');
    if (BASES.indexOf(r.base) < 0) e.push('Base no válida.');
    return e;
  }

  function alertas(inv) {
    var out = [];
    inv.forEach(function (r) {
      var n = r.categoria + ' · ' + (r.datos || 'sin datos').slice(0, 40);
      if (r.base === 'Consentimiento') out.push({ id: r.id, texto: n + ': guarda evidencia del consentimiento.' });
      if (r.sensible) out.push({ id: r.id, texto: n + ': datos sensibles (salud, biometría, etc.). Reduce el acceso y consulta a un abogado.' });
      if (!r.plazo) out.push({ id: r.id, texto: n + ': falta un plazo de conservación.' });
      if (r.terceros && !/^(no|ninguno)/i.test(r.terceros)) out.push({ id: r.id, texto: n + ': revisa la privacidad de ' + r.terceros + '.' });
    });
    return out;
  }

  // ---- CSV ----
  var COLS = ['categoria', 'datos', 'finalidad', 'base', 'donde', 'terceros', 'plazo', 'sensible'];
  function esc(v) { v = String(v == null ? '' : v); return /[",\n\r;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function aCSV(inv) {
    var lines = [COLS.join(',')];
    inv.forEach(function (r) { lines.push(COLS.map(function (c) { return esc(c === 'sensible' ? (r.sensible ? 'si' : 'no') : r[c]); }).join(',')); });
    return lines.join('\n');
  }
  function parseCSV(t) {
    var rows = [], row = [], f = '', q = false, i, c;
    t = String(t).replace(/^﻿/, '');
    for (i = 0; i < t.length; i++) {
      c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
  }
  function deCSV(t) {
    var rows = parseCSV(t);
    if (!rows.length) throw new Error('El archivo CSV está vacío.');
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    COLS.slice(0, 3).forEach(function (c) { if (head.indexOf(c) < 0) throw new Error('Falta la columna «' + c + '». Exporta primero desde esta herramienta.'); });
    return rows.slice(1).map(function (r) {
      var o = {}; head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); });
      o.sensible = /^(si|sí|true|1)$/i.test(o.sensible || '');
      if (CATEGORIAS.indexOf(o.categoria) < 0) o.categoria = 'Otros';
      if (BASES.indexOf(o.base) < 0) o.base = 'Otra';
      return nuevoRegistro(o);
    });
  }

  // ---- Solicitudes de derechos ----
  var TIPOS = ['Acceso', 'Rectificación', 'Supresión', 'Oposición', 'Portabilidad', 'Bloqueo'];
  function sumarDias(iso, n) {
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function diffDias(a, b) { // b - a
    var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function nuevaSolicitud(o) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.recibida || '')) throw new Error('Fecha de recepción no válida (use AAAA-MM-DD).');
    if (TIPOS.indexOf(o.tipo) < 0) throw new Error('Tipo de solicitud no válido.');
    if (!String(o.persona || '').trim()) throw new Error('Indica quién la solicita.');
    var plazo = Number(o.plazoDias) > 0 ? Math.floor(Number(o.plazoDias)) : PLAZO_ARCO_DEFECTO;
    return { id: o.id || ('s' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)), persona: String(o.persona).trim(), tipo: o.tipo, recibida: o.recibida, plazoDias: plazo, limite: sumarDias(o.recibida, plazo), resuelta: !!o.resuelta, nota: String(o.nota || '') };
  }
  function estadoSolicitud(s, hoy) {
    if (s.resuelta) return { clave: 'resuelta', texto: 'Resuelta', dias: null };
    var d = diffDias(hoy, s.limite);
    if (d < 0) return { clave: 'vencida', texto: 'Vencida hace ' + (-d) + ' día(s)', dias: d };
    if (d <= 5) return { clave: 'urgente', texto: 'Vence en ' + d + ' día(s)', dias: d };
    return { clave: 'ok', texto: 'Quedan ' + d + ' días', dias: d };
  }
  function respuestaModelo(s, empresa) {
    var base = {
      Acceso: 'Hemos recibido tu solicitud de acceso. Adjuntamos la información sobre los datos personales tuyos que tratamos, su finalidad y los destinatarios.',
      Rectificación: 'Hemos recibido tu solicitud de rectificación. Corregimos los datos indicados y te confirmamos cuando esté hecho.',
      Supresión: 'Hemos recibido tu solicitud de supresión. Eliminaremos tus datos, salvo los que debamos conservar por una obligación legal, que te indicaremos.',
      Oposición: 'Hemos recibido tu solicitud de oposición. Dejamos de usar tus datos para la finalidad que indicas, salvo causa legal que te explicaremos.',
      Portabilidad: 'Hemos recibido tu solicitud de portabilidad. Te enviamos tus datos en un formato estructurado de uso común.',
      Bloqueo: 'Hemos recibido tu solicitud de bloqueo. Suspendemos el tratamiento de tus datos mientras se resuelve el asunto.'
    }[s.tipo];
    return 'Hola ' + s.persona + ':\n\n' + base + '\n\nFecha de recepción: ' + s.recibida + '. Fecha comprometida de respuesta: ' + s.limite + '.\n\nSaludos,\n' + (empresa.nombre || '[Nombre de la empresa]') + (empresa.contacto ? '\n' + empresa.contacto : '');
  }

  // ---- Política ----
  function generarPolitica(emp, inv, hoy) {
    emp = emp || {};
    var nombre = emp.nombre || '[Nombre de la empresa]';
    var L = [];
    L.push('POLÍTICA DE PRIVACIDAD DE ' + nombre.toUpperCase());
    L.push('Última actualización: ' + (hoy || '[fecha]'));
    L.push('');
    L.push('1. Quién es responsable de tus datos');
    L.push(nombre + (emp.rut ? ' (RUT/NIF ' + emp.rut + ')' : '') + (emp.direccion ? ', con domicilio en ' + emp.direccion : '') + '. Contacto para temas de privacidad: ' + (emp.contacto || '[correo]') + '.');
    L.push('');
    L.push('2. Qué datos tratamos y para qué');
    if (!inv || !inv.length) L.push('[Completa el inventario para listar aquí tus tratamientos.]');
    (inv || []).forEach(function (r) {
      L.push('- ' + r.categoria + ': ' + r.datos + '. Finalidad: ' + r.finalidad + '. Base: ' + r.base.toLowerCase() + '.' + (r.plazo ? ' Se conservan: ' + r.plazo + '.' : ''));
    });
    var terc = {};
    (inv || []).forEach(function (r) { if (r.terceros && !/^(no|ninguno)/i.test(r.terceros)) r.terceros.split(/[;,]/).forEach(function (t) { t = t.trim(); if (t) terc[t] = 1; }); });
    L.push('');
    L.push('3. Con quién los compartimos');
    var tl = Object.keys(terc);
    L.push(tl.length ? 'Compartimos datos con proveedores que nos prestan servicios: ' + tl.join(', ') + '. Solo reciben lo necesario para ese servicio.' : 'No compartimos tus datos con terceros, salvo obligación legal.');
    L.push('');
    L.push('4. Tus derechos');
    L.push('Puedes pedir acceso, rectificación, supresión, oposición, portabilidad y bloqueo escribiendo a ' + (emp.contacto || '[correo]') + '. Respondemos dentro del plazo que fija la ley.');
    L.push('');
    L.push('5. Seguridad');
    L.push('Aplicamos medidas razonables de seguridad para proteger tus datos. Si ocurre una brecha que te afecte, te avisaremos.');
    L.push('');
    L.push('Este texto es una base orientativa y no reemplaza asesoría legal.');
    return L.join('\n');
  }

  function aMarkdownResumen(emp, inv, resp) {
    var p = puntaje(resp);
    return '# Mapa de datos de ' + (emp.nombre || 'mi empresa') + '\n\nNivel: ' + p.nivel + ' (' + p.puntaje + '/100)\n\n' + inv.map(function (r) { return '- **' + r.categoria + '**: ' + r.datos + ' → ' + r.finalidad + ' (' + r.donde + ')'; }).join('\n');
  }

  function exportarTodo(estado) { return JSON.stringify({ version: 1, herramienta: 'mapa-de-datos', estado: estado }, null, 2); }
  function importarTodo(txt) {
    var o;
    try { o = JSON.parse(txt); } catch (e) { throw new Error('El archivo no es un JSON válido.'); }
    if (!o || o.herramienta !== 'mapa-de-datos' || !o.estado) throw new Error('El archivo no corresponde a Mapa de Datos.');
    var s = o.estado;
    return {
      empresa: s.empresa || {},
      respuestas: s.respuestas || {},
      inventario: (s.inventario || []).map(nuevoRegistro),
      solicitudes: (s.solicitudes || []).map(nuevaSolicitud)
    };
  }

  root.MapaDatos = { PLAZO_ARCO_DEFECTO: PLAZO_ARCO_DEFECTO, CATEGORIAS: CATEGORIAS, BASES: BASES, TIPOS: TIPOS, DIAG: DIAG, puntaje: puntaje, nuevoRegistro: nuevoRegistro, validarRegistro: validarRegistro, alertas: alertas, aCSV: aCSV, deCSV: deCSV, parseCSV: parseCSV, sumarDias: sumarDias, diffDias: diffDias, nuevaSolicitud: nuevaSolicitud, estadoSolicitud: estadoSolicitud, respuestaModelo: respuestaModelo, generarPolitica: generarPolitica, aMarkdownResumen: aMarkdownResumen, exportarTodo: exportarTodo, importarTodo: importarTodo };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MapaDatos;
})(typeof window !== 'undefined' ? window : globalThis);
