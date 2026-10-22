# KOHAUS — desenvolvimento, produção e publicação

## Decisão e estado atual
- Banco Supabase atual: desenvolvimento. Preservar dados fictícios, usuários e fotos.
- Produção: criar um projeto Supabase novo e independente, sem importar cadastros.
- Código preparado para essa separação; projeto de produção, credenciais e publicação ainda dependem da configuração abaixo.
- Nunca executar limpeza, restauração ou cópia de dados em produção para testar.
- O ID público do projeto de desenvolvimento está em config/environments.json. Não é uma credencial.
- Supabase Auth, tabelas, Storage e chaves são independentes em cada projeto.

## 1. Criar o Supabase de produção
1. Guilherme cria/acessa sua conta em https://supabase.com/dashboard e cria a organização KOHAUS. Ele permanece Owner. Em Organization Settings > Team, convida Gabriela com sua própria conta (Administrator para configurar o projeto). Não compartilhar senhas. Acesso à organização Supabase é separado dos usuários do CRM.
2. Identificar o projeto atual como KOHAUS DEV (renomear é opcional; não muda sua URL).
3. Escolher New project, na organização desejada; nome sugerido: KOHAUS PROD.
4. Escolher uma região europeia próxima dos usuários e uma senha forte para o banco. Guardar a senha em um gerenciador; não enviar ao chat nem ao Git.
5. Conferir o plano e eventuais custos apresentados antes de criar.
6. Esperar o projeto ficar pronto. Em Authentication, nas configurações de cadastro/provedores, DESATIVAR a opção que permite novos cadastros públicos. Manter login por e-mail habilitado.
   IMPORTANTE: o schema atual provisiona usuários Auth como administradores do CRM. Só criar contas internas autorizadas pelo painel administrativo.
7. No SQL Editor do projeto NOVO, executar supabase/schema.sql inteiro. Confirmar o nome/ID do projeto antes de executar.
   Esse arquivo instala tabelas, políticas, funções e bucket. Não contém imóveis/clientes de demonstração. Cria uma configuração vazia de emissor de faturas.
8. Em Authentication > Users, criar as contas internas autorizadas. Cada pessoa deve definir/receber sua senha por um processo seguro. As senhas e IDs do DEV não são copiados.
9. Conferir public.dashboard_users: cada conta criada deve possuir o acesso esperado. O provisionamento atual começa em admin; revisar os papéis antes de liberar acesso.
10. Conferir Storage: bucket property-media. Não copiar as fotos de DEV.
11. No diálogo Connect / Settings > API Keys, obter Project URL, publishable key (ou chave anon legada) e Project ID.
    NUNCA usar secret key, service_role ou senha do banco no frontend.
12. Em Authentication > URL Configuration, configurar Site URL com o endereço HTTPS de produção do Pages (depois, o domínio oficial) e somente os redirects necessários para os fluxos de autenticação usados. No DEV, manter localhost e o endereço estável do preview dev; não autorizar previews no projeto PROD. Se usar convites/recuperação por e-mail, configurar SMTP próprio e validar esses fluxos antes de liberar acesso.
13. Revisar Security Advisor e as políticas RLS. O schema foi inspecionado no repositório; uma instalação limpa só estará validada depois de executada e conferida no novo projeto.

## 2. Cloudflare Pages e variáveis
Workers & Pages > projeto Pages > Settings > Variables and Secrets. Criar valores diferentes por ambiente; não marcar os mesmos valores para todos os ambientes.

| Variável | Local e Preview | Production |
| --- | --- | --- |
| VITE_APP_ENV | development | production |
| VITE_SUPABASE_URL | URL do projeto atual DEV | URL do novo PROD |
| VITE_SUPABASE_PUBLISHABLE_KEY | publishable/anon do DEV | publishable/anon do PROD |
| VITE_SUPABASE_PROPERTY_MEDIA_BUCKET | property-media | property-media |
| KOHAUS_EXPECTED_SUPABASE_REF | não é necessária | Project ID do PROD |

