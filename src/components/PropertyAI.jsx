import { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { publicFacts, validateResult } from '../../supabase/functions/property-ai/core.js'
const copy={
 pt:{generate:'Gerar descrição',translate:'Traduzir título e descrição',busy:'Preparando…',hint:'A IA usa os dados públicos preenchidos. Confira as características antes de aplicar. A tradução usa o título e a descrição originais acima; não inclua dados pessoais.',apply:'Aplicar ao rascunho',discard:'Descartar',review:'Revise a sugestão. Aplicar substitui os campos correspondentes; salvar o imóvel continua sendo uma ação separada.',error:'Não foi possível preparar o texto. Confira a conexão ou tente novamente.',notConfigured:'A IA ainda não está configurada no Supabase. Cadastre os secrets necessários e publique a função property-ai.',quotaUnavailable:'Não foi possível acessar o limite de uso da IA. Confirme se a migração property_ai foi aplicada no Supabase.',accessDenied:'Apenas usuários admin ou editor podem usar a IA.',sessionExpired:'Sua sessão expirou. Entre novamente e tente outra vez.',providerError:'A Groq não conseguiu processar o pedido. Confira a chave e o modelo configurados no Supabase e tente novamente.',originDenied:'Este endereço do site não está autorizado para usar a IA. Confira AI_ALLOWED_ORIGINS nos secrets do Supabase.',functionUnavailable:'Não consegui acessar a função property-ai. Confirme se ela foi publicada no projeto correto e se AI_ALLOWED_ORIGINS contém a origem exata deste site.',missing:'Preencha tipo, destino e área para gerar; título e descrição para traduzir.',stale:'Os campos foram alterados. Gere uma nova sugestão para preservar suas mudanças.',limit:'Limite de uso atingido. Tente novamente mais tarde.'},
 es:{generate:'Generar descripción',translate:'Traducir título y descripción',busy:'Preparando…',hint:'La IA usa los datos públicos introducidos. Revisa las características antes de aplicar. La traducción usa el título y la descripción originales de arriba; no incluyas datos personales.',apply:'Aplicar al borrador',discard:'Descartar',review:'Revisa la propuesta. Aplicar sustituye los campos correspondientes; guardar el inmueble sigue siendo una acción separada.',error:'No se pudo preparar el texto. Comprueba la conexión o inténtalo de nuevo.',notConfigured:'La IA aún no está configurada en Supabase. Añade los secrets necesarios y despliega la función property-ai.',quotaUnavailable:'No se pudo acceder al límite de uso de la IA. Comprueba si se aplicó la migración property_ai en Supabase.',accessDenied:'Solo los usuarios admin o editor pueden usar la IA.',sessionExpired:'Tu sesión ha expirado. Inicia sesión de nuevo e inténtalo otra vez.',providerError:'Groq no pudo procesar la solicitud. Comprueba la clave y el modelo configurados en Supabase e inténtalo de nuevo.',originDenied:'Esta dirección del sitio no está autorizada para usar la IA. Comprueba AI_ALLOWED_ORIGINS en los secrets de Supabase.',functionUnavailable:'No se pudo acceder a la función property-ai. Confirma que está desplegada en el proyecto correcto y que AI_ALLOWED_ORIGINS contiene el origen exacto del sitio.',missing:'Completa tipo, destino y superficie para generar; título y descripción para traducir.',stale:'Los campos han cambiado. Genera una nueva propuesta para conservar los cambios.',limit:'Límite de uso alcanzado. Inténtalo más tarde.'},
 en:{generate:'Generate description',translate:'Translate title and description',busy:'Preparing…',hint:'AI uses the public details entered. Check features before applying. Translation uses the original title and description; do not include personal data.',apply:'Apply to draft',discard:'Discard',review:'Review the suggestion. Applying replaces the corresponding fields; saving the property remains a separate action.',error:'Unable to prepare the text. Check the connection or try again.',notConfigured:'AI is not configured in Supabase yet. Add the required secrets and deploy the property-ai function.',quotaUnavailable:'Unable to access the AI usage limit. Check whether the property_ai migration was applied in Supabase.',accessDenied:'Only admin or editor users can use AI.',sessionExpired:'Your session has expired. Sign in again and retry.',providerError:'Groq could not process the request. Check the key and model configured in Supabase and retry.',originDenied:'This website origin is not allowed to use AI. Check AI_ALLOWED_ORIGINS in Supabase secrets.',functionUnavailable:'Could not reach the property-ai function. Confirm it is deployed to the correct project and AI_ALLOWED_ORIGINS contains this site’s exact origin.',missing:'Enter type, destination and area to generate; title and description to translate.',stale:'Fields have changed. Generate a new suggestion to preserve your edits.',limit:'Usage limit reached. Try again later.'}
}
const providerErrors={
 pt:{providerAuthFailed:'A Groq rejeitou GROQ_API_KEY. Confirme se é uma chave válida da Groq e atualize o secret no Supabase.',modelRejected:'A Groq rejeitou o modelo ou o formato do pedido. Confira GROQ_MODEL nos secrets do Supabase.'},
 es:{providerAuthFailed:'Groq rechazó GROQ_API_KEY. Confirma que sea una clave válida de Groq y actualiza el secret en Supabase.',modelRejected:'Groq rechazó el modelo o el formato de la solicitud. Comprueba GROQ_MODEL en los secrets de Supabase.'},
 en:{providerAuthFailed:'Groq rejected GROQ_API_KEY. Confirm it is a valid Groq API key and update the Supabase secret.',modelRejected:'Groq rejected the model or request format. Check GROQ_MODEL in Supabase secrets.'}
}
const knownErrors=new Set(['not_configured','quota_unavailable','forbidden','unauthorized','provider_unavailable','provider_auth_failed','model_or_request_rejected','origin_denied','rate_limited'])
const errorMessages={not_configured:'notConfigured',quota_unavailable:'quotaUnavailable',forbidden:'accessDenied',unauthorized:'sessionExpired',provider_unavailable:'providerError',provider_auth_failed:'providerAuthFailed',model_or_request_rejected:'modelRejected',origin_denied:'originDenied',function_unavailable:'functionUnavailable'}
async function errorCode(error){
 const context=error?.context
 if(context && typeof context.clone==='function'){
  try{const body=await context.clone().json();if(knownErrors.has(body?.error))return body.error}catch{}
 }
 return context?.status===429?'rate_limited':context?.status===401?'unauthorized':context?.status===403?'forbidden':context?.status===503?'not_configured':context?.status>=500?'provider_unavailable':context?.status===404||!Number.isFinite(context?.status)?'function_unavailable':'error'
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
   if(failure){const code=await errorCode(failure);throw Error(code==='rate_limited'?'limit':code)}
   const result=validateResult(data,action)
   if(alive.current)setSuggestion({action,result,snapshot})
  }catch(e){if(alive.current)setError(e.message==='limit'?c.limit:providerErrors[language]?.[errorMessages[e.message]]||c[errorMessages[e.message]]||c.error)}finally{if(alive.current)setBusy(false)}
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
