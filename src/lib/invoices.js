import { jsPDF } from 'jspdf'
export const invoiceText = {
 es: { title:'FACTURA Nº', date:'Fecha', client:'Datos cliente', description:'Descripción / Producto', quantity:'Cantidad', base:'Base', tax:'IVA', total:'Total', taxable:'Base imponible', service:'Honorarios profesionales correspondientes a asesoramiento inmobiliario en', rent:'el alquiler del inmueble', buy:'la compraventa del inmueble' },
 pt: { title:'FATURA Nº', date:'Data', client:'Dados do cliente', description:'Descrição / Serviço', quantity:'Quantidade', base:'Base', tax:'Imposto', total:'Total', taxable:'Base tributável', service:'Honorários profissionais referentes à assessoria imobiliária em', rent:'locação do imóvel', buy:'compra e venda do imóvel' },
 en: { title:'INVOICE No.', date:'Date', client:'Client details', description:'Description / Service', quantity:'Quantity', base:'Base', tax:'Tax', total:'Total', taxable:'Taxable amount', service:'Professional fees for real estate advisory services for', rent:'the rental of the property', buy:'the purchase or sale of the property' },
}
export function invoiceTotals(base, taxRate) {
 const cents = Math.round(Number(base)*100), rate = Number(taxRate)
 if (!Number.isSafeInteger(cents) || cents < 0 || !Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Invalid invoice amounts')
 const taxCents = Math.round(cents*rate/100)
 return { base:cents/100, tax:taxCents/100, total:(cents+taxCents)/100 }
}
export function invoiceDescription(property, language) {
 const c=invoiceText[language]
 return `${c.service} ${property.operation==='alquilar'?c.rent:c.buy} ${property.privateAddress || property.reference}.`
}
export function createInvoicePdf(snapshot, logo) {
 const { issuer, client, number, date, language, currency, description, base, taxRate }=snapshot
 const c=invoiceText[language], totals=invoiceTotals(base,taxRate), doc=new jsPDF({unit:'mm',format:'a4'})
 const money=value=>new Intl.NumberFormat(language,{style:'currency',currency,minimumFractionDigits:2}).format(value).replace(/\u00a0|\u202f/g,' ')
 const txt=(text,x,y,size=10,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.text(String(text || ''),x,y)}
 const lines=(text,x,y,width,size=10)=>{doc.setFontSize(size);doc.setFont('helvetica','normal');const wrapped=doc.splitTextToSize(String(text||''),width);doc.text(wrapped,x,y);return y+wrapped.length*5}
 doc.setTextColor(38,38,38)
 let y=40
 for(const line of [issuer.name,`NIF / ID: ${issuer.taxId}`,issuer.phone,issuer.address,`IBAN: ${issuer.iban}`]) y=lines(line,21,y,100)
 lines(`${c.title}: ${number}`,140,40,50,11)
 lines(`${c.date}: ${new Intl.DateTimeFormat(language,{dateStyle:'long'}).format(new Date(`${date}T12:00:00`))}`,140,47,50)
 y=Math.max(80,y+12);txt(c.client,21,y,11,true);y+=6
 y=lines(`${client.name}\n${client.address}\n${client.taxId}`,21,y,150)
 let tableY=Math.max(116,y+12)
 const line=y=>{doc.setDrawColor(210,210,210);doc.setLineWidth(.3);doc.line(21,y,189,y)}
 if(tableY>160) {doc.addPage();tableY=30}
 line(tableY)
 txt(c.description,24,tableY+7,9,true);txt(c.quantity,101,tableY+7,9,true);txt(c.base,132,tableY+7,9,true);txt(c.tax,157,tableY+7,9,true);txt(c.total,177,tableY+7,9,true);line(tableY+12)
 doc.setFontSize(10);const descLines=doc.splitTextToSize(description,73)
 if(descLines.length>20) throw new Error('Description too long for the invoice template')
 let bottom=tableY+18+Math.max(36,descLines.length*5)
 if(bottom>220) {doc.addPage();tableY=25;bottom=tableY+18+Math.max(36,descLines.length*5);line(tableY)}
 doc.setTextColor(90,90,90);doc.text(descLines,24,tableY+22)
 txt('1',112,tableY+32,9)
 const amount=(value,right)=>{const text=money(value);doc.setFont('helvetica','normal');doc.setFontSize(9);if(doc.getTextWidth(text)>20)doc.setFontSize(Math.max(6,9*20/doc.getTextWidth(text)));doc.text(text,right,tableY+32,{align:'right'})}
 amount(totals.base,147);amount(totals.tax,169);amount(totals.total,189)
 line(bottom);line(bottom+12);line(bottom+24)
 const summary=Math.max(202,bottom+32)
 if(summary+45>260) {doc.addPage(); y=40} else y=summary
 doc.setDrawColor(210);doc.line(112,y,189,y)
 txt(c.taxable,115,y+8,9);doc.text(money(totals.base),186,y+8,{align:'right'})
 doc.line(112,y+13,189,y+13);txt(`${c.tax} ${taxRate}%`,115,y+21,9);doc.text(money(totals.tax),186,y+21,{align:'right'})
 doc.line(112,y+26,189,y+26);doc.setTextColor(30);txt(c.total,115,y+38,10,true);doc.text(money(totals.total),186,y+38,{align:'right'});doc.line(112,y+43,189,y+43)
 if(logo) {const image=doc.getImageProperties(logo);doc.addImage(logo,'PNG',30,260,50,50*image.height/image.width)}
 else {txt('K O H A U S',30,264,18);txt('REAL ESTATE',40,270,7)}
 return doc
}
export async function invoiceLogo() {
 const img = new Image();img.src='/brand/kohaus-logo-transparent.png';await img.decode()
 const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height
 const ctx=canvas.getContext('2d');ctx.filter='brightness(0)';ctx.drawImage(img,0,0)
 return canvas.toDataURL('image/png')
}
