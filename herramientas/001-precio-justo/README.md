# Precio Justo

Pon tu costo y el margen que quieres: te dice a qué precio publicar para que el IVA, las comisiones y los descuentos no se coman tu ganancia.

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/001-precio-justo/

## Ejemplo
Entrada: vela de soja, costo 6,50, margen 45 %, IVA 21 %, comisión 3,5 % + 0,30, envío 1,20, descuento 10 %, terminar en ,90.
Salida: **publicar a 21,90 (IVA incluido)**. El cliente paga 19,71 con el descuento, y quedan 7,60 de ganancia por unidad (margen real 46,7 %).

## Cómo se usa
1. Escribe el costo por unidad (sin IVA).
2. Elige el margen que quieres y el IVA de tu país (o escribe el tuyo).
3. Agrega comisiones, envío y descuento si los tienes.
4. Copia el precio, o pulsa «Agregar a mi lista» y descarga el CSV.
5. ¿Ya tienes un precio? Usa «Ya tengo un precio» y verás tu margen real.

## Cómo instalarla en tu web o tu equipo
- Descarga `index.html` y ábrelo con doble clic. No necesita internet ni servidor.
- Para incrustarla: `<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/001-precio-justo/" width="100%" height="900" title="Precio Justo"></iframe>`
- La lógica está en `logica.js`; las pruebas se corren con `node pruebas.mjs`.

## A quién le sirve
Tiendas online, artesanos, vendedores en marketplaces, restaurantes y servicios que venden con IVA y pagan comisiones.

## Limitaciones
- Los tipos de IVA son orientativos; verifica el de tu producto.
- Un solo tipo de IVA por producto y comisiones lineales. No incluye retenciones ni impuestos específicos.
- La lista se guarda en tu navegador (localStorage); si lo borras, se pierde. Descarga el CSV.
- No sustituye a tu contador.

Licencia MIT. Tus datos no salen de tu navegador.

Herramienta 001 del Laboratorio Pymes · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
