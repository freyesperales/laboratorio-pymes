(function(){
'use strict';
var M=window.MapaDatos, KEY='lab006-mapa-de-datos';
var estado={empresa:{},respuestas:{},inventario:[],solicitudes:[]};
var tab='empresa';
function $(id){return document.getElementById(id)}
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function hoy(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function msg(t,mal){$('msg').innerHTML=t?'<div class="'+(mal?'err':'ok')+'">'+h(t)+'</div>':''}
function guardar(){try{localStorage.setItem(KEY,M.exportarTodo(estado))}catch(e){msg('No se pudo guardar en este navegador (modo privado o almacenamiento lleno). Exporta un respaldo.',true)}}
function cargar(){try{var t=localStorage.getItem(KEY);if(t)estado=M.importarTodo(t)}catch(e){}}
function bajar(nombre,texto,tipo){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([texto],{type:tipo}));a.download=nombre;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}

var TABS=[['empresa','1 · Tu empresa'],['diag','2 · Diagnóstico'],['inv','3 · Inventario'],['pol','4 · Política'],['sol','5 · Solicitudes']];
function pintarTabs(){
  $('tabs').innerHTML=TABS.map(function(t){return '<button role="tab" id="t-'+t[0]+'" aria-selected="'+(tab===t[0])+'" data-t="'+t[0]+'">'+t[1]+'</button>'}).join('');
  TABS.forEach(function(t){$('v-'+t[0]).hidden=tab!==t[0]});
}
$('tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;tab=b.dataset.t;msg('');pintar()});
$('tabs').addEventListener('keydown',function(e){var i=TABS.findIndex(function(t){return t[0]===tab});if(e.key==='ArrowRight')i=(i+1)%TABS.length;else if(e.key==='ArrowLeft')i=(i+TABS.length-1)%TABS.length;else return;tab=TABS[i][0];pintar();$('t-'+tab).focus()});

function vEmpresa(){
  var e=estado.empresa;
  $('v-empresa').innerHTML='<h2>Datos de tu empresa</h2><div class="campos">'+
  [['nombre','Nombre de la empresa'],['rut','RUT o NIF (opcional)'],['direccion','Dirección (opcional)'],['contacto','Correo de contacto para privacidad']].map(function(c){return '<div><label for="e-'+c[0]+'">'+c[1]+'</label><input id="e-'+c[0]+'" data-k="'+c[0]+'" value="'+h(e[c[0]])+'"></div>'}).join('')+
  '<div class="doble"><p class="sub">Estos datos solo se usan para armar tu política y tus respuestas. Se guardan en este equipo.</p></div></div>';
}
$('v-empresa').addEventListener('input',function(e){var k=e.target.dataset.k;if(k){estado.empresa[k]=e.target.value;guardar()}});

function vDiag(){
  var p=M.puntaje(estado.respuestas);
  var html='<h2>¿Qué tan preparada está tu empresa?</h2><div class="medidor">'+p.puntaje+'<span style="font-size:1rem;font-weight:600"> / 100 · '+h(p.nivel)+'</span></div><div class="barra" aria-hidden="true"><i style="width:'+p.puntaje+'%"></i></div>';
  M.DIAG.forEach(function(d){var r=estado.respuestas[d.id]||'';
    html+='<div class="preg"><fieldset><legend>'+h(d.texto)+'</legend><div class="opc">'+[['si','Sí'],['parcial','En parte'],['no','No']].map(function(o){return '<label><input type="radio" name="d-'+d.id+'" value="'+o[0]+'" data-d="'+d.id+'"'+(r===o[0]?' checked':'')+'>'+o[1]+'</label>'}).join('')+'</div></fieldset></div>'});
  html+='<h2 style="margin-top:16px">Qué hacer primero</h2>';
  var pend=p.pendientes.slice(0,5);
  html+=pend.length?pend.map(function(x){return '<div class="item"><b>'+h(x.consejo)+'</b><span class="sub">'+(x.respondida?'Respondiste parcial o no.':'Sin responder.')+'</span></div>'}).join(''):'<div class="ok">Todo en orden por ahora. Revisa de nuevo cada trimestre.</div>';
  $('v-diag').innerHTML=html;
}
$('v-diag').addEventListener('change',function(e){var id=e.target.dataset.d;if(id){estado.respuestas[id]=e.target.value;guardar();var y=window.scrollY;vDiag();window.scrollTo(0,y)}});

function vInv(){
  var o='<option>'+M.CATEGORIAS.join('</option><option>')+'</option>',b='<option>'+M.BASES.join('</option><option>')+'</option>';
  var html='<div class="caja"><h2>Agregar un tratamiento de datos</h2><form id="f-inv" class="campos">'+
  '<div><label for="i-cat">Persona</label><select id="i-cat">'+o+'</select></div>'+
  '<div><label for="i-datos">Datos que guardas</label><input id="i-datos" placeholder="nombre, teléfono, correo"></div>'+
  '<div><label for="i-fin">Para qué los usas</label><input id="i-fin" placeholder="coordinar despachos"></div>'+
  '<div><label for="i-base">Por qué puedes usarlos</label><select id="i-base">'+b+'</select></div>'+
  '<div><label for="i-donde">Dónde se guardan</label><input id="i-donde" placeholder="Excel, WhatsApp, Shopify"></div>'+
  '<div><label for="i-terc">Terceros que los reciben</label><input id="i-terc" placeholder="Mailchimp, Google (o «ninguno»)"></div>'+
  '<div><label for="i-plazo">Cuánto tiempo los conservas</label><input id="i-plazo" placeholder="2 años desde la última compra"></div>'+
  '<div style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="i-sens"><label for="i-sens" style="margin:0">Incluye datos sensibles (salud, biometría…)</label></div>'+
  '<div class="doble acc"><button class="b prim" type="submit">Agregar</button></div></form><div id="e-inv"></div></div>';
  html+='<div class="caja"><h2>Tu inventario ('+estado.inventario.length+')</h2>';
  if(!estado.inventario.length)html+='<p class="sub">Aún no hay filas. Usa «Probar con un ejemplo» abajo o agrega la primera.</p>';
  estado.inventario.forEach(function(r){html+='<div class="item"><b>'+h(r.categoria)+': '+h(r.datos)+(r.sensible?' ⚠️':'')+'</b><span class="sub">Para '+h(r.finalidad)+' · '+h(r.base)+' · en '+h(r.donde)+(r.terceros?' · terceros: '+h(r.terceros):'')+(r.plazo?' · conserva: '+h(r.plazo):'')+'</span> <button class="b chico" data-del="'+r.id+'" aria-label="Quitar '+h(r.datos)+'">Quitar</button></div>'});
  var al=M.alertas(estado.inventario);
  if(al.length)html+='<h2 style="margin-top:16px">Revisa esto</h2>'+al.map(function(a){return '<div class="item sub">'+h(a.texto)+'</div>'}).join('');
  html+='<div class="acc"><button class="b" id="csv-exp">Exportar CSV</button><label class="b" style="display:inline-flex;align-items:center;margin:0;cursor:pointer">Importar CSV<input type="file" id="csv-imp" accept=".csv,text/csv" hidden></label></div></div>';
  $('v-inv').innerHTML=html;
}
$('v-inv').addEventListener('submit',function(e){
  e.preventDefault();
  var r=M.nuevoRegistro({categoria:$('i-cat').value,datos:$('i-datos').value,finalidad:$('i-fin').value,base:$('i-base').value,donde:$('i-donde').value,terceros:$('i-terc').value,plazo:$('i-plazo').value,sensible:$('i-sens').checked});
  var er=M.validarRegistro(r);
  if(er.length){$('e-inv').innerHTML='<div class="err">'+h(er.join('\n'))+'</div>';return}
  estado.inventario.push(r);guardar();vInv();$('i-datos').focus();
});
$('v-inv').addEventListener('click',function(e){
  var d=e.target.dataset.del;if(d){estado.inventario=estado.inventario.filter(function(r){return r.id!==d});guardar();vInv()}
  if(e.target.id==='csv-exp'){if(!estado.inventario.length){msg('No hay filas para exportar.',true);return}bajar('inventario-datos.csv','﻿'+M.aCSV(estado.inventario),'text/csv;charset=utf-8')}
});
$('v-inv').addEventListener('change',function(e){
  if(e.target.id!=='csv-imp')return;var f=e.target.files[0];if(!f)return;
  f.text().then(function(t){var rs=M.deCSV(t);estado.inventario=estado.inventario.concat(rs);guardar();vInv();msg('Se importaron '+rs.length+' filas.')}).catch(function(er){msg(er.message,true)});
});

function vPol(){
  var t=M.generarPolitica(estado.empresa,estado.inventario,hoy());
  $('v-pol').innerHTML='<h2>Tu política de privacidad</h2><p class="sub">Se arma con tu empresa y tu inventario. Revísala, adáptala y publícala donde recojas datos.</p><pre id="pol-txt">'+h(t)+'</pre><div class="acc"><button class="b prim" id="pol-cop">Copiar</button><button class="b" id="pol-desc">Descargar .txt</button></div>';
}
$('v-pol').addEventListener('click',function(e){
  var t=M.generarPolitica(estado.empresa,estado.inventario,hoy());
  if(e.target.id==='pol-cop'){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){msg('Copiada.')}).catch(function(){msg('No se pudo copiar; selecciona el texto a mano.',true)})}
  if(e.target.id==='pol-desc')bajar('politica-privacidad.txt',t,'text/plain;charset=utf-8');
});

function vSol(){
  var html='<div class="caja"><h2>Registrar una solicitud de un cliente</h2><form id="f-sol" class="campos">'+
  '<div><label for="s-per">Quién la pide</label><input id="s-per" placeholder="Nombre del cliente"></div>'+
  '<div><label for="s-tipo">Qué pide</label><select id="s-tipo"><option>'+M.TIPOS.join('</option><option>')+'</option></select></div>'+
  '<div><label for="s-rec">Fecha en que la recibiste</label><input type="date" id="s-rec" value="'+hoy()+'"></div>'+
  '<div><label for="s-pz">Plazo en días corridos</label><input type="number" min="1" id="s-pz" value="'+M.PLAZO_ARCO_DEFECTO+'"><span class="sub">Valor orientativo, sin verificar; ajústalo.</span></div>'+
  '<div class="doble acc"><button class="b prim" type="submit">Registrar</button></div></form><div id="e-sol"></div></div>';
  html+='<div class="caja"><h2>Solicitudes ('+estado.solicitudes.length+')</h2>';
  if(!estado.solicitudes.length)html+='<p class="sub">Sin solicitudes registradas.</p>';
  estado.solicitudes.slice().sort(function(a,b){return a.limite<b.limite?-1:1}).forEach(function(s){var st=M.estadoSolicitud(s,hoy());
    html+='<div class="item"><b>'+h(s.persona)+' · '+h(s.tipo)+' <span class="tag t-'+st.clave+'">'+h(st.texto)+'</span></b><span class="sub">Recibida '+s.recibida+' · límite '+s.limite+'</span><div class="acc">'+(s.resuelta?'':'<button class="b chico" data-res="'+s.id+'">Marcar resuelta</button>')+'<button class="b chico" data-resp="'+s.id+'">Respuesta modelo</button><button class="b chico" data-qs="'+s.id+'">Quitar</button></div></div>'});
  html+='<div id="resp"></div></div>';
  $('v-sol').innerHTML=html;
}
$('v-sol').addEventListener('submit',function(e){
  e.preventDefault();
  try{estado.solicitudes.push(M.nuevaSolicitud({persona:$('s-per').value,tipo:$('s-tipo').value,recibida:$('s-rec').value,plazoDias:$('s-pz').value}));guardar();vSol()}
  catch(er){$('e-sol').innerHTML='<div class="err">'+h(er.message)+'</div>'}
});
$('v-sol').addEventListener('click',function(e){
  var d=e.target.dataset;
  if(d.res){estado.solicitudes.forEach(function(s){if(s.id===d.res)s.resuelta=true});guardar();vSol()}
  if(d.qs){estado.solicitudes=estado.solicitudes.filter(function(s){return s.id!==d.qs});guardar();vSol()}
  if(d.resp){var s=estado.solicitudes.filter(function(x){return x.id===d.resp})[0];$('resp').innerHTML='<pre>'+h(M.respuestaModelo(s,estado.empresa))+'</pre>'}
});

$('exp-json').onclick=function(){bajar('mapa-de-datos.json',M.exportarTodo(estado),'application/json')};
$('imp-json').onchange=function(e){var f=e.target.files[0];if(!f)return;f.text().then(function(t){estado=M.importarTodo(t);guardar();pintar();msg('Respaldo importado.')}).catch(function(er){msg(er.message,true)});e.target.value=''};
$('borrar').onclick=function(){if(confirm('¿Borrar todos los datos de este navegador?')){estado={empresa:{},respuestas:{},inventario:[],solicitudes:[]};guardar();pintar();msg('Datos borrados.')}};
$('ejemplo').onclick=function(){
  var f=hoy();
  estado={empresa:{nombre:'Café Los Andes',rut:'',direccion:'Santiago, Chile',contacto:'privacidad@ejemplo.cl'},
    respuestas:{inventario:'parcial',finalidad:'si',aviso:'no',consentimiento:'parcial',derechos:'no',seguridad:'parcial'},
    inventario:[M.nuevoRegistro({categoria:'Clientes',datos:'nombre, teléfono, dirección de despacho',finalidad:'coordinar pedidos y entregas',base:'Contrato',donde:'WhatsApp Business y Excel',terceros:'Shopify, courier',plazo:'2 años desde la última compra'}),
      M.nuevoRegistro({categoria:'Clientes',datos:'correo',finalidad:'enviar promociones',base:'Consentimiento',donde:'Mailchimp',terceros:'Mailchimp',plazo:''}),
      M.nuevoRegistro({categoria:'Empleados',datos:'RUT, cuenta bancaria, licencias médicas',finalidad:'remuneraciones',base:'Obligación legal',donde:'Planilla y contador',terceros:'ninguno',plazo:'6 años',sensible:true})],
    solicitudes:[M.nuevaSolicitud({persona:'Cliente de ejemplo',tipo:'Supresión',recibida:M.sumarDias(f,-26)})]};
  guardar();tab='diag';pintar();msg('Ejemplo cargado. Es ficticio: puedes borrarlo.');
};
function pintar(){pintarTabs();vEmpresa();vDiag();vInv();vPol();vSol()}
cargar();pintar();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
})();
