let loading
function load() {
 if(window.turnstile) return Promise.resolve()
 if(!loading) loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true
  const timer=setTimeout(()=>{script.remove();loading=null;reject(new Error('Verification unavailable'))},15000)
  script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);script.remove();loading=null;reject(new Error('Verification unavailable'))}
  document.head.appendChild(script)
 })
 return loading
}
export async function botCheck(language) {
 const key=import.meta.env.VITE_TURNSTILE_SITE_KEY
 if(!key) throw new Error('Formulário indisponível. Entre em contato por e-mail.')
 await load()
 return new Promise((resolve,reject)=>{
  const previous=document.activeElement
  const dialog=document.createElement('dialog');dialog.className='bot-check'
  const title=document.createElement('p');title.textContent={pt:'Verificação de segurança',es:'Verificación de seguridad',en:'Security verification'}[language] || 'Security verification'
  const holder=document.createElement('div');const cancel=document.createElement('button');cancel.type='button';cancel.className='outline-button';cancel.textContent={pt:'Cancelar',es:'Cancelar',en:'Cancel'}[language] || 'Cancel'
  dialog.append(title,holder,cancel);document.body.append(dialog);dialog.showModal()
  let widget;let finished=false
  const finish=(error,token)=>{if(finished)return;finished=true;clearTimeout(timer);if(widget!==undefined)window.turnstile.remove(widget);dialog.close();dialog.remove();previous?.focus();if(error)reject(new Error('Verificação não concluída. Tente novamente.'));else resolve(token)}
  const timer=setTimeout(()=>finish(true),120000)
  cancel.onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(true)}
  try {widget=window.turnstile.render(holder,{sitekey:key,action:'lead',language,callback:token=>finish(false,token),'error-callback':()=>finish(true),'expired-callback':()=>finish(true)})} catch {finish(true)}
 })
}
