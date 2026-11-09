# Pruebas de usuario

Registro de las dos sesiones de prueba con el cliente de De Panas SV y de las decisiones que salieron de cada una. Este documento recoge lo que se decidió en las reuniones; no lleva el estado de cada cambio.

| Sesión | Fecha | Equipo FORGE | Cliente | Forma de trabajo |
|---|---|---|---|---|
| 1 | 13/10/2026 | Pedro, Alejandro, Gabriel y Soham | César | Le mostramos el programa a César y nos dio su opinión sobre cómo funcionaba y cómo se veía. |
| 2 | 29/10/2026 | Pedro, Alejandro, Gabriel y Soham | César y Marta | Le dimos el programa a César para que lo usara, con una factura real. |

## Sesión 1: 13 de octubre de 2026

Esta sesión dejó cambios de funcionamiento, de apariencia y de nombres.

### Módulo de compras

- Cambiar el orden de fecha y proveedor.
- Cambiar el nombre del módulo Compras a Lista de compras.
- Quitar la flecha del botón de ingresar.
- Pedir confirmación para guardar una compra.
- Pedir confirmación para cancelar.
- Deshabilitar Cancelar y Guardar compra cuando no haya nada escrito.
- Acortar el mensaje que sale al guardar una compra.
- No dejar crear una fila si la anterior no está llena.
- Hacer que el monto salga de la lista de productos.
- Centrar la ventana de modificar una compra.
- Decir «Cost» en vez de «Gasto total».
- Permitir más de un producto al agregar un material nuevo.

### Proveedores

- Agregar los detalles del proveedor.
- Agregar una pantalla para registrar un proveedor.
- Quitar la opción de respuesta automática de proveedores.
- Quitar la respuesta de ejemplo.
- Relacionar productos con proveedores.
- Avisar «debe seleccionar el proveedor primero» si se intenta agregar un producto antes.
- Permitir importar y exportar los proveedores y otros datos.

### Productos y artículos

- Decir «artículos» en vez de «materiales», en Productos y en Categoría.
- Mostrar «Categoría» en vez de «Nombre» en el módulo de categorías.
- Poner el buscador arriba en Productos.
- Aprovechar mejor el espacio del Catálogo y de la edición de un producto.
- Editar un producto arrastrando en vez de seleccionando, como al armar una receta.
- Agregar el campo de unidad.

### Usuarios y permisos

- Gestionar con más detalle lo que puede hacer cada usuario.
- Crear los roles de usuario y administrador, con permisos según el rol.
- Al agregar una persona, indicar debajo de «Usuario» que es el nombre de usuario para ingresar.
- Poner requisitos para crear las contraseñas.
- Mostrar el rol junto al usuario.
- Decir «Cerrar sesión» en vez de «Bloquear».

### Interfaz en general

- Usar un fondo más claro en la pantalla de inicio.
- Quitar las funciones que no se usan del panel izquierdo.
- Pedir confirmación en cada botón de acción.

## Sesión 2: 29 de octubre de 2026

En esta sesión César usó el programa y entre todos fuimos señalando errores y cosas por mejorar. El ejercicio central fue registrar una factura real de Pepsi con tres productos.

**Lo que descubrimos:** al registrar esa factura nos dimos cuenta de que el sistema no tomaba en cuenta el IVA. Parece algo básico, pero no lo vimos hasta hacer el ejercicio con una factura real. Por eso decidimos agregarlo.

### IVA en las compras

- La tasa es de 13 % fija y se suma encima: los montos van sin IVA, y el total es el subtotal más el IVA.
- Cada compra muestra el subtotal, una casilla de IVA con su costo y el total.
- En una compra nueva, la casilla toma el valor de la última compra de ese proveedor. Si no tiene historial, queda sin marcar. Una vez que alguien la toca, queda como la dejaron.
- El IVA también aparece en el detalle de la compra, en el Excel y en los respaldos JSON. Los respaldos anteriores, que no lo traen, siguen cargando y cuentan con IVA 0.

### Formulario de compra

- Se puede escribir el monto y que se calcule el precio unitario, o al revés. Al cambiar la cantidad se conserva el último valor escrito y se recalcula el otro.
- El botón «+» siempre se ve junto a cada artículo.
- El precio de la última compra se pone solo y sin mensaje, y nunca reemplaza lo escrito a mano.
- La confirmación «¿Guardamos esta compra?» resalta en negrita la cantidad de artículos y el total.
- Caben más artículos por pantalla, sin cambiar el tamaño de la letra. «Categoría · Producto» deja de verse debajo de cada artículo y queda como texto de ayuda.
- «Agregar teléfono» queda apagado mientras haya un teléfono vacío.

### Artículos, categorías y proveedores

- Un proveedor sin categorías vinculadas ya no sugiere artículos. Se puede escribir uno a mano; si es nuevo, sale el formulario y queda ligado al proveedor.
- El formulario de un artículo nuevo explica que, si no aparece la categoría o el producto, se puede escribir en el buscador para agregarlo.
- Desde una categoría se puede agregar un proveedor nuevo, que se crea al guardarla.

### Salir sin perder datos

- Antes de perder datos sin guardar, el sistema avisa y ofrece «Salir sin guardar» o «Registrar».
- El aviso sale al cambiar de pantalla, al cerrar una ventana de edición, al cerrar sesión o apagar, y al recargar o cerrar la pestaña.

### Versión .zip

- Esta versión deja solo «Apagar De Panas SV» y no lleva «Cerrar sesión».
- Cerrar la pestaña o ventana pide confirmación y apaga el sistema. Una recarga no lo apaga.
- Al cerrar, el navegador muestra su propia ventana genérica, porque no permite poner texto ni botones propios.
