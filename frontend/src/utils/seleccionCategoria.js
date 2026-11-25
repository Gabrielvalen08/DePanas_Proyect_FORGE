export function articulosDeProveedores(materiales, miembros, proveedores) {
  const seleccionados = new Set(proveedores.map(proveedor => proveedor.toLowerCase()))
  return new Set(materiales
    .filter(({ nombre, proveedores = [] }) => miembros.has(nombre) &&
      proveedores.some(proveedor => seleccionados.has(proveedor.toLowerCase())))
    .map(({ nombre }) => nombre))
}

export function estaMarcado(nombre, delProveedor, ajustes) {
  return ajustes.get(nombre) ?? delProveedor.has(nombre)
}

export function alternarAjuste(ajustes, nombre, delProveedor) {
  const nuevos = new Map(ajustes)
  if (estaMarcado(nombre, delProveedor, ajustes)) nuevos.set(nombre, false)
  else if (delProveedor.has(nombre)) nuevos.delete(nombre)
  else nuevos.set(nombre, true)
  return nuevos
}

export function articulosAlGuardar(materiales, miembros, ajustes) {
  return materiales.map(({ nombre }) => nombre).filter(nombre => ajustes.get(nombre) ?? miembros.has(nombre))
}

export function ordenarArticulos(materiales, miembros, delProveedor) {
  const destacados = []
  const otrosMiembros = []
  const restantes = []
  for (const material of materiales) {
    if (delProveedor.has(material.nombre)) destacados.push(material)
    else if (miembros.has(material.nombre)) otrosMiembros.push(material)
    else restantes.push(material)
  }
  return [...destacados, ...otrosMiembros, ...restantes]
}
