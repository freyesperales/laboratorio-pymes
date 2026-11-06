/* Atajos · lógica pura (sin DOM). Funciona en navegador (window.Atajos) y en Node. */
(function (root) {
  'use strict';
  var LIMITE = 50;
  var CAMPOS = { negocio: 'nombre del negocio', horario: 'horario', direccion: 'dirección', pago: 'medios de pago', web: 'web o catálogo' };
  var RUBROS = {
    general: 'Cualquier negocio',
    belleza: 'Peluquería, barbería o estética',
    comida: 'Restaurante, cafetería o delivery',
    tienda: 'Tienda (física u online)',
    taller: 'Taller o servicio técnico',
    salud: 'Consulta, clínica o terapia',
    servicios: 'Servicios profesionales u oficios'
  };

  // r = rubros a los que aplica ('*' = todos). tipo: 'rapida' | 'bienvenida' | 'ausencia'
  var PLANTILLAS = [
    { id: 'hola', tipo: 'rapida', atajo: 'hola', titulo: 'Saludo', r: '*', texto: 'Hola, gracias por escribir a {negocio}. ¿En qué te puedo ayudar?' },
    { id: 'horario', tipo: 'rapida', atajo: 'horario', titulo: 'Horario', r: '*', texto: 'Nuestro horario es: {horario}. Si nos escribes fuera de ese horario, te respondemos apenas abramos.' },
    { id: 'ubicacion', tipo: 'rapida', atajo: 'ubicacion', titulo: 'Dónde estamos', r: '*', texto: 'Estamos en {direccion}. Si te pierdes al llegar, escríbenos y te guiamos.' },
    { id: 'pago', tipo: 'rapida', atajo: 'pago', titulo: 'Medios de pago', r: '*', texto: 'Aceptamos: {pago}. Si necesitas otra forma de pago, cuéntanos y lo vemos.' },
    { id: 'espera', tipo: 'rapida', atajo: 'espera', titulo: 'Un momento', r: '*', texto: 'Gracias por tu paciencia. Estoy revisando tu consulta y te respondo en unos minutos.' },
    { id: 'datos', tipo: 'rapida', atajo: 'datos', titulo: 'Pedir datos', r: '*', texto: '¿Me indicas tu nombre completo y lo que necesitas? Así te respondo con la información exacta.' },
    { id: 'web', tipo: 'rapida', atajo: 'web', titulo: 'Catálogo o web', r: '*', texto: 'Puedes ver más información aquí: {web}' },
    { id: 'gracias', tipo: 'rapida', atajo: 'gracias', titulo: 'Agradecer la compra', r: '*', texto: 'Gracias por elegir {negocio}. Si algo no queda como esperabas, escríbenos y lo resolvemos.' },
    { id: 'resena', tipo: 'rapida', atajo: 'resena', titulo: 'Pedir opinión', r: '*', texto: 'Gracias por venir a {negocio}. Si te gustó la atención, nos ayuda mucho que cuentes tu experiencia. Y si algo falló, dínoslo por aquí primero para mejorarlo.' },
    { id: 'seguimiento', tipo: 'rapida', atajo: 'seguimiento', titulo: 'Retomar una conversación', r: '*', texto: 'Hola, te escribo para saber si pudiste revisar lo que conversamos. Si tienes dudas, con gusto te ayudo.' },
    { id: 'cierre', tipo: 'rapida', atajo: 'cierre', titulo: 'Despedida', r: '*', texto: 'Quedo atento a lo que necesites. Gracias por escribir a {negocio}.' },

    { id: 'cita', tipo: 'rapida', atajo: 'cita', titulo: 'Agendar una cita', r: ['belleza', 'salud', 'taller', 'servicios'], texto: 'Para agendar necesito: tu nombre, el servicio que quieres y dos opciones de día y hora. Nuestro horario es: {horario}.' },
    { id: 'recordatorio', tipo: 'rapida', atajo: 'recordatorio', titulo: 'Recordar la cita', r: ['belleza', 'salud', 'taller', 'servicios'], texto: 'Hola, te recordamos tu cita en {negocio}. ¿Nos confirmas que asistes? Si necesitas cambiarla, avísanos con anticipación.' },
    { id: 'cambio-cita', tipo: 'rapida', atajo: 'cambio', titulo: 'Reagendar', r: ['belleza', 'salud', 'taller', 'servicios'], texto: 'Sin problema, podemos cambiar tu cita. ¿Qué día y hora te acomodan mejor?' },
    { id: 'primera-vez', tipo: 'rapida', atajo: 'primera', titulo: 'Primera visita', r: ['belleza', 'salud'], texto: 'Para tu primera visita, llega unos minutos antes. Estamos en {direccion}.' },

    { id: 'menu', tipo: 'rapida', atajo: 'menu', titulo: 'Carta o menú', r: ['comida'], texto: 'Esta es nuestra carta: {web}. Dime qué te gustaría y te confirmo disponibilidad.' },
    { id: 'pedido', tipo: 'rapida', atajo: 'pedido', titulo: 'Tomar un pedido', r: ['comida'], texto: 'Para tomar tu pedido necesito: qué quieres, cantidad, dirección de entrega (o si retiras en local) y a nombre de quién va.' },
    { id: 'reserva', tipo: 'rapida', atajo: 'reserva', titulo: 'Reservar mesa', r: ['comida'], texto: 'Para reservar necesito: día, hora, cantidad de personas y un nombre. Atendemos: {horario}.' },
    { id: 'alergias', tipo: 'rapida', atajo: 'alergias', titulo: 'Alergias', r: ['comida'], texto: 'Si tienes alguna alergia o restricción, avísanos antes de pedir para indicarte qué opciones son seguras. Si no tenemos certeza, te lo diremos con claridad.' },

    { id: 'stock', tipo: 'rapida', atajo: 'stock', titulo: 'Disponibilidad', r: ['tienda'], texto: 'Déjame confirmar el stock. ¿Me dices el producto, la talla o el modelo que buscas?' },
    { id: 'envio', tipo: 'rapida', atajo: 'envio', titulo: 'Envíos', r: ['tienda'], texto: 'Hacemos envíos. Para calcular el costo y el plazo, ¿me indicas tu comuna, ciudad o código postal?' },
    { id: 'cambios', tipo: 'rapida', atajo: 'cambios', titulo: 'Cambios y devoluciones', r: ['tienda'], texto: 'Si necesitas un cambio o devolución, escríbenos con tu número de pedido y una foto del producto. Te indicamos los pasos.' },
    { id: 'seguimiento-envio', tipo: 'rapida', atajo: 'despacho', titulo: 'Aviso de despacho', r: ['tienda'], texto: 'Tu pedido ya salió. Te avisamos apenas tengamos el seguimiento para que lo veas.' },

    { id: 'diagnostico', tipo: 'rapida', atajo: 'diagnostico', titulo: 'Pedir detalles del problema', r: ['taller'], texto: 'Para orientarte, cuéntame qué falla, desde cuándo y, si puedes, envía una foto o un video corto.' },
    { id: 'presupuesto', tipo: 'rapida', atajo: 'presupuesto', titulo: 'Plazo del presupuesto', r: ['taller', 'servicios'], texto: 'Para enviarte un presupuesto necesito revisar los detalles. Te lo mando en el plazo que acordemos; ¿qué día lo necesitas?' },
    { id: 'listo', tipo: 'rapida', atajo: 'listo', titulo: 'Trabajo listo', r: ['taller', 'servicios'], texto: 'Tu trabajo está listo. Puedes pasar a retirarlo en {direccion}, en este horario: {horario}.' },

    { id: 'consulta', tipo: 'rapida', atajo: 'consulta', titulo: 'Antes de la consulta', r: ['salud'], texto: 'Gracias por escribir. Por este chat no entregamos diagnósticos; para eso necesitas una consulta. ¿Te agendo una hora?' },
    { id: 'urgencia', tipo: 'rapida', atajo: 'urgencia', titulo: 'Aviso de urgencia', r: ['salud'], texto: 'Si es una urgencia, no esperes respuesta por este chat: acude a un servicio de urgencias o llama a emergencias de tu país.' },

    { id: 'propuesta', tipo: 'rapida', atajo: 'propuesta', titulo: 'Enviar propuesta', r: ['servicios'], texto: 'Te envío la propuesta con el alcance, el plazo y el valor. Si quieres ajustar algo, dime y la actualizo.' },
    { id: 'reunion', tipo: 'rapida', atajo: 'reunion', titulo: 'Coordinar reunión', r: ['servicios'], texto: 'Podemos coordinar una breve llamada. ¿Qué día y hora te acomodan? Mi horario es: {horario}.' },

    { id: 'bienvenida', tipo: 'bienvenida', atajo: '', titulo: 'Mensaje de bienvenida', r: '*', texto: 'Hola, bienvenido a {negocio}. Cuéntanos en qué podemos ayudarte y te respondemos lo antes posible. Atendemos: {horario}.' },
    { id: 'ausencia', tipo: 'ausencia', atajo: '', titulo: 'Mensaje de ausencia', r: '*', texto: 'Hola, gracias por escribir a {negocio}. Ahora estamos fuera de horario. Atendemos: {horario}. Déjanos tu mensaje y te respondemos al volver.' }
  ];

  function rellenar(texto, datos) {
    var faltan = [];
    var salida = String(texto).replace(/\{(\w+)\}/g, function (m, k) {
      var v = datos && datos[k] != null ? String(datos[k]).trim() : '';
      if (v) return v;
      if (faltan.indexOf(k) < 0) faltan.push(k);
      return '[completa: ' + (CAMPOS[k] || k) + ']';
    });
    return { texto: salida, faltan: faltan };
  }

  function plantillasDe(rubro) {
    return PLANTILLAS.filter(function (p) { return p.r === '*' || p.r.indexOf(rubro) >= 0; });
  }

  function normalizarAtajo(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/^\/+/, '').replace(/[^a-z0-9_-]/g, '').slice(0, 30);
  }

  // elementos: [{atajo, texto, activo}] -> problemas
  function validar(elementos) {
    var problemas = [], vistos = {}, activos = 0;
    elementos.forEach(function (e) {
      if (!e.activo) return;
      activos++;
      if (!e.atajo) problemas.push('Falta el atajo de una respuesta («' + String(e.texto).slice(0, 25) + '…»).');
      else if (vistos[e.atajo]) problemas.push('El atajo «/' + e.atajo + '» está repetido.');
      vistos[e.atajo] = true;
      if (!String(e.texto).trim()) problemas.push('La respuesta «/' + e.atajo + '» está vacía.');
      if (String(e.texto).length > 4096) problemas.push('La respuesta «/' + e.atajo + '» supera los 4096 caracteres.');
    });
    if (activos > LIMITE) problemas.push('Marcaste ' + activos + ' respuestas rápidas y el máximo es ' + LIMITE + '.');
    return problemas;
  }

  function exportarTexto(elementos) {
    return elementos.filter(function (e) { return e.activo && e.tipo === 'rapida'; }).map(function (e) {
      return '/' + e.atajo + '\n' + e.texto;
    }).join('\n\n');
  }

  function aCsv(elementos) {
    var q = function (s) { s = String(s); return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var f = ['tipo,atajo,texto'];
    elementos.filter(function (e) { return e.activo; }).forEach(function (e) {
      f.push([q(e.tipo), q(e.atajo ? '/' + e.atajo : ''), q(e.texto)].join(','));
    });
    return f.join('\r\n');
  }

  var API = { LIMITE: LIMITE, CAMPOS: CAMPOS, RUBROS: RUBROS, PLANTILLAS: PLANTILLAS, rellenar: rellenar, plantillasDe: plantillasDe, normalizarAtajo: normalizarAtajo, validar: validar, exportarTexto: exportarTexto, aCsv: aCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Atajos = API;
})(typeof window !== 'undefined' ? window : this);
