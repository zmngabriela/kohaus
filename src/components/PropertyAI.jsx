import { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { publicFacts, validateResult } from '../../supabase/functions/property-ai/core.js'
const copy={
 pt:{generate:'Gerar descrição',translate:'Traduzir título e descrição',busy:'Preparando…',hint:'A IA usa os dados públicos preenchidos. Confira as características antes de aplicar. A tradução usa o título e a descrição originais acima; não inclua dados pessoais.',apply:'Aplicar ao rascunho',discard:'Descartar',review:'Revise a sugestão. Aplicar substitui os campos correspondentes; salvar o imóvel continua sendo uma ação separada.',error:'Não foi possível preparar o texto. Confira a configuração da IA ou tente mais tarde.',missing:'Preencha tipo, destino e área para gerar; título e descrição para traduzir.',stale:'Os campos foram alterados. Gere uma nova sugestão para preservar suas mudanças.',limit:'Limite de uso atingido. Tente novamente mais tarde.'},
 es:{generate:'Generar descripción',translate:'Traducir título y descripción',busy:'Preparando…',hint:'La IA usa los datos públicos introducidos. Revisa las características antes de aplicar. La traducción usa el título y la descripción originales de arriba; no incluyas datos personales.',apply:'Aplicar al borrador',discard:'Descartar',review:'Revisa la propuesta. Aplicar sustituye los campos correspondientes; guardar el inmueble sigue siendo una acción separada.',error:'No se pudo preparar el texto. Revisa la configuración o inténtalo más tarde.',missing:'Completa tipo, destino y superficie para generar; título y descripción para traducir.',stale:'Los campos han cambiado. Genera una nueva propuesta para conservar los cambios.',limit:'Límite de uso alcanzado. Inténtalo más tarde.'},
 en:{generate:'Generate description',translate:'Translate title and description',busy:'Preparing…',hint:'AI uses the public details entered. Check features before applying. Translation uses the original title and description above; do not include personal data.',apply:'Apply to draft',discard:'Discard',review:'Review the suggestion. Applying replaces the corresponding fields; saving the property remains a separate action.',error:'Unable to prepare the text. Check AI configuration or try later.',missing:'Enter type, destination and area to generate; title and description to translate.',stale:'Fields have changed. Generate a new suggestion to preserve your edits.',limit:'Usage limit reached. Try again later.'}
}
export default function PropertyAI({form,setForm,language,client=supabase}) {
 const c=copy[language] || copy.es
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[suggestion,setSuggestion]=useState(null)
 const alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 async function run(action){
  const snapshot=JSON.stringify(form)
  const facts=publicFacts(form)
  if(action==='generate' ? !facts.type || !facts.destination || !(Number(facts.surface)>0) : !form.title.trim() || !form.observations.trim()){setError(c.missing);return}
  setBusy(true);setError('');setSuggestion(null)
  try {
   if(!client)throw Error()
   const {data,error:failure}=await client.functions.invoke('property-ai',{body:action==='generate'?{action,language,property:facts}:{action,language,title:form.title,description:form.observations},timeout:55000})
   if(failure){if(failure.context?.status===429)throw Error('limit');throw Error()}
   const result=validateResult(data,action)
   if(alive.current)setSuggestion({action,result,snapshot})
  }catch(e){if(alive.current)setError(e.message==='limit'?c.limit:c.error)}finally{if(alive.current)setBusy(false)}
 }
 function apply(){
  if(JSON.stringify(form)!==suggestion.snapshot){setError(c.stale);setSuggestion(null);return}
  setForm(current=>suggestion.action==='generate'?{...current,observations:suggestion.result.description}:{...current,portalData:{...current.portalData,translations:{...current.portalData?.translations,...suggestion.result.translations}}})
  setSuggestion(null)
 }
 return <section className="dashboard-property-form-full property-ai" aria-label="KOHAUS AI">
  <p className="dashboard-property-help">{c.hint}</p>
  <div className="dashboard-auth-actions"><button type="button" className="outline-button" disabled={busy} onClick={()=>run('generate')}>{busy?c.busy:c.generate}</button><button type="button" className="outline-button" disabled={busy} onClick={()=>run('translate')}>{c.translate}</button></div>
  {error && <p role="alert">{error}</p>}
  {suggestion && <div aria-live="polite"><p className="dashboard-property-help">{c.review}</p>{suggestion.action==='generate'?<p className="property-ai-preview">{suggestion.result.description}</p>:Object.entries(suggestion.result.translations).map(([lang,text])=><div key={lang}><strong>{({pt:'Português',es:'Español',en:'English'})[lang]}</strong><p>{text.title}</p><p className="property-ai-preview">{text.description}</p></div>)}<div className="dashboard-auth-actions"><button type="button" className="outline-button" onClick={apply}>{c.apply}</button><button type="button" className="outline-button" onClick={()=>setSuggestion(null)}>{c.discard}</button></div></div>}
 </section>
}