A URL normalmente é https://PROJECT_ID.supabase.co. KOHAUS_EXPECTED_SUPABASE_REF recebe somente PROJECT_ID.
VITE_* fica visível no navegador. Apenas configuração pública pode usar esse prefixo.
CF_PAGES e CF_PAGES_BRANCH são fornecidas pelo Cloudflare; não cadastrar manualmente. A branch de produção registrada em config/environments.json é main e deve coincidir com a configuração do painel.
Na configuração atual são suportados projetos Supabase hospedados com URL padrão supabase.co.

Conectar somente o repositório zmngabriela/kohaus em Workers & Pages > Create application > Pages > Connect to Git (não criar um Worker). Antes do primeiro deploy, preencher Production com os dados do PROD; depois preencher Preview com DEV.

Framework: React (Vite), ou configuração manual. Build: npm run build. Output: dist. Root: raiz do repositório. Node: 22.16.0, fixado em .nvmrc (se definir NODE_VERSION no painel, usar o mesmo valor nos dois ambientes). O Pages instala dependências usando package-lock.json; localmente usar npm ci.

Configurar previews apenas para dev inicialmente. Habilitar proteção de previews com Cloudflare Access para restringir o site de teste à equipe. Um endereço de preview não é privado por si só.

O Pages oferece fallback de SPA quando não há 404.html na raiz; este projeto não precisa de regras de redirecionamento adicionais. Não há dependência de Vercel Functions.
Production Branch: main. A branch permanente dev gera Preview usando o Supabase DEV. Trabalhar na dev por padrão; publicar na main somente após aprovação.
Depois de alterar variáveis, gerar um NOVO build de produção. Não promover um artefato Preview compilado com DEV para produção.
A proteção no build falha se Production apontar ao DEV, Preview apontar ao PROD ou faltar configuração. Não remover essa proteção para fazer o deploy passar.

## 3. Desenvolvimento local
- .env.local contém exclusivamente o projeto DEV, com VITE_APP_ENV=development. Já ajustado neste checkout.
- Outros computadores: copiar .env.example para .env.local e preencher os valores DEV.
- npm ci
- npm run dev
- npm test: testes isolados em memória/localStorage de teste, sem consultar o Supabase.
- npm run build: compila usando a configuração local DEV; isso não publica o site.
- npm run test:integration: leitura do Supabase configurado em .env.local; não cria nem apaga dados.
- npm run preview: serve o build mais recente; não representa automaticamente produção.

Fora dos testes automatizados, ausência de configuração deve falhar; nunca simular um CRM funcional em localStorage em produção.

## 4. Mudanças futuras
1. Trabalhar na branch permanente dev, atualizada com o remoto. Branches temporárias codex/nome-da-alteracao são opcionais para trabalhos paralelos e retornam à dev.
2. Implementar e testar no DEV. Nunca copiar dados reais para DEV para reproduzir problemas.
3. Executar npm test, npm run lint, npm run build e, quando afetar banco/acesso, npm run test:integration.
4. Fazer commits por assunto na dev e push para origin/dev para gerar o Preview.
5. Conferir o Preview em computador e celular. Abrir PR de dev para main para revisão; aguardar aprovação antes do merge.
6. Aplicar migrações de banco no PROD apenas após aprovação/revisão e backup adequado.
7. Após aprovação, fazer merge de dev na main. O Cloudflare Pages deve executar um NOVO build da main com variáveis Production e Supabase PROD; verificar o resultado em produção. Não promover o build Preview diretamente.
8. Manter dev após o merge e sincronizá-la com main quando necessário, preservando alterações pendentes. Em falha do frontend, voltar ao deploy anterior. Rollback do site não desfaz alterações no banco.

