import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Invoices from './Invoices'
import { createInvoicePdf } from '../lib/invoices'
vi.mock('./PdfPreview',()=>({default:()=> <div>PDF renderizado</div>}))
vi.mock('../lib/invoices',async original=>({...await original(),invoiceLogo:vi.fn().mockResolvedValue('test-logo'),createInvoicePdf:vi.fn(()=>({output:()=>new Blob(['PDF']),save:vi.fn()}))}))
beforeEach(()=>{
 localStorage.clear()
 localStorage.setItem('kohaus-invoice-issuer',JSON.stringify({name:'Test',taxId:'Test',address:'Test',iban:'Test'}))
 URL.createObjectURL=vi.fn(()=> 'blob:invoice-test')
 URL.revokeObjectURL=vi.fn()
})
it('previews and generates a PDF in the client language with an editable prefilled address',async()=>{
 const user=userEvent.setup()
 render(<Invoices language="pt" clients={[{id:'c',name:'Ana',language:'es'}]} properties={[{id:'p',reference:'KH-1',privateAddress:'Calle Ejemplo 12',operation:'alquilar',currency:'EUR'}]} databaseEnabled={false}/>)
 await user.click(screen.getByRole('button',{name:'Nova fatura'}))
 await waitFor(()=>expect(screen.getByLabelText('Cliente',{exact:true})).toBeEnabled())
 await user.selectOptions(screen.getByLabelText('Cliente',{exact:true}),'c')
 await user.selectOptions(screen.getByLabelText('Imóvel',{exact:true}),'p')
 expect(screen.getByLabelText('Descrição do serviço').value).toContain('alquiler del inmueble Calle Ejemplo 12')
 for(const [label,value] of [['Número da fatura','TEST-1'],['Endereço atual do cliente','Calle Cliente 4'],['Documento fiscal do cliente','CLIENT-1'],['Honorários (base)','1588']])await user.type(screen.getByLabelText(label),value)
 await user.clear(screen.getByLabelText('Descrição do serviço'))
 await user.type(screen.getByLabelText('Descrição do serviço'),'Servicio editado: Calle Ejemplo 12')
 await user.click(screen.getByRole('button',{name:'Pré-visualizar'}))
 expect(await screen.findByText('PDF renderizado')).toBeInTheDocument()
 expect(localStorage.getItem('kohaus-invoices')).toBeNull()
 await user.click(screen.getByRole('button',{name:'Gerar PDF'}))
 await waitFor(()=>expect(JSON.parse(localStorage.getItem('kohaus-invoices'))).toHaveLength(1))
 expect(createInvoicePdf).toHaveBeenLastCalledWith(expect.objectContaining({language:'es',description:'Servicio editado: Calle Ejemplo 12'}),'test-logo')
 expect(screen.getByRole('link',{name:/Baixar PDF/})).toHaveAttribute('download','KOHAUS-TEST-1.pdf')
})

it('confirms invoice deletion and removes it from local history',async()=>{
 const user=userEvent.setup()
 const invoice={id:'invoice-1',number:'KH-2026-1',snapshot:{client:{name:'Ana Cliente'},date:'2026-10-25'}}
 localStorage.setItem('kohaus-invoices',JSON.stringify([invoice]))
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true)
 const onSaved=vi.fn()
 render(<Invoices language="pt" clients={[]} properties={[]} databaseEnabled={false} onSaved={onSaved}/>)
 expect(await screen.findByText(/KH-2026-1/)).toBeInTheDocument()
 const invoiceRow=screen.getByText(/KH-2026-1/).closest('article')
 const rowButtons=within(invoiceRow).getAllByRole('button')
 expect(rowButtons.map(button=>button.textContent)).toEqual(['Excluir fatura','Baixar PDF'])
 expect(rowButtons[0]).toHaveClass('invoice-delete-button')
 await user.click(rowButtons[0])
 await waitFor(()=>expect(screen.queryByText(/KH-2026-1/)).not.toBeInTheDocument())
 expect(JSON.parse(localStorage.getItem('kohaus-invoices'))).toEqual([])
 expect(onSaved).toHaveBeenCalledWith('deleted')
 expect(confirm).toHaveBeenCalled()
 confirm.mockRestore()
})

it('records payments and separates totals by currency without assuming old invoices are paid',async()=>{
 const user=userEvent.setup()
 localStorage.setItem('kohaus-invoices',JSON.stringify([
  {id:'one',number:'F-1',snapshot:{client:{name:'Ana'},date:'2026-11-01',base:100,taxRate:21,currency:'EUR'}},
  {id:'two',number:'F-2',snapshot:{client:{name:'Joao'},date:'2026-11-01',base:200,taxRate:0,currency:'BRL'}},
 ]))
 render(<Invoices language="pt" clients={[]} properties={[]} databaseEnabled={false}/>)
 const row=(await screen.findByText(/F-1/)).closest('article')
 expect(within(row).getByLabelText('Pagamento')).toHaveValue('')
 await user.selectOptions(within(row).getByLabelText('Pagamento'),'paid')
 await waitFor(()=>expect(JSON.parse(localStorage.getItem('kohaus-invoices'))[0].payment_status).toBe('paid'))
 expect(screen.getAllByRole('img')).toHaveLength(2)
 expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(/Recebido:.*121/)
 expect(screen.getAllByRole('img')[1]).toHaveAccessibleName(/Não informado:.*200/)
})

it('shows a deletion failure beside the invoice when the database denies deletion',async()=>{
 const user=userEvent.setup()
 const row={id:'denied',number:'DENIED-1',snapshot:{client:{name:'Ana'},date:'2026-11-02',dueDate:'2026-11-10',description:'Serviço de intermediação'}}
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true)
 const database={from:vi.fn(table=> table==='dashboard_invoice_settings'
  ?{select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})})}
  :{select:()=>({order:async()=>({data:[row]})}),delete:()=>({eq:()=>({select:async()=>({data:[],error:null})})})})}
 render(<Invoices language="pt" clients={[]} properties={[]} database={database} databaseEnabled/>)
 const article=(await screen.findByText(/DENIED-1/)).closest('article')
 expect(within(article).getByText(/Vencimento: 2026-11-10/)).toBeInTheDocument()
 expect(within(article).getByText('Serviço de intermediação')).toBeInTheDocument()
 await user.click(within(article).getByRole('button',{name:'Excluir fatura'}))
 expect(await within(article).findByRole('alert')).toHaveTextContent('Não foi possível excluir')
 expect(screen.getByText(/DENIED-1/)).toBeInTheDocument()
 confirm.mockRestore()
})
