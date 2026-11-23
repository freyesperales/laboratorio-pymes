/* Guía Lista · lógica pura (sin DOM). Navegador (global GuiaLista) y Node.
   Reglas tomadas de la Resolución Ex. SII N° 144 de 2026 (fuentes en INVESTIGACION.md). */
(function (root) {
  'use strict';

  var FUENTE = 'https://www.sii.cl/normativa_legislacion/resoluciones/2026/reso144.pdf';
  var NOTICIA = 'https://www.sii.cl/noticias/2026/291026noti01aav.htm';
  var HITOS = [
    { fecha: '2026-11-01', titulo: 'Rige la resolución para quien ya tiene los datos', detalle: 'Resolutivo 18°: las obligaciones entran en vigencia el 1 de noviembre de 2026. El SII aclaró que desde esa fecha puede emitir con los campos nuevos quien ya cuenta con los datos.' },
    { fecha: '2027-01-31', titulo: 'Informar al SII tu modelo de transporte', detalle: 'Resolutivo 16° y noticia del SII del 29-10-2026: autogestionado o tercerizado, en un aplicativo del sitio del SII. Si no informas, se entiende autogestionado. El modelo se mantiene al menos seis meses.' },
    { fecha: '2027-05-01', titulo: 'Todos los campos obligatorios', detalle: 'Noticia del SII del 29-10-2026: desde el 1 de mayo de 2027 las facturas y guías de despacho deben llevar todos los campos obligatorios; es también el plazo para la guía de despacho tercerizada y la interoperabilidad (resolutivo 18°).' }
  ];

  // Anexo de la resolución: indicador de tipo de traslado (IndTraslado).
  // venta: true = el traslado importa venta (precio unitario exigido); false = puede omitirse el precio indicando el motivo.
  var TRASLADOS = [
    { c: 1, n: 'Operación constituye venta', venta: true },
    { c: 2, n: 'Ventas por efectuar', venta: false },
    { c: 3, n: 'Consignaciones', venta: false },
    { c: 4, n: 'Entrega gratuita', venta: false },
    { c: 5, n: 'Traslados internos', venta: false },
    { c: 6, n: 'Otros traslados no venta', venta: false },
    { c: 7, n: 'Devolución de mercaderías', venta: false },
    { c: 8, n: 'Traslado para exportación (no venta)', venta: false },
    { c: 9, n: 'Venta de exportación', venta: true },
    { c: 10, n: 'Traslado de tercerizado', venta: false },
    { c: 11, n: 'Traslado prolongado, importa venta', venta: true },
    { c: 12, n: 'Traslado prolongado, no venta', venta: false }
  ];
  var MARCAS = ['Diferido', 'Sin Dato'];
  var UNIDADES = ['UN', 'KG', 'LT', 'MT', 'M2', 'M3', 'CJ', 'PAL', 'TON'];

  // ---------- Utilidades ----------
  function txt(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esFecha(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  function esHora(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s)); }
  function diasEntre(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function fechaCL(s) { return esFecha(s) ? s.slice(8) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : ''; }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = txt(v); if (!s) return null;
    s = s.replace(/\$/g, '').replace(/\s/g, '');
    if (/,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,5
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 12.500
    var n = Number(s); return isFinite(n) ? n : null;
  }
  function esMarca(v) { var t = txt(v).toLowerCase(); return t === 'diferido' || t === 'sin dato'; }
  function marcaNormal(v) { return txt(v).toLowerCase() === 'diferido' ? 'Diferido' : 'Sin Dato'; }

  // ---------- RUT (módulo 11) ----------
  function dvRut(cuerpo) {
    var s = String(cuerpo), suma = 0, m = 2;
    for (var i = s.length - 1; i >= 0; i--) { suma += Number(s[i]) * m; m = m === 7 ? 2 : m + 1; }
    var r = 11 - (suma % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  }
  function limpiarRut(v) { return txt(v).replace(/[.\s]/g, '').replace(/-/g, '').toUpperCase(); }
  function rutValido(v) {
    var s = limpiarRut(v); if (!/^\d{6,8}[0-9K]$/.test(s)) return false;
    return dvRut(s.slice(0, -1)) === s.slice(-1);
  }
  function formatoRut(v) { var s = limpiarRut(v); return s.length < 2 ? s : s.slice(0, -1) + '-' + s.slice(-1); }

  // ---------- Patente ----------
  // La resolución exige la patente pero no fija su formato. Esto es una revisión de forma, no una regla del SII:
  // se aceptan los formatos habituales de 6 caracteres (2 letras + 4 números, 4 letras + 2 números, 3 letras + 3 números).
  function limpiarPatente(v) { return txt(v).replace(/[\s.\-·]/g, '').toUpperCase(); }
  function patenteHabitual(v) { var p = limpiarPatente(v); return /^[A-Z]{2}\d{4}$/.test(p) || /^[A-Z]{4}\d{2}$/.test(p) || /^[A-Z]{3}\d{3}$/.test(p); }

  // ---------- Diagnóstico: ¿me aplica? ¿qué modalidad tengo? ----------
  // r: { documento: 'guia'|'factura'|'boleta', feria: bool, traslado: 'propio'|'externo-con-datos'|'externo-sin-datos'|'courier'|'retira-cliente', sectorial: bool }
  function diagnostico(r) {
    r = r || {};
    var o = { aplica: true, modalidad: null, titulo: '', motivos: [], acciones: [], citas: [] };
    if (!r.documento || !r.traslado) { o.aplica = null; o.titulo = 'Responde las preguntas para ver tu caso'; return o; }
    if (r.feria) {
      o.aplica = false; o.titulo = 'Los datos nuevos no se te exigen';
      o.motivos.push('Los comerciantes de ferias libres acogidos al régimen de la Ley N° 21.745 quedan fuera de la resolución.'); o.citas.push('14°'); return o;
    }
    if (r.documento === 'boleta') {
      o.aplica = false; o.titulo = 'Los datos nuevos no se te exigen';
      o.motivos.push('La resolución no aplica a los traslados que se documentan con boleta.'); o.citas.push('14°'); return o;
    }
    if (r.traslado === 'retira-cliente') {
      o.aplica = false; o.titulo = 'Si el cliente retira en tu local, basta la factura o la boleta';
      o.motivos.push('Cuando el comprador retira los bienes en el establecimiento del vendedor, la factura o boleta ampara el traslado y no se exigen los datos de transporte.');
      o.motivos.push('El comprador puede emitir su propia guía de despacho para el retiro; en ese caso sí debe llevar todos los datos.'); o.citas.push('15°'); return o;
    }
    if (r.sectorial) {
      o.modalidad = 'especial'; o.titulo = 'Régimen especial';
      o.motivos.push('Emites la guía como requisito de un trámite previo ante un organismo fiscalizador (Aduanas, Sernapesca, SAG, Conaf, Sernageomin, ISP u otro).');
      o.acciones.push('En zona primaria aduanera o bajo control sectorial puedes omitir parte de los datos de chofer, transportista y patente, pero mantén al menos: fecha de emisión, tipo de traslado, dirección de origen y descripción de las mercaderías.');
      o.acciones.push('La excepción no corre cuando la guía ampara un traslado fuera de la zona primaria.');
      o.citas.push('2° N° 3', '11°');
    } else if (r.traslado === 'propio' || r.traslado === 'externo-con-datos') {
      o.modalidad = 'autogestionado'; o.titulo = 'Transporte autogestionado';
      o.motivos.push(r.traslado === 'propio' ? 'Trasladas con vehículo propio y sabes quién conduce.' : 'Contratas transporte externo y recibes los datos completos antes de emitir.');
      o.acciones.push('Cada guía o factura que ampare un traslado debe salir con origen, destino, chofer, RUT del transportista, patente y el detalle de la carga.');
      o.acciones.push('Si cambia un dato después de emitir (otro chofer, otro vehículo), se emite una guía nueva que referencia la anterior, y la anterior se registra como anulada en el Registro de Guías de Despacho.');
      o.citas.push('2° N° 1', '1°');
    } else {
      o.modalidad = 'tercerizado'; o.titulo = 'Transporte tercerizado';
      o.motivos.push(r.traslado === 'courier' ? 'Entregas la carga a un courier u operador logístico que la reparte con su propia red.' : 'Al emitir no sabes qué chofer o qué vehículo hará el traslado.');
      o.acciones.push('En tu guía, los datos que no conoces (chofer, RUT del transportista, patente, fecha de salida) se escriben como «Diferido» o «Sin Dato».');
      o.acciones.push('Después se completan de una de tres formas: una guía posterior que referencia la original, la guía de despacho tercerizada (GDT) que emite el transportista, o el envío electrónico del Anexo de Transporte Tercerizado.');
      if (r.traslado === 'courier') o.acciones.push('Los servicios postales y courier de envíos masivos pueden quedar exceptuados de informar los campos de transporte; pero cuando transportan carga de un contribuyente de primera categoría para su negocio, se aplican las reglas generales o las alternativas de datos diferidos. Confírmalo con tu courier.');
      o.citas.push('2° N° 2', '4°', '5°', '10°'); if (r.traslado === 'courier') o.citas.push('12°');
    }
    o.acciones.push('Informa tu modelo de transporte al SII a más tardar el 31 de enero de 2027. Si no lo haces, se entiende que eres autogestionado.');
    o.citas.push('16°');
    return o;
  }

  // ---------- Estado ----------
  function estadoVacio() {
    return { v: 1, caso: {}, emisor: { rut: '', nombre: '' }, choferes: [], vehiculos: [], transportistas: [], direcciones: [], despachos: [] };
  }
  function despachoVacio(hoy) {
    return { id: id(), nombre: '', documento: 'guia', tipo: 1, fchEmis: hoy || '', fchSalida: hoy || '', hraSalida: '', fchLlegada: '',
      dirOrigen: '', cmnaOrigen: '', dirDest: '', cmnaDest: '', rutTrans: '', rutChofer: '', nombreChofer: '', patente: '', patenteCarro: '',
      motivo: '', parcial: false, sectorial: false, items: [itemVacio()], ref: { tipo: '', folio: '', fecha: '', razon: '', rutOtr: '' },
      completado: null };
  }
  function itemVacio() { return { nombre: '', desc: '', cant: '', unidad: 'UN', precio: '', peso: '', volumen: '' }; }
  function traslado(c) { for (var i = 0; i < TRASLADOS.length; i++) if (TRASLADOS[i].c === Number(c)) return TRASLADOS[i]; return null; }

  // ---------- Revisión de un despacho ----------
  // Devuelve { alertas: [{nivel:'error'|'aviso'|'info', codigo, campo, texto, cita}], diferidos: [campo], listo: bool }
  function revisar(d) {
    var A = [], dif = [];
    function al(nivel, codigo, campo, texto, cita) { A.push({ nivel: nivel, codigo: codigo, campo: campo, texto: texto, cita: cita || '' }); }
    var t = traslado(d.tipo), esGDT = Number(d.tipo) === 10, prolongado = Number(d.tipo) === 11 || Number(d.tipo) === 12;

    if (!t) al('error', 'tipo', 'tipo', 'Elige el tipo de traslado.', '3°');
    if (!esFecha(d.fchEmis)) al('error', 'fecha-emision', 'fchEmis', 'Falta la fecha de emisión.', 'Anexo');

    // Origen y destino
    if (!txt(d.dirOrigen)) al('error', 'origen', 'dirOrigen', 'Falta la dirección de origen efectivo del traslado.', '1° N° 1');
    if (!txt(d.cmnaOrigen)) al('error', 'origen-comuna', 'cmnaOrigen', 'Falta la comuna de origen.', '1° N° 1');
    if (!txt(d.dirDest)) al(d.sectorial ? 'aviso' : 'error', 'destino', 'dirDest', 'Falta la dirección de destino efectivo del traslado.', '1° N° 1');
    if (!txt(d.cmnaDest)) al(d.sectorial ? 'aviso' : 'error', 'destino-comuna', 'cmnaDest', 'Falta la comuna de destino.', '1° N° 1');

    // Fecha de salida
    if (esMarca(d.fchSalida)) { dif.push('fchSalida'); }
    else if (!esFecha(d.fchSalida)) al('error', 'salida', 'fchSalida', 'Falta la fecha de salida. Si no tienes certeza, márcala como «Diferido» o «Sin Dato».', '4° y 7° N° 4');
    else if (esFecha(d.fchEmis) && d.fchSalida < d.fchEmis) al('aviso', 'salida-antes', 'fchSalida', 'La fecha de salida es anterior a la de emisión. La salida debe ser el día en que parte el traslado.', '7° N° 4');
    if (txt(d.hraSalida) && !esHora(d.hraSalida)) al('error', 'hora', 'hraSalida', 'La hora de salida no tiene formato HH:MM (es opcional: puedes dejarla vacía).', '7° N° 4');

    // Chofer, transportista y patente (numerales 2 y 3 del resolutivo 1°)
    var nivelT = d.sectorial ? 'aviso' : 'error';
    function campoTransporte(campo, valor, falta, cita, valida, malo) {
      if (esMarca(valor)) { dif.push(campo); return; }
      if (!txt(valor)) { al(nivelT, campo + '-falta', campo, falta + (d.sectorial ? ' En régimen especial puede omitirse si el traslado está bajo control sectorial.' : ' Si aún no lo sabes, escribe «Diferido» o «Sin Dato».'), d.sectorial ? '11°' : cita); return; }
      if (valida && !valida(valor)) al(malo[0], campo + '-forma', campo, malo[1], cita);
    }
    campoTransporte('nombreChofer', d.nombreChofer, 'Falta el nombre completo del chofer.', '1° N° 2', function (v) { return txt(v).split(' ').length >= 2; }, ['aviso', 'El nombre del chofer debe ser completo (nombre y apellido).']);
    campoTransporte('rutChofer', d.rutChofer, 'Falta la cédula de identidad (RUT) del chofer.', '1° N° 2', rutValido, ['error', 'El RUT del chofer no es válido: revisa el dígito verificador.']);
    campoTransporte('rutTrans', d.rutTrans, 'Falta el RUT del transportista.', '1° N° 2', rutValido, ['error', 'El RUT del transportista no es válido: revisa el dígito verificador.']);
    campoTransporte('patente', d.patente, 'Falta la patente del vehículo.', '1° N° 3', patenteHabitual, ['aviso', 'La patente no tiene un formato habitual de 6 caracteres. Revisa que esté bien escrita.']);
    if (txt(d.patenteCarro) && !esMarca(d.patenteCarro) && !patenteHabitual(d.patenteCarro)) al('aviso', 'patenteCarro-forma', 'patenteCarro', 'La patente del carro (remolque o semirremolque) no tiene un formato habitual. Revisa que esté bien escrita.', '1° N° 3');
    if (esMarca(d.patenteCarro)) dif.push('patenteCarro');

    // Traslado de más de un día
    var dias = esFecha(d.fchSalida) && esFecha(d.fchLlegada) ? diasEntre(d.fchSalida, d.fchLlegada) : null;
    if (txt(d.fchLlegada) && !esFecha(d.fchLlegada)) al('error', 'llegada', 'fchLlegada', 'La fecha de llegada no es válida.', 'Anexo');
    if (dias !== null && dias < 0) al('error', 'llegada-antes', 'fchLlegada', 'La fecha de llegada es anterior a la de salida.', 'Anexo');
    if (dias !== null && dias > 0 && !prolongado && !esGDT) al('error', 'prolongado-tipo', 'tipo', 'El traslado dura más de un día: usa el tipo «Traslado prolongado, importa venta» (11) o «Traslado prolongado, no venta» (12). Si no, la guía vale solo el día de emisión.', '7° N° 2');
    if (prolongado) {
      if (!esFecha(d.fchLlegada)) al('error', 'prolongado-llegada', 'fchLlegada', 'En un traslado prolongado debes señalar la fecha estimada de llegada.', '7° N° 2');
      if (!txt(d.motivo)) al('error', 'prolongado-motivo', 'motivo', 'Describe en el detalle por qué el traslado toma más de un día (distancia, carga especial u otro motivo).', '7° N° 2');
      if (dias === 0) al('aviso', 'prolongado-mismo-dia', 'fchLlegada', 'Elegiste traslado prolongado, pero sale y llega el mismo día.', '7° N° 2');
    }

    // Entregas parciales
    if (d.parcial && Number(d.tipo) !== 2) al('error', 'parcial-tipo', 'tipo', 'En un reparto con entregas parciales a distintos receptores, la guía que ampara toda la carga va con el tipo «Ventas por efectuar» (2). En cada entrega se emite el documento que corresponda.', '7° N° 3');

    // Guía de despacho tercerizada
    var ref = d.ref || {};
    if (esGDT) {
      if (d.documento !== 'guia') al('error', 'gdt-documento', 'documento', 'El traslado tercerizado solo se documenta con guía de despacho electrónica.', '5°');
      if (!txt(ref.tipo)) al('error', 'gdt-ref-tipo', 'ref.tipo', 'La guía tercerizada debe indicar el tipo del documento original que referencia.', '5°');
      if (!txt(ref.folio)) al('error', 'gdt-ref-folio', 'ref.folio', 'Falta el folio del documento original.', '5°');
      if (!esFecha(ref.fecha)) al('error', 'gdt-ref-fecha', 'ref.fecha', 'Falta la fecha del documento original.', '5°');
      if (!rutValido(ref.rutOtr)) al('error', 'gdt-ref-rut', 'ref.rutOtr', 'Falta el RUT (válido) del emisor del documento original.', '5°');
      if (dif.length) al('error', 'gdt-diferidos', 'tipo', 'La guía tercerizada existe para completar lo que faltaba en la original: no puede llevar datos «Diferido» o «Sin Dato».', '5°');
    } else if (txt(ref.folio) || txt(ref.tipo)) {
      if (!txt(ref.tipo) || !txt(ref.folio) || !esFecha(ref.fecha)) al('aviso', 'ref-incompleta', 'ref.folio', 'La referencia está incompleta: indica tipo de documento, folio y fecha.', 'Anexo');
      if (txt(ref.rutOtr) && !rutValido(ref.rutOtr)) al('error', 'ref-rut', 'ref.rutOtr', 'El RUT del otro contribuyente no es válido.', 'Anexo');
    }

    // Detalle de la carga
    var items = (d.items || []).filter(function (i) { return txt(i.nombre) || txt(i.cant) || txt(i.precio); });
    if (!items.length) {
      if (esGDT) al('info', 'gdt-sin-detalle', 'items', 'La guía tercerizada puede ir sin detalle de productos cuando solo completa datos del traslado y referencia el documento que sí lo tiene.', '6°');
      else al('error', 'sin-items', 'items', 'Falta el detalle de los bienes que se trasladan.', '1° N° 4');
    }
    var sinPrecio = 0, sinPeso = 0;
    items.forEach(function (i, k) {
      var n = k + 1, cant = num(i.cant), precio = num(i.precio);
      if (!txt(i.nombre)) al('error', 'item-nombre', 'items.' + k, 'Línea ' + n + ': falta el nombre del producto.', '1° N° 4');
      if (cant === null || cant <= 0) al('error', 'item-cantidad', 'items.' + k, 'Línea ' + n + ': falta la cantidad (mayor que cero).', '1° N° 4');
      if (!txt(i.unidad)) al('aviso', 'item-unidad', 'items.' + k, 'Línea ' + n + ': falta la unidad de medida.', 'Anexo');
      if (txt(i.precio) && (precio === null || precio < 0)) al('error', 'item-precio-malo', 'items.' + k, 'Línea ' + n + ': el precio unitario no es un número válido.', '1° N° 4');
      else if (precio === null) sinPrecio++;
      if (num(i.peso) === null && num(i.volumen) === null) sinPeso++;
    });
    if (sinPrecio && t && !esGDT) {
      if (t.venta) al('error', 'precio-venta', 'items', 'Hay ' + sinPrecio + (sinPrecio === 1 ? ' línea' : ' líneas') + ' sin precio unitario y el traslado importa venta.', '1° N° 4');
      else if (!txt(d.motivo)) al('error', 'precio-motivo', 'motivo', 'En un traslado que no es venta puedes omitir el precio unitario, pero debes escribir en forma clara el motivo del traslado (por ejemplo: «para reparación», «de bodega a sucursal»).', '1° N° 4');
    }
    if (sinPeso && items.length && !esGDT) al('aviso', 'peso', 'items', 'Hay ' + sinPeso + (sinPeso === 1 ? ' línea' : ' líneas') + ' sin peso ni volumen. La resolución pide peso y/o volumen «según corresponda».', '1° N° 4');

    if (dif.length && !esGDT) al('info', 'diferidos', 'tipo', 'Esta guía sale con ' + dif.length + (dif.length === 1 ? ' dato diferido' : ' datos diferidos') + ' (' + dif.map(etiqueta).join(', ') + '). Queda pendiente completarlos con una guía posterior, con la guía tercerizada del transportista o por interoperabilidad.', '4°, 5° y 10°');
    al('info', 'un-vehiculo', 'patente', 'Recuerda: una guía por cada traslado y por cada vehículo. La misma guía no sirve para otro día ni para otro vehículo.', '7° N° 1');

    return { alertas: A, diferidos: dif, errores: A.filter(function (a) { return a.nivel === 'error'; }).length, avisos: A.filter(function (a) { return a.nivel === 'aviso'; }).length,
      listo: !A.some(function (a) { return a.nivel === 'error'; }) };
  }

  var ETIQUETAS = { fchSalida: 'fecha de salida', nombreChofer: 'nombre del chofer', rutChofer: 'RUT del chofer', rutTrans: 'RUT del transportista', patente: 'patente', patenteCarro: 'patente del carro' };
  function etiqueta(c) { return ETIQUETAS[c] || c; }

  // Estado de seguimiento: 'borrador' (con errores), 'pendiente' (lista pero con diferidos sin completar), 'lista', 'completada'
  function situacion(d) {
    var r = revisar(d);
    if (!r.listo) return 'borrador';
    if (r.diferidos.length) return d.completado ? 'completada' : 'pendiente';
    return 'lista';
  }
  function completar(d, c) {
    c = c || {};
    var faltas = [];
    if (['guia-posterior', 'gdt', 'interoperabilidad'].indexOf(c.via) < 0) faltas.push('Elige cómo se completaron los datos.');
    if (c.via !== 'interoperabilidad' && !txt(c.folio)) faltas.push('Anota el folio de la guía que completó los datos.');
    if (!esFecha(c.fecha)) faltas.push('Anota la fecha en que se completaron.');
    if (faltas.length) return { ok: false, faltas: faltas };
    d.completado = { via: c.via, folio: txt(c.folio), fecha: c.fecha };
    return { ok: true, faltas: [] };
  }

  // ---------- Salidas ----------
  // Campos con la etiqueta del formato DTE que cita el anexo de la resolución.
  function campos(d) {
    function v(x) { return esMarca(x) ? marcaNormal(x) : txt(x); }
    var t = traslado(d.tipo), ref = d.ref || {}, F = [];
    function f(nombre, tag, valor) { F.push({ nombre: nombre, tag: tag, valor: valor == null ? '' : String(valor) }); }
    f('Fecha de emisión', 'FchEmis', txt(d.fchEmis));
    f('Fecha de salida', 'FchSalida', v(d.fchSalida));
    f('Hora de salida', 'HraSalida', txt(d.hraSalida));
    f('Fecha de llegada', 'FchLlegada', txt(d.fchLlegada));
    f('Indicador tipo de traslado', 'IndTraslado', t ? t.c + ' · ' + t.n : '');
    f('Dirección origen', 'DirOrigen', txt(d.dirOrigen)); f('Comuna origen', 'CmnaOrigen', txt(d.cmnaOrigen));
    f('Dirección destino', 'DirDest', txt(d.dirDest)); f('Comuna destino', 'CmnaDest', txt(d.cmnaDest));
    f('RUT transportista', 'RUTTrans', esMarca(d.rutTrans) ? marcaNormal(d.rutTrans) : formatoRut(d.rutTrans));
    f('RUT chofer', 'RUTChofer', esMarca(d.rutChofer) ? marcaNormal(d.rutChofer) : formatoRut(d.rutChofer));
    f('Nombre del chofer', 'NombreChofer', v(d.nombreChofer));
    f('Patente', 'Patente', esMarca(d.patente) ? marcaNormal(d.patente) : limpiarPatente(d.patente));
    f('Patente del carro', 'PatenteCarro', esMarca(d.patenteCarro) ? marcaNormal(d.patenteCarro) : limpiarPatente(d.patenteCarro));
    (d.items || []).filter(function (i) { return txt(i.nombre); }).forEach(function (i, k) {
      var n = ' (línea ' + (k + 1) + ')', extra = [txt(i.desc), num(i.peso) !== null ? 'Peso: ' + txt(i.peso) + ' kg' : '', num(i.volumen) !== null ? 'Volumen: ' + txt(i.volumen) + ' m3' : ''].filter(Boolean).join(' · ');
      f('Nombre del ítem' + n, 'NmbItem', txt(i.nombre)); f('Descripción adicional' + n, 'DscItem', extra);
      f('Cantidad' + n, 'QtyItem', txt(i.cant)); f('Unidad de medida' + n, 'UnmdItem', txt(i.unidad)); f('Precio unitario' + n, 'PrcItem', txt(i.precio));
    });
    if (txt(d.motivo)) f('Motivo o detalle del traslado', 'DscItem', txt(d.motivo));
    if (txt(ref.tipo) || txt(ref.folio)) {
      f('Tipo documento de referencia', 'TpoDocRef', txt(ref.tipo)); f('Folio de referencia', 'FolioRef', txt(ref.folio));
      f('Fecha de la referencia', 'FchRef', txt(ref.fecha)); f('Razón referencia', 'RazonRef', txt(ref.razon));
      f('RUT otro contribuyente', 'RUTOtr', formatoRut(ref.rutOtr));
    }
    return F;
  }
  function hoja(d) {
    return campos(d).filter(function (c) { return c.valor; }).map(function (c) { return c.nombre + ' [' + c.tag + ']: ' + c.valor; }).join('\n');
  }
  // Mensaje para pedir al transportista los datos que faltan.
  function pedirDatos(d, emisor) {
    var r = revisar(d), faltan = r.diferidos.slice();
    ['nombreChofer', 'rutChofer', 'rutTrans', 'patente'].forEach(function (c) { if (!txt(d[c]) && faltan.indexOf(c) < 0) faltan.push(c); });
    if (!faltan.length) return '';
    var L = ['Hola. Para emitir la guía de despacho' + (txt(d.nombre) ? ' de «' + txt(d.nombre) + '»' : '') + ' necesito estos datos del traslado:'];
    faltan.forEach(function (c) { L.push('• ' + etiqueta(c).charAt(0).toUpperCase() + etiqueta(c).slice(1) + ':'); });
    var ruta = [txt(d.cmnaOrigen), txt(d.cmnaDest)].filter(Boolean).join(' → ');
    if (ruta) L.push('Ruta: ' + ruta + (esFecha(d.fchSalida) ? ' · salida ' + fechaCL(d.fchSalida) : ''));
    L.push('El SII los exige en la guía (Resolución Ex. N° 144 de 2026). Gracias.' + (emisor && txt(emisor.nombre) ? '\n' + txt(emisor.nombre) : ''));
    return L.join('\n');
  }

  // ---------- CSV ----------
  function celdaCSV(v) { var s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  var COLS = ['nombre', 'documento', 'tipo', 'fchEmis', 'fchSalida', 'hraSalida', 'fchLlegada', 'dirOrigen', 'cmnaOrigen', 'dirDest', 'cmnaDest', 'rutTrans', 'rutChofer', 'nombreChofer', 'patente', 'patenteCarro', 'motivo'];
  function despachosCSV(lista) {
    var L = [COLS.concat(['situacion', 'errores', 'avisos', 'diferidos', 'lineas']).join(';')];
    (lista || []).forEach(function (d) {
      var r = revisar(d);
      L.push(COLS.map(function (c) { return celdaCSV(d[c]); }).concat([situacion(d), r.errores, r.avisos, celdaCSV(r.diferidos.map(etiqueta).join(', ')), (d.items || []).filter(function (i) { return txt(i.nombre); }).length]).join(';'));
    });
    return '﻿' + L.join('\r\n');
  }
  function leerCSV(texto) {
    var s = String(texto || '').replace(/^﻿/, ''), sep = (s.split(/\r?\n/)[0].match(/;/g) || []).length >= (s.split(/\r?\n/)[0].match(/,/g) || []).length ? ';' : ',';
    var filas = [], f = [], c = '', q = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { f.push(c); c = ''; }
      else if (ch === '\n') { f.push(c); filas.push(f); f = []; c = ''; }
      else if (ch !== '\r') c += ch;
    }
    if (c !== '' || f.length) { f.push(c); filas.push(f); }
    return filas.filter(function (x) { return x.some(function (y) { return txt(y); }); });
  }
  function sinTilde(s) { return txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  // Libreta por CSV: columnas tipo (chofer|vehiculo|transportista|direccion), nombre, rut, patente, carro, direccion, comuna
  function leerLibretaCSV(texto) {
    var filas = leerCSV(texto), o = { choferes: [], vehiculos: [], transportistas: [], direcciones: [], errores: [] };
    if (filas.length < 2) { o.errores.push('El archivo no tiene filas de datos.'); return o; }
    var cab = filas[0].map(sinTilde), ix = function (n) { return cab.indexOf(n); };
    if (ix('tipo') < 0) { o.errores.push('Falta la columna «tipo» (chofer, vehiculo, transportista o direccion).'); return o; }
    filas.slice(1).forEach(function (f, k) {
      var g = function (n) { return ix(n) < 0 ? '' : txt(f[ix(n)]); }, tipo = sinTilde(g('tipo')), n = k + 2;
      if (tipo === 'chofer') { if (!g('nombre') || !rutValido(g('rut'))) o.errores.push('Fila ' + n + ': chofer sin nombre o con RUT inválido.'); else o.choferes.push({ id: id(), nombre: g('nombre'), rut: formatoRut(g('rut')) }); }
      else if (tipo === 'vehiculo') { if (!g('patente')) o.errores.push('Fila ' + n + ': vehículo sin patente.'); else o.vehiculos.push({ id: id(), nombre: g('nombre'), patente: limpiarPatente(g('patente')), carro: limpiarPatente(g('carro')) }); }
      else if (tipo === 'transportista') { if (!g('nombre') || !rutValido(g('rut'))) o.errores.push('Fila ' + n + ': transportista sin nombre o con RUT inválido.'); else o.transportistas.push({ id: id(), nombre: g('nombre'), rut: formatoRut(g('rut')) }); }
      else if (tipo === 'direccion') { if (!g('direccion') || !g('comuna')) o.errores.push('Fila ' + n + ': dirección sin calle o sin comuna.'); else o.direcciones.push({ id: id(), nombre: g('nombre') || g('direccion'), direccion: g('direccion'), comuna: g('comuna') }); }
      else o.errores.push('Fila ' + n + ': tipo «' + g('tipo') + '» no reconocido.');
    });
    return o;
  }

  // ---------- Fechas clave ----------
  function hitos(hoy) {
    return HITOS.map(function (h) { var f = esFecha(hoy) ? diasEntre(hoy, h.fecha) : null; return { fecha: h.fecha, titulo: h.titulo, detalle: h.detalle, faltan: f, vencido: f !== null && f < 0 }; });
  }
  function ics() {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Laboratorio Pymes//Guia Lista//ES'];
    HITOS.filter(function (h) { return h.fecha > '2026-11-01'; }).forEach(function (h) {
      var d = h.fecha.replace(/-/g, '');
      L.push('BEGIN:VEVENT', 'UID:guia-lista-' + d + '@laboratorio-pymes', 'DTSTAMP:20261123T000000Z', 'DTSTART;VALUE=DATE:' + d,
        'SUMMARY:' + ('SII guías de despacho: ' + h.titulo).replace(/([,;\\])/g, '\\$1'), 'DESCRIPTION:' + (h.detalle + ' Fuente: ' + FUENTE).replace(/([,;\\])/g, '\\$1'),
        'BEGIN:VALARM', 'TRIGGER:-P14D', 'ACTION:DISPLAY', 'DESCRIPTION:Faltan 14 días', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.join('\r\n');
  }

  // ---------- Respaldo ----------
  function validarEstado(o) {
    var E = [];
    if (!o || typeof o !== 'object' || Array.isArray(o)) return ['El archivo no es un respaldo de Guía Lista.'];
    ['choferes', 'vehiculos', 'transportistas', 'direcciones', 'despachos'].forEach(function (k) { if (!Array.isArray(o[k])) E.push('Falta la lista «' + k + '».'); });
    if (!E.length) o.despachos.forEach(function (d, i) { if (!d || typeof d !== 'object' || !Array.isArray(d.items)) E.push('El despacho ' + (i + 1) + ' no tiene el formato esperado.'); });
    return E;
  }
  function normalizar(o) {
    var b = estadoVacio();
    b.caso = o.caso && typeof o.caso === 'object' ? o.caso : {};
    b.emisor = { rut: txt(o.emisor && o.emisor.rut), nombre: txt(o.emisor && o.emisor.nombre) };
    ['choferes', 'vehiculos', 'transportistas', 'direcciones'].forEach(function (k) { b[k] = o[k].filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { var y = {}; Object.keys(x).forEach(function (p) { y[p] = txt(x[p]); }); y.id = y.id || id(); return y; }); });
    b.despachos = o.despachos.map(function (d) {
      var n = despachoVacio(''); Object.keys(n).forEach(function (k) { if (d[k] !== undefined && k !== 'items' && k !== 'ref' && k !== 'completado') n[k] = typeof n[k] === 'boolean' ? !!d[k] : k === 'tipo' ? Number(d[k]) || 1 : txt(d[k]); });
      n.id = txt(d.id) || id();
      n.items = d.items.map(function (i) { var m = itemVacio(); Object.keys(m).forEach(function (k) { if (i && i[k] !== undefined) m[k] = txt(i[k]); }); return m; });
      if (!n.items.length) n.items = [itemVacio()];
      if (d.ref && typeof d.ref === 'object') Object.keys(n.ref).forEach(function (k) { n.ref[k] = txt(d.ref[k]); });
      if (d.completado && typeof d.completado === 'object') n.completado = { via: txt(d.completado.via), folio: txt(d.completado.folio), fecha: txt(d.completado.fecha) };
      return n;
    });
    return b;
  }

  // ---------- Ejemplo (datos inventados; los RUT son de prueba con dígito verificador correcto) ----------
  function ejemplo(hoy) {
    var e = estadoVacio(), man = sumar(hoy, 1), pas = sumar(hoy, 3);
    e.caso = { documento: 'guia', feria: false, traslado: 'propio', sectorial: false };
    e.emisor = { rut: '76123456-0', nombre: 'Maderas del Sur SpA (ejemplo)' };
    e.choferes = [{ id: 'c1', nombre: 'Rosa Fuentes Araya', rut: '12345678-5' }, { id: 'c2', nombre: 'Luis Tapia Soto', rut: '11111111-1' }];
    e.vehiculos = [{ id: 'v1', nombre: 'Camión 3/4', patente: 'KXTR42', carro: '' }, { id: 'v2', nombre: 'Tracto con rampla', patente: 'HJ4521', carro: 'JK2314' }];
    e.transportistas = [{ id: 't1', nombre: 'Flota propia', rut: '76123456-0' }, { id: 't2', nombre: 'Transportes Ruta Larga Ltda. (ejemplo)', rut: '77777777-7' }];
    e.direcciones = [{ id: 'd1', nombre: 'Bodega central', direccion: 'Camino a Melipilla 1500', comuna: 'Maipú' }, { id: 'd2', nombre: 'Sucursal Rancagua', direccion: 'Av. Cachapoal 220', comuna: 'Rancagua' }, { id: 'd3', nombre: 'Cliente ferretería', direccion: 'O\'Higgins 345', comuna: 'Temuco' }];
    var a = despachoVacio(hoy); a.id = 'e1'; a.nombre = 'Venta a ferretería de Rancagua'; a.tipo = 1;
    a.dirOrigen = 'Camino a Melipilla 1500'; a.cmnaOrigen = 'Maipú'; a.dirDest = 'Av. Cachapoal 220'; a.cmnaDest = 'Rancagua';
    a.rutTrans = '76123456-0'; a.rutChofer = '12345678-5'; a.nombreChofer = 'Rosa Fuentes Araya'; a.patente = 'KXTR42'; a.hraSalida = '08:30';
    a.items = [{ nombre: 'Tablero OSB 9 mm', desc: '', cant: '40', unidad: 'UN', precio: '8990', peso: '520', volumen: '' }, { nombre: 'Pino cepillado 2x4', desc: '3,2 m', cant: '120', unidad: 'UN', precio: '2490', peso: '610', volumen: '' }];
    var b = despachoVacio(man); b.id = 'e2'; b.nombre = 'Despacho a Temuco con transporte externo'; b.tipo = 1; b.fchEmis = hoy; b.fchLlegada = pas;
    b.dirOrigen = 'Camino a Melipilla 1500'; b.cmnaOrigen = 'Maipú'; b.dirDest = 'O\'Higgins 345'; b.cmnaDest = 'Temuco';
    b.rutTrans = '77777777-7'; b.rutChofer = 'Diferido'; b.nombreChofer = 'Diferido'; b.patente = 'Diferido';
    b.items = [{ nombre: 'Terciado estructural 15 mm', desc: '', cant: '200', unidad: 'UN', precio: '', peso: '', volumen: '' }];
    var c = despachoVacio(hoy); c.id = 'e3'; c.nombre = 'Traslado de bodega a sucursal'; c.tipo = 5;
    c.dirOrigen = 'Camino a Melipilla 1500'; c.cmnaOrigen = 'Maipú'; c.dirDest = 'Av. Cachapoal 220'; c.cmnaDest = 'Rancagua';
    c.rutTrans = '76123456-0'; c.rutChofer = '11111111-1'; c.nombreChofer = 'Luis Tapia Soto'; c.patente = 'HJ4521'; c.patenteCarro = 'JK2314';
    c.motivo = 'Traslado interno de bodega central a sucursal para reposición de stock'; c.items = [{ nombre: 'Clavos 3 pulgadas', desc: 'Cajas de 25 kg', cant: '30', unidad: 'CJ', precio: '', peso: '750', volumen: '' }];
    e.despachos = [a, b, c];
    return e;
  }
  function sumar(f, n) { var d = new Date(Date.parse(f + 'T00:00:00Z') + n * 86400000); return d.toISOString().slice(0, 10); }

  var api = {
    FUENTE: FUENTE, NOTICIA: NOTICIA, HITOS: HITOS, TRASLADOS: TRASLADOS, MARCAS: MARCAS, UNIDADES: UNIDADES,
    txt: txt, id: id, esFecha: esFecha, esHora: esHora, diasEntre: diasEntre, fechaCL: fechaCL, num: num, esMarca: esMarca, sumar: sumar,
    dvRut: dvRut, limpiarRut: limpiarRut, rutValido: rutValido, formatoRut: formatoRut, limpiarPatente: limpiarPatente, patenteHabitual: patenteHabitual,
    diagnostico: diagnostico, estadoVacio: estadoVacio, despachoVacio: despachoVacio, itemVacio: itemVacio, traslado: traslado,
    revisar: revisar, etiqueta: etiqueta, situacion: situacion, completar: completar, campos: campos, hoja: hoja, pedirDatos: pedirDatos,
    despachosCSV: despachosCSV, leerCSV: leerCSV, leerLibretaCSV: leerLibretaCSV, hitos: hitos, ics: ics,
    validarEstado: validarEstado, normalizar: normalizar, ejemplo: ejemplo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuiaLista = api;
})(this);
