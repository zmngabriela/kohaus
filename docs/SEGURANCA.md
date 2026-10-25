# KOHAUS — segurança, ativação e resposta a incidentes

Revisão iniciada em 23/10/2026, concluída tecnicamente em 24/10/2026. Trabalhar na dev; **não publicar este pacote sem a sequência de ativação abaixo**. Não é certificação, pentest completo ou promessa de invulnerabilidade.

## Estado e evidências

| Controle | Estado nesta revisão |
| --- | --- |
| HTTPS de `kohaus.pages.dev` | Respondeu HTTP 200 por HTTPS; cabeçalhos novos ainda não publicados |
| Acesso anônimo ao PROD | Consulta somente leitura: um imóvel publicado, nenhuma linha privada retornada pelas consultas testadas. Não prova todas as políticas nem acesso autenticado |
| Dependências | Auditoria inicial: 6 pacotes sinalizados (1 crítico, 3 altos, 2 moderados); correções compatíveis instaladas; revalidar com `npm audit` |
| Segredos no Git | 153 blobs alcançáveis pelas branches/remotos locais e os arquivos de trabalho não ignorados examinados por padrões; nenhum resultado. Cobertura limitada, não inclui todo segredo possível, forks, backups, logs externos ou arquivos locais ignorados |
| Permissões SQL | Migrações preparadas e testadas em PostgreSQL isolado (PGlite com schemas Supabase simulados); **não aplicadas ao DEV/PROD** |
| Arquivos off-market | Bucket privado + assinatura temporária preparados; **não ativos no Supabase** |
| Formulários | Gateway Pages `/api/leads`, Turnstile e limite atômico 5 tentativas válidas/minuto/IP preparados; **precisam de secrets e D1** |
| Alertas de login/download | **Não ativados**. Dependem do acesso aos logs/recursos dos provedores e da configuração abaixo |
| Backup diário | Workflow e script preparados, desativados por padrão; **nenhuma cópia remota criada nem restauração validada** |
| Responsável pelos alertas | `guilhermekonnin@me.com` (informado pela Gabriela); não publicado no aviso legal |

Não foi encontrada execução de HTML bruto (`dangerouslySetInnerHTML`) ou montagem de SQL com texto de formulário no frontend. React escapa os textos; as operações usam o SDK/PostgREST e parâmetros. Isso não elimina todo XSS ou SQL injection possível. URLs externas passam por lista de protocolos; SVGs não são aceitos como upload. O backend é Supabase; PHP/Python não servem este site. Node é ferramenta de build; Pages Functions usa o runtime Workers.

## Correções importantes

1. Remover provisionamento automático de admin no Auth. Uma identidade não é uma autorização. Preservar membros atuais, revisar cada um e cadastrar futuros membros explicitamente no SQL Editor.
2. Guardas RLS restritivas para leitores/editores: viewers não gravam; não membros não leem o CRM; navegador não altera a tabela de membros.
3. Bucket `property-media` privado: anônimo só consegue assinar/ler arquivos referenciados por imóveis `active`/`closed` não off-market. Membros podem ler a mídia interna. URLs assinadas expiram em 1 hora e a tela renova em 30 minutos. Não salvar a assinatura no banco.
4. MIME/20 MB no bucket e validação de tipo, tamanho e assinatura de imagem no navegador. A validação do navegador não é barreira contra cliente malicioso; MIME do Storage também não é antivírus. Conteúdo privado não deve ser usado como foto pública.
5. `/api/leads`: validação por lista de campos, tamanho máximo real de 20 KB, Turnstile validado no servidor com hostname/action, limite atômico em D1 e secrets só no servidor. Origin é defesa complementar, não autenticação. Sem configuração, falha fechado, sem gravar direto no Supabase.
6. Cabeçalhos CSP, anti-frame, nosniff, referrer e HSTS em `_headers`. `style-src unsafe-inline` é necessário pelos estilos inline atuais; scripts não permitem `unsafe-inline`/`unsafe-eval`. Fotos HTTPS externas ainda são permitidas para compatibilidade. Revisar depois de migrar todo acervo.
7. `robots.txt` solicita que crawlers de IA conhecidos não rastreiem. **Bots hostis podem ignorar isso; não é controle de acesso.** Nenhum dado de cliente deve estar público em primeiro lugar.

## Sequência de ativação (primeiro DEV, depois PROD)

