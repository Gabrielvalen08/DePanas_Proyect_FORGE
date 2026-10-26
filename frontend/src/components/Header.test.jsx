import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'

describe('Header', () => {
  it('renderiza título, badge y fecha sin botón regresar si no se pasa alRegresar', () => {
    render(<Header title="Compras" badge="Administrador" frase="Aquí se viene a comer rico" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Compras' })).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Aquí se viene a comer rico')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Regresar/i })).not.toBeInTheDocument()
  })

  it('renderiza botón Regresar cuando se proporciona alRegresar y responde a clics', async () => {
    const alRegresar = vi.fn()
    const usuario = userEvent.setup()

    render(<Header title="Exportar datos" alRegresar={alRegresar} />)

    const botonRegresar = screen.getByRole('button', { name: /Regresar/i })
    expect(botonRegresar).toBeInTheDocument()

    await usuario.click(botonRegresar)
    expect(alRegresar).toHaveBeenCalledTimes(1)
  })
})
