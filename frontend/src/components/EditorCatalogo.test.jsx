import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditorCatalogo from './EditorCatalogo'

// El orden por categoría (Materia Prima primero) se prueba en services/api.test.js (ordenarMaterialesPorCategoria)

describe('EditorCatalogo — Producto (panel dual)', () => {
  const materialesEjemplo = [
    { nombre: 'Harina PAN', categoria: 'Materia Prima', producto: '' },
    { nombre: 'Queso Guayanés', categoria: 'Lácteos', producto: '' },
    { nombre: 'Carne Mechada', categoria: 'Materia Prima', producto: 'Arepas' },
    { nombre: 'Servilletas', categoria: 'Limpieza', producto: '' },
  ]

  it('muestra título "Agregar producto" al crear un producto nuevo', () => {
    render(
      <EditorCatalogo
        tipo="producto"
        edicion={{ registro: null }}
        materiales={materialesEjemplo}
        alGuardar={vi.fn()}
        alCerrar={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: 'Agregar producto' })).toBeInTheDocument()
  })

  it('muestra el panel dual: izquierda Artículos con buscador, derecha Artículos que lleva este producto sin nota explicativa', async () => {
    render(
      <EditorCatalogo
        tipo="producto"
        edicion={{ registro: null }}
        materiales={materialesEjemplo}
        alGuardar={vi.fn()}
        alCerrar={vi.fn()}
      />
    )

    const modal = screen.getByRole('dialog', { name: 'Agregar producto' })

    // Encabezados de los paneles
    expect(within(modal).getByText('Artículos')).toBeInTheDocument()
    expect(within(modal).getByText('Artículos que lleva este producto')).toBeInTheDocument()

    // No debe mostrar la nota explicativa antigua
    expect(screen.queryByText(/Un artículo puede ir en varios productos/)).not.toBeInTheDocument()

    // Buscador presente en el panel izquierdo
    expect(within(modal).getByPlaceholderText('Buscar artículo…')).toBeInTheDocument()
  })

  it('permite traspasar artículos entre paneles al hacer clic', async () => {
    const usuario = userEvent.setup()
    render(
      <EditorCatalogo
        tipo="producto"
        edicion={{ registro: null }}
        materiales={materialesEjemplo}
        alGuardar={vi.fn()}
        alCerrar={vi.fn()}
      />
    )

    const modal = screen.getByRole('dialog', { name: 'Agregar producto' })

    // Inicialmente 0 elegidos
    expect(within(modal).getByText('0 elegidos')).toBeInTheDocument()

    // Clic en Harina PAN en panel izquierdo (disponible)
    const botonHarina = within(modal).getByRole('button', { name: /Agregar Harina PAN/i })
    await usuario.click(botonHarina)

    // Ahora hay 1 elegido en el panel derecho
    expect(within(modal).getByText('1 elegido')).toBeInTheDocument()
    const botonQuitarHarina = within(modal).getByRole('button', { name: /Quitar Harina PAN/i })
    expect(botonQuitarHarina).toBeInTheDocument()

    // Al hacer clic en el botón de Harina PAN en el panel derecho, vuelve a la izquierda
    await usuario.click(botonQuitarHarina)
    expect(within(modal).getByText('0 elegidos')).toBeInTheDocument()
    expect(within(modal).getByRole('button', { name: /Agregar Harina PAN/i })).toBeInTheDocument()
  })

  it('el buscador filtra los artículos disponibles', async () => {
    const usuario = userEvent.setup()
    render(
      <EditorCatalogo
        tipo="producto"
        edicion={{ registro: null }}
        materiales={materialesEjemplo}
        alGuardar={vi.fn()}
        alCerrar={vi.fn()}
      />
    )

    const modal = screen.getByRole('dialog', { name: 'Agregar producto' })
    const buscador = within(modal).getByPlaceholderText('Buscar artículo…')

    await usuario.type(buscador, 'Queso')

    expect(within(modal).getByRole('button', { name: /Agregar Queso Guayanés/i })).toBeInTheDocument()
    expect(within(modal).queryByRole('button', { name: /Agregar Harina PAN/i })).not.toBeInTheDocument()
  })
})
