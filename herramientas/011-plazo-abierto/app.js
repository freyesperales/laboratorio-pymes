/* Plazo Abierto · interfaz. La lógica vive en logica.js (global PlazoAbierto). */
(function () {
  'use strict';
  var P = window.PlazoAbierto, CLAVE = 'plazo-abierto-v1';
  var VISTAS = [['tienda', 'Tu tienda'], ['ventas', 'Ventas'], ['plazos', 'Plazos'], ['dinero', 'Dinero en juego'], ['politica', 'Política y mensajes']];
  var ETQ = { 'abierto': 'Plazo abierto', 'cerrado': 'Plazo cerrado', 'sin-iniciar': 'Sin recibir', 'no-aplica': 'Sin derecho legal', 'excluido': 'Excluido', 'ejercido': 'Pidió devolución' };
  var est, vista = 'tienda', filtro = 'todos', editando = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function L() { return P.LEY[est.tienda.pais] || P.LEY.CL; }
  function plata(n) { return P.dinero(n, est.tienda.pais); }
  function cargar() {
    try { var t = localStorage.getItem(CLAVE); if (t) return P.leerRespaldo(t); } catch (e) { /* sin almacenamiento o dañado */ }
    return { tienda: P.tiendaVacia(), pedidos: [] };
  }
  function guardar() { try { localStorage.setItem(CLAVE, P.respaldo(est)); } catch (e) { aviso('No se pudo guardar en este navegador (modo privado o sin espacio). Exporta un respaldo.', true); } }
  function aviso(t, mal) { var m = $('#msg'); m.className = mal ? 'err' : 'ok'; m.textContent = t; clearTimeout(aviso.t); aviso.t = setTimeout(function () { m.textContent = ''; m.className = ''; }, 6000); }
  function descargar(nombre, txt, tipo) {
    var b = new Blob([txt], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copiar(t, okMsg) {
    function plan() { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* nada */ } a.remove(); aviso(ok ? okMsg : 'No se pudo copiar: selecciona el texto y cópialo a mano.', !ok); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { aviso(okMsg); }, plan); else plan();
  }
  function cambio() { guardar(); pintarEstado(); }
  function buscar(id) { for (var i = 0; i < est.pedidos.length; i++) if (est.pedidos[i].id === id) return est.pedidos[i]; return null; }
  function calc(p) { return P.calcularPedido(p, est.tienda, hoy()); }

  // ---------- Pestañas y barra de estado ----------
  function pintarTabs() {
    $('#tabs').innerHTML = VISTAS.map(function (v, i) {
      return '<li><button type="button" role="tab" id="t-' + v[0] + '" aria-controls="v-' + v[0] + '" aria-selected="' + (v[0] === vista) + '" tabindex="' + (v[0] === vista ? 0 : -1) + '" data-v="' + v[0] + '"><span class="n">' + (i + 1) + '.</span> ' + v[1] + '</button></li>';
    }).join('');
  }
  function ir(v) { vista = v; pintarTabs(); VISTAS.forEach(function (x) { $('#v-' + x[0]).hidden = x[0] !== v; }); pintar(); }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) ir(b.dataset.v); });
  $('#tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = VISTAS.findIndex(function (x) { return x[0] === vista; }) + (e.key === 'ArrowRight' ? 1 : -1);
    i = (i + VISTAS.length) % VISTAS.length; ir(VISTAS[i][0]); $('#t-' + VISTAS[i][0]).focus();
  });
  function pintarEstado() {
    if (!est.pedidos.length) { $('#estado').innerHTML = '<span>' + esc(L().nombre) + ' · aún no hay ventas. Agrégalas en «Ventas» o prueba el ejemplo.</span>'; return; }
    var e = P.exposicion(est.pedidos, est.tienda, hoy()), urg = 0;
    est.pedidos.forEach(function (p) { if (calc(p).alertas.some(function (a) { return a.nivel === 'error'; })) urg++; });
    var h = '<span class="pill a">' + plata(e.abierto + e.sinIniciar) + ' todavía devolvible</span>';
    if (e.nAlargados) h += '<span class="pill e">' + e.nAlargados + (e.nAlargados === 1 ? ' pedido con plazo alargado' : ' pedidos con plazo alargado') + '</span>';
    if (urg) h += '<span class="pill e">' + urg + (urg === 1 ? ' con error o reembolso vencido' : ' con errores o reembolsos vencidos') + '</span>';
    h += '<span class="pill k">' + plata(e.firme) + ' firme</span>';
    $('#estado').innerHTML = h;
  }
  function pintar() { ({ tienda: vTienda, ventas: vVentas, plazos: vPlazos, dinero: vDinero, politica: vPolitica })[vista](); pintarEstado(); }

  // ---------- 1. Tu tienda ----------
  function campo(id, et, v, extra) { return '<div><label for="' + id + '">' + et + '</label><input id="' + id + '" value="' + esc(v) + '"' + (extra || '') + '></div>'; }
  function vTienda() {
    var t = est.tienda, es = t.pais === 'ES', Ly = L();
    var h = '<h2>Tu tienda</h2><p class="sub">Las reglas cambian según el país desde el que vendes y según si cumples un paso formal que casi nadie conoce.</p>';
    h += '<fieldset style="border:0;padding:0;margin:12px 0 0"><legend style="font-weight:700;margin-bottom:6px">¿Desde qué país vendes?</legend><div class="radios">' +
      '<label><input type="radio" name="pais" value="CL"' + (es ? '' : ' checked') + '> Chile</label>' +
      '<label><input type="radio" name="pais" value="ES"' + (es ? ' checked' : '') + '> España</label></div></fieldset>';
    h += '<div class="reglas">' +
      '<div class="regla-c"><b>' + Ly.diasBase + ' días</b><span>' + (es ? 'naturales para desistir, desde que el cliente recibe el último producto del pedido' : 'corridos para retractarse, desde que el cliente recibe el producto') + ' · ' + esc(Ly.citaRetracto) + '</span></div>' +
      '<div class="regla-c"><b>' + (es ? '+12 meses' : '90 días') + '</b><span>' + (es ? 'si no informaste del derecho ni entregaste el formulario' : 'si no enviaste la confirmación escrita con copia del contrato') + ' · ' + esc(Ly.citaAlargue) + '</span></div>' +
      '<div class="regla-c"><b>' + Ly.reembolsoDias + ' días</b><span>para devolver el dinero desde que el cliente te avisa · ' + esc(Ly.citaReembolso) + '</span></div></div>';
    h += '<h3>El paso formal</h3>';
    if (es) h += '<div class="radios" role="radiogroup" aria-label="Informas del desistimiento"><label><input type="radio" name="paso" value="si"' + (t.informa !== false ? ' checked' : '') + '> Sí: antes de la compra informo del derecho y entrego el formulario de desistimiento</label><label><input type="radio" name="paso" value="no"' + (t.informa === false ? ' checked' : '') + '> No, o no estoy seguro</label></div>';
    else h += '<div class="radios" role="radiogroup" aria-label="Envías confirmación escrita"><label><input type="radio" name="paso" value="si"' + (t.confirmacion !== false ? ' checked' : '') + '> Sí: después de cada venta envío por escrito la confirmación con una copia completa de las condiciones</label><label><input type="radio" name="paso" value="no"' + (t.confirmacion === false ? ' checked' : '') + '> No, o no estoy seguro</label></div>';
    h += '<p class="sub">' + (es ? 'Si no lo haces, el plazo de 14 días se alarga 12 meses (art. 105). Si lo informas después, corren 14 días desde que el cliente recibe la información.' : 'Un correo automático de «gracias por tu compra» sin las condiciones no basta: la ley pide una copia íntegra, clara y legible del contrato (art. 12 A).') + ' Puedes corregirlo pedido por pedido en «Ventas».</p>';
    h += '<h3>Datos para tu política</h3><div class="grid">' + campo('t-nombre', 'Nombre de la tienda', t.nombre) + campo('t-id', es ? 'NIF' : 'RUT', t.id) + campo('t-correo', 'Correo para devoluciones', t.correo, ' type="email"') +
      campo('t-dir', 'Dirección', t.direccion) + campo('t-web', 'Web o red social', t.web) +
      '<div><label for="t-costo">¿Quién paga el envío de vuelta?</label><select id="t-costo"><option value="cliente"' + (t.costoDevolucion !== 'tienda' ? ' selected' : '') + '>El cliente</option><option value="tienda"' + (t.costoDevolucion === 'tienda' ? ' selected' : '') + '>La tienda</option></select></div>' +
      campo('t-extra', 'Días extra que regalas (opcional)', t.diasExtra || '', ' inputmode="numeric"') + '</div>';
    h += '<p class="sub">Los días extra solo aparecen en tu política: los plazos legales de la pestaña «Plazos» no cambian.</p>';
    h += '<div class="acc"><button class="b prim" type="button" data-ir="ventas">Seguir a Ventas</button></div>';
    $('#v-tienda').innerHTML = h;
  }
  $('#v-tienda').addEventListener('change', function (e) {
    var t = est.tienda, el = e.target;
    if (el.name === 'pais') { t.pais = el.value; cambio(); vTienda(); aviso('Reglas de ' + L().nombre + ' activadas.'); return; }
    if (el.name === 'paso') { if (t.pais === 'ES') t.informa = el.value === 'si'; else t.confirmacion = el.value === 'si'; cambio(); return; }
  });
  $('#v-tienda').addEventListener('input', function (e) {
    var m = { 't-nombre': 'nombre', 't-id': 'id', 't-correo': 'correo', 't-dir': 'direccion', 't-web': 'web', 't-costo': 'costoDevolucion', 't-extra': 'diasExtra' }[e.target.id];
    if (m) { est.tienda[m] = e.target.value; cambio(); }
  });

  // ---------- 2. Ventas ----------
  function opcionesExclusion(v) {
    var ex = L().exclusiones, h = '<option value="">Ninguna</option>';
    Object.keys(ex).forEach(function (k) { h += '<option value="' + k + '"' + (v === k ? ' selected' : '') + '>' + esc(ex[k].texto) + '</option>'; });
    if (v && !ex[v]) h += '<option value="' + esc(v) + '" selected>(no corresponde a este país)</option>';
    return h;
  }
  function formPedido(p) {
    var es = est.tienda.pais === 'ES', sel = function (v, o) { return v === o ? ' selected' : ''; };
    return '<form class="form-ped" id="f-ped" data-id="' + esc(p.id) + '"><h3 style="margin-top:0">' + (buscar(p.id) ? 'Editar venta ' + esc(p.numero) : 'Nueva venta') + '</h3><div class="grid">' +
      campo('p-numero', 'N° de pedido', p.numero) + campo('p-cliente', 'Cliente', p.cliente) + campo('p-monto', 'Monto', p.monto, ' inputmode="decimal"') +
      '<div><label for="p-compra">Fecha de compra</label><input type="date" id="p-compra" value="' + esc(p.fechaCompra) + '" required></div>' +
      '<div><label for="p-recep">Fecha en que lo recibió</label><input type="date" id="p-recep" value="' + esc(p.fechaRecepcion) + '"></div>' +
      '<div><label for="p-tipo">Qué vendiste</label><select id="p-tipo"><option value="bien"' + sel(p.tipo, 'bien') + '>Producto</option><option value="servicio"' + sel(p.tipo, 'servicio') + '>Servicio</option><option value="digital"' + sel(p.tipo, 'digital') + '>Contenido digital</option></select></div>' +
      '<div><label for="p-canal">Dónde compró</label><select id="p-canal"><option value="distancia"' + sel(p.canal, 'distancia') + '>Internet, WhatsApp, redes o catálogo</option>' + (es ? '' : '<option value="presencial-sin-acceso"' + sel(p.canal, 'presencial-sin-acceso') + '>En el local, sin ver el producto</option>') + '<option value="presencial"' + sel(p.canal, 'presencial') + '>En el local, viendo el producto</option></select></div>' +
      '<div><label for="p-excl">Excepción legal</label><select id="p-excl">' + opcionesExclusion(p.exclusion) + '</select></div>' +
      '<div><label for="p-paso">' + (es ? '¿Informaste del desistimiento?' : '¿Enviaste la confirmación escrita?') + '</label><select id="p-paso"><option value=""' + sel(p.paso, '') + '>Según lo que dice la tienda</option><option value="si"' + sel(p.paso, 'si') + '>Sí, en este pedido</option><option value="no"' + sel(p.paso, 'no') + '>No, en este pedido</option></select></div>' +
      campo('p-gar', 'Garantía propia en meses (opcional)', p.garantiaMeses, ' inputmode="numeric"') +
      '<div><label for="p-retr">El cliente pidió devolver el</label><input type="date" id="p-retr" value="' + esc(p.fechaRetracto) + '"></div>' +
      '<div><label class="check"><input type="checkbox" id="p-reemb"' + (p.reembolsado ? ' checked' : '') + '> Ya le devolví el dinero</label>' + (es ? '<label class="check"><input type="checkbox" id="p-2mano"' + (p.segundaMano ? ' checked' : '') + '> Producto de segunda mano</label>' : '') + '</div>' +
      '</div><div><label for="p-notas">Notas</label><input id="p-notas" value="' + esc(p.notas) + '"></div>' +
      '<div class="acc"><button class="b prim" type="submit">Guardar venta</button><button class="b" type="button" id="p-cancelar">Cancelar</button></div></form>';
  }
  function leerForm() {
    var p = Object.assign({}, buscar(editando.id) || editando), v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    p.numero = v('p-numero'); p.cliente = v('p-cliente'); p.monto = v('p-monto') === '' ? '' : (P.num(v('p-monto')) == null ? v('p-monto') : P.num(v('p-monto')));
    p.fechaCompra = v('p-compra'); p.fechaRecepcion = v('p-recep'); p.tipo = v('p-tipo'); p.canal = v('p-canal'); p.exclusion = v('p-excl'); p.paso = v('p-paso');
    p.garantiaMeses = v('p-gar'); p.fechaRetracto = v('p-retr'); p.reembolsado = $('#p-reemb').checked; p.segundaMano = $('#p-2mano') ? $('#p-2mano').checked : false; p.notas = v('p-notas');
    return p;
  }
  function vVentas() {
    var h = '<h2>Ventas</h2><p class="sub">Anota cada venta con su fecha de compra y la fecha en que el cliente la recibió. También puedes subir la planilla de pedidos de tu tienda (CSV) o pegarla.</p>';
    h += '<div class="acc"><button class="b prim" type="button" id="nueva">Agregar venta</button><label class="b archivo">Subir planilla CSV<input type="file" id="imp-csv" accept=".csv,text/csv,.txt"></label><button class="b" type="button" id="ver-pegar" aria-expanded="false" aria-controls="pegar">Pegar desde la planilla</button></div>';
    h += '<div id="pegar" hidden><label for="txt-csv">Copia las filas de tu planilla, con la fila de encabezados, y pégalas aquí</label><textarea id="txt-csv" placeholder="pedido;cliente;fecha;entrega;total&#10;1001;Ana;27-11-2026;30-11-2026;12990"></textarea><div class="acc"><button class="b" type="button" id="imp-pegado">Importar lo pegado</button></div></div>';
    h += '<p class="sub">Columnas que reconoce: número de pedido, cliente, fecha de compra (o «created at»), fecha de entrega o recepción, total. Si un pedido aparece en varias filas (una por producto), se suma en una sola venta.</p>';
    h += '<div id="form-zona">' + (editando ? formPedido(editando) : '') + '</div>';
    if (!est.pedidos.length) h += '<p class="vacio">Todavía no hay ventas. Usa «Probar con un ejemplo» abajo para ver cómo funciona.</p>';
    else {
      h += '<div class="tabla"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Compra</th><th>Recibido</th><th class="num">Monto</th><th>Plazo</th><th><span class="saltar">Acciones</span></th></tr></thead><tbody>';
      est.pedidos.slice().sort(function (a, b) { return (b.fechaCompra || '').localeCompare(a.fechaCompra || ''); }).forEach(function (p) {
        var c = calc(p);
        h += '<tr><td>' + esc(p.numero) + '</td><td>' + esc(p.cliente) + '</td><td>' + esc(P.fechaCorta(p.fechaCompra) || p.fechaCompra) + '</td><td>' + (p.fechaRecepcion ? esc(P.fechaCorta(p.fechaRecepcion)) : '<button class="b chico" type="button" data-recibido="' + esc(p.id) + '">Recibido hoy</button>') + '</td><td class="num">' + plata(c.monto) + '</td><td><span class="tag t-' + c.retracto.estado + '">' + esc(ETQ[c.retracto.estado] || '—') + '</span></td>' +
          '<td><button class="b chico" type="button" data-editar="' + esc(p.id) + '">Editar</button> <button class="b chico" type="button" data-quitar="' + esc(p.id) + '" aria-label="Quitar venta ' + esc(p.numero) + '">Quitar</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    $('#v-ventas').innerHTML = h;
  }
  function importarTexto(texto) {
    var r = P.importarVentas(texto);
    if (r.pedidos.length) { est.pedidos = est.pedidos.concat(r.pedidos); cambio(); }
    vVentas();
    var msg = r.pedidos.length ? 'Importé ' + r.pedidos.length + (r.pedidos.length === 1 ? ' venta.' : ' ventas.') : 'No importé ninguna venta.';
    if (r.errores.length) aviso(msg + '\n' + r.errores.slice(0, 6).map(function (x) { return x.texto; }).join('\n') + (r.errores.length > 6 ? '\n… y ' + (r.errores.length - 6) + ' avisos más.' : ''), !r.pedidos.length);
    else aviso(msg + ' Revisa la pestaña «Plazos».');
  }
  $('#v-ventas').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'nueva') { editando = P.pedidoVacio(hoy()); vVentas(); $('#p-numero').focus(); return; }
    if (b.id === 'p-cancelar') { editando = null; vVentas(); return; }
    if (b.id === 'ver-pegar') { var z = $('#pegar'); z.hidden = !z.hidden; b.setAttribute('aria-expanded', String(!z.hidden)); if (!z.hidden) $('#txt-csv').focus(); return; }
    if (b.id === 'imp-pegado') { importarTexto($('#txt-csv').value); return; }
    if (b.dataset.editar) { editando = Object.assign({}, buscar(b.dataset.editar)); vVentas(); $('#p-numero').focus(); return; }
    if (b.dataset.recibido) { var p = buscar(b.dataset.recibido); p.fechaRecepcion = hoy(); cambio(); vVentas(); aviso('Marcado como recibido hoy: el plazo empezó a correr.'); return; }
    if (b.dataset.quitar) { var q = buscar(b.dataset.quitar); if (confirm('¿Quitar la venta ' + (q.numero || '') + '? No se puede deshacer, salvo con un respaldo.')) { est.pedidos = est.pedidos.filter(function (x) { return x.id !== q.id; }); cambio(); vVentas(); } }
  });
  $('#v-ventas').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = leerForm();
    if (!P.esFecha(p.fechaCompra)) { aviso('Falta la fecha de compra.', true); $('#p-compra').focus(); return; }
    var i = est.pedidos.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) est.pedidos[i] = p; else est.pedidos.push(p);
    editando = null; cambio(); vVentas();
    var c = calc(p);
    aviso('Venta guardada. ' + (c.retracto.finPrudente ? 'El plazo vence el ' + P.fechaCorta(c.retracto.finPrudente) + '.' : ETQ[c.retracto.estado] + '.'));
  });
  $('#v-ventas').addEventListener('change', function (e) {
    if (e.target.id !== 'imp-csv' || !e.target.files[0]) return;
    var f = e.target.files[0], r = new FileReader();
    r.onload = function () { importarTexto(String(r.result)); };
    r.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    r.readAsText(f);
  });

  // ---------- 3. Plazos ----------
  var FILTROS = [['todos', 'Todos'], ['abierto', 'Abiertos'], ['semana', 'Vencen en 7 días'], ['sin-iniciar', 'Sin recibir'], ['alargado', 'Plazo alargado'], ['ejercido', 'Devoluciones pedidas'], ['cerrado', 'Cerrados']];
  function pasa(c) {
    var R = c.retracto;
    switch (filtro) {
      case 'abierto': return R.estado === 'abierto';
      case 'semana': return R.estado === 'abierto' && R.diasRestantes <= 7;
      case 'sin-iniciar': return R.estado === 'sin-iniciar';
      case 'alargado': return R.alargado;
      case 'ejercido': return R.estado === 'ejercido';
      case 'cerrado': return R.estado === 'cerrado' || R.estado === 'no-aplica' || R.estado === 'excluido';
      default: return true;
    }
  }
  function vPlazos() {
    var Ly = L(), h = '<h2>Plazos por pedido</h2><p class="sub">Para cada venta: hasta qué día puede ' + (est.tienda.pais === 'ES' ? 'desistir' : 'retractarse') + ' tu cliente, hasta cuándo responde la garantía legal y qué revisar. Cada aviso lleva el artículo que lo respalda.</p>';
    if (!est.pedidos.length) { $('#v-plazos').innerHTML = h + '<p class="vacio">Agrega ventas en la pestaña anterior.</p>'; return; }
    h += '<div class="filtros" role="group" aria-label="Filtrar">' + FILTROS.map(function (f) { return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
    var lista = est.pedidos.map(function (p) { return { p: p, c: calc(p) }; }).filter(function (x) { return pasa(x.c); });
    var orden = { 'ejercido': 0, 'abierto': 1, 'sin-iniciar': 2, 'excluido': 3, 'no-aplica': 4, 'cerrado': 5 };
    var pos = function (x) { return orden.hasOwnProperty(x) ? orden[x] : 9; };
    lista.sort(function (a, b) { var d = pos(a.c.retracto.estado) - pos(b.c.retracto.estado); return d || (a.c.retracto.finPrudente || '9').localeCompare(b.c.retracto.finPrudente || '9'); });
    if (!lista.length) h += '<p class="vacio">Ningún pedido en este filtro.</p>';
    lista.forEach(function (x) {
      var p = x.p, c = x.c, R = c.retracto, G = c.garantia, est_ = R.estado || 'sin-iniciar';
      h += '<article class="item ' + est_ + '"><div class="fila"><div><b>Pedido ' + esc(p.numero || 's/n') + '</b>' + (p.cliente ? ' · ' + esc(p.cliente) : '') + ' <span class="tag t-' + est_ + '">' + esc(ETQ[est_] || '—') + '</span>' + (R.alargado ? ' <span class="tag t-ejercido">Alargado</span>' : '') + '</div><span class="monto">' + plata(c.monto) + '</span></div>';
      h += '<div class="datos">';
      if (R.estado === 'abierto') h += '<span>' + (Ly.palabra === 'retracto' ? 'Retracto' : 'Desistimiento') + ' hasta el <b>' + esc(P.fechaLarga(R.finPrudente)) + '</b> (' + (R.diasRestantes === 0 ? 'vence hoy' : R.diasRestantes === 1 ? 'queda 1 día' : 'quedan ' + R.diasRestantes + ' días') + ')</span>';
      else if (R.estado === 'cerrado') h += '<span>Plazo cerrado el ' + esc(P.fechaCorta(R.finPrudente)) + '</span>';
      else if (R.estado === 'sin-iniciar') h += '<span>El plazo empieza cuando el cliente lo reciba</span>';
      else if (R.estado === 'no-aplica' || R.estado === 'excluido') h += '<span>' + esc(R.motivo) + '</span>';
      if (c.reembolso) h += '<span>Pidió devolver el ' + esc(P.fechaCorta(c.reembolso.pedido)) + (c.reembolso.dentroDePlazo ? ' · reembolso <b>antes del ' + esc(P.fechaCorta(c.reembolso.antesDe)) + '</b>' + (c.reembolso.reembolsado ? ' (hecho)' : '') : ' · fuera de plazo') + '</span>';
      if (c.reembolso && c.reembolso.devolucionCliente && c.reembolso.dentroDePlazo) h += '<span>El cliente debe devolver el producto antes del ' + esc(P.fechaCorta(c.reembolso.devolucionCliente)) + '</span>';
      if (G.aplica && G.fin) h += '<span>Garantía legal hasta el <b>' + esc(P.fechaCorta(G.fin)) + '</b></span>';
      else if (!G.aplica) h += '<span>' + esc(G.nota) + '</span>';
      h += '</div>';
      if (R.cita && R.aplica) h += '<p class="sub">Base: ' + esc(R.cita) + (G.aplica ? ' · ' + esc(G.cita) : '') + '</p>';
      if (c.alertas.length) h += '<ul class="alertas">' + c.alertas.map(function (a) { return '<li class="' + a.nivel + '">' + esc(a.texto) + (a.cita ? '<small>' + esc(a.cita) + '</small>' : '') + '</li>'; }).join('') + '</ul>';
      h += '<div class="acc">';
      if (R.estado === 'sin-iniciar' && p.tipo === 'bien') h += '<button class="b chico" type="button" data-recibido="' + esc(p.id) + '">Lo recibió hoy</button>';
      if (R.estado === 'abierto') h += '<button class="b chico" type="button" data-pidio="' + esc(p.id) + '">Pidió devolver hoy</button>';
      if (c.reembolso && !c.reembolso.reembolsado && c.reembolso.dentroDePlazo) h += '<button class="b chico" type="button" data-reemb="' + esc(p.id) + '">Ya devolví el dinero</button>';
      if (R.alargado || est.tienda.pais === 'CL') h += '<button class="b chico" type="button" data-conf="' + esc(p.id) + '">Copiar mensaje de confirmación</button>';
      h += '</div></article>';
    });
    $('#v-plazos').innerHTML = h;
  }
  $('#v-plazos').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.f) { filtro = b.dataset.f; vPlazos(); return; }
    var p = buscar(b.dataset.recibido || b.dataset.pidio || b.dataset.reemb || b.dataset.conf); if (!p) return;
    if (b.dataset.recibido) { p.fechaRecepcion = hoy(); cambio(); vPlazos(); aviso('Plazo iniciado hoy.'); }
    else if (b.dataset.pidio) { p.fechaRetracto = hoy(); cambio(); vPlazos(); var c = calc(p); aviso('Anotado. Devuelve el dinero antes del ' + P.fechaCorta(c.reembolso.antesDe) + '.'); }
    else if (b.dataset.reemb) { p.reembolsado = true; cambio(); vPlazos(); aviso('Reembolso marcado como hecho.'); }
    else if (b.dataset.conf) copiar(P.mensajeConfirmacion(est.tienda, p), 'Mensaje copiado. Adjunta tus condiciones completas al enviarlo.');
  });

  // ---------- 4. Dinero en juego ----------
  function vDinero() {
    var h = '<h2>Dinero en juego</h2><p class="sub">Lo que vendiste se divide en dinero que el cliente todavía puede pedir de vuelta y dinero firme. El calendario muestra qué semana se libera cada parte.</p>';
    if (!est.pedidos.length) { $('#v-dinero').innerHTML = h + '<p class="vacio">Agrega ventas para ver tu exposición.</p>'; return; }
    var e = P.exposicion(est.pedidos, est.tienda, hoy()), total = e.abierto + e.sinIniciar + e.enDevolucion + e.firme || 1;
    h += '<div class="kpis"><div class="kpi"><b>' + plata(e.abierto) + '</b><span>con plazo abierto (' + e.nAbiertos + (e.nAbiertos === 1 ? ' pedido' : ' pedidos') + ')</span></div>' +
      '<div class="kpi"><b>' + plata(e.sinIniciar) + '</b><span>sin recibir: su plazo ni siquiera empieza (' + e.nSinIniciar + ')</span></div>' +
      '<div class="kpi"><b>' + plata(e.enDevolucion) + '</b><span>en devolución pedida, por reembolsar</span></div>' +
      '<div class="kpi"><b>' + plata(e.firme) + '</b><span>firme: plazo cerrado o sin derecho legal</span></div></div>';
    h += '<div class="barra" role="img" aria-label="' + Math.round(e.firme / total * 100) + ' % del dinero ya es firme"><i style="width:' + Math.round(e.firme / total * 100) + '%"></i></div><p class="sub">' + Math.round(e.firme / total * 100) + ' % de lo vendido ya es firme.' + (e.sinMonto ? ' ' + e.sinMonto + (e.sinMonto === 1 ? ' venta sin monto no se cuenta.' : ' ventas sin monto no se cuentan.') : '') + '</p>';
    if (e.porAlargue > 0) h += '<div class="alerta-grande"><b>' + plata(e.porAlargue) + ' ya serían firmes</b> si hubieras ' + (est.tienda.pais === 'ES' ? 'informado del desistimiento y entregado el formulario' : 'enviado la confirmación escrita con copia del contrato') + '. Ese dinero sigue devolvible por el plazo alargado. ' + (est.tienda.pais === 'ES' ? 'Si informas ahora, a cada cliente le quedan 14 días desde que reciba la información (art. 105.2).' : 'Envía la confirmación desde ahora en cada venta: el mensaje está en «Política y mensajes».') + '</div>';
    else if (e.nAlargados) h += '<div class="alerta-grande">' + e.nAlargados + (e.nAlargados === 1 ? ' pedido tiene' : ' pedidos tienen') + ' el plazo alargado. Todavía no te cuesta nada, pero lo hará cuando pasen los primeros ' + L().diasBase + ' días.</div>';
    h += '<h3>Calendario: cuándo se libera el dinero abierto</h3>';
    if (!e.semanas.length) h += '<p class="vacio">No hay plazos abiertos con fecha.' + (e.sinIniciar ? ' Anota la recepción de los pedidos sin recibir para ver cuándo se liberan.' : '') + '</p>';
    else {
      var max = Math.max.apply(null, e.semanas.map(function (s) { return s.monto; })) || 1;
      h += '<div class="tabla"><table><thead><tr><th>Semana</th><th class="num">Pedidos</th><th>Se libera</th><th class="num">Firme acumulado</th></tr></thead><tbody>' + e.semanas.map(function (s) {
        return '<tr><td>' + esc(P.fechaCorta(s.desde)) + ' al ' + esc(P.fechaCorta(s.hasta)) + '</td><td class="num">' + s.pedidos + '</td><td><div class="semana-barra"><i style="width:' + Math.max(2, Math.round(s.monto / max * 140)) + 'px" aria-hidden="true"></i>' + plata(s.monto) + '</div></td><td class="num">' + plata(s.firmeAcumulado) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
      h += '<p class="sub">El último plazo abierto vence el <b>' + esc(P.fechaLarga(e.ultimoCierre)) + '</b>. Los pedidos sin recibir no están en el calendario porque su plazo aún no empieza.</p>';
    }
    $('#v-dinero').innerHTML = h;
  }

  // ---------- 5. Política y mensajes ----------
  function vPolitica() {
    var t = est.tienda, es = t.pais === 'ES', pol = P.politica(t);
    var h = '<h2>Política y mensajes</h2><p class="sub">Textos listos con tus datos. Los corchetes marcan lo que falta completar en «Tu tienda». Revísalos con tu asesor antes de publicarlos.</p>';
    h += '<h3>Política de ' + (es ? 'devoluciones y desistimiento' : 'cambios, devoluciones y retracto') + '</h3><label for="txt-pol" class="saltar">Texto de la política</label><textarea class="texto" id="txt-pol" readonly>' + esc(pol.texto) + '</textarea>';
    h += '<div class="acc"><button class="b prim" type="button" data-copia="txt-pol">Copiar política</button><button class="b" type="button" id="desc-pol">Descargar (.txt)</button></div>';
    if (es) {
      h += '<h3>Formulario de desistimiento</h3><p class="sub">La ley pide entregarlo con la información precontractual (art. 97.1.j). Es el modelo del anexo B con tus datos.</p><label for="txt-form" class="saltar">Formulario</label><textarea class="texto" id="txt-form" readonly style="min-height:200px">' + esc(P.formularioDesistimiento(t)) + '</textarea><div class="acc"><button class="b" type="button" data-copia="txt-form">Copiar formulario</button></div>';
      var faltan = P.diasEntre(hoy(), P.VIGENCIA_106BIS);
      h += '<div class="alerta-grande"><b>Desde el 25 de enero de 2027' + (faltan > 0 ? ' (en ' + faltan + ' días)' : '') + '</b>, si vendes por una web o una aplicación necesitas un botón «<b>desistir del contrato aquí</b>» visible durante todo el plazo, un paso «<b>confirmar desistimiento</b>» y un acuse de recibo con fecha y hora. No puede pedir más datos que el nombre, el pedido y el medio para enviar la confirmación. Lo agrega el <a href="https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24702">Real Decreto-ley 44/2026</a> (art. 106 bis). La fase 2 de Plazo Abierto traerá el kit para ponerlo en tu tienda.</div>';
    }
    var ej = est.pedidos[0] || { numero: '1001', cliente: 'Ana', fechaCompra: hoy() };
    h += '<h3>Mensaje de confirmación después de cada venta</h3><p class="sub">' + (es ? 'Acompáñalo de las condiciones completas y del formulario.' : 'Este es el paso que evita que el retracto se alargue a 90 días: adjunta siempre la copia completa de las condiciones de la venta (art. 12 A).') + '</p><label for="txt-conf" class="saltar">Mensaje de confirmación</label><textarea class="texto" id="txt-conf" readonly style="min-height:120px">' + esc(P.mensajeConfirmacion(t, ej)) + '</textarea><div class="acc"><button class="b" type="button" data-copia="txt-conf">Copiar mensaje</button></div>';
    $('#v-politica').innerHTML = h;
  }
  $('#v-politica').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.copia) copiar($('#' + b.dataset.copia).value, 'Texto copiado.');
    if (b.id === 'desc-pol') descargar('politica-devoluciones.txt', P.politica(est.tienda).texto, 'text/plain;charset=utf-8');
  });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) ir(b.dataset.ir); });

  // ---------- Respaldo ----------
  $('#ejemplo').addEventListener('click', function () {
    if (est.pedidos.length && !confirm('El ejemplo reemplaza tus ventas actuales. ¿Seguir? (Exporta un respaldo antes si las quieres conservar.)')) return;
    est = P.ejemplo(hoy(), est.tienda.pais); editando = null; filtro = 'todos'; cambio(); ir('plazos'); aviso('Ejemplo de ' + L().nombre + ' cargado con 10 ventas de las últimas semanas. Cambia el país en «Tu tienda» para ver el otro caso.');
  });
  $('#exp-json').addEventListener('click', function () { descargar('plazo-abierto-respaldo-' + hoy() + '.json', P.respaldo(est), 'application/json'); });
  $('#exp-csv').addEventListener('click', function () {
    if (!est.pedidos.length) { aviso('No hay ventas para exportar.', true); return; }
    descargar('plazo-abierto-plazos-' + hoy() + '.csv', '﻿' + P.exportarCSV(est.pedidos, est.tienda, hoy()), 'text/csv;charset=utf-8');
  });
  $('#imp-json').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { try { est = P.leerRespaldo(String(r.result)); editando = null; cambio(); ir('plazos'); aviso('Respaldo importado: ' + est.pedidos.length + ' ventas.'); } catch (err) { aviso(err.message, true); } e.target.value = ''; };
    r.readAsText(f);
  });
  $('#borrar').addEventListener('click', function () {
    if (!confirm('¿Borrar la tienda y todas las ventas de este navegador? No se puede deshacer.')) return;
    est = { tienda: P.tiendaVacia(), pedidos: [] }; editando = null; try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } ir('tienda'); aviso('Datos borrados de este navegador.');
  });

  est = cargar();
  pintarTabs(); ir(est.pedidos.length ? 'plazos' : 'tienda');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { /* sin conexión sin caché */ });
})();
