# Papelería Yebra: guía paso a paso

La app está en internet en:

**https://ivannnavarro.github.io/papeleria-yebra/**

Sirve igual en la computadora y en el celular. Tiene 7 secciones: **Inicio** (resumen), **Vender** (la caja), **Surtir** (lista para el proveedor), **Inventario**, **Ventas** (historial), **Estadísticas** y **Ajustes**. En el celular, Inventario, Estadísticas y Ajustes están en el botón **Más**.

---

## 1. Instalarla

### En la computadora
1. Abre el link en **Chrome** o **Edge**.
2. A la derecha de la barra de dirección aparece un ícono de “Instalar” (una pantallita con flecha). Dale clic → **Instalar**.
3. Queda un ícono en el escritorio y se abre como programa.

### En iPhone
1. Abre el link en **Safari**.
2. Toca **Compartir** (cuadrito con flecha) → **Agregar a pantalla de inicio** → **Agregar**.

### En Android
1. Abre el link en **Chrome**.
2. Menú de los 3 puntos → **Agregar a pantalla principal** (o **Instalar app**).

---

## 2. Conectar celular y computadora (muy recomendado)

Sin este paso, cada equipo guarda **sus propias** ventas: lo que vendas en la computadora no se ve en el celular. Con este paso todo se guarda en tu hoja de Google y todos los equipos ven lo mismo. Además, si se borra el navegador, no pierdes nada.

Se hace **una sola vez** (unos 5 minutos):

1. En la computadora entra a **https://sheets.new** con tu cuenta **personal** de Google (Gmail). Se crea una hoja **nueva y vacía** que es tuya. Ponle de nombre “Papelería Yebra - App”.
   - No uses la hoja vieja del inventario: esa ya no se ocupa (el inventario ahora vive en la app) y además es de solo lectura.
   - Evita la cuenta de la escuela: esas cuentas suelen tener bloqueado Apps Script.
