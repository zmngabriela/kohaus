import { localDate } from '../lib/tasks'
import { invoiceTotals } from '../lib/invoices'

export const invoiceUi = {
 pt: {new:'Nova fatura', overdue:'Atrasada', due:'Vencimento', recent:'Faturas recentes', close:'Fechar', paidLabel:'Paga', outstanding:'A receber', issued:'Faturas emitidas', billed:'Total faturado', paid:'Recebido', pending:'Pendente', unknown:'Não informado', receipts:'Recebimentos', scope:'Todas as faturas · valores com impostos', empty:'Nenhuma fatura emitida.', status:'Pagamento', note:'Registro manual dos pagamentos.', amount:'Valor'},
 es: {new:'Nueva factura', overdue:'Vencida', due:'Vencimiento', recent:'Facturas recientes', close:'Cerrar', paidLabel:'Pagada', outstanding:'Por cobrar', issued:'Facturas emitidas', billed:'Total facturado', paid:'Cobrado', pending:'Pendiente', unknown:'Sin informar', receipts:'Cobros', scope:'Todas las facturas · importes con impuestos', empty:'No hay facturas emitidas.', status:'Pago', note:'Registro manual de los pagos.', amount:'Importe'},
 en: {new:'New invoice', overdue:'Overdue', due:'Due date', recent:'Recent invoices', close:'Close', paidLabel:'Paid', outstanding:'Outstanding', issued:'Invoices issued', billed:'Total invoiced', paid:'Received', pending:'Pending', unknown:'Not recorded', receipts:'Payments', scope:'All invoices · tax included', empty:'No invoices issued.', status:'Payment', note:'Payments are recorded manually.', amount:'Amount'},
}
export function invoiceAmount(snapshot) {
 try { return invoiceTotals(snapshot.base, snapshot.taxRate).total } catch { return 0 }
}
export function formatInvoiceAmount(amount, currency, language) {
 return new Intl.NumberFormat({pt:'pt-PT',es:'es-ES',en:'en-GB'}[language], {style:'currency',currency}).format(amount)
}

export function paymentState(row, today=localDate()) {
 if(row.payment_status==='paid') return 'paid'
 if(row.payment_status==='pending') return row.snapshot.dueDate && row.snapshot.dueDate<today?'overdue':'pending'
 return 'unknown'
}
export default function InvoiceOverview({invoices, language, children}) {
 const c=invoiceUi[language], groups=new Map()
 for(const row of invoices) {
  const currency=row.snapshot.currency || 'EUR'
  if(!groups.has(currency)) groups.set(currency,{total:0,paid:0,pending:0,overdue:0,unknown:0})
  const group=groups.get(currency), amount=invoiceAmount(row.snapshot)
  group.total+=amount; group[paymentState(row)]+=amount
 }
 const money=(value,currency)=>formatInvoiceAmount(value,currency,language)
 const totals=key=>groups.size?[...groups].map(([currency,g])=><strong key={currency}>{money(key==='outstanding'?g.pending+g.overdue:g[key],currency)}</strong>):<strong>—</strong>
 return <>
  <div className="invoice-metrics">
   <div><span>{c.paid}</span>{totals('paid')}</div>
   <div><span>{c.issued}</span><strong>{invoices.length}</strong></div>
   <div><span>{c.outstanding}</span>{totals('outstanding')}</div>
  </div>
  <div className="invoice-workspace">
   <div className="invoice-recent">{children}</div>
   <aside className="invoice-overview" aria-label={c.receipts}>
    <h3>{c.receipts}</h3><p className="invoice-overview-note">{c.scope}</p>
    {!invoices.length&&<p>{c.empty}</p>}
    {[...groups].map(([currency,g])=>{
     let offset=0
     return <div className="invoice-currency-summary" key={currency}>
      <svg className="invoice-donut" viewBox="0 0 120 120" role="img" aria-label={['paid','pending','overdue','unknown'].map(key=>c[key]+': '+money(g[key],currency)).join(' · ')}>
       <circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" strokeWidth="12"/>
       {['paid','pending','overdue','unknown'].map(key=>{
        const percent=g.total?g[key]/g.total*100:0, start=offset; offset+=percent
        return <circle key={key} className={'invoice-ring-'+key} cx="60" cy="60" r="46" fill="none" strokeWidth="12" pathLength="100" strokeDasharray={percent+' '+(100-percent)} strokeDashoffset={-start} transform="rotate(-90 60 60)"/>
       })}
       <text x="60" y="63" textAnchor="middle">{currency}</text>
      </svg>
      <dl className="invoice-legend">{['paid','pending','overdue','unknown'].map(key=><div key={key}><dt><i className={'invoice-dot is-'+key}/>{c[key]}</dt><dd>{money(g[key],currency)}</dd></div>)}</dl>
     </div>
    })}

   </aside>
  </div>
 </>
}
