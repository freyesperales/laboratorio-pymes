/* Cuadra · interfaz. Toda la lógica de cálculo está en logica.js. */
(function () {
  'use strict';
  var C = window.Cuadra, CLAVE = 'cuadra-v1';
  var E = nuevo(), borr = { cartola: null, ventas: null }, filtro = 'todo', vista = 'cartola';

  function nuevo() { return { app: 'cuadra', version: 1, movs: [], peds: [], manual: [], rechazos: [], opciones: Object.assign({}, C.OPC), moneda: 'CLP', fuentes: {} }; }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) { aviso('No se pudo guardar en este navegador (¿modo privado o sin espacio?). Exporta un respaldo para no perder el trabajo.', true); } }
  function cargar() { try { var s = localStorage.getItem(CLAVE); if (s) E = C.validarEstado(JSON.parse(s)); } catch (e) { E = nuevo(); } }

  // ---------- utilidades de DOM (sin innerHTML con datos del usuario) ----------
  function h(tag, at, hijos) {
    var el = document.createElement(tag);
    Object.keys(at || {}).forEach(function (k) {
      var v = at[k]; if (v == null || v === false) return;
      if (k === 'texto') el.textContent = v; else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(hijos || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function $(id) { return document.getElementById(id); }
  function vaciar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  var msgT;
  function aviso(t, mal) { var m = vaciar($('msg')); m.appendChild(h('div', { 'class': mal ? 'err' : 'ok', texto: t })); clearTimeout(msgT); msgT = setTimeout(function () { vaciar(m); }, 7000); }
  function dinero(n) {
    var dec = E.moneda === 'CLP' ? 0 : 2;
    try { return new Intl.NumberFormat('es-CL', E.moneda === 'otra' ? { minimumFractionDigits: dec, maximumFractionDigits: 2 } : { style: 'currency', currency: E.moneda, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n); }
    catch (e) { return String(n); }
  }
  function fechaCorta(iso) { var p = iso.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function descargar(nombre, texto, tipo) {
    var a = h('a', { href: URL.createObjectURL(new Blob([texto], { type: tipo })), download: nombre });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function leerArchivo(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var t = String(r.result);
      // Excel en español suele guardar CSV en Windows-1252: si aparecen caracteres rotos, se relee así.
      if (t.indexOf('�') >= 0) { var r2 = new FileReader(); r2.onload = function () { cb(String(r2.result)); }; r2.readAsText(file, 'windows-1252'); }
      else cb(t);
    };
    r.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    r.readAsText(file, 'utf-8');
  }

  // ---------- pestañas ----------
  var PASOS = [['cartola', 'Cartola del banco'], ['ventas', 'Pedidos o ventas'], ['cuadre', 'Cuadre'], ['ajustes', 'Ajustes']];
  function pestañas() {
    var ol = vaciar($('tabs'));
    PASOS.forEach(function (p, i) {
      var listo = (p[0] === 'cartola' && E.movs.length) || (p[0] === 'ventas' && E.peds.length);
      ol.appendChild(h('li', { role: 'presentation' }, h('button', { id: 't-' + p[0], role: 'tab', type: 'button', 'aria-selected': String(vista === p[0]), 'aria-controls': 'v-' + p[0], 'class': listo ? 'listo' : null,
        tabindex: vista === p[0] ? '0' : '-1', onclick: function () { ir(p[0]); }, onkeydown: teclas }, [h('span', { 'class': 'n', texto: (i + 1) + '.' }), ' ' + p[1]])));
    });
  }
  function teclas(e) {
    var i = PASOS.findIndex(function (p) { return p[0] === vista; });
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); ir(PASOS[(i + (e.key === 'ArrowRight' ? 1 : PASOS.length - 1)) % PASOS.length][0]); $('t-' + vista).focus(); }
  }
  function ir(v) { vista = v; PASOS.forEach(function (p) { $('v-' + p[0]).hidden = p[0] !== v; }); pestañas(); pintar(); }

  // ---------- paso 1 y 2: carga de archivos ----------
  var CAMPOS = {
    cartola: [['fecha', 'Fecha', true], ['glosa', 'Descripción o glosa', false], ['abono', 'Abonos (lo que entra)', false], ['cargo', 'Cargos (lo que sale)', false], ['monto', 'Monto único (+ entra, − sale)', false]],
    ventas: [['id', 'N° de pedido o boleta', false], ['fecha', 'Fecha', true], ['cliente', 'Cliente', false], ['monto', 'Total', true]]
  };
  function pintarCarga(lado) {
    var sec = vaciar($('v-' + lado)), esC = lado === 'cartola';
    var lista = esC ? E.movs : E.peds;
    sec.appendChild(h('h2', { texto: esC ? '1. Sube la cartola o el extracto de tu banco' : '2. Sube tu lista de pedidos o ventas' }));
    sec.appendChild(h('p', { 'class': 'sub', texto: esC
      ? 'En la web de tu banco, busca «Descargar cartola» o «Exportar movimientos» y elige CSV. Si solo te deja Excel, ábrelo y usa «Guardar como → CSV». También puedes copiar la tabla y pegarla aquí.'
      : 'Exporta los pedidos de tu tienda o de tu planilla en CSV: necesita al menos la fecha y el total. Con el número de pedido y el nombre del cliente, el cuadre acierta mucho más.' }));
    if (lista.length) sec.appendChild(h('p', { 'class': 'ok', texto: 'Cargados: ' + lista.length + (esC ? ' movimientos' : ' pedidos') + (E.fuentes[lado] ? ' (de ' + E.fuentes[lado] + ')' : '') + '. Si subes otro archivo, reemplaza estos.' }));
    var ta = h('textarea', { id: 'pega-' + lado, 'aria-describedby': 'ayuda-' + lado, placeholder: esC ? 'Fecha;Descripción;Cargos;Abonos\n02/11/2026;TRANSF DE MARIA SOTO;;24.990' : 'N° pedido,Fecha,Cliente,Total\n1041,01-11-2026,María Soto,24990' });
    sec.appendChild(h('div', { 'class': 'acc' }, [
      h('label', { 'class': 'b prim archivo' }, ['Elegir archivo CSV', h('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain', onchange: function (e) {
        var f = e.target.files[0]; if (!f) return;
        if (/\.xlsx?$/i.test(f.name)) { aviso('Ese archivo es de Excel. Ábrelo y guárdalo como CSV (la lectura directa de Excel llega en la fase 2).', true); return; }
        leerArchivo(f, function (t) { preparar(lado, t, f.name); }); e.target.value = '';
      } })])
    ]));
    sec.appendChild(h('label', { 'for': 'pega-' + lado, style: 'margin-top:14px', texto: 'O pega aquí el contenido' }));
    sec.appendChild(ta);
    sec.appendChild(h('p', { id: 'ayuda-' + lado, 'class': 'sub', texto: 'Acepta separadores de punto y coma, coma o tabulación, montos como 1.234.567 o 1.234,56 y fechas como 02/11/2026.' }));
    sec.appendChild(h('div', { 'class': 'acc' }, h('button', { 'class': 'b', type: 'button', texto: 'Leer lo pegado', onclick: function () { if (!ta.value.trim()) { aviso('Pega primero el contenido.', true); return; } preparar(lado, ta.value, 'texto pegado'); } })));
    if (borr[lado]) sec.appendChild(pintarMapa(lado));
  }
  function preparar(lado, texto, nombre) {
    var tabla = C.leerCSV(texto);
    if (!tabla.cabecera.length || !tabla.filas.length) { aviso('No encontré una tabla en ese contenido. Revisa que tenga una fila de títulos y filas de datos.', true); return; }
    borr[lado] = { tabla: tabla, mapa: C.adivinarColumnas(tabla.cabecera), decimal: 'auto', nombre: nombre };
    pintar();
    var s = $('mapa-' + lado); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function pintarMapa(lado) {
    var b = borr[lado], caja = h('div', { id: 'mapa-' + lado, tabindex: '-1' });
    caja.appendChild(h('h3', { texto: '¿Qué hay en cada columna?' }));
    caja.appendChild(h('p', { 'class': 'sub', texto: 'Lo adiviné a partir de los títulos' + (b.tabla.omitidas ? ' (salté ' + b.tabla.omitidas + ' líneas de encabezado del banco)' : '') + '. Corrige lo que no calce.' }));
    var g = h('div', { 'class': 'grid' });
    CAMPOS[lado].forEach(function (c) {
      var id = 'col-' + lado + '-' + c[0];
      var sel = h('select', { id: id, onchange: function () { if (this.value === '') delete b.mapa[c[0]]; else b.mapa[c[0]] = +this.value; } },
        [h('option', { value: '', texto: c[2] ? '(elige una columna)' : '(no hay)' })].concat(b.tabla.cabecera.map(function (t, i) { return h('option', { value: String(i), texto: t || ('Columna ' + (i + 1)), selected: b.mapa[c[0]] === i }); })));
      g.appendChild(h('div', {}, [h('label', { 'for': id, texto: c[1] + (c[2] ? ' *' : '') }), sel]));
    });
    var dec = h('select', { id: 'dec-' + lado, onchange: function () { b.decimal = this.value; } }, [['auto', 'Detectar solo'], [',', 'Coma (1.234,56)'], ['.', 'Punto (1,234.56)'], ['ninguno', 'Sin decimales (pesos)']].map(function (o) { return h('option', { value: o[0], texto: o[1], selected: b.decimal === o[0] }); }));
    g.appendChild(h('div', {}, [h('label', { 'for': 'dec-' + lado, texto: 'Separador decimal' }), dec]));
    caja.appendChild(g);
    var cab = b.tabla.cabecera, muestra = b.tabla.filas.slice(0, 5);
    caja.appendChild(h('div', { 'class': 'tabla', role: 'region', 'aria-label': 'Vista previa', tabindex: '0' }, h('table', {}, [
      h('caption', { 'class': 'sub', texto: 'Primeras ' + muestra.length + ' de ' + b.tabla.filas.length + ' filas' }),
      h('thead', {}, h('tr', {}, cab.map(function (t) { return h('th', { scope: 'col', texto: t }); }))),
      h('tbody', {}, muestra.map(function (f) { return h('tr', {}, cab.map(function (_, i) { return h('td', { texto: f[i] || '' }); })); }))
    ])));
    caja.appendChild(h('div', { 'class': 'acc' }, [
      h('button', { 'class': 'b prim', type: 'button', texto: 'Usar estos datos', onclick: function () { confirmar(lado); } }),
      h('button', { 'class': 'b', type: 'button', texto: 'Cancelar', onclick: function () { borr[lado] = null; pintar(); } })
    ]));
    return caja;
  }
  function confirmar(lado) {
    var b = borr[lado], m = b.mapa, esC = lado === 'cartola';
    if (m.fecha == null) { aviso('Elige la columna de la fecha.', true); return; }
    if (esC && m.monto == null && m.abono == null) { aviso('Elige la columna de abonos o la de monto.', true); return; }
    if (!esC && m.monto == null) { aviso('Elige la columna del total.', true); return; }
    var r = esC ? C.aMovimientos(b.tabla, m, b.decimal) : C.aPedidos(b.tabla, m, b.decimal);
    if (!r.lista.length) { aviso('No pude leer ninguna fila. Revisa las columnas y el separador decimal.\n' + r.errores.slice(0, 5).join('\n'), true); return; }
    if (esC) E.movs = r.lista; else E.peds = r.lista;
    E.manual = []; E.rechazos = []; E.fuentes[lado] = b.nombre; borr[lado] = null; guardar();
    aviso('Listo: ' + r.lista.length + (esC ? ' movimientos' : ' pedidos') + ' leídos.' + (r.errores.length ? ' Se omitieron ' + r.errores.length + ' filas que no se pudieron leer (' + r.errores.slice(0, 3).join('; ') + (r.errores.length > 3 ? '…' : '') + ').' : ''), false);
    ir(esC ? (E.peds.length ? 'cuadre' : 'ventas') : (E.movs.length ? 'cuadre' : 'cartola'));
  }

  // ---------- paso 3: cuadre ----------
  function resultado() { return C.conciliar(E.movs, E.peds, E.opciones, E.manual, E.rechazos); }
  function pintarCuadre() {
    var sec = vaciar($('v-cuadre'));
    sec.appendChild(h('h2', { texto: '3. Cuadre' }));
    if (!E.movs.length || !E.peds.length) {
      sec.appendChild(h('p', { 'class': 'vacio', texto: 'Falta ' + (!E.movs.length ? 'la cartola' : '') + (!E.movs.length && !E.peds.length ? ' y ' : '') + (!E.peds.length ? 'la lista de pedidos' : '') + '. O pulsa «Probar con un ejemplo» para ver cómo funciona.' }));
      return;
    }
    var R = resultado(), r = R.resumen, M = {}, P = {};
    E.movs.forEach(function (m) { M[m.id] = m; }); E.peds.forEach(function (p) { P[p.id] = p; });
    sec.appendChild(h('p', { 'class': 'sub', texto: r.conciliados + ' de ' + r.pedidos + ' pedidos tienen su cobro en la cartola (' + r.porcentaje + ' %).' }));
    sec.appendChild(h('div', { 'class': 'barra', role: 'img', 'aria-label': r.porcentaje + ' % de los pedidos cobrados' }, h('i', { style: 'width:' + r.porcentaje + '%' })));
    sec.appendChild(h('div', { 'class': 'kpis' }, [
      kpi(dinero(r.totalCobrado), 'cobrado y encontrado en el banco'),
      kpi(dinero(r.totalPendiente), R.pendientes.length + ' pedidos sin cobro'),
      kpi(dinero(r.totalSinRespaldo), R.sinRespaldo.length + ' abonos sin pedido'),
      kpi(dinero(r.comisiones), 'descontado en comisiones')
    ]));
    if (r.revisar) sec.appendChild(h('p', { 'class': 'err', texto: 'Hay ' + r.revisar + ' cruce(s) dudoso(s): revísalos y confírmalos o descártalos.' }));
    if (R.duplicados.length) sec.appendChild(h('p', { 'class': 'err', texto: 'Ojo: ' + R.duplicados.length + ' abono(s) se repiten igual (mismo día, monto y glosa). Puede ser un cliente que pagó dos veces o una línea duplicada en la cartola.' }));

    var F = [['todo', 'Todo'], ['revisar', 'Por revisar (' + r.revisar + ')'], ['pend', 'Sin cobro (' + R.pendientes.length + ')'], ['sin', 'Sin respaldo (' + R.sinRespaldo.length + ')'], ['ok', 'Cobrados (' + R.pares.length + ')']];
    sec.appendChild(h('div', { 'class': 'filtros', role: 'group', 'aria-label': 'Filtrar' }, F.map(function (f) {
      return h('button', { type: 'button', 'aria-pressed': String(filtro === f[0]), texto: f[1], onclick: function () { filtro = f[0]; pintarCuadre(); } });
    })));
    var lista = h('div', {});
    var ver = function (k) { return filtro === 'todo' || filtro === k; };
    if (ver('revisar') || ver('ok')) R.pares.filter(function (x) { return filtro !== 'revisar' || x.confianza === 'revisar'; })
      .sort(function (a, b) { return (a.confianza === 'revisar' ? 0 : 1) - (b.confianza === 'revisar' ? 0 : 1); })
      .forEach(function (x) { if (filtro === 'ok' || filtro === 'todo' || x.confianza === 'revisar') lista.appendChild(itemPar(x, M, P)); });
    if (ver('pend')) R.pendientes.sort(function (a, b) { return b.diasEsperando - a.diasEsperando; }).forEach(function (p) { lista.appendChild(itemPend(p)); });
    if (ver('sin')) R.sinRespaldo.forEach(function (m) { lista.appendChild(itemSin(m, R.pendientes)); });
    if (!lista.firstChild) lista.appendChild(h('p', { 'class': 'vacio', texto: 'Nada en este filtro.' }));
    sec.appendChild(lista);
    sec.appendChild(h('div', { 'class': 'acc' }, [
      h('button', { 'class': 'b prim', type: 'button', texto: 'Descargar informe (CSV para Excel)', onclick: function () { descargar('cuadre-' + new Date().toISOString().slice(0, 10) + '.csv', C.informeCSV(resultado(), E.movs, E.peds), 'text/csv;charset=utf-8'); } }),
      h('button', { 'class': 'b', type: 'button', texto: 'Imprimir o guardar PDF', onclick: function () { window.print(); } })
    ]));
  }
  function kpi(v, t) { return h('div', { 'class': 'kpi' }, [h('b', { texto: v }), h('span', { texto: t })]); }
  function itemPar(x, M, P) {
    var m = M[x.mov], ps = x.pedidos.map(function (id) { return P[id]; });
    var etq = { alta: 'Seguro', media: 'Probable', revisar: 'Revisar', manual: 'Confirmado' }[x.tipo === 'manual' ? 'manual' : x.confianza];
    var cls = x.tipo === 'manual' ? 'manual' : x.confianza;
    var acc = x.tipo === 'manual'
      ? [h('button', { 'class': 'b chico', type: 'button', texto: 'Deshacer', onclick: function () { E.manual = E.manual.filter(function (y) { return y.mov !== x.mov; }); guardar(); pintarCuadre(); } })]
      : [h('button', { 'class': 'b chico', type: 'button', texto: 'Confirmar', onclick: function () { E.manual.push({ mov: x.mov, pedidos: x.pedidos.slice() }); guardar(); aviso('Cruce confirmado.'); pintarCuadre(); } }),
         h('button', { 'class': 'b chico', type: 'button', texto: 'No es este', onclick: function () { x.pedidos.forEach(function (id) { E.rechazos.push(x.mov + '|' + id); }); guardar(); aviso('Descartado: no se volverá a proponer.'); pintarCuadre(); } })];
    return h('div', { 'class': 'item ' + cls }, [
      h('div', { 'class': 'fila' }, [
        h('div', {}, [h('span', { 'class': 'tag t-' + cls, texto: etq }), h('b', { texto: ps.map(function (p) { return 'Pedido ' + p.ref + (p.cliente ? ' · ' + p.cliente : ''); }).join(' + ') })]),
        h('span', { 'class': 'monto', texto: dinero(ps.reduce(function (s, p) { return s + p.monto; }, 0)) })
      ]),
      h('div', { 'class': 'sub', texto: 'Banco ' + fechaCorta(m.fecha) + ': ' + (m.glosa || '(sin glosa)') + ' · ' + dinero(m.monto) + (x.diferencia ? ' · diferencia ' + dinero(x.diferencia) : '') }),
      h('div', { 'class': 'sub', texto: 'Por qué: ' + x.motivo }),
      h('div', { 'class': 'acc' }, acc)
    ]);
  }
  function itemPend(p) {
    return h('div', { 'class': 'item pend' }, [
      h('div', { 'class': 'fila' }, [h('div', {}, [h('span', { 'class': 'tag t-pend', texto: 'Sin cobro' }), h('b', { texto: 'Pedido ' + p.ref + (p.cliente ? ' · ' + p.cliente : '') })]), h('span', { 'class': 'monto', texto: dinero(p.monto) })]),
      h('div', { 'class': 'sub', texto: 'Pedido del ' + fechaCorta(p.fecha) + ' · ' + p.diasEsperando + ' días esperando. Si ya te pagó en efectivo o por otra cuenta, no aparecerá en esta cartola.' })
    ]);
  }
  function itemSin(m, pendientes) {
    var id = 'unir-' + m.id;
    var sel = h('select', { id: id }, [h('option', { value: '', texto: '(elige el pedido)' })].concat(pendientes.map(function (p) {
      return h('option', { value: p.id, texto: 'Pedido ' + p.ref + ' · ' + (p.cliente || 'sin nombre') + ' · ' + dinero(p.monto) + ' · ' + fechaCorta(p.fecha) });
    })));
    return h('div', { 'class': 'item sin' }, [
      h('div', { 'class': 'fila' }, [h('div', {}, [h('span', { 'class': 'tag t-sin', texto: 'Sin respaldo' }), h('b', { texto: m.glosa || '(sin glosa)' })]), h('span', { 'class': 'monto', texto: dinero(m.monto) })]),
      h('div', { 'class': 'sub', texto: 'Abono del ' + fechaCorta(m.fecha) + '. Puede ser una venta sin registrar, un aporte, un reembolso o un pago duplicado.' }),
      pendientes.length ? h('div', { 'class': 'acc' }, [h('label', { 'for': id, 'class': 'sub', style: 'margin:0', texto: 'Unir a mano con:' }), sel,
        h('button', { 'class': 'b chico', type: 'button', texto: 'Unir', onclick: function () { if (!sel.value) { aviso('Elige un pedido.', true); return; } E.manual.push({ mov: m.id, pedidos: [sel.value] }); guardar(); aviso('Unido a mano.'); pintarCuadre(); } })]) : null
    ]);
  }

  // ---------- paso 4: ajustes ----------
  function pintarAjustes() {
    var sec = vaciar($('v-ajustes')), o = E.opciones;
    sec.appendChild(h('h2', { texto: '4. Ajustes del cuadre' }));
    function num(k, t, ayuda, max) {
      var id = 'op-' + k;
      return h('div', {}, [h('label', { 'for': id, texto: t }), h('input', { id: id, type: 'number', min: '0', max: String(max), step: '1', value: String(o[k]), 'aria-describedby': id + '-a',
        onchange: function () { var v = Math.max(0, Math.min(max, Math.round(+this.value || 0))); this.value = v; o[k] = v; guardar(); aviso('Ajuste guardado.'); } }),
        h('p', { id: id + '-a', 'class': 'sub', texto: ayuda })]);
    }
    sec.appendChild(h('div', { 'class': 'grid' }, [
      num('antes', 'Días antes del pedido', 'Cuántos días antes de la fecha del pedido puede llegar el pago (pagos anticipados).', 30),
      num('despues', 'Días después del pedido', 'Cuántos días después puede llegar (transferencias tardías, liquidación de la pasarela).', 90),
      num('comision', 'Comisión máxima (%)', 'Si llega menos que el pedido hasta este porcentaje, se propone como «descontado en comisión».', 20)
    ]));
    var mon = h('select', { id: 'op-moneda', onchange: function () { E.moneda = this.value; guardar(); } }, [['CLP', 'Peso chileno (CLP)'], ['EUR', 'Euro (EUR)'], ['MXN', 'Peso mexicano (MXN)'], ['COP', 'Peso colombiano (COP)'], ['PEN', 'Sol (PEN)'], ['ARS', 'Peso argentino (ARS)'], ['USD', 'Dólar (USD)'], ['otra', 'Otra (sin símbolo)']].map(function (x) { return h('option', { value: x[0], texto: x[1], selected: E.moneda === x[0] }); }));
    sec.appendChild(h('div', { 'class': 'grid', style: 'margin-top:12px' }, h('div', {}, [h('label', { 'for': 'op-moneda', texto: 'Moneda para mostrar' }), mon])));
    sec.appendChild(h('h3', { texto: 'Cómo decide Cuadra' }));
    sec.appendChild(h('ol', { 'class': 'sub' }, [
      'Primero cruza los montos exactos dentro de la ventana de días. Gana el pedido cuyo número aparece en la glosa o cuyo cliente coincide con el nombre de quien transfirió; si no, el más cercano en fecha.',
      'Si un abono no calza con un pedido, busca de 2 a 4 pedidos del mismo cliente que sumen exactamente ese abono.',
      'Si llegó un poco menos (hasta el % de comisión), lo propone como pago con comisión descontada.',
      'Si dos pedidos empatan, no adivina: lo marca «Revisar». Lo que confirmas o descartas a mano se respeta siempre.'
    ].map(function (t) { return h('li', { texto: t }); })));
  }

  function pintar() { pestañas(); if (vista === 'cartola' || vista === 'ventas') pintarCarga(vista); else if (vista === 'cuadre') pintarCuadre(); else pintarAjustes(); }

  // ---------- respaldo ----------
  $('ejemplo').addEventListener('click', function () {
    if ((E.movs.length || E.peds.length) && !confirm('Esto reemplaza tus datos actuales por el ejemplo. ¿Seguir?')) return;
    var tc = C.leerCSV(C.EJ_CARTOLA), tp = C.leerCSV(C.EJ_PEDIDOS);
    E = nuevo(); E.movs = C.aMovimientos(tc, C.adivinarColumnas(tc.cabecera)).lista; E.peds = C.aPedidos(tp, C.adivinarColumnas(tp.cabecera)).lista;
    E.fuentes = { cartola: 'ejemplo', ventas: 'ejemplo' }; guardar(); filtro = 'todo'; ir('cuadre'); aviso('Ejemplo cargado: una tienda que vende por Instagram y WhatsApp.');
  });
  $('exp-json').addEventListener('click', function () { descargar('cuadra-respaldo-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(E, null, 1), 'application/json'); });
  $('imp-json').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    leerArchivo(f, function (t) {
      try { E = C.validarEstado(JSON.parse(t)); guardar(); ir('cuadre'); aviso('Respaldo importado.'); }
      catch (err) { aviso(err instanceof SyntaxError ? 'El archivo no es un JSON válido.' : err.message, true); }
    });
    e.target.value = '';
  });
  $('borrar').addEventListener('click', function () {
    if (!confirm('¿Borrar la cartola, los pedidos y los ajustes de este navegador? No se puede deshacer.')) return;
    E = nuevo(); borr = { cartola: null, ventas: null }; try { localStorage.removeItem(CLAVE); } catch (e) {} ir('cartola'); aviso('Datos borrados de este navegador.');
  });

  cargar();
  ir(E.movs.length && E.peds.length ? 'cuadre' : (E.movs.length ? 'ventas' : 'cartola'));
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
