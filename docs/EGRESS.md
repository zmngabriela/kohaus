# Consumo de transferência (egress)

Armazenamento é o espaço ocupado; egress é o volume enviado pelo Supabase.
Visitas ao site, uso do CRM e testes podem gerar transferência. Não é necessário parar de testar.

## Confirmar a origem

1. No Supabase, abrir Usage da organização e o detalhamento de Egress.
2. Comparar Storage, Database e Edge Functions; separar DEV e PROD e usar o mesmo período.
3. Em Logs Explorer, consultar os modelos Storage Egress Requests e Storage Top Cache Misses, se disponíveis.
4. Identificar os caminhos mais solicitados e comparar com o tamanho dos arquivos. Contagem de requisições não equivale a volume em bytes.
5. No navegador, usar Network para verificar tamanho transferido, cache e repetições. Evitar desativar o cache em medições de uso normal.
6. Comparar o crescimento diário antes/depois. Otimizar não reduz o consumo já contabilizado.

## Implementação

- Uploads já eram reduzidos para até 2400 px e WebP quando o resultado era menor.
- Novos uploads também geram uma versão de até 800 px, quando menor, para cards públicos e listas do CRM.
- Fotos antigas continuam funcionando com o arquivo existente; não foram reprocessadas.
- Cards usam imagens HTML com carregamento lazy nativo. O navegador decide a distância de antecipação.
- URLs assinadas duram uma hora e são reutilizadas por até 20 minutos, deixando margem para a atualização do catálogo a cada 30 minutos.
- Cache do navegador continua de uma hora. O cache de assinaturas no Cloudflare é separado do catálogo de 60 segundos.
- O cache local de assinaturas é descartado ao entrar/sair da conta.
- O bucket continua privado; fotos off-market não são assinadas pelo catálogo público.

## Ativação

Executar supabase/migrations/202610292300_property_thumbnails.sql primeiro no DEV.
Validar um novo upload, cards, galeria e acesso público. A migração autoriza miniaturas apenas dos mesmos imóveis públicos permitidos.
Aplicar no PROD antes de publicar o código aprovado. Não precisa reenviar fotos antigas.
A criação retroativa de miniaturas deve ser planejada separadamente, preservando os arquivos existentes.
