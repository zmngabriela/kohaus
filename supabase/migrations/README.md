# Migrações incrementais

`../schema.sql` é o bootstrap consolidado para instalar um projeto novo. Os arquivos
desta pasta atualizam projetos existentes; eles não são cópias descartáveis do schema.
O schema consolidado inclui o estado final das mudanças, mas não substitui a sequência
incremental em um banco que já contém dados.

Migrações disponíveis:

- `202610281500_featured_properties.sql`: publica a seleção manual de destaques e limita
  a quatro vagas únicas para imóveis ativos, fora de off-market. Aplicar primeiro no DEV
  antes de testar a home. Não seleciona imóveis automaticamente; marcar e salvar os
  destaques no editor. Aplicação em DEV/PROD ainda não confirmada.

- `202610232100_security_boundaries.sql`: reforça acesso ao CRM e validação de leads.
- `202610232110_private_media.sql`: restringe fotos a URLs assinadas e anúncios publicados.
- `202610232120_protected_leads.sql`: direciona gravações de leads pelo gateway protegido.
- `202610241000_property_ai.sql`: cria o limite de uso do assistente de texto de imóveis.
- `202610251000_property_workflow.sql`: associa proprietários e garante gravação transacional
  do imóvel e do endereço privado.
- `202610252100_invoice_delete.sql`: permite que editores/admins excluam faturas, mantendo
  a permissão de somente leitura para viewers.

A presença de um arquivo aqui não confirma se ele já foi aplicado em DEV ou PROD. Confira
o registro de execução de cada ambiente antes de aplicar; não reaplique migrações já
executadas nem use o bootstrap consolidado para atualizar um banco existente. Teste no
DEV, faça backup e aplique manualmente em PROD, registrando data, projeto e resultado.

Para novas mudanças, crie `YYYYMMDDHHMM_descricao.sql`, atualize o schema consolidado e
documente a ordem/dependências. Nunca copie dados de DEV para PROD nem reescreva arquivos
já aplicados.

Processo completo: [docs/AMBIENTES.md](../../docs/AMBIENTES.md).

- `202611190020_property_country.sql`: adiciona país, preserva Município como cidade,
  atualiza a gravação transacional e a view pública. Aplicar em DEV antes de publicar
  o frontend e depois em PROD. Não altera cidades existentes nem inventa municípios.

Execução confirmada: `202611190020_property_country.sql` aplicada em 19/11/2026
no DEV `nnrfluzbsbdngxklomyp`; coluna `country` conferida em `dashboard_properties`
e `public_properties`. Produção separada: execução ainda não confirmada.

- `202611211200_commercial_activity.sql`: histórico imutável de visitas e tarefas,
  vinculado aos clientes, proprietários, imóveis e leads. Depende da associação de
  proprietários (`202610251000_property_workflow.sql`). Aplicar antes do frontend.
  Registros existentes recebem uma fotografia inicial identificada como tal;
  mudanças anteriores não são reconstruídas. Usuária informou em 21/11/2026 que
  executou o SQL; ambiente não especificado e execução não verificada via CLI.
