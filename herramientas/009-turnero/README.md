# Turnero

Arma los turnos de tu equipo en una grilla y te avisa al instante si alguien pasa de 42 horas, de 10 horas en un día o se queda sin descanso; comparte el horario por WhatsApp o calendario, anota lo que de verdad se trabajó y obtén las horas extra del mes por persona.

**▶ Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/009-turnero/

Gratis, en español, sin registro. 🔒 Los nombres de tu equipo y tus turnos no salen de tu navegador.

## Ejemplo

Una cafetería con 6 personas y un ciclo de 2 semanas («Probar con un ejemplo»). Diego tiene dos turnos «Largo» de 08:00 a 20:00 con una hora de colación:

```
Incumple · Diego trabaja 11 h el Vie 20-11: supera el máximo de 10 h diarias.
Incumple · Diego suma 46 h en la semana 1 (desde el 16-11): en un ciclo, ninguna semana puede pasar de 45 h ordinarias.
Incumple · Diego promedia 46 h semanales en el ciclo: supera las 42 h.
Dato     · Felipe tiene 10 h planificadas por semana y su contrato dice 20 h (faltan 10 h).
```

Y el mensaje para el grupo del equipo sale listo:

```
*Café del Puerto · Turnos semana del 16-11 al 22-11*

*Lun 16-11*
• Ana 07:30–16:00 (Apertura)
• Diego 07:30–16:00 (Apertura)
• Elena 10:00–15:00 (Media)
• Benjamín 12:30–21:00 (Cierre)
Libre: Carla, Felipe
```

Al cierre de cada día anotas lo que pasó de verdad. A fin de mes, el informe dice cuánto se trabajó contra lo planificado y cuántas horas extra hay que pagar:

```
Incumple · Diego trabajó 2 h 45 más de lo planificado el Lun 09-11: el máximo son 2 horas extra por día.
Revisa   · Carla trabajó 4 h el Lun 09-11, que era su día libre: revisa su descanso de la semana.

Persona    Días  Planificadas  Trabajadas  Diferencia  Extra del mes
Benjamín   5     40 h          40 h 40     +0 h 40     0 h 40
Diego      5     46 h          48 h 45     +2 h 45     2 h 45
Elena      3     20 h          15 h        -5 h        0 h
```

## Qué tendencia resuelve

