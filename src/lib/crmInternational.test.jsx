import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { preferredLanguage, recipientLanguage, visitRecipient } from './language'
import { invoiceTotals, invoiceDescription, createInvoicePdf } from './invoices'
import { buildVisitEmail } from './visitEmail'
import { publicProperty, buildGoogleCalendarLink, saveDashboardProperty, updateDashboardProperty } from '../App'
import OffMarket from '../components/OffMarket'

const property={id:'p1',status:'active',offMarket:true,reference:'KH-1',title:'Reserved home',operation:'comprar',destination:'Barcelona',surface:120,rooms:3,currency:'EUR',privateAddress:'Carrer Privat 12, 2-2',photos:[{url:'https://example.com/private-photo.jpg'}],history:[{text:'Internal'}],portalData:{address:'Secret street',contactEmail:'private@example.com',province:'Barcelona'}}

it('selects a supported browser language and prefers the client language over the CRM language',()=>{
 expect(preferredLanguage(['fr-FR','pt-BR','en-US'])).toBe('pt')
 expect(preferredLanguage(['de'])).toBe('es')
 expect(recipientLanguage({language:'en'},{language:'pt'},'es')).toBe('en')
 expect(recipientLanguage(null,{language:'pt'},'es')).toBe('pt')
})
it('only publishes safe property fields and hides off-market photos',()=>{
 const result=publicProperty(property)
 expect(result.photos).toEqual([])
 expect(JSON.stringify(result)).not.toMatch(/Secret street|Carrer Privat|private@example|private-photo|Internal/)
 expect(publicProperty({...property,offMarket:false}).portalData).toEqual({province:'Barcelona'})
})
it('prepares calendar and email in the client language with the private address and guest',()=>{
 const visit={scheduledAt:'2026-10-15T12:00:00Z',notes:'Private commission',location:'Old location'}
 const client={name:'Ana',email:'ana@example.com',language:'en'}
 const calendar=new URL(buildGoogleCalendarLink(visit,property,client,client.language))
 expect(calendar.searchParams.get('add')).toBe(client.email)
 expect(calendar.searchParams.get('location')).toBe(property.privateAddress)
 expect(calendar.searchParams.get('details')).toContain('Your viewing is confirmed')
 expect(calendar.searchParams.get('details')).not.toContain('Private commission')
 const email=new URLSearchParams(buildVisitEmail(visit,property,client,client.language).split('?')[1])
 expect(email.get('body')).toBe(calendar.searchParams.get('details'))
})
it('rounds invoice tax to cents and translates the property service',()=>{
 expect(invoiceTotals(1588,21)).toEqual({base:1588,tax:333.48,total:1921.48})
 expect(invoiceTotals(19.99,21)).toEqual({base:19.99,tax:4.2,total:24.19})
 expect(()=>invoiceTotals(100,-1)).toThrow()
 expect(invoiceDescription(property,'pt')).toContain(property.privateAddress)
 expect(invoiceDescription({...property,operation:'alquilar'},'en')).toContain('rental')
})
it.each(['pt','es','en'])('creates a one-page invoice with exact totals in %s',language=>{
 const pdf=createInvoicePdf({issuer:{name:'Example Issuer',taxId:'TEST',address:'Test Street 1',iban:'TEST'},client:{name:'Ana Test',address:'Test Street 2',taxId:'TEST-CLIENT'},number:'TEST-2026-1',date:'2026-10-11',language,currency:'EUR',description:invoiceDescription(property,language),base:1588,taxRate:21})
 expect(pdf.getNumberOfPages()).toBe(1)
 expect(pdf.output()).toContain('TEST-2026-1')
})
it('saves the property and private address through one atomic operation',async()=>{
 const database={rpc:vi.fn().mockResolvedValue({error:null}),from:vi.fn(()=>({select:()=>({order:()=>Promise.resolve({data:[],error:null})})}))}
 await saveDashboardProperty({...property,priceValue:'100',reference:'KH-1'},[],database,true)
 expect(database.rpc).toHaveBeenCalledWith('save_property_with_address',expect.objectContaining({p_address:property.privateAddress,p_property:expect.objectContaining({off_market:true})}))
 await updateDashboardProperty('p1',{privateAddress:'New private address',title:'Updated'},database,true)
 expect(database.rpc).toHaveBeenLastCalledWith('save_property_with_address',{p_id:'p1',p_address:'New private address',p_property:{title:'Updated'}})
})
it('sends the off-market request language without exposing private data',async()=>{
 const user=userEvent.setup(),onSubmit=vi.fn().mockResolvedValue([])
 const {container}=render(<OffMarket property={property} language="en" onSubmit={onSubmit} />)
 expect(container.innerHTML).not.toContain('private-photo')
 expect(container.textContent).not.toContain(property.privateAddress)
 for(const [label,value] of [['Name','Ana'],['Surname','Test'],['Email','ana@example.com'],['Phone','123456789']])await user.type(screen.getByLabelText(label,{exact:true}),value)
 await user.click(screen.getByRole('checkbox'))
 await user.click(screen.getByRole('button',{name:'Send request'}))
 expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({language:'en',source:'property_request',address:'KH-1'}))
 expect(screen.getByRole('status')).toHaveTextContent('We received your request')
})

it('resolves legacy unlinked visits to the client language using a unique contact',()=>{
 const client={id:'c1',name:'Gabriela',surname:'Zimmermann',email:'example@example.com',language:'es'}
 expect(recipientLanguage(visitRecipient({contactEmail:'EXAMPLE@example.com'},[client]))).toBe('es')
 expect(recipientLanguage(visitRecipient({clientId:'c1'},[{...client,language:'en'}]))).toBe('en')
 expect(visitRecipient({contactEmail:client.email},[client,{...client,id:'c2'}])).toBe(null)
})