1. Confirmar backup e revisar `dashboard_users` no SQL Editor. Conferir Guilherme e Gabriela; remover acessos indevidos somente após confirmação. Manter signup público e acesso anônimo ao Auth desativados. Nunca criar uma service key para o frontend.
2. Aplicar `supabase/migrations/202610232100_security_boundaries.sql` no DEV. Não reaplicar o schema completo no PROD. Para novos membros, depois de criar/convidar no Auth, executar como administrador (substituir o UUID real):
   ```sql
   insert into public.dashboard_users(user_id,email,display_name,role)
   select id,email,split_part(email,'@',1),'admin'
   from auth.users where id = 'UUID-DO-USUARIO'::uuid
   on conflict(user_id) do nothing;
   ```
   Usar `editor`/`viewer` quando apropriado. Nunca inserir uma lista inteira de usuários automaticamente. O papel de dono da organização Supabase é distinto do CRM.
3. Cloudflare → Turnstile: criar widget Managed para os hostnames exatos de DEV; outro para PROD. No Pages, definir `VITE_TURNSTILE_SITE_KEY` (pública, build) e `TURNSTILE_SECRET_KEY` (Secret, servidor).
4. Cloudflare → D1: criar banco exclusivo de contadores do ambiente e executar `config/cloudflare/rate-limits.sql`. Pages → Settings → Bindings: vincular como `RATE_LIMITS`. Não contém contatos, apenas hash salgado do IP, minuto e contador. A limpeza é realizada em requisições posteriores, removendo janelas com mais de 24h; adicionar limpeza agendada no provedor se exigir retenção rígida.
5. Secrets/variáveis de Pages Functions por ambiente: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (secret/service_role **somente servidor**), `RATE_LIMIT_SALT` (secret aleatório forte) e `ALLOWED_HOSTS` (hostnames exatos separados por vírgula, sem protocolo). PROD: `kohaus.pages.dev` por enquanto. Não usar wildcard de previews nem compartilhar secrets DEV/PROD. O frontend continua usando a publishable key.
6. Fazer build/deploy DEV com Node `.nvmrc` (22.23.4). Se `NODE_VERSION` estiver fixado no painel, atualizar também. Localmente `vite` não executa Pages Functions: para envio real usar preview Pages configurado ou Wrangler Pages local com bindings e `.dev.vars` não versionado. Sem esses recursos, o envio fica indisponível; não contornar usando insert direto.
7. Testar os três formulários (contato, proprietário, imóvel) com dados fictícios. Confirmar gravação DEV, consentimento, falha de CAPTCHA, limite, erro de serviço e reenvio. Depois aplicar `202610232120_protected_leads.sql` para revogar INSERT direto de navegadores e testar novamente. O endpoint usa secret server-side e valida todas as entradas porque esse segredo ignora RLS.
8. Com o frontend de URLs assinadas no ar, aplicar `202610232110_private_media.sql`. Conferir catálogo, upload, edição, URLs conhecidas de off-market e arquivo órfão. Fotos antigas precisam ter `path`; registros sem path devem ser auditados/migrados, não adivinhar arquivos. Links públicos antigos podem continuar em caches ou cópias de terceiros: purgar cache, mover/excluir versões antigas conforme revisão. Não prometer revogação de material já baixado. Uma assinatura já emitida dura até expirar.
9. Repetir verificações com usuário admin, viewer e usuário Auth sem membership no DEV. O teste PGlite não substitui os serviços reais de Auth, Storage e PostgREST. Confirmar faturas, calendário e PDFs sob a CSP.
10. Só depois repetir a sequência em PROD e publicar main. Não apagar dados reais nem copiar dados pessoais para DEV. Para rollback de frontend, manter um build compatível com o bucket privado e com o gateway; não reabrir tabelas/bucket para contornar falhas.

## Login, senhas e administração

- Supabase → Authentication → Sign In/Providers: senha mínima de 12 caracteres no servidor, não apenas no formulário. Preferir senhas únicas e gerenciador. Ativar bloqueio de senhas vazadas se o plano suportar (Pro ou superior na documentação consultada).
- Configurar SMTP próprio, limites de autenticação e proteção CAPTCHA do Supabase com integração correspondente no login/recuperação antes de ligar a exigência. O Turnstile de leads deste pacote **não protege automaticamente `/auth/v1`**.
- MFA nas contas administrativas GitHub, Cloudflare e Supabase. MFA dos usuários do CRM necessita fluxo de enrollment/challenge e políticas AAL2 testadas; ainda não implementado. Não ligar RLS AAL2 sem preparar esse fluxo, pois bloquearia todos.
- Evitar links de convite repetidos; recuperação tem link de uso único e prazo. Nunca registrar URL completa com token. Limitar redirects a hostnames próprios de cada ambiente.
- Restringir criação de membros aos responsáveis; revisar acessos mensalmente e revogar imediatamente ao encerrar relação profissional.