- En Chile la jornada bajó a **42 horas el 26-04-2026** y bajará a 40 en abril de 2028 ([Mintrab](https://www.mintrab.gob.cl/ley-40-horas/)). La Dirección del Trabajo exige que la rebaja sea «efectiva y operativa» ([Dictamen 253/21](http://www.dt.gob.cl/legislacion/1624/w3-article-129189.html)).
- La ley permite promediar en ciclos de hasta 4 semanas, con topes por semana y por día ([art. 22 bis](https://iura.cl/ct/22-bis), [art. 31](https://iura.cl/ct/31)). Cuadrar eso a mano en Excel es lo que la prensa llamó «ingeniería de turnos» ([24horas](https://www.24horas.cl/actualidad/nacional/ley-40-horas-advierten-que-la-complejidad-operativa-y-el-riesgo-de-multas)).
- En Chile las horas extra **se determinan por semana**, no por día: se suma lo trabajado, se resta la jornada pactada y los atrasos se compensan con las salidas tardías de la misma semana; si el mes termina a mitad de semana, se pagan en el mes en que la semana termina ([Dirección del Trabajo](https://www.dt.gob.cl/portal/1628/w3-article-60176.html)). El máximo es de 2 por día y, según el criterio de la DT, 12 por semana ([DT](https://www.dt.gob.cl/portal/1628/w3-article-60157.html)). Hacer esa cuenta a mano, persona por persona, es donde se pagan horas de más o de menos.
- En España el tope es de **80 horas extraordinarias al año**, sin contar las compensadas con descanso en los 4 meses siguientes; se registran día a día y el trabajador recibe copia del resumen (art. 35 del Estatuto).
- En España rigen 40 horas, 9 horas diarias, 12 horas entre jornadas y día y medio de descanso semanal ([Estatuto de los Trabajadores, BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430)).

Investigación completa, propuestas descartadas y jurado: [INVESTIGACION.md](INVESTIGACION.md).

## Cómo se usa

1. **Negocio y reglas:** elige Chile 42 h, Chile 40 h o España 40 h, el lunes en que empieza el ciclo y su largo (1 a 4 semanas). Indica cuántas personas necesitas cada día.
2. **Equipo:** agrega a cada persona con su cargo y sus horas de contrato, o pega una lista `nombre;cargo;horas`.
3. **Turnos:** define cada tipo de turno (inicio, término y colación). Entiende turnos de noche que pasan la medianoche.
4. **Grilla:** elige el turno de cada persona cada día. Las horas de la semana y los incumplimientos se recalculan al instante; las celdas en rojo son las que incumplen.
5. **Revisión:** lista de incumplimientos, avisos y datos, con el resumen de horas por persona (descargable en CSV).
6. **Compartir:** copia el mensaje para WhatsApp, descarga el calendario `.ics` de cada persona (Google Calendar, Outlook o el teléfono), la grilla en CSV o imprímela.
7. **Lo trabajado:** elige el día y anota la entrada, la salida y la colación de cada persona, o usa «Todo el día según lo planificado» y corrige solo lo que fue distinto. También puedes marcar «No vino» o pegar las marcas de un reloj control (`fecha;persona;entrada;salida;colación;nota`). El plan de cada fecha sale solo, porque la grilla se repite.
8. **Informe del mes:** horas planificadas y trabajadas, ausencias, horas extra del mes y del año por persona, con los incumplimientos de topes. Anota las horas compensadas con descanso, descarga el resumen o el detalle por día en CSV, o imprime el informe de una persona con espacio para las firmas.

Qué revisa:

| Regla | Chile 42 h | España 40 h |
|---|---|---|
| Horas semanales | 42 (promedio del ciclo) | 40 (en el ciclo; la ley lo promedia en el año) |
| Tope de una semana dentro del ciclo | 45 h, no más de 2 semanas seguidas | — |
| Máximo diario | 10 h | 9 h (salvo convenio) |
| Días de trabajo por semana | de 5 a 6 en jornada completa | — |
| Descanso entre jornadas | — | 12 h |
| Descanso semanal continuo | — | 36 h (día y medio) |
| Pausa en jornada continua | — | 15 min si pasa de 6 h |
| Personas mínimas por día, horas de contrato y solapes | sí | sí |

Qué revisa sobre lo trabajado:

| Regla | Chile | España |
|---|---|---|
| Cómo se cuentan las horas extra | por semana, sobre la jornada pactada (o sobre lo planificado esa semana, en un ciclo de varias semanas) | por día, sobre lo planificado |
| Tope por día | 2 horas extra; 12 horas de trabajo en total | — |
| Tope por semana | 12 horas extra (criterio de la DT) | — |
| Tope por año | — | 80 horas, sin las compensadas con descanso |
| Pacto escrito | avisa si hay horas extra y no anotaste un pacto vigente (máximo 3 meses, renovable) | — |
| Tiempo parcial | — | avisa: no se pueden hacer horas extraordinarias |
| Descanso entre jornadas reales | — | 12 h |
| Día libre trabajado, registros que se pisan, jornadas sin registrar | sí | sí |

Puedes cambiar el método (por semana o por día) y fijar una tolerancia de hasta 30 minutos para que las diferencias pequeñas al marcar no cuenten.

Todas las reglas se pueden ajustar (o desactivar) si tu convenio o pacto dice otra cosa. Si aún no aplicas la rebaja a 42 horas sin acuerdo, Turnero muestra cómo la fija la DT: 1 hora en 2 días (jornada de 5 días) o 50 + 50 + 20 minutos (jornada de 6 días).

## Cómo instalarla en tu web o tu equipo

- **Usarla en línea:** abre la demo. Se puede instalar como aplicación desde el navegador y funciona sin conexión después de la primera visita.
- **Descargarla:** baja esta carpeta (`index.html`, `estilo.css`, `logica.js`, `app.js`, `manifest.webmanifest`, `sw.js`) y abre `index.html`. No necesita servidor ni dependencias.
- **Incrustarla en tu web:**
  ```html
  <iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/009-turnero/" width="100%" height="900" style="border:0" title="Turnero"></iframe>
  ```

## A quién le sirve

Cafeterías, restaurantes, tiendas, farmacias, minimarkets, peluquerías y clínicas pequeñas: equipos de 3 a 30 personas con turnos rotativos en Chile o en España.

## En qué se diferencia

Las alternativas habituales son planillas hechas a mano o servicios de turnos y asistencia que cobran por trabajador al mes, piden cuenta y guardan los datos del equipo en su servidor. Turnero es gratis, no pide registro, trae las reglas chilenas (incluida la transición a 40 horas) y españolas, y los datos quedan en tu navegador.

## Fases

- [x] **Fase 1 (18-11-2026):** equipo, turnos, grilla de 1 a 4 semanas, revisión de reglas de Chile y España, cobertura mínima, rebaja sin acuerdo, WhatsApp, calendario `.ics`, CSV, impresión, respaldo JSON, uso sin conexión.
- [x] **Fase 2 (20-11-2026):** registro de lo que realmente se trabajó (planificado contra real), importación de marcas, horas extra por semana (Chile) o por día (España) con sus topes, horas compensadas con descanso e informe mensual por persona en CSV e impresión.

## Limitaciones honestas

- **No es un sistema de registro de asistencia.** En Chile el registro electrónico debe cumplir los requisitos de la Dirección del Trabajo; en España el registro diario de jornada es obligatorio. Turnero planifica, avisa y resume; lo que anotas en «Lo trabajado» lo escribe quien administra, no lo marca el trabajador, así que no reemplaza esos registros.
- No calcula el valor en dinero de las horas extra (en Chile llevan un recargo del 50 % sobre el sueldo convenido): entrega las horas para que las pagues en tu liquidación.
- El tope chileno de 2 horas extra por día tiene matices que no se modelan: según la DT, en el sexto día de una jornada de lunes a viernes se pueden trabajar hasta 7 horas si queda saldo de las 12 semanales. Turnero avisa el día libre trabajado y controla las 12 de la semana.
- En un ciclo de varias semanas, las horas extra de cada semana se cuentan sobre lo planificado para esa semana. Es el criterio que elegimos; confírmalo con tu asesor si tu pacto dice otra cosa.
- En España no distingue las horas de fuerza mayor ni las complementarias del tiempo parcial.
- Aplica la ley general. No modela convenios colectivos, pactos sindicales de hasta 52 horas, jornadas especiales ni excepciones por rubro: ajusta los topes a mano.
- En España el promedio de 40 horas es anual; Turnero lo controla en el ciclo, que es más estricto.
- No es asesoría laboral. Ante dudas, consulta a la Dirección del Trabajo, a la Inspección de Trabajo o a tu asesor.

## Licencia

MIT.

---
Plataforma 009 del Laboratorio Pymes · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
