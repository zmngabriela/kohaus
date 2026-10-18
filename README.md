# KOHAUS — site e CRM

React/Vite com Supabase para autenticação, banco e arquivos.

## Processo oficial
Leia [docs/AMBIENTES.md](docs/AMBIENTES.md) para criar produção, configurar a Vercel e seguir o fluxo de desenvolvimento, testes e publicação.

- DEV: projeto Supabase atual, preservado com os dados de teste.
- PROD: projeto independente a criar/configurar; não copiar dados de DEV.
- Instalação inicial: [supabase/schema.sql](supabase/schema.sql).
- Alterações futuras de banco: migrações incrementais em supabase/migrations e atualização do schema consolidado.
- Contas Auth são provisionadas como administradores pelo schema atual. Cadastro público de usuários deve ficar desativado.

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
O build exige configuração válida e impede mistura de ambientes na Vercel.
.env.local e segredos não entram no Git.
