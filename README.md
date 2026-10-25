# KOHAUS — site e CRM

React/Vite com Supabase para autenticação, banco e arquivos.

## Processo oficial
Leia [docs/AMBIENTES.md](docs/AMBIENTES.md) para criar produção, configurar o Cloudflare Pages e seguir o fluxo de desenvolvimento, testes e publicação.

- Branch dev: trabalho e Preview com Supabase DEV, preservado com os dados de teste.
- Branch main: versão aprovada; merge dispara novo build Production no Cloudflare Pages quando configurada.
- PROD: projeto independente a criar/configurar; não copiar dados de DEV.
- Instalação inicial: [supabase/schema.sql](supabase/schema.sql).
- Alterações futuras de banco: migrações incrementais em supabase/migrations e atualização do schema consolidado.
- Contas Auth não recebem acesso ao CRM automaticamente. Um administrador deve autorizar cada conta em `dashboard_users`. Cadastro público deve ficar desativado.

## Local
Copie .env.example para .env.local e configure somente o Supabase DEV.

    npm ci
    npm run dev

## Verificação
    npm test
    npm run lint
    npm run build
    npm run test:integration

Vitest usa dados isolados; o teste de integração faz apenas leituras no DEV configurado.
O build exige configuração válida e impede mistura de ambientes no Cloudflare Pages.
.env.local e segredos não entram no Git.

## Segurança
Antes de publicar este pacote, siga [a ordem de ativação](docs/SEGURANCA.md): Turnstile, função de leads, D1 e migrações. Alertas e backups exigem configuração; os arquivos sozinhos não os ativam.
