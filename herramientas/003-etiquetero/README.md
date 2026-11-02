# Etiquetero

**Crea enlaces con etiquetas UTM siempre escritas igual, guarda tu historial y evita que «FB», «facebook» y «Facebook» cuenten como tres fuentes distintas en Google Analytics.**

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/003-etiquetero/

## Ejemplo
**Entrada:** página `mipeluqueria.cl/promo-invierno`, fuente `FB`, medio `Social`, campaña `Promo Invierno`, contenido `Reel 1`.
**Salida:** `https://mipeluqueria.cl/promo-invierno?utm_source=facebook&utm_medium=social&utm_campaign=promo_invierno&utm_content=reel_1`

## Cómo se usa
1. Escribe la página de destino y completa fuente, medio y campaña (contenido y término son opcionales).
2. Pulsa «Crear enlace». Etiquetero pasa todo a minúsculas, quita tildes y espacios y unifica fuentes conocidas (fb → facebook, ig → instagram, correo → email).
3. Copia el enlace y úsalo en tu anuncio, publicación o correo.
4. Pulsa «Guardar en el historial». La próxima vez, Etiquetero te avisará si repites un enlace o si usas un nombre casi igual a uno anterior (por ejemplo `promoinvierno` y `promo_invierno`).
5. Exporta el CSV de vez en cuando como copia de seguridad; también puedes importarlo en otro equipo.

## Cómo instalarla en tu web o tu equipo
- **Equipo:** descarga `index.html` y `logica.js` (en la misma carpeta) y abre `index.html` con tu navegador.
- **Tu web:** sube ambos archivos a tu hosting, o incrústala: `<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/003-etiquetero/" width="100%" height="900" title="Etiquetero"></iframe>`

## A quién le sirve
A dueños de pymes y responsables de marketing que miden en Google Analytics de dónde llegan las visitas y las ventas, solos o en equipo.

## Limitaciones
- No mide clics ni acorta enlaces: solo construye y ordena las etiquetas.
- El historial vive en el navegador de ese equipo; no se sincroniza (usa el CSV).
- Convierte guiones y espacios en guion bajo, así que `spring-sale` y `spring_sale` quedan iguales. Si tu equipo ya usa otra convención en Analytics, los nombres antiguos seguirán separados.
- Los alias de fuentes son una lista corta y fija.
- Tus datos no salen de tu navegador; no hay servidor ni cuentas.

Pruebas: `node pruebas.mjs`.

Licencia MIT.

---
Herramienta 003 del Laboratorio Pymes · [laura.lat](https://laura.lat) · [farp.dev](https://farp.dev)
