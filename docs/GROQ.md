# Assistente de textos — DEV

Implementado em 24/10/2026. Ainda exige secrets, migração e deploy da função no Supabase DEV. Não foi ativado em produção.

## Como usar

No editor de imóvel, preencher os dados e clicar **Gerar descrição**. A sugestão usa a linguagem do dashboard e apenas campos públicos selecionados: tipo, operação, destino, área, quartos, banheiros, bairro, município, conservação, andar e extras cadastrados. Não envia endereço privado, fotos, contatos, notas internas nem cadastro de clientes. Campos vazios não autorizam deduzir características. O modelo editorial segue a amostra enviada por Gabriela: abertura breve, apresentação, distribuição, equipamento e fechamento, somente quando houver dados suficientes. O texto é mais curto se os dados forem escassos.

**Traduzir título e descrição** usa os dois campos originais acima, mesmo quando já existirem traduções. Não inclua dados pessoais nesses textos. Retorna PT/ES/EN, preservando os originais. Antes de substituir traduções existentes, a interface exibe a proposta e exige **Aplicar ao rascunho**. Depois é possível editar os campos normalmente e salvar o imóvel. Nenhuma ação da IA salva/publica automaticamente. Alterações feitas enquanto a IA processa impedem aplicar uma sugestão desatualizada.

A instrução proíbe inventar características, mas um modelo pode errar. Revisão humana de fatos, números e traduções é obrigatória antes de salvar.

## Cadastrar a chave (sem enviar pelo chat)

1. Abrir o projeto **DEV** no Supabase. Não usar o projeto PROD.
2. **Edge Functions → Secrets → Add new secret**. Nome `GROQ_API_KEY`; valor: chave criada no painel da Groq. Salvar.
3. Adicionar `AI_ALLOWED_ORIGINS`: origens exatas separadas por vírgulas, por exemplo `http://localhost:5173,http://127.0.0.1:5173,https://dev.SEUPROJETO.pages.dev`. Substituir a URL de preview pela real. Sem barra final, sem wildcard e sem domínio de produção nesta fase.
4. Opcional: `GROQ_MODEL=llama-3.3-70b-versatile` (já é o padrão). Usa JSON mode e validação da resposta no servidor. A disponibilidade/cota gratuita depende da conta Groq; não existe promessa de uso gratuito ilimitado. Não habilitar cobrança só para testar.
5. No SQL Editor **DEV**, executar `supabase/migrations/202610241000_property_ai.sql`. Criar/inserir nada em clientes ou imóveis não é necessário. A tabela registra apenas usuário, janela e contador (máximo 20 chamadas/hora/usuário), sem textos. Falhas do provedor também contam como tentativa.
6. Publicar a função com Supabase CLI, autenticado na organização correta:

   ```sh
   supabase functions deploy property-ai --project-ref REF_DO_DEV
   ```

   Executar na raiz do projeto para incluir `core.js` e `config.toml`. Manter a verificação JWT ativa. A função também valida o usuário com Auth e exige membro `admin` ou `editor` em `dashboard_users`; público e viewers não podem usar. Se o deploy reportar incompatibilidade de JWT, investigar a configuração do projeto antes de alterar proteção.
7. Abrir o frontend DEV, entrar no CRM e testar com um imóvel fictício. Testar geração, tradução, descarte, edição durante processamento, sessão expirada e limite. Conferir no painel Groq o consumo. Teste real com a Groq permanece pendente até a chave estar cadastrada e a função publicada.

A chave não deve aparecer em variáveis `VITE_*`, no GitHub, no código do navegador ou em mensagens de erro. O frontend chama somente Supabase; apenas a função chama Groq. Não há logs de prompts/respostas no código. Confirmar as configurações de retenção/tratamento no provedor antes de enviar material confidencial. Limites da Groq são adicionais ao limite local. Limitar quem tem papel de editor/admin.

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
