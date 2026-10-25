# Assistente de textos — DEV

Implementado em 24/10/2026. Em 25/10/2026, a função `property-ai` foi publicada e depois atualizada no Supabase DEV `nnrfluzbsbdngxklomyp`. A proprietária informou que cadastrou os secrets e aplicou a migração. A chamada completa autenticada com a Groq ainda precisa ser validada pela interface no dashboard DEV. Não foi ativado em produção.

## Como usar

No editor de imóvel, preencher os dados e clicar **Gerar descrição**. A sugestão usa a linguagem do dashboard e apenas campos públicos selecionados: tipo, operação, destino, área, quartos, banheiros, bairro, município, conservação, andar e extras cadastrados. Não envia endereço privado, fotos, contatos, notas internas nem cadastro de clientes. Campos vazios não autorizam deduzir características. O modelo editorial segue a amostra enviada por Gabriela: abertura breve, apresentação, distribuição, equipamento e fechamento, somente quando houver dados suficientes. O texto é mais curto se os dados forem escassos.

**Traduzir título e descrição** usa os dois campos originais acima, mesmo quando já existirem traduções. Não inclua dados pessoais nesses textos. Retorna PT/ES/EN, preservando os originais. Antes de substituir traduções existentes, a interface exibe a proposta e exige **Aplicar ao rascunho**. Depois é possível editar os campos normalmente e salvar o imóvel. Nenhuma ação da IA salva/publica automaticamente. Alterações feitas enquanto a IA processa impedem aplicar uma sugestão desatualizada.

A instrução proíbe inventar características, mas um modelo pode errar. Revisão humana de fatos, números e traduções é obrigatória antes de salvar.

## Cadastrar a chave (sem enviar pelo chat)

1. Abrir o projeto **DEV** no Supabase. Não usar o projeto PROD.
2. **Edge Functions → Secrets → Add new secret**. Nome `GROQ_API_KEY`; valor: chave criada no painel da Groq. Salvar.
3. Adicionar `AI_ALLOWED_ORIGINS`: origens exatas separadas por vírgulas, por exemplo `http://localhost:5173,http://127.0.0.1:5173,https://dev.SEUPROJETO.pages.dev`. Substituir a URL de preview pela real. Sem barra final, sem wildcard e sem domínio de produção nesta fase.
4. Opcional: `GROQ_MODEL=openai/gpt-oss-120b` (já é o padrão). Não configure o antigo `llama-3.3-70b-versatile`: a Groq encerrou esse modelo em 16/08/2026. O GPT-OSS 120B suporta JSON mode. A função valida a resposta antes de mostrá-la. A disponibilidade/cota gratuita depende da conta Groq; não existe promessa de uso gratuito ilimitado. Não habilitar cobrança só para testar.
5. No SQL Editor **DEV**, executar `supabase/migrations/202610241000_property_ai.sql`. Criar/inserir nada em clientes ou imóveis não é necessário. A tabela registra apenas usuário, janela e contador (máximo 20 chamadas/hora/usuário), sem textos. Falhas do provedor também contam como tentativa.
6. Publicar a função com Supabase CLI, autenticado na organização correta:

   ```sh
   supabase functions deploy property-ai --project-ref REF_DO_DEV
   ```

   Executar na raiz do projeto para incluir `core.js` e `config.toml`. Manter a verificação JWT ativa. A função também valida o usuário com Auth e exige membro `admin` ou `editor` em `dashboard_users`; público e viewers não podem usar. Se o deploy reportar incompatibilidade de JWT, investigar a configuração do projeto antes de alterar proteção.
7. Abrir o frontend DEV conectado ao mesmo projeto Supabase, entrar no CRM com usuário `admin` ou `editor` e testar com um imóvel fictício. Testar geração, tradução, descarte, edição durante processamento, sessão expirada e limite. Conferir no painel Groq o consumo. O endpoint foi confirmado ativo, mas a chamada autenticada real com a Groq continua pendente.

A chave não deve aparecer em variáveis `VITE_*`, no GitHub, no código do navegador ou em mensagens de erro. O frontend chama somente Supabase; apenas a função chama Groq. Não há logs de prompts/respostas no código. Confirmar as configurações de retenção/tratamento no provedor antes de enviar material confidencial. Limites da Groq são adicionais ao limite local. Limitar quem tem papel de editor/admin.

## Diagnóstico de erros

- **IA ainda não configurada (503):** confirme `GROQ_API_KEY` nos secrets do projeto correto e que `property-ai` foi publicada nesse projeto. A função usa também `SUPABASE_URL` e `SUPABASE_ANON_KEY` fornecidos pelo ambiente Supabase.
- **Limite de uso indisponível (503):** aplique `202610241000_property_ai.sql` no mesmo projeto Supabase; a função depende de `consume_property_ai_quota`.
- **Acesso negado (401/403):** confirme sessão ativa e papel `admin` ou `editor` em `dashboard_users`. Para erro de origem no navegador, inclua a origem exata do site em `AI_ALLOWED_ORIGINS` (protocolo, hostname e porta quando houver; sem barra final).
- **Falha do provedor (502):** confira no Supabase o secret e o nome do modelo Groq e verifique os limites da conta Groq. A aplicação não mostra a resposta bruta do provedor.
- **Modelo antigo:** a Groq encerrou `llama-3.3-70b-versatile` em 16/08/2026. O handler foi atualizado para usar `openai/gpt-oss-120b`; se existir um secret `GROQ_MODEL`, ele substitui o padrão.
- **Origem não autorizada ao testar no Pages:** `AI_ALLOWED_ORIGINS` precisa conter a origem sem barra final (por exemplo, `https://dev.kohaus.pages.dev`). A allowlist do DEV foi corrigida para localhost e esse endereço.
- **Limite atingido (429):** pode ser o limite local de 20 chamadas/hora por usuário ou o limite do provedor.

Nunca compartilhe a chave Groq nem cole o valor em logs, issues ou no chat. Se continuar falhando, compartilhe somente o texto do erro, o endereço/ambiente que está usando e o código HTTP, sem tokens ou dados de imóveis/clientes.

## Verificação e dependências

`npm test` cobre seleção de dados, validação, revisão/aplicação, respostas inválidas e preservação de edições. `npm run test:security` cobre políticas locais do banco; não substitui testes na Edge Function publicada.

O pacote anterior de segurança continua pendente de ativação (ver `SEGURANCA.md`). Não publicar toda a DEV em produção apenas para habilitar IA: existem migrações, Turnstile e D1 independentes a configurar primeiro.

## Aviso legal

Referência lida: https://www.thekohaus.com/terminos-y-condiciones em 24/10/2026. Foram aproveitados os temas de uso, atualização das condições, links externos, restrição de acesso, direitos autorais e lei aplicável. Não foi reproduzida a afirmação de que todas as marcas são registradas, nem a exclusão irrestrita de responsabilidade. Dados legais pendentes continuam destacados.

## Documentação oficial

- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/rate-limits
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/functions/secrets
