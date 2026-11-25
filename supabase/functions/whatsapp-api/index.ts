import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createWhatsappHandler } from './handler.js'
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
Deno.serve(createWhatsappHandler({db,env:key=>Deno.env.get(key)}))
