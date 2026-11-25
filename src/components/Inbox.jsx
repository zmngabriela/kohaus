import FormNotice from './FormNotice'
import { recipientLanguage, replyLanguage } from '../lib/language'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createInboxStore, isLocalInbox, fullName, filterInbox, canReply, propertyMessage } from '../lib/inbox'
import { visitMessage } from '../lib/visitMessage'
import { matchProperties } from '../lib/opportunities'
import EditorDialog from './EditorDialog'
import './Inbox.css'

const copy = {
 pt: {title:'Conversas',active:'Ativas',intro:'Cada conversa, com o contexto certo.',all:'Todos',open:'Em aberto',waiting:'Aguardando',resolved:'Resolvidos',unread:'Não lidos',whatsapp:'WhatsApp',form:'Formulário',email:'E-mail',search:'Buscar contato ou conversa',new:'Novo atendimento',empty:'Nenhuma conversa por aqui.',emptyHint:'Os contatos dos formulários e do WhatsApp ficam reunidos aqui, com seus vínculos e próximos passos.',choose:'Selecione uma conversa',chooseHint:'Abra um atendimento para ler as mensagens e consultar o contexto.',local:'Prévia local · nada é enviado',localHint:'Tickets, notas e respostas de teste ficam apenas neste navegador. WhatsApp não conectado.',demo:'Ver demonstração',import:'Trazer formulários para a prévia',refresh:'Atualizar',loading:'Carregando…',error:'Não foi possível concluir. Seus textos foram preservados. Tente novamente.',setup:'A central ainda não está configurada no banco. A migração e a conexão do canal precisam ser ativadas antes do uso real.',retry:'Tentar novamente',connected:'WhatsApp conectado',paused:'Envios pausados',unconfigured:'WhatsApp não conectado',connectionError:'Não foi possível verificar o WhatsApp',subject:'Assunto',name:'Nome do contato',phone:'Telefone com DDI',mail:'E-mail',save:'Salvar',cancel:'Cancelar',status:'Situação',priority:'Prioridade',normal:'Normal',high:'Alta',assigned:'Responsável',unassigned:'Sem responsável',mine:'Meus',team:'Toda a equipe',note:'Nota interna',reply:'Resposta',noteHint:'Registre uma informação para a equipe…',replyHint:'Escreva sua resposta…',saveNote:'Salvar nota',send:'Enviar pelo WhatsApp',simulate:'Salvar resposta de teste',emailDraft:'Abrir rascunho de e-mail',emailHint:'Abre seu aplicativo de e-mail. O CRM não confirma envio nem sincroniza respostas da caixa postal.',window:'A janela de resposta terminou. Para iniciar uma conversa, use um modelo aprovado com consentimento do contato.',offline:'Conecte o WhatsApp para enviar mensagens. Você já pode organizar o ticket e registrar notas.',context:'Contexto',client:'Cliente / proprietário',lead:'Lead',property:'Imóvel',visit:'Visita',none:'Sem vínculo',links:'Editar vínculos',history:'Histórico do atendimento',next:'Próximos passos',schedule:'Agendar visita',task:'Criar tarefa',viewClient:'Abrir cliente',viewProperty:'Abrir imóvel',viewLead:'Abrir lead',insertProperty:'Inserir imóvel na resposta',insertVisit:'Inserir dados da visita',matches:'Imóveis compatíveis',older:'Carregar anteriores',received:'Recebida',draft:'Teste local · não enviada',sending:'Enviando',sent:'Aceita pelo WhatsApp',delivered:'Entregue',read:'Lida',failed:'Falha no envio',uncertain:'Confirmação pendente · confira antes de reenviar',internal:'Visível apenas para a equipe',download:'Baixar anexo',unsupported:'Mensagem recebida em formato não exibido nesta versão.',templates:'Modelo aprovado',freeText:'Texto livre',optIn:'Confirmo que este contato autorizou mensagens pelo WhatsApp.',param:'Variável',noTemplates:'Nenhum modelo de texto compatível disponível.',conversation:'Conversa',audit:'Eventos',back:'Voltar à lista',clear:'Limpar filtro do cadastro',limit:'Até 200 atendimentos recentes',readOnly:'Seu acesso permite apenas consultar.',ticketCreated:'Atendimento criado',ticketUpdated:'Atendimento atualizado',messageAdded:'Mensagem registrada',messageUpdated:'Entrega atualizada',noEvents:'Nenhum evento registrado.',saved:'Salvo',linkNotice:'Os vínculos organizam o contexto; o destinatário continua sendo o contato deste atendimento.',confirmSend:'Enviar esta mensagem para',details:'Detalhes',notShared:'Imóvel privado ou indisponível para compartilhamento público.',demoName:'Dados fictícios de demonstração',source:'Canal',sendingError:'O envio não foi confirmado. Confira o estado da mensagem antes de tentar novamente.'},
 es: {title:'Conversaciones',active:'Activas',intro:'Cada conversación, con el contexto adecuado.',all:'Todos',open:'Abiertos',waiting:'En espera',resolved:'Resueltos',unread:'No leídos',whatsapp:'WhatsApp',form:'Formulario',email:'Email',search:'Buscar contacto o conversación',new:'Nueva conversación',empty:'No hay conversaciones.',emptyHint:'Los contactos de formularios y WhatsApp se reúnen aquí con su contexto y próximos pasos.',choose:'Selecciona una conversación',chooseHint:'Abre una conversación para consultar los mensajes y su contexto.',local:'Vista previa local · no se envía nada',localHint:'Tickets, notas y respuestas de prueba se guardan solo en este navegador. WhatsApp no conectado.',demo:'Ver demostración',import:'Importar formularios a la vista previa',refresh:'Actualizar',loading:'Cargando…',error:'No se pudo completar. Tus textos se han conservado. Inténtalo de nuevo.',setup:'La bandeja aún no está configurada en la base de datos. Activa la migración y el canal antes del uso real.',retry:'Reintentar',connected:'WhatsApp conectado',paused:'Envíos pausados',unconfigured:'WhatsApp no conectado',connectionError:'No se pudo verificar WhatsApp',subject:'Asunto',name:'Nombre del contacto',phone:'Teléfono con prefijo internacional',mail:'Email',save:'Guardar',cancel:'Cancelar',status:'Estado',priority:'Prioridad',normal:'Normal',high:'Alta',assigned:'Responsable',unassigned:'Sin responsable',mine:'Míos',team:'Todo el equipo',note:'Nota interna',reply:'Respuesta',noteHint:'Añade información para el equipo…',replyHint:'Escribe tu respuesta…',saveNote:'Guardar nota',send:'Enviar por WhatsApp',simulate:'Guardar respuesta de prueba',emailDraft:'Abrir borrador de email',emailHint:'Abre tu aplicación de correo. El CRM no confirma el envío ni sincroniza las respuestas del buzón.',window:'La ventana de respuesta ha terminado. Usa una plantilla aprobada con el consentimiento del contacto.',offline:'Conecta WhatsApp para enviar mensajes. Ya puedes organizar el ticket y guardar notas.',context:'Contexto',client:'Cliente / propietario',lead:'Lead',property:'Inmueble',visit:'Visita',none:'Sin vínculo',links:'Editar vínculos',history:'Historial de la conversación',next:'Próximos pasos',schedule:'Agendar visita',task:'Crear tarea',viewClient:'Abrir cliente',viewProperty:'Abrir inmueble',viewLead:'Abrir lead',insertProperty:'Añadir inmueble a la respuesta',insertVisit:'Añadir datos de la visita',matches:'Inmuebles compatibles',older:'Cargar anteriores',received:'Recibida',draft:'Prueba local · no enviada',sending:'Enviando',sent:'Aceptada por WhatsApp',delivered:'Entregada',read:'Leída',failed:'Error de envío',uncertain:'Confirmación pendiente · comprueba antes de reenviar',internal:'Solo visible para el equipo',download:'Descargar adjunto',unsupported:'Mensaje recibido en un formato no mostrado en esta versión.',templates:'Plantilla aprobada',freeText:'Texto libre',optIn:'Confirmo que el contacto autorizó mensajes por WhatsApp.',param:'Variable',noTemplates:'No hay plantillas de texto compatibles disponibles.',conversation:'Conversación',audit:'Eventos',back:'Volver a la lista',clear:'Quitar filtro de ficha',limit:'Hasta 200 conversaciones recientes',readOnly:'Tu acceso solo permite consultar.',ticketCreated:'Conversación creada',ticketUpdated:'Conversación actualizada',messageAdded:'Mensaje registrado',messageUpdated:'Entrega actualizada',noEvents:'Sin eventos.',saved:'Guardado',linkNotice:'Los vínculos organizan el contexto; el destinatario sigue siendo el contacto de esta conversación.',confirmSend:'Enviar este mensaje a',details:'Detalles',notShared:'Inmueble privado o no disponible para compartir públicamente.',demoName:'Datos ficticios de demostración',source:'Canal',sendingError:'No se confirmó el envío. Comprueba el estado del mensaje antes de intentarlo de nuevo.'},
 en: {title:'Conversations',active:'Active',intro:'Every conversation, with the right context.',all:'All',open:'Open',waiting:'Waiting',resolved:'Resolved',unread:'Unread',whatsapp:'WhatsApp',form:'Form',email:'Email',search:'Search contacts or conversations',new:'New conversation',empty:'No conversations here yet.',emptyHint:'Website and WhatsApp contacts come together here with their context and next steps.',choose:'Select a conversation',chooseHint:'Open a ticket to read messages and review its context.',local:'Local preview · nothing is sent',localHint:'Tickets, notes and test replies stay in this browser only. WhatsApp is not connected.',demo:'View demo',import:'Import forms into preview',refresh:'Refresh',loading:'Loading…',error:'Could not complete the action. Your text was kept. Please try again.',setup:'The inbox database is not configured yet. Activate the migration and channel before live use.',retry:'Try again',connected:'WhatsApp connected',paused:'Sending paused',unconfigured:'WhatsApp not connected',connectionError:'Could not verify WhatsApp',subject:'Subject',name:'Contact name',phone:'Phone with country code',mail:'Email',save:'Save',cancel:'Cancel',status:'Status',priority:'Priority',normal:'Normal',high:'High',assigned:'Assignee',unassigned:'Unassigned',mine:'Mine',team:'Entire team',note:'Internal note',reply:'Reply',noteHint:'Add a note for your team…',replyHint:'Write your reply…',saveNote:'Save note',send:'Send via WhatsApp',simulate:'Save test reply',emailDraft:'Open email draft',emailHint:'Opens your email app. The CRM cannot confirm sending or sync mailbox replies.',window:'The reply window has closed. Use an approved template with the contact’s consent.',offline:'Connect WhatsApp to send messages. You can already organize tickets and add notes.',context:'Context',client:'Client / owner',lead:'Lead',property:'Property',visit:'Viewing',none:'Unlinked',links:'Edit links',history:'Conversation history',next:'Next steps',schedule:'Schedule viewing',task:'Create task',viewClient:'Open client',viewProperty:'Open property',viewLead:'Open lead',insertProperty:'Insert property in reply',insertVisit:'Insert viewing details',matches:'Matching properties',older:'Load older',received:'Received',draft:'Local test · not sent',sending:'Sending',sent:'Accepted by WhatsApp',delivered:'Delivered',read:'Read',failed:'Sending failed',uncertain:'Unconfirmed · check before resending',internal:'Visible only to your team',download:'Download attachment',unsupported:'Message received in a format not displayed in this version.',templates:'Approved template',freeText:'Free text',optIn:'I confirm that this contact opted in to WhatsApp messages.',param:'Variable',noTemplates:'No compatible text templates available.',conversation:'Conversation',audit:'Events',back:'Back to list',clear:'Clear record filter',limit:'Up to 200 recent conversations',readOnly:'Your role allows read-only access.',ticketCreated:'Conversation created',ticketUpdated:'Conversation updated',messageAdded:'Message recorded',messageUpdated:'Delivery updated',noEvents:'No events yet.',saved:'Saved',linkNotice:'Links organize context; the recipient remains the contact on this ticket.',confirmSend:'Send this message to',details:'Details',notShared:'Private property or unavailable for public sharing.',demoName:'Fictional demo data',source:'Channel',sendingError:'Sending was not confirmed. Check the message status before trying again.'},
}
function visibleMessageBody(body) {
 return body?.replace(/(?:^|\r?\n)Anexos disponíveis na caixa de e-mail: assinatura-guilherme\.png[ \t]*(?=\r?\n|$)/gi, '').trimEnd()
}
function encodeEmailFile(file) {
 return new Promise((resolve,reject)=>{
  const reader=new FileReader()
  reader.onload=()=>resolve({name:file.name,content:String(reader.result).split(',')[1]})
  reader.onerror=()=>reject(reader.error)
  reader.readAsDataURL(file)
 })
}
const time=(value,language)=>value ? new Date(value).toLocaleString(language,{dateStyle:'short',timeStyle:'short'}) : '—'
export default function Inbox({language='pt',clients=[],leads=[],properties=[],visits=[],userId='preview',role='admin',initialContext={},onClient,onProperty,onLead,onVisit,onTask,forceLocal=false}) {
 const devReadOnly = !forceLocal && isLocalInbox()
  && import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') === 'https://nnrfluzbsbdngxklomyp.supabase.co'
 const c=copy[language] || copy.es,local=forceLocal || (isLocalInbox() && !devReadOnly)
 const canManageConversation = ['admin','editor'].includes(role)
 const editable = !devReadOnly && canManageConversation
 const store=useMemo(()=>createInboxStore({local,userId}),[local,userId])
 const [tickets,setTickets]=useState([]),[selected,setSelected]=useState(null),[messages,setMessages]=useState([]),[events,setEvents]=useState([])
 const [loading,setLoading]=useState(true),[threadLoading,setThreadLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [filters,setFilters]=useState({search:'',status:'active',channel:'all',assigned:'all',mailbox:'all'}),[context,setContext]=useState(initialContext)
 const [connection,setConnection]=useState({state:local?'local':'loading',canSend:false})
 const [replyFiles,setReplyFiles]=useState([])
 const filePicker=useRef(null)
 const attachmentCopy={
  pt:{add:'Anexar arquivos',remove:'Remover',limit:'Escolha até 5 arquivos, somando no máximo 3 MB.'},
  es:{add:'Adjuntar archivos',remove:'Quitar',limit:'Elige hasta 5 archivos con un total máximo de 3 MB.'},
  en:{add:'Attach files',remove:'Remove',limit:'Choose up to 5 files totaling no more than 3 MB.'},
 }[language] || {add:'Attach files',remove:'Remove',limit:'Up to 5 files and 3 MB total.'}
 function selectFiles(event){
  const files=[...replyFiles,...Array.from(event.target.files || [])]
  event.target.value=''
  if(files.length>5 || files.some(file=>!file.size) || files.reduce((size,file)=>size+file.size,0)>3*1024*1024){
   setError(attachmentCopy.limit)
   return
  }
  setReplyFiles(files)
 }
 const [emailConnection,setEmailConnection]=useState({state:local?'local':'unconfigured',canSend:false,mailboxes:[]}),[replyMailbox,setReplyMailbox]=useState('hola@kohausrealestate.com')
 const [members,setMembers]=useState([]),[tab,setTab]=useState('conversation'),[mode,setMode]=useState('note'),[text,setText]=useState('')
 const [showNew,setShowNew]=useState(false),[showLinks,setShowLinks]=useState(false),[confirm,setConfirm]=useState(false),[draft,setDraft]=useState({})
 const [templates,setTemplates]=useState([]),[templateKey,setTemplateKey]=useState(''),[params,setParams]=useState([]),[optIn,setOptIn]=useState(false)
 const lock=useRef(false),requestId=useRef(crypto.randomUUID()),bottom=useRef(null),currentSelection=useRef(selected),lastCount=useRef(0)
 useEffect(()=>{currentSelection.current=selected},[selected])
 const ticket=tickets.find(t=>t.id===selected),client=clients.find(x=>x.id===ticket?.client_id),lead=leads.find(x=>x.id===ticket?.lead_id),property=properties.find(x=>x.id===ticket?.property_id),visit=visits.find(x=>x.id===ticket?.visit_id)
 const filtered=filterInbox(tickets,{...filters,context},userId),template=templates.find(t=>`${t.name}:${t.language}`===templateKey)
 const refresh=useCallback(async()=>{const rows=await store.list();setTickets(rows);return rows},[store])
 useEffect(()=>{let active=true;store.list().then(rows=>{if(active)setTickets(rows)}).catch(()=>{if(active)setError(c.setup)}).finally(()=>{if(active)setLoading(false)})
  store.emailConnection().then(value=>{if(active)setEmailConnection(value)}).catch(()=>{})
  store.connection().then(value=>{if(active)setConnection(value)}).catch(()=>{if(active)setConnection({state:'error',canSend:false})})
  if(!local)import('../lib/supabase').then(async({supabase})=>{const {data}=await supabase.from('dashboard_users').select('user_id,display_name');if(active)setMembers(data || [])})
  return ()=>{active=false}
 },[store,local,c.setup])
 useEffect(()=>{let active=true;if(!selected)return
  Promise.all([store.messages(selected),store.events(selected),store.markRead(selected)]).then(([rows,audit])=>{if(active){setMessages(rows);setEvents(audit);refresh().catch(()=>{})}}).catch(()=>{if(active)setError(c.error)}).finally(()=>{if(active)setThreadLoading(false)})
  return ()=>{active=false}
 },[selected,store,refresh,c.error,devReadOnly])
 // Poll only while visible. No realtime service setup required; no stale thread replacement.
 useEffect(()=>{if(local)return;let active=true;const timer=setInterval(async()=>{if(document.hidden || lock.current)return;const id=currentSelection.current;try{const rows=await store.list();if(active)setTickets(rows);if(id){const next=await store.messages(id);if(active && currentSelection.current===id){setMessages(next);await store.markRead(id)}}}catch{/* Keep the last successful data; manual refresh reports errors. */}},15000);return ()=>{active=false;clearInterval(timer)}},[store,local,devReadOnly])
 useEffect(()=>{if(messages.length>lastCount.current)bottom.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});lastCount.current=messages.length},[messages])
 const draftKey=`kohaus-inbox-draft:${userId}:${selected}:${mode}`
 function select(id){if(id===selected)return;setReplyFiles([]);setThreadLoading(Boolean(id));setSelected(id);setMessages([]);setEvents([]);setError('');setNotice('');setTemplateKey('');setParams([]);setConfirm(false);requestId.current=crypto.randomUUID();setText(sessionStorage.getItem(`kohaus-inbox-draft:${userId}:${id}:${mode}`) || '')}
 function changeText(value){setText(value);sessionStorage.setItem(draftKey,value)}
 function changeMode(value){setMode(value);setText(sessionStorage.getItem(`kohaus-inbox-draft:${userId}:${selected}:${value}`) || '');setTemplateKey('')}
 async function act(fn){if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await fn()}catch{setError(c.error)}finally{lock.current=false;setBusy(false)}}
 const [refreshing,setRefreshing]=useState(false)
 const [replyLanguageOverride,setReplyLanguageOverride]=useState(null)
 const savedLanguage=recipientLanguage(client,lead,language)
 const incoming=messages.findLast(message=>message.direction==='inbound' && message.body?.trim())
 const macroLanguage=(replyLanguageOverride?.conversationId===selected && replyLanguageOverride.language)
  || (ticket?.channel==='form' && lead?.language ? recipientLanguage(null,lead,savedLanguage) : replyLanguage(incoming?.body,savedLanguage))
 const refreshCopy={
  pt:{checking:'Verificando…',updated:'Lista atualizada.',empty:'Caixas verificadas. Nenhum e-mail novo.',found:n=>n===1?'1 e-mail novo na lista.':n+' e-mails novos na lista.',partial:'Lista atualizada. Não foi possível verificar todas as caixas.'},
  es:{checking:'Comprobando…',updated:'Lista actualizada.',empty:'Buzones comprobados. No hay correos nuevos.',found:n=>n===1?'1 correo nuevo en la lista.':n+' correos nuevos en la lista.',partial:'Lista actualizada. No se pudieron comprobar todos los buzones.'},
  en:{checking:'Checking…',updated:'List updated.',empty:'Mailboxes checked. No new emails.',found:n=>n===1?'1 new email in the list.':n+' new emails in the list.',partial:'List updated. Some mailboxes could not be checked.'},
 }[language] || {}
 async function refreshInbox(){
  await act(async()=>{
   setRefreshing(true)
   try {
    const checks=!local && role==='admin'
     ? await Promise.allSettled(['hola@kohausrealestate.com','guilherme@kohausrealestate.com'].map(email=>store.syncEmail(email)))
     : []
    await refresh()
    if(selected){setMessages(await store.messages(selected));setEvents(await store.events(selected))}
    const imported=checks.reduce((sum,check)=>sum+(check.status==='fulfilled'?(check.value?.imported || 0):0),0)
    if(checks.some(check=>check.status==='rejected' || check.value?.state!=='ok')){
     setError([imported?refreshCopy.found(imported):'',refreshCopy.partial].filter(Boolean).join(' '))
    }else setNotice(imported?refreshCopy.found(imported):checks.length?refreshCopy.empty:refreshCopy.updated)
   }finally{setRefreshing(false)}
  })
 }
 async function update(patch){
  const saved=await store.save(selected,patch)
  await refresh()
  if(patch.status && !filterInbox([{...ticket,...saved}],{status:filters.status},userId).length)select(null)
  else setEvents(await store.events(selected))
  setNotice(c.saved)
 }
 const canCompose = editable || (devReadOnly && canManageConversation && mode==='reply' && ticket?.channel!=='whatsapp' && Boolean(ticket?.contact_email))
 const canSubmit = canCompose && (mode==='note' || local || (ticket?.channel==='whatsapp'
  ? connection.canSend && (template || canReply(ticket.last_inbound_at))
  : emailConnection.canSend && emailConnection.mailboxes.includes(ticket?.mailbox_email || replyMailbox)))
 async function submit(){if(!canSubmit)return;await act(async()=>{const id=selected,nonce=requestId.current
  if(mode==='note')await store.note(id,text,nonce)
  else {try{await (ticket.channel==='whatsapp'?store.send(id,text,nonce,template?{name:template.name,language:template.language,values:params}:null,optIn):store.sendEmail(id,text,nonce,ticket.mailbox_email || replyMailbox,await Promise.all(replyFiles.map(encodeEmailFile))))}catch{setError(c.sendingError);setMessages(await store.messages(id));await refresh();return}}
  sessionStorage.removeItem(draftKey);setText('');if(mode==='reply')setReplyFiles([]);requestId.current=crypto.randomUUID();setConfirm(false);setMessages(await store.messages(id));setEvents(await store.events(id));await refresh();setNotice(c.saved)
 })}
 function insert(value){if(!value)return;setMode('reply');const next=[sessionStorage.getItem(`kohaus-inbox-draft:${userId}:${selected}:reply`),value].filter(Boolean).join('\n\n');setText(next);sessionStorage.setItem(`kohaus-inbox-draft:${userId}:${selected}:reply`,next);setTemplateKey('')}
 const statusText={local:c.local,connected:c.connected,paused:c.paused,unconfigured:c.unconfigured,error:c.connectionError,loading:c.loading}[connection.state] || c.unconfigured
 const fields=[['client_id','client',clients,fullName],['lead_id','lead',leads,fullName],['property_id','property',properties,p=>`${p.reference} · ${typeof p.title==='string'?p.title:''}`],['visit_id','visit',visits,v=>`${v.contactName} · ${time(v.scheduledAt,language)}`]]
 function newTicket(){const contact=clients.find(x=>x.id===context.client_id) || leads.find(x=>x.id===context.lead_id) || client;setDraft({channel:'whatsapp',subject:'',contact_name:fullName(contact),contact_phone:contact?.phone || '',contact_email:contact?.email || '',...context});setShowNew(true)}
 const sendLabel=ticket?.channel==='whatsapp'?c.send:language==='pt'?'Enviar e-mail':language==='es'?'Enviar correo':'Send email'
 const eventNames={'ticket.insert':c.ticketCreated,'ticket.update':c.ticketUpdated,'message.insert':c.messageAdded,'message.update':c.messageUpdated}
 return <section className={`inbox dashboard-section ${selected?'inbox-has-selection':''}`}>
  <header className="inbox-heading"><h2>{c.title}</h2><div className="inbox-heading-actions">{connection.state!=='error' && <span className={`inbox-connection ${connection.state==='connected'?'is-connected':''}`}><i/>{statusText}</span>}<button className="outline-button" disabled={busy || loading} aria-busy={refreshing} onClick={refreshInbox}>{refreshing?refreshCopy.checking:c.refresh}</button><button className="dashboard-property-cta" disabled={!editable || busy} onClick={newTicket}>{c.new}</button></div></header>
  {local && <aside className="inbox-local"><div><strong>{c.local}</strong><p>{c.localHint}</p></div><div><button onClick={()=>act(async()=>{await store.seedDemo();await store.seedEmailDemo();const rows=await refresh();select(rows.find(t=>t.demo)?.id)})} disabled={busy}>{c.demo}</button>{leads.length>0 && <button onClick={()=>act(async()=>{await store.importForms(leads);await refresh()})} disabled={busy}>{c.import}</button>}</div></aside>}
  {(error || notice) && <FormNotice key={error || notice} language={language} error={Boolean(error)} onDismiss={()=>{
   setError('');setNotice('')
  }}>{error || notice}</FormNotice>}
  {!devReadOnly && !editable && <p>{c.readOnly}</p>}
  <div className="inbox-filters"><label className="inbox-search"><span>{c.search}</span><input type="search" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder={c.search}/></label>
   {[['status',['active','open','waiting','resolved','unread']],['channel',['all','whatsapp','form','email']],['assigned',['all','mine','unassigned']]].map(([key,values])=><label key={key}><span>{key==='channel'?c.source:key==='assigned'?c.assigned:c.status}</span><select value={filters[key]} onChange={e=>{
    const value=e.target.value
    if(key==='status' && ticket && !filterInbox([ticket],{status:value},userId).length)select(null)
    setFilters({...filters,[key]:value})
   }}>{values.map(v=><option key={v} value={v}>{c[v]}</option>)}</select></label>)}
   <label><span>{language==='pt'?'Caixa de e-mail':language==='es'?'Buzón':'Mailbox'}</span><select value={filters.mailbox} onChange={e=>setFilters({...filters,mailbox:e.target.value})}><option value="all">{c.all}</option>{['hola@kohausrealestate.com','guilherme@kohausrealestate.com'].map(email=><option key={email} value={email}>{email}</option>)}</select></label>
  </div>
  {Object.values(context).some(Boolean) && <button className="inbox-context-filter" onClick={()=>setContext({})}>{c.clear} ×</button>}
  <div className="inbox-workspace">
   <aside className="inbox-list" aria-label={c.title}><div className="inbox-list-head"><span>{filtered.length} {c.title.toLowerCase()}</span><small>{c.limit}</small></div>
    {loading?<p className="inbox-empty">{c.loading}</p>:filtered.length?filtered.map(t=><button className={`inbox-ticket ${t.id===selected?'is-selected':''} ${Number(t.unread_count)>0?'is-unread':''}`} key={t.id} onClick={()=>select(t.id)} aria-pressed={t.id===selected}>
     <span className="inbox-ticket-top"><span className="inbox-avatar">{(t.contact_name || t.subject).slice(0,1).toUpperCase()}</span><strong>{t.contact_name || t.subject}</strong><small>{time(t.last_message_at || t.created_at,language)}</small></span>
     <span className="inbox-ticket-subject">{t.subject}</span><span className="inbox-ticket-preview">{t.last_body || c.none}</span>
     <span className="inbox-ticket-bottom"><span>{t.mailbox_email || c[t.channel]}</span><span className={`inbox-status is-${t.status}`}>{c[t.status]}</span>{t.priority==='high'&&<span aria-label={c.high}>!</span>}{Number(t.unread_count)>0&&<b className="inbox-unread-count" aria-label={`${t.unread_count} · ${c.unread}`}>{t.unread_count}</b>}</span>
    </button>):<div className="inbox-empty"><strong>{c.empty}</strong><p>{c.emptyHint}</p></div>}
   </aside>
   {!ticket?<div className="inbox-placeholder"><span className="inbox-placeholder-icon" aria-hidden="true">↔</span><h3>{c.choose}</h3><p>{c.chooseHint}</p></div>:<>
    <div className="inbox-thread">
     <header className="inbox-thread-head"><button className="inbox-back" onClick={()=>select(null)}>← {c.back}</button><div><p className="section-label">{c[ticket.channel]} · {ticket.mailbox_email || ticket.id.slice(0,8)}</p><h3>{ticket.contact_name || ticket.subject}</h3><p>{ticket.subject}</p></div><label><span>{c.status}</span><select disabled={!canManageConversation || busy} value={ticket.status} onChange={e=>act(()=>update({status:e.target.value}))}>{['open','waiting','resolved'].map(v=><option key={v} value={v}>{c[v]}</option>)}</select></label></header>
     <div className="inbox-tabs" role="tablist" aria-label={c.details}>{['conversation','audit'].map(v=><button role="tab" aria-selected={tab===v} key={v} onClick={()=>setTab(v)}>{c[v]}</button>)}</div>
     <div className="inbox-messages" role="region" aria-label={tab==='audit'?c.history:c.conversation} tabIndex={0}>
      {threadLoading?<p>{c.loading}</p>:tab==='audit'?<>{!events.length&&<p>{c.noEvents}</p>}{events.map(e=><article className="inbox-audit" key={e.id}><small>{time(e.created_at,language)}</small><strong>{eventNames[e.action] || e.action}</strong>{e.before_data && Object.keys(e.after_data || {}).filter(k=>['status','priority','assigned_to','client_id','lead_id','property_id','visit_id'].includes(k) && e.before_data[k]!==e.after_data[k]).map(k=><p key={k}>{c[k.replace('_id','')] || c[k] || k}: {c[e.before_data[k]] || e.before_data[k] || '—'} → {c[e.after_data[k]] || e.after_data[k] || '—'}</p>)}</article>)}</>:<>
       {messages.length>=100 && <button onClick={()=>act(async()=>setMessages([...await store.messages(selected,messages.length),...messages]))}>{c.older}</button>}
       {messages.map(m=><article key={m.id} className={`inbox-message is-${m.direction}`}><div className="inbox-message-label">{m.direction==='internal'?c.note:m.direction==='inbound'?ticket.contact_name:c.reply}</div>
        {visibleMessageBody(m.body) && <p>{visibleMessageBody(m.body)}</p>}{m.kind==='unsupported'&&<p>{c.unsupported}</p>}{m.media_id&&<button className="inbox-attachment-link" disabled={busy} onClick={()=>act(async()=>{const blob=await store.media(m.id);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(m.media_name || 'whatsapp-attachment').replace(/[/\\]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})}>{c.download} · {m.media_name || m.kind}</button>}
        {m.email_attachments?.map(part=><button className="inbox-attachment-link" key={part.index} disabled={busy} onClick={()=>act(async()=>{
         const blob=await store.emailAttachment(m.id,part.index)
         const url=URL.createObjectURL(blob)
         const link=document.createElement('a')
         link.href=url
         link.download=part.name.replace(/[^\p{L}\p{N} ._()-]/gu,'_') || 'anexo'
         link.click()
         setTimeout(()=>URL.revokeObjectURL(url),1000)
        })}>{c.download} · {part.name}</button>)}
        {m.status==='failed' && m.direction==='outbound' && m.kind==='text' && editable && <button type="button" disabled={busy} onClick={()=>{requestId.current=crypto.randomUUID();setMode('reply');setText(m.body);sessionStorage.setItem(`kohaus-inbox-draft:${userId}:${selected}:reply`,m.body);setConfirm(false);setError('')}}>{c.retry}</button>}
        <footer><time>{time(m.provider_at || m.created_at,language)}</time><span>{m.direction==='internal'?c.internal:(m.status==='sent' && ticket.channel!=='whatsapp' ? (language==='pt'?'Aceito pelo servidor de e-mail':language==='es'?'Aceptado por el servidor de correo':'Accepted by mail server') : c[m.status] || m.status)}</span></footer>
       </article>)}<div ref={bottom}/>
      </>}
     </div>
     <form className="inbox-composer" onSubmit={e=>{e.preventDefault();if(!canSubmit)return;if(mode==='note' || local)submit();else setConfirm(true)}}>
      <div className="inbox-composer-tabs">{['note','reply'].map(v=><button type="button" key={v} aria-pressed={mode===v} onClick={()=>changeMode(v)}>{c[v]}</button>)}</div>
      {!template&&<textarea aria-label={c[mode]} placeholder={mode==='note'?c.noteHint:c.replyHint} rows={3} maxLength={mode==='note'?10000:4096} value={text} onChange={e=>changeText(e.target.value)} disabled={!canCompose || busy} required/>}
      <div className="inbox-composer-bottom">
       <small>{mode==='note'?c.internal:ticket.channel==='whatsapp'?ticket.contact_phone:<>{language==='pt'?'Responder por':language==='es'?'Responder desde':'Reply from'}: {ticket.mailbox_email || replyMailbox}</>}</small>
       <button className="solid-button" disabled={!canSubmit || busy || (!template&&!text.trim())}>{busy?c.loading:mode==='note'?c.saveNote:local?c.simulate:ticket.channel==='whatsapp'?c.send:language==='pt'?'Enviar e-mail':language==='es'?'Enviar correo':'Send email'}</button>
      </div>
      {mode==='reply' && !local && ticket.channel==='whatsapp' && <>
       {!connection.canSend?<p>{c.offline}</p>:!canReply(ticket.last_inbound_at)&&<p>{c.window}</p>}
       <button type="button" onClick={()=>act(async()=>setTemplates(await store.templates()))}>{c.templates}</button>
       {templates.length>0&&<label><span>{c.templates}</span><select value={templateKey} onChange={e=>{setTemplateKey(e.target.value);setParams([]);setOptIn(false)}}><option value="">{c.freeText}</option>{templates.map(t=><option key={`${t.name}:${t.language}`} value={`${t.name}:${t.language}`}>{t.name} · {t.language}</option>)}</select></label>}
       {template&&<><p>{template.body}</p>{Array.from({length:template.parameters},(_,i)=><label key={i}><span>{c.param} {i+1}</span><input required maxLength={1000} value={params[i] || ''} onChange={e=>setParams(values=>Array.from({length:template.parameters},(_,j)=>j===i?e.target.value:values[j] || ''))}/></label>)}<label className="inbox-check"><input type="checkbox" checked={optIn} onChange={e=>setOptIn(e.target.checked)} required/>{c.optIn}</label></>}
      </>}
      {mode==='reply' && ticket.channel!=='whatsapp' && canCompose && <div className="inbox-reply-tools">
       <label>{language==='pt'?'Idioma da resposta':language==='es'?'Idioma de la respuesta':'Reply language'} <select value={macroLanguage} onChange={event=>setReplyLanguageOverride({conversationId:selected,language:event.target.value})}>
        <option value="pt">Português</option><option value="es">Español</option><option value="en">English</option>
       </select></label>
       <button type="button" className="outline-button inbox-reply-macro" disabled={busy} onClick={()=>{
       const [initial = '', ...rest] = Array.from(ticket.contact_name?.trim().split(/\s+/)[0] || '')
       const firstName = initial.toLocaleUpperCase(macroLanguage) + rest.join('')
       const greeting=macroLanguage==='pt'?'Olá':macroLanguage==='es'?'Hola':'Hello'
       const opening=macroLanguage==='pt'?'Agradecemos o seu contato com a KOHAUS. Como podemos ajudar?':macroLanguage==='es'?'Gracias por contactar con KOHAUS. ¿En qué podemos ayudarte?':'Thank you for contacting KOHAUS. How can we help?'
       insert([firstName?`${greeting}, ${firstName}!`:`${greeting}!`,opening].join('\n\n'))
      }}>{language==='pt'?'Inserir resposta padrão':language==='es'?'Insertar respuesta estándar':'Insert standard reply'}</button>
       {!local && <><input ref={filePicker} type="file" multiple hidden disabled={busy} onChange={selectFiles} />
       <button type="button" className="outline-button inbox-file-picker" disabled={busy} onClick={()=>filePicker.current?.click()}>{attachmentCopy.add}</button></>}
      </div>}
       {mode==='reply' && ticket.channel!=='whatsapp' && <div>{!ticket.mailbox_email && <select aria-label="Caixa remetente" value={replyMailbox} onChange={e=>setReplyMailbox(e.target.value)}>{['hola@kohausrealestate.com','guilherme@kohausrealestate.com'].map(email=><option key={email}>{email}</option>)}</select>}{!local && !emailConnection.canSend && <p>{language==='pt'?'Envio pelo Spacemail ainda não conectado. Seu rascunho será preservado.':language==='es'?'Envío por Spacemail aún no conectado. Se conserva el borrador.':'Spacemail sending is not connected. Your draft is preserved.'}</p>}</div>}
      {mode==='reply' && !local && ticket.channel!=='whatsapp' && canCompose && replyFiles.length>0 && <div className="inbox-reply-files">

       {replyFiles.length>0 && <ul>{replyFiles.map((file,index)=><li key={index}><span>{file.name}</span><button type="button" className="inbox-remove-file" disabled={busy} aria-label={`${attachmentCopy.remove} ${file.name}`} onClick={()=>setReplyFiles(items=>items.filter((_,i)=>i!==index))}>×</button></li>)}</ul>}
      </div>}
      {mode==='reply' && ticket.channel!=='whatsapp' && canCompose && <img className="inbox-reply-signature" src="/brand/assinatura-guilherme.png" width="560" height="160" alt={language==='pt'?'Assinatura do e-mail: Guilherme Coninch, KOHAUS Real Estate':language==='es'?'Firma del correo: Guilherme Coninch, KOHAUS Real Estate':'Email signature: Guilherme Coninch, KOHAUS Real Estate'}/>}
     </form>
    </div>
    <aside className="inbox-context"><h3>{c.context}</h3><div className="inbox-contact"><strong>{ticket.contact_name}</strong>{ticket.contact_phone&&<a href={`tel:${ticket.contact_phone.replace(/[^+\d]/g,'')}`}>{ticket.contact_phone}</a>}{ticket.contact_email&&<a href={`mailto:${encodeURIComponent(ticket.contact_email)}`}>{ticket.contact_email}</a>}{ticket.demo&&<small>{c.demoName}</small>}</div>
     <label><span>{c.assigned}</span><select disabled={!canManageConversation || busy} value={ticket.assigned_to || ''} onChange={e=>act(()=>update({assigned_to:e.target.value || null}))}><option value="">{c.unassigned}</option><option value={userId}>{c.mine}</option>{members.filter(m=>m.user_id!==userId).map(m=><option key={m.user_id} value={m.user_id}>{m.display_name || m.user_id.slice(0,8)}</option>)}</select></label>
     <label><span>{c.priority}</span><select disabled={!canManageConversation || busy} value={ticket.priority} onChange={e=>act(()=>update({priority:e.target.value}))}>{['normal','high'].map(v=><option key={v} value={v}>{c[v]}</option>)}</select></label>
     <div className="inbox-links">{[[c.client,client?fullName(client):null],[c.lead,lead?fullName(lead):null],[c.property,property?.reference],[c.visit,visit?time(visit.scheduledAt,language):null]].map(([label,value])=><div key={label}><small>{label}</small><span>{value || c.none}</span></div>)}<button disabled={!canManageConversation || busy} onClick={()=>{setDraft({...ticket});setShowLinks(true)}}>{c.links}</button></div>
     <div className="inbox-next"><h4>{c.next}</h4>{client&&onClient&&<button onClick={()=>onClient(client)}>{c.viewClient} ↗</button>}{lead&&onLead&&<button onClick={()=>onLead(lead)}>{c.viewLead} ↗</button>}{property&&onProperty&&<button onClick={()=>onProperty(property)}>{c.viewProperty} ↗</button>}
      {editable&&onVisit&&<button onClick={()=>onVisit({client,lead,property})}>{c.schedule} ↗</button>}{editable&&onTask&&<button onClick={()=>onTask({client_id:ticket.client_id,lead_id:ticket.lead_id,property_id:ticket.property_id,title:ticket.subject})}>{c.task} ↗</button>}
     </div>
     {property&&<div className="inbox-property"><small>{property.reference}</small><strong>{typeof property.title==='string'?property.title:property.title?.[language]}</strong><span>{property.priceLabel}</span><button disabled={!editable || !propertyMessage(property,language)} onClick={()=>insert(propertyMessage(property,language))}>{c.insertProperty}</button>{!propertyMessage(property,language)&&<small>{c.notShared}</small>}</div>}
     {visit&&<button disabled={!editable} onClick={()=>insert(visitMessage(visit,property,client,language)?.body)}>{c.insertVisit}</button>}
     {client&&<details><summary>{c.matches}</summary>{matchProperties(client,properties).filter(p=>propertyMessage(p,language)).slice(0,5).map(p=><div className="inbox-property" key={p.id}><small>{p.reference}</small><strong>{typeof p.title==='string'?p.title:''}</strong><button disabled={!editable} onClick={()=>insert(propertyMessage(p,language))}>{c.insertProperty}</button></div>)}</details>}
    </aside>
   </>}
  </div>
  {((showNew && editable) || (showLinks && canManageConversation))&&<EditorDialog title={showNew?c.new:c.links} closeLabel={c.cancel} busy={busy} onClose={()=>{setShowNew(false);setShowLinks(false)}}><form className="inbox-editor" onSubmit={e=>{e.preventDefault();act(async()=>{const patch=showNew?draft:Object.fromEntries(fields.map(([key])=>[key,draft[key] || null]));const t=await store.save(showNew?null:selected,patch);await refresh();setShowNew(false);setShowLinks(false);select(t.id)})}}>
   {showNew&&<><label><span>{c.source}</span><select value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value})}>{['whatsapp','email'].map(v=><option key={v} value={v}>{c[v]}</option>)}</select></label>{[['subject','subject'],['contact_name','name'],['contact_phone','phone'],['contact_email','mail']].map(([key,label])=><label key={key}><span>{c[label]}</span><input required={key==='subject' || key==='contact_name' || (draft.channel==='whatsapp'&&key==='contact_phone') || (draft.channel==='email'&&key==='contact_email')} type={key==='contact_email'?'email':key==='contact_phone'?'tel':'text'} maxLength={key==='subject'?240:200} value={draft[key] || ''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}</>}
   {fields.map(([key,label,items,name])=><label key={key}><span>{c[label]}</span><select value={draft[key] || ''} onChange={e=>setDraft({...draft,[key]:e.target.value || null})}><option value="">{c.none}</option>{items.map(item=><option key={item.id} value={item.id}>{name(item)}</option>)}</select></label>)}
   <p>{c.linkNotice}</p>{error&&<p role="alert">{error}</p>}<button className="solid-button" disabled={busy}>{busy?c.loading:c.save}</button>
  </form></EditorDialog>}
  {confirm&&<EditorDialog title={sendLabel} closeLabel={c.cancel} busy={busy} onClose={()=>setConfirm(false)}><div className="inbox-send-confirm"><p>{c.confirmSend} <strong>{ticket.contact_name} · {ticket.channel==='whatsapp'?ticket.contact_phone:ticket.contact_email}</strong>?</p><pre>{template?template.body.replace(/\{\{(\d+)\}\}/g,(_,n)=>params[Number(n)-1] || ''):text}</pre>{replyFiles.length>0 && ticket.channel!=='whatsapp' && <ul>{replyFiles.map((file,index)=><li key={index}>{file.name}</li>)}</ul>}<button className="solid-button" disabled={busy} onClick={submit}>{sendLabel}</button>{error&&<p role="alert">{error}</p>}</div></EditorDialog>}
 </section>
}