## 5. SQL e migrações
- supabase/schema.sql é o estado consolidado para instalar um projeto novo.
- Novas mudanças devem ter migração incremental em supabase/migrations/YYYYMMDDHHMM_nome.sql e atualização equivalente no schema consolidado.
- Testar cada migração primeiro no DEV. Registrar data, projeto e resultado de execução no registro de migrações da equipe.
- Não editar uma migração já aplicada. Criar outra para corrigir.
- Não há aplicador automático de migrações neste repositório: execução pelo SQL Editor é manual e precisa ser registrada.
- Não reaplicar o bootstrap completo em produção para cada publicação.
- Nenhum script de limpeza foi criado.

## 6. Conferência antes de liberar ao Guilherme
- Verificar Project ID do PROD e variáveis Production.
- Login funciona e usuário sem permissão não entra no CRM.
- Catálogo começa vazio; não aparecem os oito imóveis de DEV.
- Conferir policies/RLS no painel. Uma consulta anônima vazia em banco vazio NÃO prova que a proteção funciona.
- Testar cadastro controlado de imóvel, upload, edição e formulário; verificar no PROD e conferir que nada apareceu no DEV.
- Validar que endereço privado, clientes, tarefas, visitas e faturas não são retornados anonimamente.
- Validar tratamento público de off-market e links de fotos.
- Conferir faturas, dados do emissor, textos legais preliminares, domínio, HTTPS e configuração de recuperação de acesso antes do lançamento público.
- Planejar backups do banco e arquivos do Storage; verificar cobertura/retenção do plano contratado.
- Remover somente registros de validação identificados, com autorização; não fazer limpeza geral.

## Referências
- https://supabase.com/docs/guides/deployment/managing-environments
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/guides/getting-started/api-keys
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/branch-build-controls/
- https://supabase.com/docs/guides/platform/access-control

## Registro desta preparação
- 2026-10-19: configuração migrada de Vercel para Cloudflare Pages; bloqueio por branch no build.
- SQL de instalação único: supabase/schema.sql. Nenhum dado foi apagado ou copiado.
- 2026-10-22: Gabriela informou ter executado o SQL no KOHAUS PROD. Validação remota do PROD pendente de Project URL e publishable key; ainda não confirmado por testes neste projeto. O banco local Docker não estava disponível para ensaio de instalação.
- 2026-10-22: 66 testes passaram, build passou e integração anônima no DEV passou. Lint sem erros, com avisos existentes. Node fixado em .nvmrc para o build remoto.
- Antes de conectar o repositório, publicar estes ajustes na branch correspondente: alterações apenas locais não chegam ao Cloudflare.

## Cookies e Google Analytics
- ID de medição: G-YZZQDVVQLX. ID público, sem chave secreta.
- Coleta desligada por padrão. Habilitar VITE_ANALYTICS_ENABLED=true somente em Production após aprovação; Preview/local permanecem false.
- A tag só carrega com consentimento de análise, em ambiente production e em páginas públicas. Dashboard e editor não são medidos.
- No fluxo Web do GA4, DESATIVAR a medição otimizada automática antes de ativar: o código controla os pageviews, evitando duplicações e captura automática de formulários/URLs. Manter Google Signals e personalização publicitária desligados.
- Esta primeira versão mede páginas por tipo e idioma; não envia nomes, mensagens, contatos, busca livre ou identificadores do CRM. Também não envia parâmetros de campanhas nem o referrer nesta versão.
- Escolhas guardadas por 180 dias em kohaus-cookie-consent-v1. A retirada bloqueia a medição, remove cookies _ga acessíveis e recarrega para descarregar a tag. Não apaga dados anteriormente enviados ao Google.
- Testar primeiro a interface no localhost. Para testar entrega real, usar propriedade GA4 separada de teste; não habilitar a coleta de produção no DEV.
- Antes do lançamento, completar a identificação do responsável e revisar retenção, cookies e privacidade. Os textos legais continuam preliminares.
