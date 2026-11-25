import { createServer } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { readMailAccounts } from './settings.mjs'
import { createMailApi } from './api.mjs'
// Explicit activation; secrets never use a VITE_ prefix.
if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing server database configuration.')
const accounts=readMailAccounts(process.env.SPACEMAIL_ACCOUNTS_JSON)
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const handle=createMailApi({db,accounts,enabled:process.env.SPACEMAIL_SEND_ENABLED==='true',makeTransport:account=>nodemailer.createTransport({host:'mail.spacemail.com',port:465,secure:true,auth:{user:account.email,pass:account.password},logger:false,debug:false,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000})})
const allowedOrigins=new Set((process.env.SPACEMAIL_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(','))
createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff')
 const finish=(code,body)=>{res.writeHead(code);res.end(JSON.stringify(body))}
 if(req.method!=='POST' || req.url!=='/api/mail') return finish(404,{error:'NOT_FOUND'})
 if(req.headers.origin && !allowedOrigins.has(req.headers.origin)) return finish(403,{error:'ORIGIN_REJECTED'})
 try {
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>24000)return finish(413,{error:'TOO_LARGE'})}
  const token=/^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1]
  const response=await handle({token,input:JSON.parse(body)})
  finish(response.status,response.body)
 }catch{finish(500,{error:'MAIL_UNAVAILABLE'})}
}).listen(8788,'127.0.0.1',()=>console.log('Mail API on 127.0.0.1:8788. Sending is disabled unless explicitly configured.'))
