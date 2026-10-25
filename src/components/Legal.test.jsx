import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LegalPage } from './Legal'
afterEach(cleanup)
it('marks missing owner details without inventing identifiers or security guarantees',()=>{
 const {container}=render(<LegalPage page="legal" language="pt" />)
 expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Aviso legal')
 expect(container.querySelectorAll('mark')).toHaveLength(4)
 expect(screen.getByText(/Não garantimos invulnerabilidade/)).toBeTruthy()
 expect(screen.getByText(/NIF\/NIE\/CIF/)).toHaveTextContent('PENDENTE')
})
