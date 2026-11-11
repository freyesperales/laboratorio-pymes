# Cerebro Pyme

Escribe una vez los datos de tu negocio y obtén respuestas de WhatsApp, preguntas frecuentes para tu web, texto para tu ficha de Google y un documento para asistentes de IA; luego prueba con preguntas de clientes qué te falta responder.

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/007-cerebro-pyme/

## Ejemplo
Entrada: horario «lunes a viernes 09:00–18:30», pagos «efectivo, transferencia», envío «Valparaíso, el mismo día».
Pregunta de un cliente: «¿hacen despacho a domicilio?» → respuesta: «Hacemos envíos a Valparaíso. Plazo estimado: el mismo día…». Si preguntan algo que no está («¿aceptan perros?»), la herramienta lo marca como **hueco** y te deja crear la respuesta.

## Qué tendencia resuelve
- Las pymes reciben las mismas preguntas todos los días ([WATI](https://www.wati.io/geo-chile-es/blog/recommended/mejorar-atencion-cliente-whatsapp-pymes-chile)).
- WhatsApp Business ya ofrece un agente de IA que usa los datos del negocio, el catálogo y la web ([página de producto](https://www.whatsappbusiness.com/es-la/products/business-app-ai-agent/), [Cronista](https://www.cronista.com/infotechnology/it-business/asi-funciona-la-novedad-de-whatsapp-que-usan-las-pymes-para-vender-mas-sin-sumar-personal/)): funciona mejor con datos completos y ordenados.
- La privacidad es la barrera principal para usar IA ([Bluevine](https://www.bluevine.com/blog/small-business-ai-trends-report-2026)): aquí el contenido se prepara sin subirlo a nadie.

Detalle y fuentes (consultadas por búsqueda, no abiertas): [INVESTIGACION.md](INVESTIGACION.md).

## Cómo se usa
1. Pulsa «Probar con un ejemplo» o completa **Tu negocio**.
2. En **Horarios y reglas** marca días, pagos, envíos y políticas.
3. En **Productos y preguntas** agrega precios y las preguntas propias de tus clientes (también por CSV).
4. En **Probar** mira tu porcentaje de cobertura y escribe preguntas reales; guarda los huecos y respóndelos.
5. En **Salidas** copia o descarga: respuestas de WhatsApp, FAQ en HTML, datos estructurados (JSON-LD), texto para Google o documento para IA.
6. Exporta un respaldo JSON para llevarlo a otro equipo.

## Cómo instalarla en tu web o tu equipo
- **Equipo:** descarga la carpeta y abre `index.html` (funciona sin conexión; con servidor local o en GitHub Pages instala el modo sin conexión).
- **Tu web:** sube la carpeta y enlázala, o incrústala: `<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/007-cerebro-pyme/" width="100%" height="900" title="Cerebro Pyme"></iframe>`.
- Pruebas: `node pruebas.mjs` (sin dependencias).

## A quién le sirve
Cafés, tiendas, talleres, consultas y servicios que atienden por WhatsApp o Instagram, en Chile, España y Latinoamérica.

## En qué se diferencia
Gratis, en español, sin registro, y todo ocurre en tu navegador. [005 Atajos](../005-atajos/) arma respuestas rápidas por rubro; esta plataforma parte de tu ficha completa, genera varios formatos y mide qué preguntas no puedes responder.

## Fases
- Fase 1/1 (hecha): ficha, generadores, probador de huecos, importación y exportación, modo sin conexión.
- Ideas futuras: más preguntas típicas por rubro, vista previa de la conversación, plantillas por país.

## Limitaciones honestas
- La búsqueda de respuestas usa reglas simples (palabras y sinónimos), no IA: puede fallar con frases muy distintas.
- No sabemos cómo procesa Meta tus datos ni garantizamos que su agente responda igual; los detalles de ese agente vienen de fuentes de prensa no verificadas en la documentación oficial.
- Según fuentes, Google ya no muestra resultados destacados de preguntas frecuentes; el JSON-LD sigue siendo válido pero no promete posicionamiento.
- Revisa cada texto antes de publicarlo.

Licencia MIT.

---
Plataforma 007 del Laboratorio Pymes · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
