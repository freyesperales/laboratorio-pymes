(function(){
'use strict';
var M=window.CerebroPyme, KEY='lab007-cerebro-pyme';
var f=M.ficha(), tab='negocio', salida='whatsapp', ultima=null;
function $(id){return document.getElementById(id)}
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function msg(t,mal){$('msg').innerHTML=t?'<div class="'+(mal?'err':'ok')+'">'+h(t)+'</div>':''}
function guardar(){try{localStorage.setItem(KEY,M.exportarTodo(f))}catch(e){msg('No se pudo guardar en este navegador (modo privado o almacenamiento lleno). Exporta un respaldo.',true)}}
function cargar(){try{var t=localStorage.getItem(KEY);if(t)f=M.importarTodo(t)}catch(e){}}
function bajar(n,t,tipo){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:tipo}));a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function copiar(t){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){msg('Copiado.')},function(){msg('No se pudo copiar; selecciona el texto y cópialo a mano.',true)})}
  else msg('Tu navegador no permite copiar con el botón; selecciona el texto y cópialo a mano.',true);
}
var TABS=[['negocio','1 · Tu negocio'],['reglas','2 · Horarios y reglas'],['prod','3 · Productos y preguntas'],['prueba','4 · Probar'],['salidas','5 · Salidas']];
function tabs(){
  $('tabs').innerHTML=TABS.map(function(t){return '<button role="tab" id="t-'+t[0]+'" aria-selected="'+(tab===t[0])+'" data-t="'+t[0]+'">'+t[1]+'</button>'}).join('');
  TABS.forEach(function(t){$('v-'+t[0]).hidden=tab!==t[0]});
}
$('tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;tab=b.dataset.t;msg('');pintar()});
$('tabs').addEventListener('keydown',function(e){var i=TABS.findIndex(function(t){return t[0]===tab});if(e.key==='ArrowRight')i=(i+1)%TABS.length;else if(e.key==='ArrowLeft')i=(i+TABS.length-1)%TABS.length;else return;tab=TABS[i][0];pintar();$('t-'+tab).focus()});

function campo(id,et,val,extra){return '<div'+(extra&&extra.doble?' class="doble"':'')+'><label for="'+id+'">'+et+'</label>'+(extra&&extra.area?'<textarea id="'+id+'" data-p="'+id+'">'+h(val)+'</textarea>':'<input id="'+id+'" data-p="'+id+'" value="'+h(val)+'"'+(extra&&extra.ph?' placeholder="'+h(extra.ph)+'"':'')+'>')+'</div>'}
function vNegocio(){
  var n=f.negocio;
  $('v-negocio').innerHTML='<h2>Tu negocio</h2><div class="campos">'+
  campo('n.nombre','Nombre del negocio',n.nombre)+campo('n.rubro','Rubro (ej. cafetería, ferretería)',n.rubro)+
  '<div><label for="n.pais">País</label><select id="n.pais" data-p="n.pais">'+['Chile','España','México','Colombia','Perú','Argentina','Otro'].map(function(p){return '<option'+(p===n.pais?' selected':'')+'>'+p+'</option>'}).join('')+'</select></div>'+
  campo('n.ciudad','Ciudad o comuna',n.ciudad)+campo('n.direccion','Dirección',n.direccion)+campo('n.whatsapp','WhatsApp del negocio',n.whatsapp,{ph:'con código de país'})+
  campo('n.correo','Correo',n.correo)+campo('n.web','Sitio web o Instagram',n.web)+
  campo('n.descripcion','¿Qué vendes o qué servicio das? Una o dos frases.',n.descripcion,{area:1,doble:1})+'</div>'+
  '<p class="sub">Cada dato que escribes se convierte en una respuesta. Deja vacío lo que no aplique.</p>';
}
function vReglas(){
  var e=f.envio,p=f.politicas;
  $('v-reglas').innerHTML='<h2>Horarios</h2>'+f.horarios.map(function(x,i){
    return '<div class="item" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="display:flex;gap:8px;align-items:center;margin:0;min-width:150px"><input type="checkbox" data-hab="'+i+'"'+(x.abierto?' checked':'')+'> '+x.dia+'</label>'+
    '<label for="d'+i+'" class="sub" style="margin:0">desde</label><input id="d'+i+'" type="time" style="width:130px" data-hd="'+i+'" value="'+x.desde+'"'+(x.abierto?'':' disabled')+'>'+
    '<label for="u'+i+'" class="sub" style="margin:0">hasta</label><input id="u'+i+'" type="time" style="width:130px" data-hu="'+i+'" value="'+x.hasta+'"'+(x.abierto?'':' disabled')+'></div>'}).join('')+
  '<div class="campos" style="margin-top:12px">'+campo('hn','Nota de horario (feriados, almuerzo…)',f.horarioNota,{doble:1})+'</div>'+
  '<h2 style="margin-top:20px">Medios de pago</h2><div class="opc">'+M.PAGOS.map(function(x,i){return '<label><input type="checkbox" data-pago="'+h(x)+'"'+(f.pagos.indexOf(x)>=0?' checked':'')+'> '+x+'</label>'}).join('')+'</div>'+
  '<div class="campos" style="margin-top:10px">'+campo('po','Otros medios de pago',f.pagosOtros)+'</div>'+
  '<h2 style="margin-top:20px">Envíos y retiro</h2><div class="opc"><label><input type="checkbox" data-env="hace"'+(e.hace?' checked':'')+'> Hago envíos</label><label><input type="checkbox" data-env="retiro"'+(e.retiro?' checked':'')+'> Se puede retirar en el local</label></div>'+
  '<div class="campos" style="margin-top:10px">'+campo('e.zonas','Zonas de envío',e.zonas)+campo('e.plazo','Plazo (ej. 2 a 3 días hábiles)',e.plazo)+campo('e.costo','Costo del envío',e.costo)+campo('e.retiroDonde','Dónde se retira',e.retiroDonde)+'</div>'+
  '<h2 style="margin-top:20px">Políticas</h2><div class="campos">'+
  campo('p.cambios','Cambios y devoluciones',p.cambios,{area:1,doble:1})+campo('p.garantia','Garantía',p.garantia,{area:1})+campo('p.comprobante','Boleta o factura',p.comprobante,{area:1})+'</div>';
}
function vProd(){
  $('v-prod').innerHTML='<h2>Productos o servicios</h2><p class="sub">Cada uno responde «¿cuánto cuesta…?».</p>'+
  f.productos.map(function(x,i){return '<div class="item"><div class="campos">'+campo('pr'+i+'n','Nombre',x.nombre).replace('data-p="pr'+i+'n"','data-pr="'+i+'.nombre"')+campo('pr'+i+'p','Precio (con moneda)',x.precio).replace('data-p="pr'+i+'p"','data-pr="'+i+'.precio"')+campo('pr'+i+'d','Detalle (opcional)',x.desc,{doble:1}).replace('data-p="pr'+i+'d"','data-pr="'+i+'.desc"')+'</div><button class="b chico" data-delpr="'+i+'">Quitar</button></div>'}).join('')+
  '<div class="acc"><button class="b" id="addpr">+ Agregar producto</button></div>'+
  '<h2 style="margin-top:22px">Preguntas propias</h2><p class="sub">Lo que tus clientes preguntan y no está arriba. Las palabras clave ayudan a encontrar la respuesta (ej. «celíaco, gluten»).</p>'+
  f.faq.map(function(x,i){return '<div class="item"><div class="campos">'+campo('fq'+i+'p','Pregunta',x.p).replace('data-p="fq'+i+'p"','data-fq="'+i+'.p"')+campo('fq'+i+'k','Palabras clave',x.claves).replace('data-p="fq'+i+'k"','data-fq="'+i+'.claves"')+campo('fq'+i+'r','Respuesta',x.r,{area:1,doble:1}).replace('data-p="fq'+i+'r"','data-fq="'+i+'.r"')+'</div><button class="b chico" data-delfq="'+i+'">Quitar</button></div>'}).join('')+
  '<div class="acc"><button class="b" id="addfq">+ Agregar pregunta</button><button class="b" id="fq-csv">Exportar preguntas (CSV)</button><label class="b" style="display:inline-flex;align-items:center;margin:0;cursor:pointer">Importar preguntas (CSV)<input type="file" id="fq-imp" accept=".csv,text/csv" hidden></label></div>';
}
function vPrueba(){
  var c=M.cobertura(f);
  var html='<h2>¿Qué tan completo está tu cerebro?</h2><div class="medidor">'+c.porcentaje+'%</div><div class="barra" aria-hidden="true"><i style="width:'+c.porcentaje+'%"></i></div>'+
  '<p class="sub">'+c.respondidas+' de '+c.total+' preguntas típicas de clientes ya tienen respuesta.</p>';
  if(c.pasos.length)html+='<p><b>Para subirlo:</b></p><ul>'+c.pasos.map(function(p){return '<li>'+h(p)+'</li>'}).join('')+'</ul>';
  html+='<h2 style="margin-top:20px">Pregunta como un cliente</h2><label for="q">Escribe una pregunta real que te hayan hecho</label><input id="q" autocomplete="off"><div class="acc"><button class="b prim" id="pq">Buscar respuesta</button></div><div id="res" aria-live="polite"></div>';
  if(f.huecos.length)html+='<h2 style="margin-top:20px">Huecos: preguntas sin respuesta</h2>'+f.huecos.map(function(x,i){return '<div class="item"><b>'+h(x)+'</b><div class="acc"><button class="b chico" data-hfq="'+i+'">Crear respuesta</button><button class="b chico" data-hdel="'+i+'">Descartar</button></div></div>'}).join('');
  $('v-prueba').innerHTML=html;
}
function responder(){
  var q=$('q').value.trim(); if(!q){msg('Escribe una pregunta primero.',true);return}
  msg(''); var r=M.buscar(M.entradas(f),q); ultima=q;
  if(r.respondida)$('res').innerHTML='<div class="ok"><b>Tu ficha responde:</b><br>'+h(r.mejor.r)+'<p class="sub" style="margin:6px 0 0">Coincide con «'+h(r.mejor.p)+'»</p></div>';
  else{
    var alt=r.alternativas.length?'<p class="sub">Lo más parecido: '+r.alternativas.map(function(a){return '«'+h(a.p)+'»'}).join(', ')+'.</p>':'';
    $('res').innerHTML='<div class="err">Tu ficha no responde esta pregunta todavía.</div>'+alt+'<div class="acc"><button class="b" id="gh">Guardar como hueco</button></div>';
  }
}
function vSalidas(){
  var S=[['whatsapp','Respuestas de WhatsApp'],['faq','FAQ para tu web'],['json','Datos para Google (JSON-LD)'],['ficha','Texto ficha de Google'],['doc','Documento para IA']];
  var txt='',nota='',rap;
  if(salida==='whatsapp'){rap=M.respuestasRapidas(f);txt=rap.map(function(x){return x.atajo+'\n'+x.texto}).join('\n\n');nota='En WhatsApp Business crea cada respuesta rápida: el atajo es lo que escribes y el texto es el mensaje.'}
  if(salida==='faq'){txt=M.faqHtml(f);nota='Pega este HTML en tu web. Funciona sin estilos; adáptalo a tu diseño. Según fuentes consultadas, Meta indica que su agente de IA para WhatsApp Business puede aprender de la web del negocio: tener tus respuestas publicadas ayuda (sin verificar en la documentación oficial).'}
  if(salida==='json'){txt=M.jsonld(f);nota='Datos estructurados (LocalBusiness y FAQPage) para buscadores y lectores de IA. Según fuentes consultadas, Google ya no muestra resultados destacados de preguntas frecuentes, así que no esperes verlas en Google; el marcado sigue siendo válido. Pégalos dentro de la página de tu web.'}
  if(salida==='ficha'){var g=M.textoFichaGoogle(f);txt=g.texto;nota='Texto base para la descripción de tu ficha. Largo: '+g.largo+' caracteres; revisa el límite que muestre Google al editarla.'}
  if(salida==='doc'){txt=M.documento(f);nota='Pégalo como contexto en el asistente de IA o la función de respuestas automáticas que uses. Revisa que no incluya datos que no quieras compartir.'}
  $('v-salidas').innerHTML='<h2>Salidas</h2><div class="opc" role="group" aria-label="Tipo de salida">'+S.map(function(s){return '<button class="b chico'+(salida===s[0]?' prim':'')+'" data-s="'+s[0]+'" aria-pressed="'+(salida===s[0])+'">'+s[1]+'</button>'}).join('')+'</div>'+
  '<p class="sub">'+h(nota)+'</p>'+(txt.trim()?'<pre id="salida-txt" tabindex="0">'+h(txt)+'</pre><div class="acc"><button class="b prim" id="cp">Copiar</button><button class="b" id="dl">Descargar</button></div>':'<p class="err">Todavía no hay datos: completa los pasos 1 a 3.</p>');
}
function pintar(){tabs();
  if(tab==='negocio')vNegocio();else if(tab==='reglas')vReglas();else if(tab==='prod')vProd();else if(tab==='prueba')vPrueba();else vSalidas();
}
function ruta(o,k,v){var p=k.split('.');o[p[0]][p[1]]=v}
document.addEventListener('input',function(e){
  var t=e.target,d=t.dataset;
  if(d.p){var p=d.p.split('.');f[p[0]==='n'?'negocio':p[0]==='e'?'envio':'politicas'][p[1]]=t.value;guardar()}
  else if(t.id==='hn'){f.horarioNota=t.value;guardar()}
  else if(t.id==='po'){f.pagosOtros=t.value;guardar()}
  else if(d.hd!==undefined){f.horarios[d.hd].desde=t.value;guardar()}
  else if(d.hu!==undefined){f.horarios[d.hu].hasta=t.value;guardar()}
  else if(d.pr){var a=d.pr.split('.');f.productos[a[0]][a[1]]=t.value;guardar()}
  else if(d.fq){var b=d.fq.split('.');f.faq[b[0]][b[1]]=t.value;guardar()}
});
document.addEventListener('change',function(e){
  var t=e.target,d=t.dataset;
  if(d.p&&t.tagName==='SELECT'){f.negocio.pais=t.value;guardar()}
  else if(d.hab!==undefined){f.horarios[d.hab].abierto=t.checked;guardar();pintar()}
  else if(d.pago){var i=f.pagos.indexOf(d.pago);if(t.checked&&i<0)f.pagos.push(d.pago);if(!t.checked&&i>=0)f.pagos.splice(i,1);guardar()}
  else if(d.env){f.envio[d.env]=t.checked;guardar()}
  else if(t.id==='fq-imp'){var file=t.files[0];if(!file)return;var r=new FileReader();r.onload=function(){try{var x=M.faqDeCSV(r.result);f.faq=f.faq.concat(x);guardar();pintar();msg(x.length+' preguntas importadas.')}catch(er){msg(er.message,true)}};r.readAsText(file);t.value=''}
  else if(t.id==='imp-json'){var f2=t.files[0];if(!f2)return;var r2=new FileReader();r2.onload=function(){try{f=M.importarTodo(r2.result);guardar();pintar();msg('Respaldo importado.')}catch(er){msg(er.message,true)}};r2.readAsText(f2);t.value=''}
});
document.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;var d=b.dataset;
  if(b.id==='addpr'){f.productos.push({nombre:'',precio:'',desc:''});guardar();pintar()}
  else if(d.delpr!==undefined){f.productos.splice(d.delpr,1);guardar();pintar()}
  else if(b.id==='addfq'){f.faq.push({p:'',r:'',claves:''});guardar();pintar()}
  else if(d.delfq!==undefined){f.faq.splice(d.delfq,1);guardar();pintar()}
  else if(b.id==='fq-csv'){bajar('preguntas-cerebro-pyme.csv',M.faqACSV(f),'text/csv;charset=utf-8')}
  else if(b.id==='pq'){responder()}
  else if(b.id==='gh'){if(f.huecos.indexOf(ultima)<0)f.huecos.push(ultima);guardar();pintar();msg('Guardada en huecos.')}
  else if(d.hfq!==undefined){f.faq.push({p:f.huecos[d.hfq],r:'',claves:''});f.huecos.splice(d.hfq,1);guardar();tab='prod';pintar();msg('Escribe la respuesta abajo.')}
  else if(d.hdel!==undefined){f.huecos.splice(d.hdel,1);guardar();pintar()}
  else if(d.s){salida=d.s;pintar()}
  else if(b.id==='cp'){copiar($('salida-txt').textContent)}
  else if(b.id==='dl'){var ext={whatsapp:'txt',faq:'html',json:'html',ficha:'txt',doc:'md'}[salida];bajar('cerebro-pyme-'+salida+'.'+ext,$('salida-txt').textContent,'text/plain;charset=utf-8')}
  else if(b.id==='ejemplo'){f=M.ejemplo();guardar();tab='negocio';pintar();msg('Ejemplo cargado. Cambia los datos por los tuyos.')}
  else if(b.id==='exp-json'){bajar('cerebro-pyme-respaldo.json',M.exportarTodo(f),'application/json')}
  else if(b.id==='borrar'){if(confirm('¿Borrar todos los datos de este equipo?')){f=M.ficha();guardar();pintar();msg('Datos borrados.')}}
});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='q'){e.preventDefault();responder()}});
cargar();pintar();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){navigator.serviceWorker.register('sw.js').catch(function(){})}
})();