2. Menú **Extensiones → Apps Script**.
3. Borra lo que aparece y pega todo el contenido del archivo **`google-sheets/Codigo.gs`** (está en esta misma carpeta, o en GitHub: https://github.com/ivannnavarro/papeleria-yebra/blob/main/google-sheets/Codigo.gs).
4. En la línea `const CLAVE = 'cambia-esta-clave';` cambia `cambia-esta-clave` por una clave tuya (ej. `yebra-2026-pluma`). Guarda (ícono de disquete).
5. Arriba a la derecha: **Implementar → Nueva implementación**.
   - Engrane ⚙️ → **Aplicación web**.
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier usuario.
   - **Implementar**. Google te pide permiso: **Autorizar acceso** → elige tu cuenta → *Configuración avanzada* → *Ir a … (no seguro)* → **Permitir**. (Es tu propio código, por eso sale ese aviso.)
6. Copia la **URL de la aplicación web** (termina en `/exec`).
7. En la app: **Ajustes → Celular y computadora juntos**, pega la dirección y la clave → **Conectar**.
8. Repite el paso 7 en cada celular o computadora (misma dirección y misma clave).

Listo. Arriba a la derecha la app dice **✓ Guardado en la nube**. Si no hay internet, las ventas se guardan en el equipo y se suben solas cuando regresa la señal.

En esa hoja nueva aparecen 2 pestañas:
- **APP_Ventas**: todas las ventas, una línea por artículo (fecha, hora, vendedor, descripción, precio, efectivo, tarjeta…). Esta sí la puedes ver y filtrar.
- **APP_Movimientos**: es la memoria de la app. **No la edites ni la borres.**

> Si vendiste en un equipo **antes** de conectarlo, esas ventas se suben solas al conectarlo.

---

## 3. Cómo se usa

### Vender (la caja)
1. Escribe en el buscador lo que lleva el cliente (ej. “foamy rojo”) y tócalo. Cada toque suma una pieza.
2. Para **copias, impresiones, trámites (CURP, actas), pagos de luz/agua, recargas, maquetas o manualidades** toca el botón del servicio:
   - Copias e impresiones: escribe cuántas.
   - Trámites y trabajos escolares: escribe qué es y el precio (y si quieres, lo que te costó a ti, para la ganancia).
   - Pagos de luz/agua y recargas: escribe el monto del recibo y tu comisión. El monto del recibo no cuenta como ganancia, solo tu comisión.
3. Si algo no está en la lista: **“Vender algo que no está en la lista”**.
4. Toca **Cobrar**:
   - Escoge **quién vendió** (o escribe el nombre la primera vez).
   - Escoge **Efectivo**, **Tarjeta** o **Las dos**. En “Las dos” escribes cuánto va con tarjeta y el resto se calcula en efectivo.
   - Si con tarjeta se paga **menos de $50**, la app suma sola la comisión (hoy $5). Se puede quitar con la palomita si no aplica.
   - Si escribes con cuánto paga en efectivo, te dice el **cambio**.
   - La **fecha y la hora** se guardan solas.

Si un producto no tiene precio, la app te lo pregunta la primera vez y lo guarda.

### Inicio
- Resumen como tablero: productos por surtir, agotados, poco stock, ventas de hoy, valor del inventario, ventas por mes (este año contra el pasado), productos por surtir por categoría y la tabla de recomendación de surtido.

### Surtir (para ir con el proveedor)
- Salen solos los productos **agotados** y los que llegaron a su **mínimo** (2 piezas, se cambia en Ajustes o por producto en Editar).
- Cada uno trae cuántos **comprar**: se calcula con lo que se vendió en los últimos 30 días. Se puede cambiar con − y +.
- Arriba van primero los que **más se venden**. Filtros: Agotados, Poco stock, Se venden, por categoría.
- **Agregar producto**: para comprar algo que todavía no se acaba (también desde Inventario con el botón del camión).
- Toca el círculo para marcar lo que **ya compraste**. Al regresar, **Sumar al inventario** registra la entrada de todo lo marcado (puedes corregir piezas y costo).
- **Compartir** manda la lista por WhatsApp o la copia; **Excel** la descarga.
- Las palomitas y cantidades de esta lista se guardan en ese celular.

### Inventario
- Cada venta descuenta las piezas sola.
- **+ Entrada**: cuando llega mercancía.
- **Editar**: cambiar nombre, precio, costo o corregir la existencia.
- Filtros: **Poco stock**, **Agotados**, **Sin precio**, **Sin costo**.
- **Descargar (Excel)** baja el inventario actual.

### Ventas (historial)
- Elige **Día, Semana, Mes o Año** y muévete con ‹ ›.
- Arriba: total, efectivo, tarjeta, comisiones y ganancia. En “Día” sale el **corte de caja por vendedor**.
- Cada venta muestra hora, vendedor, forma de pago, cantidad, descripción y precio.
- **Cancelar venta**: si hubo un error. Las piezas regresan al inventario.
- **Descargar (Excel)** baja las ventas del periodo.

### Estadísticas
- Ganancia y **margen de ganancia**, productos **más** y **menos** vendidos, lo que más ganancia deja, servicios más pedidos, ventas por categoría, efectivo vs tarjeta, por vendedor, por hora, y la gráfica de **ventas por mes** con el mes más alto.

### Ajustes
- Vendedores, comisión de tarjeta, precios de servicios, conexión con Google Sheets y **respaldo**.

---

## 4. Lo que hay que revisar

Importé las 4 pestañas de tu hoja: **1,251 productos** (Papelería 1,047, Regalos 115, Mercería 54, Electrónica 35).

- **635 productos no tienen precio** en la hoja. No pasa nada: al venderlos la primera vez, la app pregunta el precio y lo guarda. También puedes ir a Inventario → **Sin precio**.
- **Costos**: donde la hoja decía el precio de un paquete, por ejemplo `$57,20 (12)`, lo dividí entre las piezas. Cuando el costo era más alto que el precio de venta y no decía cuántas piezas traía (como en los agarrapapeles), no lo usé y le puse una nota “revisar”. La ganancia se calcula solo con los productos que tienen costo.
- Los precios con centavos raros de la hoja (`$7,01`, `$7,02`, `$8,13`…) los redondeé a pesos (`$7`, `$8`).
- La existencia se tomó de la columna **INVENTARIO** (o **EXISTENCIA TOTAL** si estaba vacía). Las existencias negativas quedaron en 0.
- **Precios de servicios** (los puse de ejemplo, cámbialos en Ajustes → Servicios): copia B/N $1, copia color $5, impresión B/N $3, impresión color $8, escaneo $5, enmicado $15, engargolado $35, CURP $10, comisión por pago de luz y agua $10, recargas sin comisión.
- **Comisión con tarjeta**: puse $5 cuando el pago con tarjeta es menor a $50. Se cambia en Ajustes (puede ser en pesos o en %).

---

## 5. Para Claude Code (cambios futuros)

- Código en `C:\…\papeleria-yebra` y en GitHub `ivannnavarro/papeleria-yebra` (rama `main`, GitHub Pages).
- `seed.js` es el inventario inicial. **No lo vuelvas a generar** una vez que se usa la app: los cambios viven como movimientos (ventas, entradas, ediciones) en `APP_Movimientos`, y sus `id` de producto (`p1`, `p2`…) dependen de `seed.js`.
- Si cambias `app.js` o `app.css`, sube `VERSION` en `sw.js` para que los celulares bajen la nueva versión.
