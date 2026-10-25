# Cadastro de imóveis — revisão de 25/10/2026 (DEV)

## Ativação

Executar **somente no Supabase DEV**, antes de testar esta versão:
`supabase/migrations/202610251000_property_workflow.sql`.
A migração exige as tabelas existentes do CRM e `property_private`. Não reaplicar o schema completo em produção. Há outras mudanças de segurança e IA pendentes: ver SEGURANCA.md e GROQ.md.

## Comportamento

- Salvar mostra progresso, bloqueia submissões simultâneas e exibe confirmação. Cada novo cadastro mantém um ID durante suas tentativas; o RPC trata repetição do mesmo ID sem inserir outro imóvel. Um cadastro novo aberto em outra sessão é outra operação. Duplicatas históricas não são removidas automaticamente.
- Novas referências são geradas no Postgres com sequência e índice único: KH0115, KH0116 etc. As antigas permanecem. Números podem ter intervalos após falhas/exclusões; não são reutilizados pela sequência. Não prometer numeração contígua. O modo de teste local tem contador próprio; a garantia entre vários usuários está no banco.
- Destino/cidade vira texto livre. Filtros mostram cidades presentes no catálogo carregado (ativos e fechados publicados), com normalização de espaços/maiúsculas/acentos para evitar opções repetidas. O CRM inclui também rascunhos. Destinos conhecidos mantêm seus identificadores para compatibilidade.
- Proprietário é um vínculo privado a `dashboard_clients`, guardado em `property_private.owner_client_id`. Nunca entra na view pública. Pode escolher cliente existente ou abrir o cadastro completo de cliente pelo botão ao lado da seleção, retornando ao imóvel com o vínculo preenchido. O cliente é salvo ao salvar o cadastro completo; cancelar depois o imóvel não apaga o cliente.
- Excluir fica no editor, exige confirmação e remove o registro do banco. Visitas/tarefas seguem existentes com FK nula; endereço/vínculo privado são apagados em cascata. Faturas preservam seus dados próprios. Fotos ficam no Storage para evitar apagar arquivos compartilhados ou evidências por acidente; com a migração de mídia privada ativa, arquivos não referenciados deixam de ser públicos. Publicações em portais externos não são removidas por esta ação: retirar esses anúncios separadamente.

## Revisão manual na DEV

1. Cadastrar imóvel com uma cidade nova; clicar repetidamente em salvar. Conferir apenas um registro e a referência gerada após atualizar.
2. Criar outro imóvel simultaneamente em uma segunda sessão e confirmar referências diferentes.
3. Selecionar proprietário existente, salvar e reabrir. Depois testar “Cadastrar proprietário” sem perder o rascunho do imóvel.
4. Conferir a cidade nova nos filtros e pesquisar por ela.
5. Excluir um imóvel fictício e conferir ausência no CRM/catálogo e preservação das visitas/tarefas.

Testes locais incluem repetição de submissão na interface, retry do RPC, referência inicial, vínculo privado e exclusão em PostgreSQL isolado. Nada foi aplicado remotamente por estes testes.
