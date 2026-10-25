# Migrações incrementais

`../schema.sql` é o bootstrap consolidado para instalar um projeto novo. Os arquivos
desta pasta atualizam projetos existentes; eles não são cópias descartáveis do schema.
O schema consolidado inclui o estado final das mudanças, mas não substitui a sequência
incremental em um banco que já contém dados.

Migrações disponíveis:

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