## Cloudflare, bots e limites

`pages.dev` não é uma zona de domínio que controlamos. Regras WAF/Bot Fight Mode configuradas em uma zona própria dependem de domínio próprio ativo/proxy e do plano. Além disso, chamadas diretas a `*.supabase.co` **não passam pelo WAF do site**. Não dizer que um limite do site protege o banco.

Quando o domínio estiver conectado: Security → Security rules → criar limites por rota com uma referência inicial de 120 leituras/min/IP para catálogo (ajustar conforme tráfego legítimo) e desafio/bloqueio temporário; usar limites menores nos endpoints de escrita. Separar vídeo/imagens para não bloquear o hero. Os intervalos e ações disponíveis dependem do plano; confirmar no painel. Evitar bloqueio permanente por IP e considerar redes compartilhadas. Bloquear crawlers de IA via controles de bots da zona quando disponíveis; User-Agent isolado é falsificável.

O limite de `/api/leads` não protege leituras de catálogo, downloads diretos do Storage ou tentativas diretas de Auth. Para controle central de todo download e login será necessário gateway específico e bloquear acesso direto, com nova arquitetura e testes. Para catálogo público, extração não pode ser impedida totalmente; manter somente informação realmente pública.

## Alertas (ativação pendente)

Destinatário autorizado: **guilhermekonnin@me.com**. Sem envio de dados de clientes no assunto/corpo.

- Supabase Auth logs: alertar a partir de 10 falhas/5 minutos por conta ou IP e também aumento global. Não usar bloqueio de conta infinito, que permitiria negação de serviço contra o Guilherme.
- Storage/CDN logs: referência inicial 200 downloads/5 minutos por usuário/IP ou volume anormal de bytes; ajustar com uso real. É preciso coletar logs do Supabase/Storage, não só do Cloudflare Pages.
- Cloudflare: configurar Notifications para eventos de segurança/erros disponíveis no plano e testar recebimento. Os alertas granulares podem exigir plano/log drain ou coletor externo. Nenhum coletor de logins/downloads foi conectado nesta revisão.
- Falha/ausência de backup por mais de 26h: alertar. O workflow preparado envia falha via SMTP quando configurado; agendamento GitHub não garante execução pontual, portanto configurar também monitor externo de ausência.
- GitHub Actions/Dependabot: habilitar notificações, secret scanning/push protection quando disponíveis. O workflow testa dependências e código semanalmente e em push/PR; só agenda a partir do momento em que estiver na branch padrão.

## Backups diários (preparados, NÃO ativos)

O Free do Supabase não fornece o mesmo recurso de backups baixáveis do Pro. Backups de banco não incluem os bytes dos arquivos Storage. Precisamos de banco + Storage + código e de um teste de restauração.

