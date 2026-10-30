# Retoma

**Anota a quién le enviaste una cotización y te dice a quién escribir hoy, con el mensaje de seguimiento listo para WhatsApp.**

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/002-retoma/

## Ejemplo
**Entrada:** «Camila Rojas · +56 9 1111 2222 · la cotización de la remodelación · último contacto hace 9 días».
**Salida:** *Atrasado, debías escribirle hace 7 días* y el mensaje: «Hola Camila, ¿cómo estás? Te escribo por la cotización de la remodelación. ¿Pudiste revisarlo? …», con el botón «Enviar por WhatsApp».

## Cómo se usa
1. Agrega cada contacto al que enviaste una cotización o propuesta: nombre, teléfono con prefijo, de qué se trató y la fecha del último mensaje.
2. Abre Retoma cada mañana. Arriba aparecen los *atrasados* y los que *tocan hoy*.
3. Revisa el mensaje (puedes editarlo), pulsa «Enviar por WhatsApp» y confirma que lo enviaste.
4. Retoma agenda el siguiente intento: a los 2, 5 y 10 días. Tras el tercero, el contacto pasa a «enfriado» para no insistir.
5. Marca «Ganado» o «Perdido» cuando haya resultado. Exporta el CSV de vez en cuando como copia de seguridad.

## Cómo instalarla en tu web o tu equipo
- **Equipo:** descarga `index.html` y `logica.js` (en la misma carpeta) y abre `index.html` con tu navegador.
- **Tu web:** sube ambos archivos a tu hosting, o incrústala: `<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/002-retoma/" width="100%" height="900" title="Retoma"></iframe>`

## A quién le sirve
A autónomos y pymes que cotizan y cierran por WhatsApp (servicios, reformas, talleres, tiendas, estética, eventos) y pierden ventas por olvido.

## Limitaciones
- Los datos viven en el navegador de ese equipo: no se sincronizan entre dispositivos (usa exportar e importar CSV).
- No envía mensajes ni recordatorios por sí sola: abre WhatsApp con el texto y tú decides. No notifica si no la abres.
- La cadencia (2, 5 y 10 días) y los tres textos son fijos; puedes editar cada mensaje antes de enviarlo.
- Tus datos no salen de tu navegador; no hay servidor ni cuentas.

Licencia MIT.

---
Herramienta 002 del [Laboratorio Pymes](https://freyesperales.github.io/laboratorio-pymes/) · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
