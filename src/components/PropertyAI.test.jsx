import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import {it,expect,vi,afterEach} from 'vitest'
import PropertyAI from './PropertyAI'
import {publicFacts,validateInput,validateResult,messages} from '../../supabase/functions/property-ai/core.js'
afterEach(cleanup)
const form={title:'Apartamento',observations:'Dois quartos.',type:'piso',destination:'barcelona',surface:'80',privateAddress:'SECRET',portalData:{contactEmail:'PRIVATE',extras:['terraza'],translations:{}}}
it('allows only public facts and excludes notes, private address and contacts',()=>{
 const facts=publicFacts({...form,notes:'SECRET',photos:[{url:'PRIVATE'}]})
 expect(JSON.stringify(facts)).not.toMatch(/SECRET|PRIVATE/)
 expect(facts.extras).toEqual(['terraza'])
 expect(publicFacts(facts)).toEqual(facts)
})
it('requires source material and validates all three translation outputs',()=>{
 expect(()=>validateInput({action:'generate',language:'pt',property:{}})).toThrow()
 expect(()=>validateInput({action:'translate',language:'pt',title:'x',description:''})).toThrow()
 expect(()=>validateResult({translations:{pt:{title:'x',description:'y'}}},'translate')).toThrow()
 expect(messages({action:'generate',language:'pt',property:{}})[0].content).toContain('NUNCA trasladarlos')
})
it('does not save or apply automatically; applying only updates the draft',async()=>{
 const setForm=vi.fn(),invoke=vi.fn().mockResolvedValue({data:{description:'Apartamento de 80 m².'}})
 render(<PropertyAI form={form} setForm={setForm} language="pt" client={{functions:{invoke}}} />)
 fireEvent.click(screen.getByText('Gerar descrição'))
 await screen.findByText('Apartamento de 80 m².')
 expect(setForm).not.toHaveBeenCalled()
 expect(JSON.stringify(invoke.mock.calls)).not.toContain('SECRET')
 fireEvent.click(screen.getByText('Aplicar ao rascunho'))
 expect(setForm.mock.calls[0][0](form).observations).toBe('Apartamento de 80 m².')
})
it('preserves edits made while a suggestion was being prepared',async()=>{
 const setForm=vi.fn(),client={functions:{invoke:vi.fn().mockResolvedValue({data:{description:'Suggestion'}})}}
 const {rerender}=render(<PropertyAI form={form} setForm={setForm} language="pt" client={client}/> )
 fireEvent.click(screen.getByText('Gerar descrição'));await screen.findByText('Suggestion')
 rerender(<PropertyAI form={{...form,title:'Changed'}} setForm={setForm} language="pt" client={client}/> )
 fireEvent.click(screen.getByText('Aplicar ao rascunho'))
 expect(setForm).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toHaveTextContent('campos foram alterados')
})
it('keeps originals on provider failure',async()=>{
 const setForm=vi.fn()
 render(<PropertyAI form={form} setForm={setForm} language="pt" client={{functions:{invoke:vi.fn().mockResolvedValue({error:{context:{status:429}}})}}}/> )
 fireEvent.click(screen.getByText('Traduzir título e descrição'))
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Limite'))
 expect(setForm).not.toHaveBeenCalled()
})
it('explains when the Supabase AI function is not configured',async()=>{
 const setForm=vi.fn()
 const failure={context:Response.json({error:'not_configured'},{status:503})}
 render(<PropertyAI form={form} setForm={setForm} language="pt" client={{functions:{invoke:vi.fn().mockResolvedValue({error:failure})}}}/> )
 fireEvent.click(screen.getByText('Traduzir título e descrição'))
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toMatch(/cadastre os secrets necessários/i))
 expect(setForm).not.toHaveBeenCalled()
})
it('explains when the function cannot be reached',async()=>{
 const setForm=vi.fn()
 render(<PropertyAI form={form} setForm={setForm} language="pt" client={{functions:{invoke:vi.fn().mockResolvedValue({error:{context:new TypeError('Failed to fetch')}})}}}/> )
 fireEvent.click(screen.getByText('Traduzir título e descrição'))
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toMatch(/confirme se ela foi publicada/i))
 expect(setForm).not.toHaveBeenCalled()
})

it('keeps translation edits when the panel is closed and reopened',()=>{
 render(<PropertyAI form={form} setForm={vi.fn()} language="pt"><label>Translation<input defaultValue="Original" /></label></PropertyAI>)
 const toggle=screen.getByRole('button',{name:/Editar traduções/})
 expect(screen.getByLabelText('Translation')).not.toBeVisible()
 fireEvent.click(toggle)
 fireEvent.change(screen.getByLabelText('Translation'),{target:{value:'Edited'}})
 fireEvent.click(toggle)
 expect(screen.getByLabelText('Translation')).not.toBeVisible()
 fireEvent.click(toggle)
 expect(screen.getByLabelText('Translation')).toHaveValue('Edited')
 expect(toggle).toHaveAttribute('aria-expanded','true')
})