1. Guilherme escolhe destino em **outra conta/provedor**, com criptografia, MFA e retenção imutável/Object Lock quando disponível. Não usar bucket público nem o próprio projeto como única cópia. RPO proposto: 24h; RTO alvo: 8h, **ainda não comprovado**.
2. Criar credencial de leitura do banco e credenciais S3 para Storage com menor escopo possível. Acesso a Auth contém dados sensíveis; restringir ao job. Credencial do destino limitada ao prefixo de backups, sem poder apagar versões bloqueadas. Não enviar segredos pelo chat.
3. Gerar destinatário `age`; guardar chave privada de recuperação offline com o dono, não no GitHub/runner. Configurar rclone `source` (S3 Supabase) e `vault` (crypt sobre destino independente). A chave do crypt deve estar em cofre independente e cópia offline. O runner precisa dela; a proteção contra exclusão/compromisso do runner vem também do Object Lock e conta separada.
4. GitHub environment `backup`: configurar os secrets listados em `.github/workflows/backup.yml`, certificado CA do banco e SMTP de alertas. Confirmar que a versão `pg_dump` instalada é igual ou superior à do servidor; atualizar a instalação do job se necessário. Não relaxar a verificação TLS para contornar erro.
5. Executar manualmente antes de ativar. `scripts/security/backup.sh` exporta schemas public/auth/storage, criptografa o dump em stream, exporta Git e copia bytes das fotos para `vault`. Nunca publica backups como artefatos abertos. Não exporta configurações do painel, secrets do provedor nem papéis globais do Postgres: manter inventário e credenciais no cofre. Rever necessidade de outros buckets/schemas antes de adotá-lo.
6. Restaurar em projeto vazio isolado com acesso restrito: importar schema/dados com orientação do Supabase (objetos gerenciados de auth/storage exigem cuidado), recriar usuários/roles necessários, recuperar arquivos, conferir contagens, logins e fatura. Não restaurar em cima da produção para testar. Registrar duração e resultado, e descartar ambiente de teste de forma segura conforme retenção.
7. Somente após validar, definir repository variable `KOHAUS_BACKUP_ENABLED=true`; agenda diária 03:37 UTC. Confirmar horário local conforme mudança de horário de verão. Retenção sugerida: 30 diárias + 12 mensais, sujeita à minimização de dados e custos; configurar lifecycle no destino e revisão jurídica. Job não apaga cópias.
8. Testar restauração mensal e após migração relevante. Se falhar, tratar como incidente operacional; um arquivo presente não é prova de recuperabilidade.

## Resposta a incidente

1. Registrar hora UTC da descoberta, sistema, impacto aparente e responsável. Comunicar Guilherme pelo canal acordado; não difundir dados pessoais. Preservar evidências em local restrito e não apagar logs.
2. Conter o componente afetado: suspender endpoint/gateway ou acesso CRM, revogar membership/sessões comprometidas e rotacionar secrets no cofre. Se houver exposição no Supabase, corrigir RLS/revogar grants ou tornar bucket privado; tirar só o site do ar não bloqueia a API direta. Não apagar tabelas nem restaurar por cima das evidências.
3. Contatar suporte do provedor afetado (Supabase, Cloudflare, GitHub) por canais oficiais e responsável técnico. Não compartilhar service keys com supostos agentes de suporte. Canal técnico suplente/telefone do responsável: **PENDENTE de definição**.
4. Identificar quais categorias de dados, titulares, intervalo e acessos foram afetados. Avaliar risco; documentar também a decisão de não notificar. Para brecha de dados pessoais, o responsável deve notificar a autoridade competente sem demora indevida e, quando possível, em até **72 horas após tomar conhecimento**, salvo se improvável risco aos direitos/liberdades. Alto risco pode exigir comunicar os afetados sem demora indevida. Consultar assessoria jurídica/AEPD; não esperar concluir toda a perícia para avaliar o prazo.
5. Corrigir, testar em ambiente isolado, restaurar backup validado se necessário e reabrir gradualmente. Verificar persistência do invasor e monitorar reincidência. Fazer revisão da causa e ações preventivas.

Modelo de comunicação (preencher com fatos confirmados): “Em [data], identificamos [natureza do incidente]. Os dados potencialmente afetados são [categorias]. Adotamos [medidas]. Recomendamos [ações pertinentes]. Para esclarecimentos, contate [canal].” Não afirmar ausência de impacto sem evidência.

## Referências oficiais consultadas

- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/auth/password-security
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/turnstile/get-started/
- https://developers.cloudflare.com/waf/rate-limiting-rules/
- https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/11-brechas-de-datos-personales/FAQ-0233-a-quien-hay-que-notificar-las-brechas-de-datos-personales
- https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758 (art. 10)

Os textos legais seguem estrutura informativa baseada nas obrigações aplicáveis, sem copiar concorrentes. “Corhouse Real Estate” foi mantido como nome informado e destacado para confirmar a grafia/razão social perante KOHAUS. Não há NIF, endereço ou registro inventados. Revisão jurídica e confirmação dos dados continuam pendentes.

## Repetir a validação local

Com Node indicado em `.nvmrc`, executar `npm ci`, `npm test`, `npm run test:security`, `npm run lint`, `npm run build` e `python3 scripts/security/scan-secrets.py`. `test:security` usa PostgreSQL isolado em memória, sem tocar DEV ou PROD. O lint mantém avisos anteriores de React; não confundir ausência de erro de build com ausência de todo risco.
