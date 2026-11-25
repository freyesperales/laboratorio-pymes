/* Guía Lista · lógica pura (sin DOM). Navegador (global GuiaLista) y Node.
   Reglas tomadas de la Resolución Ex. SII N° 144 de 2026 (fuentes en INVESTIGACION.md). */
(function (root) {
  'use strict';

  var FUENTE = 'https://www.sii.cl/normativa_legislacion/resoluciones/2026/reso144.pdf';
  var NOTICIA = 'https://www.sii.cl/noticias/2026/291026noti01aav.htm';
  var NOTICIA2 = 'https://www.sii.cl/noticias/2026/241126noti02aav.htm';
  var HITOS = [
    { fecha: '2026-11-01', titulo: 'Rige la resolución para quien ya tiene los datos', detalle: 'Resolutivo 18°: las obligaciones entran en vigencia el 1 de noviembre de 2026. El SII aclaró que desde esa fecha puede emitir con los campos nuevos quien ya cuenta con los datos.' },
    { fecha: '2027-01-31', titulo: 'Informar al SII tu modelo de transporte', detalle: 'Resolutivo 16° y noticia del SII del 29-10-2026: autogestionado o tercerizado, en un aplicativo del sitio del SII. Si no informas, se entiende autogestionado. El modelo se mantiene al menos seis meses. Al 25-11-2026 el SII aún no publicaba ese acceso.' },
    { fecha: '2027-05-01', titulo: 'Todos los campos obligatorios', detalle: 'Noticia del SII del 29-10-2026: desde el 1 de mayo de 2027 las facturas y guías de despacho deben llevar todos los campos obligatorios; es también el plazo para la guía de despacho tercerizada y la interoperabilidad (resolutivo 18°). El SII lo reiteró el 24-11-2026, al iniciar reuniones con gremios para la implementación.' }
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
  function esHora(s) { return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(s)); }
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
    return { v: 1, caso: {}, emisor: { rut: '', nombre: '' }, choferes: [], vehiculos: [], transportistas: [], direcciones: [], despachos: [], rutas: [] };
  }
  function despachoVacio(hoy) {
    return { id: id(), nombre: '', documento: 'guia', tipo: 1, folio: '', fchEmis: hoy || '', fchSalida: hoy || '', hraSalida: '', fchLlegada: '',
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

    // Largos máximos del formato DTE (esquema DTE_v10.xsd del 06-02-2026). Si se pasan, el sistema de facturación los rechaza o los corta.
    [['nombreChofer', 'nombre del chofer', 30], ['patente', 'patente', 8], ['patenteCarro', 'patente del carro', 8], ['dirOrigen', 'dirección de origen', 70], ['dirDest', 'dirección de destino', 70], ['cmnaOrigen', 'comuna de origen', 20], ['cmnaDest', 'comuna de destino', 20]].forEach(function (L) {
      var v = esMarca(d[L[0]]) ? '' : L[0].indexOf('patente') === 0 ? limpiarPatente(d[L[0]]) : txt(d[L[0]]);
      if (v.length > L[2]) al('aviso', 'largo-' + L[0], L[0], 'La ' + L[1] + ' tiene ' + v.length + ' caracteres y el formato DTE admite ' + L[2] + '. Abrevia para que no se corte.', 'Formato DTE');
    });
    if (t && t.c >= 10) al('info', 'codigo-nuevo', 'tipo', 'El código ' + t.c + ' lo agrega el anexo de la resolución, pero el esquema XSD vigente del SII (06-02-2026) solo admite del 1 al 9. Confirma con tu sistema de facturación que ya lo acepta.', 'Formato DTE');

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
      else if (txt(i.unidad).length > 4) al('aviso', 'item-unidad-largo', 'items.' + k, 'Línea ' + n + ': la unidad de medida admite 4 caracteres en el formato DTE.', 'Formato DTE');
      if (txt(i.nombre).length > 80) al('aviso', 'item-nombre-largo', 'items.' + k, 'Línea ' + n + ': el nombre del producto tiene ' + txt(i.nombre).length + ' caracteres y el formato DTE admite 80; el resto va en la descripción.', 'Formato DTE');
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
  var COLS = ['nombre', 'documento', 'tipo', 'fchEmis', 'fchSalida', 'hraSalida', 'fchLlegada', 'dirOrigen', 'cmnaOrigen', 'dirDest', 'cmnaDest', 'rutTrans', 'rutChofer', 'nombreChofer', 'patente', 'patenteCarro', 'motivo', 'folio'];
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
    if (o.rutas !== undefined && !Array.isArray(o.rutas)) E.push('La lista «rutas» no tiene el formato esperado.');
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
    b.rutas = (Array.isArray(o.rutas) ? o.rutas : []).filter(function (r) { return r && typeof r === 'object'; }).map(normalizarRuta);
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

  // =====================================================================
  // FASE 2 · Carga en lote, rutas frecuentes, informe mensual y lector de XML
  // =====================================================================

  // ---------- Fechas escritas a la chilena ----------
  // Acepta AAAA-MM-DD, DD-MM-AAAA y DD/MM/AAAA. Devuelve AAAA-MM-DD o '' si no es una fecha real.
  function leerFecha(v) {
    var s = txt(v), m;
    if (esFecha(s)) return s;
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) { var f = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); return esFecha(f) ? f : ''; }
    return '';
  }
  function cabecera(s) { return sinTilde(s).replace(/\(.*?\)/g, '').replace(/[_\-.]/g, ' ').replace(/\s+/g, ' ').trim(); }

  // ---------- Carga de despachos en lote desde una planilla ----------
  // Una fila por línea de producto. Las filas con el mismo «nombre» forman un solo despacho.
  var ALIAS = {
    nombre: ['nombre', 'despacho', 'nombre despacho', 'referencia interna'], documento: ['documento', 'doc', 'tipo documento'],
    tipo: ['tipo', 'indtraslado', 'tipo traslado', 'tipo de traslado'], folio: ['folio'],
    fchEmis: ['fchemis', 'fecha emision', 'fecha de emision', 'emision'], fchSalida: ['fchsalida', 'fecha salida', 'fecha de salida', 'salida'],
    hraSalida: ['hrasalida', 'hora salida', 'hora de salida'], fchLlegada: ['fchllegada', 'fecha llegada', 'fecha de llegada', 'llegada'],
    dirOrigen: ['dirorigen', 'direccion origen', 'direccion de origen', 'origen'], cmnaOrigen: ['cmnaorigen', 'comuna origen', 'comuna de origen'],
    dirDest: ['dirdest', 'direccion destino', 'direccion de destino', 'destino'], cmnaDest: ['cmnadest', 'comuna destino', 'comuna de destino'],
    rutTrans: ['ruttrans', 'rut transportista', 'rut del transportista'], rutChofer: ['rutchofer', 'rut chofer', 'rut del chofer'],
    nombreChofer: ['nombrechofer', 'chofer', 'nombre chofer', 'nombre del chofer'], patente: ['patente', 'patente vehiculo'],
    patenteCarro: ['patentecarro', 'patente carro', 'patente del carro', 'carro'], motivo: ['motivo', 'motivo traslado', 'detalle traslado'],
    producto: ['producto', 'nmbitem', 'item', 'nombre item'], descripcion: ['descripcion', 'dscitem'], cantidad: ['cantidad', 'qtyitem', 'cant'],
    unidad: ['unidad', 'unmditem', 'unidad de medida'], precio: ['precio', 'prcitem', 'precio unitario'], peso: ['peso', 'peso kg', 'pesokg'], volumen: ['volumen', 'volumen m3', 'volumenm3']
  };
  var CAB_LOTE = ['nombre', 'documento', 'tipo', 'fchEmis', 'fchSalida', 'hraSalida', 'fchLlegada', 'dirOrigen', 'cmnaOrigen', 'dirDest', 'cmnaDest', 'rutTrans', 'rutChofer', 'nombreChofer', 'patente', 'patenteCarro', 'motivo', 'producto', 'cantidad', 'unidad', 'precio', 'peso', 'volumen'];
  function leerTipo(v) {
    var s = sinTilde(v); if (!s) return null;
    var n = Number(s.replace(/[^\d]/g, '')); if (/^\d+/.test(s) && traslado(n)) return n;
    for (var i = 0; i < TRASLADOS.length; i++) if (sinTilde(TRASLADOS[i].n) === s) return TRASLADOS[i].c;
    return null;
  }
  function leerDocumento(v) {
    var s = sinTilde(v); if (!s) return 'guia';
    if (/^(52|guia|guia de despacho|gd)$/.test(s)) return 'guia';
    if (/^(33|34|factura|factura electronica|factura exenta)$/.test(s)) return 'factura';
    return null;
  }
  function leerDespachosCSV(texto, hoy) {
    var filas = leerCSV(texto), o = { despachos: [], errores: [], avisos: [], filas: 0 };
    if (filas.length < 2) { o.errores.push('El archivo no tiene filas de datos.'); return o; }
    var cab = filas[0].map(cabecera), col = {};
    Object.keys(ALIAS).forEach(function (k) { for (var i = 0; i < cab.length; i++) if (ALIAS[k].indexOf(cab[i]) >= 0 || cab[i] === sinTilde(k)) { col[k] = i; break; } });
    if (col.producto === undefined && col.dirDest === undefined) { o.errores.push('No se reconocen las columnas. Descarga la plantilla de despachos y usa sus encabezados.'); return o; }
    var porNombre = {}, origenFila = {};
    filas.slice(1).forEach(function (f, k) {
      var n = k + 2, g = function (c) { return col[c] === undefined ? '' : txt(f[col[c]]); };
      o.filas++;
      var clave = g('nombre') || ('fila-' + n), d = porNombre[clave], nuevo = !d;
      if (nuevo) {
        d = despachoVacio(hoy); d.nombre = g('nombre') || ('Despacho de la fila ' + n);
        var doc = leerDocumento(g('documento')); if (doc === null) { o.avisos.push('Fila ' + n + ': documento «' + g('documento') + '» no reconocido; se dejó como guía.'); doc = 'guia'; } d.documento = doc;
        var tp = leerTipo(g('tipo')); if (g('tipo') && tp === null) o.avisos.push('Fila ' + n + ': tipo de traslado «' + g('tipo') + '» no reconocido; se dejó en 1 (venta). Revísalo.'); d.tipo = tp || 1;
        ['fchEmis', 'fchSalida', 'fchLlegada'].forEach(function (c) {
          var v = g(c); if (!v) { if (c === 'fchLlegada') d[c] = ''; return; }
          if (esMarca(v)) { d[c] = c === 'fchSalida' ? marcaNormal(v) : ''; return; }
          var fe = leerFecha(v); if (!fe) o.avisos.push('Fila ' + n + ': la fecha «' + v + '» no se entiende (usa DD-MM-AAAA).'); d[c] = fe;
        });
        ['hraSalida', 'dirOrigen', 'cmnaOrigen', 'dirDest', 'cmnaDest', 'nombreChofer', 'motivo', 'folio'].forEach(function (c) { d[c] = g(c); });
        ['rutTrans', 'rutChofer'].forEach(function (c) { var v = g(c); d[c] = esMarca(v) ? marcaNormal(v) : rutValido(v) ? formatoRut(v) : v; });
        ['patente', 'patenteCarro'].forEach(function (c) { var v = g(c); d[c] = esMarca(v) ? marcaNormal(v) : limpiarPatente(v); });
        d.items = []; porNombre[clave] = d; origenFila[clave] = n; o.despachos.push(d);
      } else {
        ['dirOrigen', 'dirDest', 'patente', 'rutChofer'].forEach(function (c) { var v = g(c); if (v && sinTilde(v).replace(/[\s.\-]/g, '') !== sinTilde(d[c]).replace(/[\s.\-]/g, '')) o.avisos.push('Fila ' + n + ': «' + c + '» distinto del de la fila ' + origenFila[clave] + ' en el mismo despacho; se mantuvo el primero.'); });
      }
      if (g('producto') || g('cantidad')) d.items.push({ nombre: g('producto'), desc: g('descripcion'), cant: g('cantidad'), unidad: (g('unidad') || 'UN').toUpperCase(), precio: g('precio'), peso: g('peso'), volumen: g('volumen') });
    });
    o.despachos.forEach(function (d) { if (!d.items.length) d.items = [itemVacio()]; });
    return o;
  }
  function plantillaDespachosCSV() {
    var F = [CAB_LOTE,
      ['Pedido 1041 ferretería', 'guia', '1', '02-12-2026', '02-12-2026', '08:30', '', 'Camino a Melipilla 1500', 'Maipú', 'Av. Cachapoal 220', 'Rancagua', '76123456-0', '12345678-5', 'Rosa Fuentes Araya', 'KXTR42', '', '', 'Tablero OSB 9 mm', '40', 'UN', '8990', '520', ''],
      ['Pedido 1041 ferretería', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Pino cepillado 2x4', '120', 'UN', '2490', '610', ''],
      ['Reposición sucursal', 'guia', '5', '02-12-2026', 'Diferido', '', '', 'Camino a Melipilla 1500', 'Maipú', 'Av. Cachapoal 220', 'Rancagua', '77777777-7', 'Diferido', 'Diferido', 'Diferido', '', 'De bodega central a sucursal para reposición', 'Clavos 3 pulgadas', '30', 'CJ', '', '750', '']];
    return '﻿' + F.map(function (f) { return f.map(celdaCSV).join(';'); }).join('\r\n');
  }

  // ---------- Rutas frecuentes (plantillas) ----------
  var CAMPOS_RUTA = ['documento', 'tipo', 'dirOrigen', 'cmnaOrigen', 'dirDest', 'cmnaDest', 'rutTrans', 'rutChofer', 'nombreChofer', 'patente', 'patenteCarro', 'motivo', 'parcial', 'sectorial'];
  function rutaDesde(d, nombre) {
    var r = { id: id(), nombre: txt(nombre) || txt(d.nombre) || [txt(d.cmnaOrigen), txt(d.cmnaDest)].filter(Boolean).join(' → ') || 'Ruta sin nombre', usos: 0 };
    CAMPOS_RUTA.forEach(function (k) { r[k] = d[k]; });
    r.items = (d.items || []).filter(function (i) { return txt(i.nombre); }).map(function (i) { return { nombre: txt(i.nombre), desc: txt(i.desc), cant: '', unidad: txt(i.unidad) || 'UN', precio: txt(i.precio), peso: '', volumen: '' }; });
    return r;
  }
  // Un despacho nuevo con los datos fijos de la ruta. Las cantidades y los pesos quedan vacíos: cambian en cada viaje.
  function despachoDesdeRuta(r, hoy) {
    var d = despachoVacio(hoy);
    CAMPOS_RUTA.forEach(function (k) { if (r[k] !== undefined) d[k] = typeof d[k] === 'boolean' ? !!r[k] : k === 'tipo' ? Number(r[k]) || 1 : txt(r[k]); });
    d.nombre = txt(r.nombre) + (esFecha(hoy) ? ' · ' + fechaCL(hoy) : '');
    d.items = (r.items || []).length ? r.items.map(function (i) { var m = itemVacio(); Object.keys(m).forEach(function (k) { if (i[k] !== undefined) m[k] = txt(i[k]); }); return m; }) : [itemVacio()];
    return d;
  }
  function normalizarRuta(x) {
    var r = { id: txt(x.id) || id(), nombre: txt(x.nombre) || 'Ruta sin nombre', usos: Math.max(0, Number(x.usos) || 0) };
    CAMPOS_RUTA.forEach(function (k) { r[k] = k === 'parcial' || k === 'sectorial' ? !!x[k] : k === 'tipo' ? Number(x[k]) || 1 : txt(x[k]); });
    r.items = (Array.isArray(x.items) ? x.items : []).filter(function (i) { return i && typeof i === 'object'; }).map(function (i) { var m = itemVacio(); Object.keys(m).forEach(function (k) { if (i[k] !== undefined) m[k] = txt(i[k]); }); return m; });
    return r;
  }

  // ---------- Informe mensual ----------
  function mesesCon(despachos) {
    var M = {}; (despachos || []).forEach(function (d) { if (esFecha(d.fchEmis)) M[d.fchEmis.slice(0, 7)] = 1; });
    return Object.keys(M).sort().reverse();
  }
  var NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function nombreMes(m) { return /^\d{4}-\d{2}$/.test(m) ? NOMBRES_MES[Number(m.slice(5)) - 1] + ' de ' + m.slice(0, 4) : m; }
  function contar(lista, clave) {
    var C = {}; lista.forEach(function (x) { var k = clave(x); if (k) C[k] = (C[k] || 0) + 1; });
    return Object.keys(C).map(function (k) { return { nombre: k, cantidad: C[k] }; }).sort(function (a, b) { return b.cantidad - a.cantidad || (a.nombre < b.nombre ? -1 : 1); });
  }
  function informe(despachos, mes, hoy) {
    var L = (despachos || []).filter(function (d) { return esFecha(d.fchEmis) && d.fchEmis.slice(0, 7) === mes; });
    var o = { mes: mes, titulo: nombreMes(mes), total: L.length, situacion: { borrador: 0, pendiente: 0, lista: 0, completada: 0 }, lineas: 0, pesoKg: 0, conDiferidos: 0,
      porTipo: [], rutas: [], choferes: [], vehiculos: [], transportistas: [], abiertos: [], completadas: [], diasCompletar: null, errores: [] };
    var R = L.map(function (d) { return { d: d, r: revisar(d), s: situacion(d) }; }), errs = {}, dias = [];
    R.forEach(function (x) {
      o.situacion[x.s]++;
      (x.d.items || []).forEach(function (i) { if (txt(i.nombre)) { o.lineas++; var p = num(i.peso); if (p !== null) o.pesoKg += p; } });
      if (x.r.diferidos.length) o.conDiferidos++;
      if (x.s === 'pendiente') o.abiertos.push({ id: x.d.id, nombre: txt(x.d.nombre) || [txt(x.d.cmnaOrigen), txt(x.d.cmnaDest)].join(' → '), folio: txt(x.d.folio), fchEmis: x.d.fchEmis, dias: esFecha(hoy) ? diasEntre(x.d.fchEmis, hoy) : null, faltan: x.r.diferidos.map(etiqueta) });
      if (x.s === 'completada' && x.d.completado) { o.completadas.push({ via: x.d.completado.via }); if (esFecha(x.d.completado.fecha)) dias.push(diasEntre(x.d.fchEmis, x.d.completado.fecha)); }
      x.r.alertas.forEach(function (a) { if (a.nivel !== 'error') return; var t = a.texto.replace(/^Línea \d+: /, ''); if (!errs[a.codigo]) errs[a.codigo] = { codigo: a.codigo, texto: t, cita: a.cita, cantidad: 0 }; errs[a.codigo].cantidad++; });
    });
    o.pesoKg = Math.round(o.pesoKg * 100) / 100;
    o.porTipo = contar(L, function (d) { var t = traslado(d.tipo); return t ? t.c + ' · ' + t.n : ''; });
    o.rutas = contar(L, function (d) { return [txt(d.cmnaOrigen), txt(d.cmnaDest)].filter(Boolean).join(' → '); });
    o.choferes = contar(L, function (d) { return esMarca(d.nombreChofer) ? '' : txt(d.nombreChofer); });
    o.vehiculos = contar(L, function (d) { return esMarca(d.patente) ? '' : limpiarPatente(d.patente); });
    o.transportistas = contar(L, function (d) { return esMarca(d.rutTrans) || !txt(d.rutTrans) ? '' : formatoRut(d.rutTrans); });
    o.completadas = contar(o.completadas, function (c) { return c.via; });
    o.abiertos.sort(function (a, b) { return (b.dias || 0) - (a.dias || 0); });
    o.diasCompletar = dias.length ? Math.round(dias.reduce(function (s, x) { return s + x; }, 0) / dias.length * 10) / 10 : null;
    o.errores = Object.keys(errs).map(function (k) { return errs[k]; }).sort(function (a, b) { return b.cantidad - a.cantidad; });
    return o;
  }

  // ---------- Lector de XML (sin DOM, funciona igual en el navegador y en Node) ----------
  // Lector mínimo y estricto en el cierre de etiquetas. Rechaza DOCTYPE (no hace falta en un DTE y evita entidades externas).
  function entidades(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, function (m, e) {
      var l = e.toLowerCase();
      if (l === 'lt') return '<'; if (l === 'gt') return '>'; if (l === 'amp') return '&'; if (l === 'quot') return '"'; if (l === 'apos') return "'";
      var c = l.charAt(1) === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10);
      return isFinite(c) && c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m;
    });
  }
  function local(n) { var i = n.indexOf(':'); return i < 0 ? n : n.slice(i + 1); }
  function parsearXML(s) {
    s = String(s || '').replace(/^﻿/, '');
    var raiz = { n: '#doc', a: {}, c: [], t: '' }, pila = [raiz], re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE|<\/\s*([^\s>]+)\s*>|<([^\s\/>!?]+)((?:\s+[^\s=\/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)|(<)/g, m;
    while ((m = re.exec(s))) {
      var top = pila[pila.length - 1];
      if (m[0] === '<!DOCTYPE') throw new Error('El XML trae una declaración DOCTYPE; un documento tributario no la usa.');
      if (m[1] !== undefined) top.t += m[1];
      else if (m[2] !== undefined) {
        if (pila.length < 2 || local(m[2]) !== top.n) throw new Error('XML mal formado: se cierra <' + m[2] + '> sin haberse abierto' + (pila.length > 1 ? ' (estaba abierto <' + top.n + '>)' : '') + '.');
        pila.pop();
      } else if (m[3] !== undefined) {
        var nodo = { n: local(m[3]), a: {}, c: [], t: '' }, ra = /([^\s=\/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, x;
        while ((x = ra.exec(m[4] || ''))) nodo.a[local(x[1])] = entidades(x[2] !== undefined ? x[2] : x[3]);
        top.c.push(nodo); if (!m[5]) pila.push(nodo);
      } else if (m[6] !== undefined) top.t += entidades(m[6]);
      else if (m[7] !== undefined) throw new Error('XML mal formado: hay un «<» suelto.');
    }
    if (pila.length > 1) throw new Error('XML incompleto: falta cerrar <' + pila[pila.length - 1].n + '>.');
    if (!raiz.c.length) throw new Error('El archivo no contiene XML.');
    return raiz;
  }
  function hijos(n, nombre) { return n ? n.c.filter(function (h) { return h.n === nombre; }) : []; }
  function nodo(n, ruta) { var p = ruta.split('/'); for (var i = 0; i < p.length && n; i++) n = hijos(n, p[i])[0]; return n || null; }
  function valor(n, ruta) { var x = nodo(n, ruta); return x ? txt(x.t) : ''; }
  function todos(n, nombre, out) { out = out || []; if (!n) return out; n.c.forEach(function (h) { if (h.n === nombre) out.push(h); else todos(h, nombre, out); }); return out; }
  function primero(n, nombre) { return todos(n, nombre)[0] || null; }

  // Decodifica los bytes del archivo según la codificación declarada (los DTE del SII suelen ir en ISO-8859-1).
  function decodificar(bytes) {
    var u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), cab = '';
    for (var i = 0; i < Math.min(u.length, 200); i++) cab += String.fromCharCode(u[i]);
    var m = cab.match(/encoding\s*=\s*["']([A-Za-z0-9._\-]+)["']/), enc = m ? m[1].toLowerCase() : 'utf-8';
    if (/^(iso-?8859-?1|latin-?1)$/.test(enc)) enc = 'iso-8859-1';
    try { return new TextDecoder(enc).decode(u); } catch (e) { return new TextDecoder('utf-8').decode(u); }
  }

  var TIPOS_DTE = { 33: 'Factura electrónica', 34: 'Factura no afecta o exenta electrónica', 46: 'Factura de compra electrónica', 52: 'Guía de despacho electrónica' };
  // Lee un XML con uno o varios DTE (un DTE suelto, un EnvioDTE o un archivo con varios) y arma un despacho por cada documento.
  function leerXMLDTE(texto, hoy) {
    var o = { documentos: [], errores: [] }, raiz;
    try { raiz = parsearXML(texto); } catch (e) { o.errores.push(e.message); return o; }
    var docs = todos(raiz, 'Documento');
    if (!docs.length) { o.errores.push('No se encontró ningún <Documento> de un DTE. ¿Es el XML de una guía o una factura electrónica?'); return o; }
    docs.forEach(function (D) {
      var E = nodo(D, 'Encabezado'), tipoDTE = Number(valor(E, 'IdDoc/TipoDTE')), extra = [];
      function nota(nivel, codigo, texto) { extra.push({ nivel: nivel, codigo: codigo, campo: 'xml', texto: texto, cita: 'Formato DTE' }); }
      var d = despachoVacio(''), T = nodo(E, 'Transporte'), ch = nodo(T, 'Chofer');
      d.folio = valor(E, 'IdDoc/Folio');
      d.documento = tipoDTE === 52 ? 'guia' : 'factura';
      var ind = valor(E, 'IdDoc/IndTraslado');
      d.tipo = Number(ind) || (tipoDTE === 52 ? 0 : 1);
      d.fchEmis = valor(E, 'IdDoc/FchEmis');
      d.dirOrigen = valor(E, 'Emisor/DirOrigen'); d.cmnaOrigen = valor(E, 'Emisor/CmnaOrigen');
      d.dirDest = valor(T, 'DirDest'); d.cmnaDest = valor(T, 'CmnaDest');
      d.rutTrans = valor(T, 'RUTTrans'); d.patente = valor(T, 'Patente');
      d.rutChofer = valor(ch, 'RUTChofer'); d.nombreChofer = valor(ch, 'NombreChofer');
      // Campos que agrega la Resolución 144 (nombres según su anexo). Se buscan dentro del encabezado.
      // En el esquema vigente (DTE_v10.xsd, 06-02-2026) cuelgan de <Transporte>; si un software los pone en otro lugar del encabezado, igual se leen.
      function enc(nombre) { var x = nodo(T, nombre) || primero(E, nombre); return x ? txt(x.t) : ''; }
      d.fchSalida = enc('FchSalida'); d.hraSalida = enc('HraSalida'); d.fchLlegada = enc('FchLlegada'); d.patenteCarro = enc('PatenteCarro');
      if (d.hraSalida && /^\d{2}:\d{2}:\d{2}$/.test(d.hraSalida)) d.hraSalida = d.hraSalida.slice(0, 5);
      d.items = hijos(D, 'Detalle').map(function (x) {
        var dsc = valor(x, 'DscItem'), peso = (dsc.match(/peso\s*:?\s*([\d.,]+)\s*kg/i) || [])[1] || '', vol = (dsc.match(/volumen\s*:?\s*([\d.,]+)\s*m/i) || [])[1] || '';
        var q = num(valor(x, 'QtyItem')), p = num(valor(x, 'PrcItem')), mt = num(valor(x, 'MontoItem'));
        if (q !== null && p !== null && mt !== null && Math.abs(q * p - mt) > Math.max(1, mt * 0.001) && !nodo(x, 'DescuentoMonto') && !nodo(x, 'RecargoMonto'))
          nota('aviso', 'xml-monto', 'Línea ' + valor(x, 'NroLinDet') + ': cantidad × precio (' + Math.round(q * p) + ') no coincide con el monto de la línea (' + mt + ').');
        return { nombre: valor(x, 'NmbItem'), desc: dsc, cant: valor(x, 'QtyItem'), unidad: valor(x, 'UnmdItem') || '', precio: valor(x, 'PrcItem'), peso: peso, volumen: vol };
      });
      if (!d.items.length) d.items = [itemVacio()];
      var refs = hijos(D, 'Referencia').filter(function (r) { return valor(r, 'TpoDocRef') && valor(r, 'TpoDocRef').toUpperCase() !== 'SET'; });
      if (refs.length) { var r = refs[0]; d.ref = { tipo: valor(r, 'TpoDocRef'), folio: valor(r, 'FolioRef'), fecha: valor(r, 'FchRef'), razon: valor(r, 'RazonRef'), rutOtr: valor(r, 'RUTOtr') }; }
      var emisor = { rut: valor(E, 'Emisor/RUTEmisor'), nombre: valor(E, 'Emisor/RznSoc') }, receptor = { rut: valor(E, 'Receptor/RUTRecep'), nombre: valor(E, 'Receptor/RznSocRecep'), dir: valor(E, 'Receptor/DirRecep'), comuna: valor(E, 'Receptor/CmnaRecep') };
      d.nombre = (TIPOS_DTE[tipoDTE] ? (tipoDTE === 52 ? 'Guía' : 'Factura') : 'DTE ' + (tipoDTE || '?')) + ' N° ' + (d.folio || 's/f') + (receptor.nombre ? ' · ' + receptor.nombre : '');

      if (!TIPOS_DTE[tipoDTE]) nota('error', 'xml-tipo', 'El documento es de tipo ' + (tipoDTE || 'desconocido') + ': no es guía de despacho (52) ni factura (33, 34 o 46). Se revisa igual, pero la resolución apunta a guías y facturas que amparan traslados.');
      if (tipoDTE === 52 && !ind) nota('error', 'xml-indtraslado', 'La guía no trae IndTraslado (tipo de traslado). Es obligatorio en la guía de despacho.');
      if (tipoDTE !== 52 && !ind) nota('info', 'xml-factura-sin-ind', 'La factura no trae IndTraslado; se revisó como «Operación constituye venta» (1).');
      if (!T) nota(tipoDTE === 52 ? 'error' : 'aviso', 'xml-sin-transporte', tipoDTE === 52 ? 'La guía no trae el bloque <Transporte>: faltan destino, chofer, transportista y patente.' : 'La factura no trae el bloque <Transporte>. Si ampara un traslado, debe llevar los datos de transporte; si el cliente retiró en tu local, no hacen falta.');
      if (!d.dirDest && receptor.dir) nota('info', 'xml-dir-receptor', 'El destino no viene en <Transporte>; la dirección del receptor (' + receptor.dir + (receptor.comuna ? ', ' + receptor.comuna : '') + ') no reemplaza el destino efectivo del traslado.');
      if (!d.fchSalida) d.fchSalida = '';
      var rv = revisar(d);
      if (!d.fchSalida) rv.alertas = rv.alertas.map(function (a) { return a.codigo === 'salida' ? Object.assign({}, a, { texto: 'El XML no trae fecha de salida (FchSalida). La resolución la exige; si no hay certeza, debe ir «Diferido» o «Sin Dato».' }) : a; });
      var alertas = extra.concat(rv.alertas.filter(function (a) { return a.codigo !== 'un-vehiculo' && !(a.codigo === 'tipo' && tipoDTE === 52 && !ind); }));
      var errores = alertas.filter(function (a) { return a.nivel === 'error'; }).length;
      o.documentos.push({ tipoDTE: tipoDTE, tipoNombre: TIPOS_DTE[tipoDTE] || 'Otro documento', folio: d.folio, fchEmis: d.fchEmis, emisor: emisor, receptor: receptor,
        despacho: d, alertas: alertas, errores: errores, avisos: alertas.filter(function (a) { return a.nivel === 'aviso'; }).length, diferidos: rv.diferidos, cumple: !errores });
    });
    return o;
  }
  // XML de ejemplo: un sobre con dos documentos ficticios. La guía cumple; la factura trae errores a propósito.
  function xmlEjemplo(hoy) {
    var f = esFecha(hoy) ? hoy : '2026-12-02', m = sumar(f, 1);
    function dte(id, cuerpo) { return '<DTE version="1.0"><Documento ID="' + id + '">' + cuerpo + '</Documento></DTE>'; }
    var emisor = '<Emisor><RUTEmisor>76123456-0</RUTEmisor><RznSoc>Maderas del Sur SpA (ejemplo)</RznSoc><GiroEmis>Venta de maderas</GiroEmis><Acteco>466301</Acteco><DirOrigen>Camino a Melipilla 1500</DirOrigen><CmnaOrigen>Maipú</CmnaOrigen></Emisor>';
    var guia = dte('G1041', '<Encabezado><IdDoc><TipoDTE>52</TipoDTE><Folio>1041</Folio><FchEmis>' + f + '</FchEmis><TipoDespacho>2</TipoDespacho><IndTraslado>1</IndTraslado></IdDoc>' + emisor +
      '<Receptor><RUTRecep>77777777-7</RUTRecep><RznSocRecep>Ferretería El Roble Ltda. (ejemplo)</RznSocRecep><DirRecep>Av. Cachapoal 220</DirRecep><CmnaRecep>Rancagua</CmnaRecep></Receptor>' +
      '<Transporte><Patente>KXTR42</Patente><RUTTrans>76123456-0</RUTTrans><Chofer><RUTChofer>12345678-5</RUTChofer><NombreChofer>Rosa Fuentes Araya</NombreChofer></Chofer><DirDest>Av. Cachapoal 220</DirDest><CmnaDest>Rancagua</CmnaDest><FchSalida>' + f + '</FchSalida><HraSalida>08:30:00</HraSalida></Transporte>' +
      '<Totales><MntNeto>658400</MntNeto><TasaIVA>19</TasaIVA><IVA>125096</IVA><MntTotal>783496</MntTotal></Totales></Encabezado>' +
      '<Detalle><NroLinDet>1</NroLinDet><NmbItem>Tablero OSB 9 mm</NmbItem><DscItem>Peso: 520 kg</DscItem><QtyItem>40</QtyItem><UnmdItem>UN</UnmdItem><PrcItem>8990</PrcItem><MontoItem>359600</MontoItem></Detalle>' +
      '<Detalle><NroLinDet>2</NroLinDet><NmbItem>Pino cepillado 2x4</NmbItem><DscItem>3,2 m · Peso: 610 kg</DscItem><QtyItem>120</QtyItem><UnmdItem>UN</UnmdItem><PrcItem>2490</PrcItem><MontoItem>298800</MontoItem></Detalle>');
    var factura = dte('F2210', '<Encabezado><IdDoc><TipoDTE>33</TipoDTE><Folio>2210</Folio><FchEmis>' + f + '</FchEmis></IdDoc>' + emisor +
      '<Receptor><RUTRecep>11111111-1</RUTRecep><RznSocRecep>Constructora Los Aromos (ejemplo)</RznSocRecep><DirRecep>Los Aromos 77</DirRecep><CmnaRecep>Temuco</CmnaRecep></Receptor>' +
      '<Transporte><RUTTrans>77777777-7</RUTTrans><DirDest>Los Aromos 77</DirDest><CmnaDest>Temuco</CmnaDest><FchSalida>' + f + '</FchSalida><FchLlegada>' + m + '</FchLlegada></Transporte>' +
      '<Totales><MntNeto>450000</MntNeto><TasaIVA>19</TasaIVA><IVA>85500</IVA><MntTotal>535500</MntTotal></Totales></Encabezado>' +
      '<Detalle><NroLinDet>1</NroLinDet><NmbItem>Terciado estructural 15 mm</NmbItem><QtyItem>50</QtyItem><UnmdItem>UN</UnmdItem><PrcItem>9500</PrcItem><MontoItem>450000</MontoItem></Detalle>' +
      '<Referencia><NroLinRef>1</NroLinRef><TpoDocRef>801</TpoDocRef><FolioRef>OC-5531</FolioRef><FchRef>' + f + '</FchRef><RazonRef>Orden de compra</RazonRef></Referencia>');
    return '<?xml version="1.0" encoding="ISO-8859-1"?>\n<EnvioDTE xmlns="http://www.sii.cl/SiiDte" version="1.0"><SetDTE ID="SetEjemplo"><Caratula version="1.0"><RutEmisor>76123456-0</RutEmisor><TmstFirmaEnv>' + f + 'T09:00:00</TmstFirmaEnv></Caratula>' + guia + factura + '</SetDTE></EnvioDTE>';
  }
  // Agrega al estado los despachos leídos desde XML, sin duplicar documentos ya cargados (mismo tipo y folio).
  function agregarDesdeXML(est, documentos) {
    var ya = {}, n = 0, rep = 0;
    est.despachos.forEach(function (d) { if (txt(d.folio)) ya[d.documento + '|' + txt(d.folio)] = 1; });
    documentos.forEach(function (x) {
      var k = x.despacho.documento + '|' + txt(x.despacho.folio);
      if (txt(x.despacho.folio) && ya[k]) { rep++; return; }
      var d = JSON.parse(JSON.stringify(x.despacho)); d.id = id(); if (!d.tipo) d.tipo = 1; est.despachos.push(d); ya[k] = 1; n++;
    });
    return { agregados: n, repetidos: rep };
  }

  var api = {
    FUENTE: FUENTE, NOTICIA: NOTICIA, NOTICIA2: NOTICIA2, HITOS: HITOS, TRASLADOS: TRASLADOS, MARCAS: MARCAS, UNIDADES: UNIDADES,
    txt: txt, id: id, esFecha: esFecha, esHora: esHora, diasEntre: diasEntre, fechaCL: fechaCL, num: num, esMarca: esMarca, sumar: sumar,
    dvRut: dvRut, limpiarRut: limpiarRut, rutValido: rutValido, formatoRut: formatoRut, limpiarPatente: limpiarPatente, patenteHabitual: patenteHabitual,
    diagnostico: diagnostico, estadoVacio: estadoVacio, despachoVacio: despachoVacio, itemVacio: itemVacio, traslado: traslado,
    revisar: revisar, etiqueta: etiqueta, situacion: situacion, completar: completar, campos: campos, hoja: hoja, pedirDatos: pedirDatos,
    despachosCSV: despachosCSV, leerCSV: leerCSV, leerLibretaCSV: leerLibretaCSV, hitos: hitos, ics: ics,
    validarEstado: validarEstado, normalizar: normalizar, ejemplo: ejemplo,
    // Fase 2
    leerFecha: leerFecha, leerTipo: leerTipo, leerDocumento: leerDocumento, leerDespachosCSV: leerDespachosCSV, plantillaDespachosCSV: plantillaDespachosCSV,
    rutaDesde: rutaDesde, despachoDesdeRuta: despachoDesdeRuta, normalizarRuta: normalizarRuta,
    mesesCon: mesesCon, nombreMes: nombreMes, informe: informe,
    parsearXML: parsearXML, decodificar: decodificar, leerXMLDTE: leerXMLDTE, agregarDesdeXML: agregarDesdeXML, xmlEjemplo: xmlEjemplo, TIPOS_DTE: TIPOS_DTE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuiaLista = api;
})(this);
