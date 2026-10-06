/**
 * catalogo.js — Opciones iniciales de los desplegables (de "Datos De Panas.xlsx",
 * hoja INGRESOS): las listas de Proveedor, Categoría, Material y Producto, y la
 * categoría y el producto de cada material según las filas de compras del Excel.
 * db.js las siembra en la tabla `catalogo` cada vez que abre la base.
 * El frontend tiene una copia en src/services/api.js (CATALOGO), para el modo local.
 */

export const CATALOGO_INICIAL = {
  proveedor: ['Selectos', 'MMAG', 'Pepsi', 'Desechables Diver.'],
  categoria: ['Materia Prima', 'Limpieza', 'Desechables', 'Servicios', 'Material Común', 'Bebidas'],
  producto: [
    'Cachitos', 'Pan Guayaba', 'Golfeados', 'Panadería', 'Arepas', 'Empanadas', 'Todos',
    'Arepas/Empanadas', 'Tequeños', 'Salsa', 'Gaseosas', 'Hidratantes',
  ],
  // [nombre, categoría, producto]; '' = el Excel aún no se lo asigna
  material: [
    ['Tocino La Rioja', 'Materia Prima', 'Cachitos'],
    ['Jamon Picnic', 'Materia Prima', 'Cachitos'],
    ['Anis', 'Materia Prima', 'Golfeados'],
    ['Manteca', 'Materia Prima', 'Panadería'],
    ['Ajo Chino', 'Materia Prima', 'Arepas/Empanadas'],
    ['Queso', '', ''],
    ['Guayaba', '', ''],
    ['Carne', '', ''],
    ['Pollo', '', ''],
    ['Cebolla', 'Materia Prima', 'Arepas/Empanadas'],
    ['Chile verde', '', ''],
    ['Fosforos', 'Material Común', 'Todos'],
    ['Gabacha #3 Blanca', 'Desechables', 'Todos'],
    ['Bolsa al Vacio 8*12', 'Desechables', 'Tequeños'],
    ['Azucar', 'Materia Prima', 'Todos'],
    ['Mr Músculo Antigrasa', 'Limpieza', ''],
    ['Frijol Negro', 'Materia Prima', 'Arepas/Empanadas'],
    ['Huevos', 'Materia Prima', 'Panadería'],
    ['Jamon Virginia', '', ''],
    ['Cilantro', 'Materia Prima', 'Salsa'],
    ['Perejil', 'Materia Prima', 'Salsa'],
    ['Sazón Completa', 'Materia Prima', 'Arepas/Empanadas'],
    ['Pechugas de Pollo', 'Materia Prima', 'Arepas/Empanadas'],
    ['Plátanos', 'Materia Prima', 'Arepas/Empanadas'],
    ['Alambrina ExtraFuerte', 'Materia Prima', 'Todos'],
    ['Pierna Mechada La Rioja', 'Materia Prima', ''],
    ['Jamón de Pavo', 'Materia Prima', 'Cachitos'],
    ['Gatorade', 'Bebidas', 'Hidratantes'],
    ['Agua', 'Bebidas', 'Hidratantes'],
    ['Pepsi', 'Bebidas', 'Gaseosas'],
    ['Lipton', 'Bebidas', 'Gaseosas'],
    ['Bandeja Bisagrada', 'Desechables', ''],
    ['Bandeja Kraft', 'Desechables', ''],
    ['Tapadera Cristal', 'Desechables', ''],
    ['Portion Cup Cuadrada', 'Desechables', ''],
    ['Tapa Portion Cup Cuadrado', 'Desechables', ''],
  ],
}
