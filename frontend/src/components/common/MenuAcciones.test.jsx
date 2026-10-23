import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MenuAcciones from './MenuAcciones'

function montar(opciones) {
  return render(
    <MemoryRouter>
      <MenuAcciones etiqueta="Más acciones" opciones={opciones} />
    </MemoryRouter>
  )
}

describe('MenuAcciones', () => {
  it('abre con el foco en la primera opción y se recorre con las flechas', async () => {
    const usuario = userEvent.setup()
    montar([{ etiqueta: 'Exportar', a: '/exportar' }, { etiqueta: 'Cargar', a: '/cargar' }])
    const boton = screen.getByRole('button', { name: 'Más acciones' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Exportar' })).toHaveFocus()
    await usuario.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Cargar' })).toHaveFocus()
    await usuario.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Exportar' })).toHaveFocus()
  })

  it('Escape cierra el menú y devuelve el foco al botón', async () => {
    const usuario = userEvent.setup()
    montar([{ etiqueta: 'Exportar', a: '/exportar' }])
    const boton = screen.getByRole('button', { name: 'Más acciones' })
    await usuario.click(boton)
    await usuario.keyboard('{Escape}')
    expect(boton).toHaveFocus()
    expect(boton).toHaveAttribute('aria-expanded', 'false')
  })

  it('una opción con onClick la ejecuta y cierra el menú', async () => {
    const usuario = userEvent.setup()
    const alElegir = vi.fn()
    montar([{ etiqueta: 'Descargar', onClick: alElegir }])
    await usuario.click(screen.getByRole('button', { name: 'Más acciones' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Descargar' }))
    expect(alElegir).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Más acciones' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('sin opciones disponibles (sin permiso) no muestra el botón', () => {
    montar([{ etiqueta: 'Exportar', a: undefined }])
    expect(screen.queryByRole('button', { name: 'Más acciones' })).not.toBeInTheDocument()
  })
})
