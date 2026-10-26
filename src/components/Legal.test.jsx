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

it.each(['pt','es','en'])('shows purposes and rights without the technology section in %s', language=>{
 const {container}=render(<LegalPage page="privacy" language={language} />)
 const lists=container.querySelectorAll('.legal-bullet-list')
 expect(lists).toHaveLength(2)
 expect(lists[0].querySelectorAll('li')).toHaveLength(6)
 expect(lists[0].textContent).not.toMatch(/inteligência artificial|inteligencia artificial|artificial intelligence/i)
 expect(lists[1].querySelectorAll('li')).toHaveLength(6)
 expect(container.textContent).not.toMatch(/inteligência artificial|inteligencia artificial|artificial intelligence/i)
 expect(container.textContent).toMatch(/pré-contratuais|precontractuales|pre-contractual/)
 expect(container.textContent).not.toMatch(/cláusulas contratuais-tipo|cláusulas contractuales tipo|standard contractual clauses/)
 expect(container.textContent).not.toMatch(/DILS|LUCAS FOX|info@walterhaus/)
 expect(screen.getByRole('link',{name:'hola@thekohaus.com'})).toHaveAttribute('href','mailto:hola@thekohaus.com')
})

it.each(['pt','es','en'])('shows three cookie categories and places contact details last in %s', language=>{
 const {container}=render(<LegalPage page="cookies" language={language} />)
 const lists=container.querySelectorAll('.legal-bullet-list')
 expect(lists).toHaveLength(2)
 expect(lists[0].querySelectorAll('li')).toHaveLength(3)
 expect(lists[1].querySelectorAll('li')).toHaveLength(4)
 expect(container.textContent).toContain('180')
 expect(container.querySelectorAll('mark')).toHaveLength(0)
 expect(container.lastElementChild).toHaveTextContent('José Guilherme Coninch')
 expect(container.lastElementChild.querySelector('.legal-contact a')).toHaveAttribute('href','mailto:hola@thekohaus.com')
})
