import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LegalPage } from './Legal'
afterEach(cleanup)
it('shows compact owner details after the terms and a contact link without public pending markers',()=>{
 const {container}=render(<LegalPage page="legal" language="pt" />)
 expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Aviso legal')
 expect(container.querySelectorAll('mark')).toHaveLength(0)
 expect(screen.getByText(/Não garantimos invulnerabilidade/)).toBeTruthy()
 expect(screen.queryByText(/NIF\/NIE\/CIF/)).not.toBeInTheDocument()
 expect(screen.getByText('Identificação do responsável')).toBeInTheDocument()
 expect(container.querySelector('section:last-child')).toHaveTextContent('José Guilherme Coninch')
 expect(screen.getByRole('link', {name:'guilherme@thekohaus.com'})).toHaveAttribute('href','mailto:guilherme@thekohaus.com')
 expect(screen.getByText(/Dúvidas sobre este aviso legal/)).toBeInTheDocument()
 expect(container.querySelector('.legal-contact a')).toHaveAttribute('href','mailto:hola@thekohaus.com')
 expect(screen.getByRole('link', {name:'+34 665 32 47 91'})).toHaveAttribute('href','tel:+34665324791')
 expect(screen.queryByText(/Formação em intermediação/)).not.toBeInTheDocument()
})
