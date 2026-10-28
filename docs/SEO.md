# SEO da KOHAUS

## O que está implementado
- Títulos e descrições por página, idioma, operação e destino; título e descrição reais nas páginas de imóveis.
- Canonical sem parâmetros irrelevantes e alternates es/pt/en.
- Dados estruturados Organization apenas com informações públicas verificadas; sem avaliações, endereço comercial ou habilitações inventadas.
- Links HTML para os imóveis e para os mercados prioritários.
- Sitemap gerado no build de produção a partir da view pública. Inclui anúncios públicos, exclui anúncios individuais off-market. Não contém tokens nem endereços privados.
- Preview/local: noindex. Builds preview também recebem robots bloqueado e X-Robots-Tag.

## Publicação e acompanhamento
1. Definir VITE_SITE_URL no Cloudflare como a origem pública definitiva, sem caminho. Enquanto o domínio não mudar, o padrão é https://kohaus.pages.dev. Nunca usar a origem do preview.
2. Após o deploy, conferir /robots.txt e /sitemap.xml na produção. O build consulta o Supabase com a chave publishable já configurada; nenhuma chave administrativa é necessária.
3. Verificar a propriedade no Google Search Console e enviar /sitemap.xml. Esse passo exige acesso à conta do responsável e ainda não foi executado.
4. Usar Inspeção de URL para home, catálogos e um anúncio por idioma. Conferir indexação, canonical e renderização.
5. O sitemap é atualizado em cada build: ao cadastrar novos imóveis, disparar novo deploy. Os links no catálogo permitem descobrir anúncios entre builds.
6. Na migração para o domínio definitivo, atualizar VITE_SITE_URL, configurar redirecionamentos permanentes e cadastrar o novo domínio no Search Console.

## Trabalho editorial e técnico seguinte
- Publicar guias originais sobre compra, aluguel e investimento em Barcelona, Costa Brava, Itapema e Balneário Camboriú. Explicar bairros, processo e custos com fontes e datas; não prometer retorno nem inventar carteira disponível.
- Descrições únicas para imóveis, títulos claros e fotos leves. A compressão de uploads novos não reprocessa as fotos antigas.
- Conseguir menções e links legítimos de parceiros locais; não comprar links nem produzir páginas repetitivas para palavras-chave.
- As páginas públicas são renderizadas no servidor pelo Cloudflare Pages, usando os mesmos componentes React da interface. Conteúdo, títulos, descrições, canonical e Open Graph chegam no HTML inicial. O React assume a navegação e os filtros no navegador.
- Monitorar Core Web Vitals com dados reais. Há imagens locais pesadas e bundles grandes; ainda precisam de otimização específica.
- Não há garantia de posição nem de prazo de indexação. Avaliar impressões, cliques, consultas e contatos qualificados.

Referências oficiais: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics e https://developers.google.com/search/docs/crawling-indexing/links-crawlable

## HTML inicial (SSR)
- `npm run build` gera `dist` (site) e `dist-ssr` (renderizador). A função `functions/index.js` usa o renderizador no Cloudflare Pages. Manter comando de build e pasta publicada `dist`; nenhum servidor próprio é necessário.
- As variáveis públicas do Supabase e `VITE_APP_ENV` já usadas no build também configuram o renderizador. Não adicionar service_role ou senha do banco.
- Somente a view `public_properties` é consultada. Clientes, usuários, tarefas, endereço privado e sessão de login não entram no HTML. Fotos off-market continuam ocultas.
- O catálogo público é reutilizado no cache interno do Cloudflare por até 60 segundos. Alterações podem levar esse tempo para aparecer. URLs de fotos expiram em uma hora; a página aberta atualiza os dados a cada 30 minutos. O HTML não é armazenado em cache compartilhado.
- O dashboard permanece no navegador e exige a autenticação existente. Falhas temporárias no catálogo retornam 503 em vez de apresentar uma lista vazia como conteúdo definitivo; anúncios inexistentes retornam 404.
- O idioma explícito na URL prevalece. Sem ele, o servidor usa Accept-Language; ao carregar, o navegador restaura a preferência consentida do visitante.
- Cabeçalhos de segurança de `public/_headers` também são aplicados às respostas da função. Previews continuam noindex.

### Verificação antes de publicar
1. Executar `npm test` e `npm run build`.
2. Validar a função com `npx wrangler pages functions build`.
3. Para testar SSR localmente, executar `npx wrangler pages dev dist --port 8788` após o build e abrir http://localhost:8788/?lang=pt. `npm run dev` continua sendo o ambiente normal de edição, sem SSR.
4. Conferir o código-fonte da home, catálogo e anúncio: títulos e dados públicos devem estar presentes mesmo sem JavaScript. Testar também filtros, troca de idioma e login com JavaScript habilitado.
5. Publicar primeiro a dev/preview e aprovar antes de enviar à main. O SSR utiliza requisições de Pages Functions, sujeitas à franquia da conta Cloudflare; acompanhar o consumo. Não foi feita publicação nesta alteração.
