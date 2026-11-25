# Central de conversas KOHAUS

A central de Conversas já está publicada. A conexão do WhatsApp com a Meta requer configuração e validação próprias.

## Revisar agora

Execute `npm run dev` e abra `http://localhost:5173/?view=inbox-preview&lang=pt`. Clique em **Ver demonstração**. A rota só existe no servidor de desenvolvimento em localhost/127.0.0.1. Os dados são fictícios e ficam no navegador. No painel autenticado, abra **Conversas**. A rota de demonstração usa armazenamento local por usuário e simula o envio. Os demais módulos do CRM mantêm seu comportamento habitual: os atalhos para tarefas/visitas podem acessar o ambiente configurado no projeto.

A prévia permite organizar tickets por responsável, prioridade, situação e canal; adicionar notas; simular respostas; relacionar cliente, proprietário, lead, imóvel e visita; inserir dados de imóveis públicos e visitas na resposta. Clientes, imóveis, leads e visitas têm atalhos para conversas filtradas. Os históricos de cliente/imóvel exibem eventos relacionados.

## Ativação posterior, após revisão

1. Confirmar com Guilherme a conta Meta Business, o número e o acesso administrativo. Identificar se o número está no WhatsApp Business App, em outra API/provedor ou ainda não registrado. A compatibilidade com coexistência/migração depende do onboarding disponível na conta; não excluir o aplicativo nem desvincular o número sem revisar esse fluxo. Esta implementação não importa o histórico antigo do aplicativo.
2. No ambiente **dev separado de produção**, aplicar `supabase/migrations/202611220100_inbox.sql`, depois da migração de atividades comerciais `202611211200`. O schema consolidado inclui a mesma estrutura para projetos novos. A migração transforma os formulários existentes em tickets uma única vez e cria os novos na mesma transação do lead. Não reaplicar todo o schema em produção como substituto da migração.
3. Preparar no aplicativo Meta o produto WhatsApp/Cloud API, o WABA, o Phone Number ID e um token com os acessos necessários ao número e templates (`whatsapp_business_messaging` e `whatsapp_business_management`). Confirmar versão Graph suportada pelo app. IDs não são o telefone formatado. Guardar os segredos somente no servidor Supabase, nunca em variáveis `VITE_`, código, commits ou mensagens de chat.
4. Configurar os secrets abaixo no projeto correto. Manter `WHATSAPP_SEND_ENABLED=false` durante conexão/validação inicial.
5. Publicar `whatsapp-webhook` e `whatsapp-api` no ambiente aprovado. A configuração `verify_jwt=false` é intencional: o webhook autentica o corpo via HMAC da Meta; a API verifica JWT com `auth.getUser` e papel no CRM em cada requisição. Não remover essas verificações.
6. No app Meta, configurar callback HTTPS `https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook`, o mesmo verify token e assinatura do campo `messages` para o WABA correto. Completar o registro/onboarding do número conforme indicado pela Meta.
7. Enviar de um telefone de teste autorizado uma mensagem para o número conectado. Conferir um único ticket, texto, contato, não lidos e vínculo. Verificar se o número exibido pela API corresponde ao de Guilherme. Só então habilitar envios e responder pelo painel, observando **aceita → entregue → lida**, quando disponíveis.
8. Validar modelo aprovado fora da janela de atendimento, confirmação de consentimento, anexos recebidos e falha de envio. Revisar uma visita/tarefa criada pelos atalhos e seus vínculos. Liberar produção somente depois desses testes e da aprovação visual.

### Secrets necessários

| Nome | Conteúdo |
| --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Token de servidor autorizado para o WABA/número |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número no Graph |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID da conta WhatsApp Business |
| `WHATSAPP_GRAPH_VERSION` | Versão suportada pelo app, formato `vNN.N` |
| `WHATSAPP_APP_SECRET` | App secret usado para validar HMAC |
| `WHATSAPP_VERIFY_TOKEN` | Valor aleatório privado escolhido para o handshake do webhook |
| `WHATSAPP_SEND_ENABLED` | `false` inicialmente; `true` após validação |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados no ambiente das Edge Functions. Não usar service role no navegador.

## Comportamento e limites desta versão

- Uma conversa WhatsApp por destinatário normalizado, para **um único número comercial configurado**. Contatos são vinculados automaticamente apenas quando há correspondência única do telefone internacional; contatos ambíguos ficam sem vínculo para revisão. Não adivinhamos DDI. O cadastro manual exige informar o número com DDI.
- Cada evento guarda horário, ator e IDs relacionados. Mudanças de vínculo preservam o vínculo anterior no evento; vínculo ao imóvel inclui seu proprietário. Eventos não inventam chamadas ou mensagens não confirmadas.
- Formulários geram lead e ticket. O canal **E-mail** usa a integração Spacemail, configurada separadamente do WhatsApp.
- Texto livre apenas na janela de 24 horas após mensagem recebida. Fora dela, modelos aprovados de texto com parâmetros posicionais e confirmação de consentimento. Modelos com botões, cabeçalhos de mídia ou parâmetros nomeados ficam fora desta versão.
- Imóveis privados/off-market e não ativos não são sugeridos para compartilhar publicamente. A resposta mostra texto, características e link; a prévia do link depende do WhatsApp. Não é uma reprodução garantida dos cartões da imagem de referência.
- Anexos recebidos podem ser baixados com autenticação (até 25 MB). Não há upload de arquivos para envio, gravação/transcrição de áudio ou campanhas em massa.
- A lista mostra até 200 atendimentos recentes; mensagens são paginadas de 100 em 100. Atualização automática a cada 15 segundos enquanto a página está visível, além de atualização manual.
- O envio reserva uma chave única antes de chamar a Meta. Timeout fica como **confirmação pendente**, sem reenvio automático. Conferir recibos/provedor antes de fazer uma nova tentativa; ausência de recibo não prova que a mensagem não saiu.
- O recebimento valida `X-Hub-Signature-256`, verifica o número configurado e elimina duplicatas por ID do provedor. Recibos atrasados não rebaixam uma mensagem lida para entregue/enviada. Acesso anônimo/externo é bloqueado; viewers só consultam.
- Os testes locais não substituem a validação do token, número, templates e entrega na conta real. Nenhum teste envia mensagem a pessoas.

## Verificações locais

`npm test`, `npm run build`, `npm run lint`, `npm run test:security`, `node scripts/security/test-inbox.mjs`.

O teste SQL usa PostgreSQL isolado (PGlite), sem modificar Supabase. Inclui permissões, idempotência, captura de formulários e eventos relacionados. Os testes do adaptador simulam a Meta para verificar reserva, repetição, timeout e bloqueio por papel/janela de atendimento.

## Referências oficiais

- [Enviar mensagens e janela de atendimento](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)
- [Payloads e recibos do webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages)
- [Verificação do webhook e assinatura](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/)
