import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CrmRecord from './CrmRecord'

const copy = {
  pt: {
    label: 'Captação',
    title: 'Imóveis de particulares',
    area: 'Zona · 15 km',
    operation: 'Operação',
    sale: 'Venda',
    rent: 'Aluguel',
    loading: 'Carregando anúncios…',
    unconfigured: 'Busca automática do Idealista ainda sem credenciais de leitura.',
    failure: 'Falha ao consultar o Idealista.',
    empty: 'Nenhum anúncio identificado como particular nesta página.',
    open: 'Abrir anúncio',
    price: 'Preço',
    size: 'Área',
    rooms: 'Quartos',
    previous: 'Anterior',
    next: 'Próxima',
    retry: 'Tentar novamente',
    map: 'Mapa de captação do Idealista',
  },
  es: {
    label: 'Captación',
    title: 'Inmuebles de particulares',
    area: 'Zona · 15 km',
    operation: 'Operación',
    sale: 'Venta',
    rent: 'Alquiler',
    loading: 'Cargando anuncios…',
    unconfigured: 'La búsqueda automática de idealista requiere credenciales de lectura.',
    failure: 'No se pudo consultar idealista.',
    empty: 'Ningún anuncio identificado como particular en esta página.',
    open: 'Ver anuncio',
    price: 'Precio',
    size: 'Superficie',
    rooms: 'Habitaciones',
    previous: 'Anterior',
    next: 'Siguiente',
    retry: 'Reintentar',
    map: 'Mapa de captación de idealista',
  },
  en: {
    label: 'Prospecting',
    title: 'Owner-listed properties',
    area: 'Area · 15 km',
    operation: 'Operation',
    sale: 'Sale',
    rent: 'Rent',
    loading: 'Loading listings…',
    unconfigured: 'Idealista search credentials are required for automatic results.',
    failure: 'Unable to search idealista.',
    empty: 'No verified private listings on this results page.',
    open: 'Open listing',
    price: 'Price',
    size: 'Area',
    rooms: 'Bedrooms',
    previous: 'Previous',
    next: 'Next',
    retry: 'Retry',
    map: 'Idealista prospecting map',
  },
}
export default function Prospecting({language}) {
  const c=copy[language]
  const [zone,setZone]=useState('barcelona'), [operation,setOperation]=useState('sale'), [page,setPage]=useState(1)
  const [result,setResult]=useState(null), [retry,setRetry]=useState(0)
  useEffect(()=>{
    let current=true
    setResult(null)
    async function load() {
      try {
        const {data,error}=await supabase.functions.invoke('idealista-prospecting',{body:{zone,operation,page}})
        if(current) setResult(error || !data ? {state:'error'} : data)
      } catch { if(current) setResult({state:'error'}) }
    }
    load()
    return ()=>{current=false}
  },[zone,operation,page,retry])
  return <section className="dashboard-section">
    <p className="section-label">{c.label} · Idealista</p><h2 className="section-title">{c.title}</h2>
    <div className="dashboard-property-filters">
      <label>{c.area} <select value={zone} onChange={e=>{setPage(1);setZone(e.target.value)}}>{Object.entries({barcelona:'Barcelona',palamos:'Palamós',roses:'Roses'}).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>{c.operation} <select value={operation} onChange={e=>{setPage(1);setOperation(e.target.value)}}><option value="sale">{c.sale}</option><option value="rent">{c.rent}</option></select></label>
    </div>
    <div className="dashboard-properties-grid" aria-live="polite">
      {!result ? <p>{c.loading}</p> : result.state ? <div><p>{result.state==='unconfigured'?c.unconfigured:c.failure}</p><a href="https://www.idealista.com/tools/" target="_blank" rel="noreferrer">{c.map}</a> <button type="button" className="outline-button" onClick={()=>setRetry(v=>v+1)}>{c.retry}</button></div> :
        result.items.length ? result.items.map(item=><CrmRecord key={item.id} language={language} title={item.title} image={item.image} meta={item.location} fields={[
          {label:c.price,value:item.price!=null && new Intl.NumberFormat(language,{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(item.price)},
          {label:c.size,value:item.size!=null && item.size+' m²'},{label:c.rooms,value:item.rooms!=null && String(item.rooms)},
        ]} actions={<a className="dashboard-property-edit" href={item.url} target="_blank" rel="noreferrer">{c.open}</a>}/> ) : <p>{c.empty}</p>}
    </div>
    {result && !result.state && <div className="dashboard-property-actions">
      {page>1 && <button className="outline-button" onClick={()=>setPage(page-1)}>{c.previous}</button>}
      {result.more && <button className="outline-button" onClick={()=>setPage(page+1)}>{c.next}</button>}
    </div>}
  </section>
}
