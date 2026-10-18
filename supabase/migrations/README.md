# Migrações incrementais
O bootstrap atual é ../schema.sql. Não existe migração incremental pendente.
Para futuras alterações, criar YYYYMMDDHHMM_descricao.sql e atualizar o schema consolidado.
Testar no DEV; revisar, fazer backup e aplicar manualmente no PROD, registrando a execução.
Nunca copiar dados DEV para PROD nem reescrever arquivos já aplicados.
Processo completo: ../../docs/AMBIENTES.md.
