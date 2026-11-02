# Publicação em portais

## Estado atual

A tela agrupa imóveis, identifica os portais selecionados, mostra estados manuais e uma revisão preliminar dos campos. Não existe conector ativo nem envio automático. O botão Publicar permanece desabilitado; preencher os dados não comprova aprovação pelo portal. Não usamos a Search API como API de publicação.

Idealista é o único portal contratado informado pelo cliente. Fotocasa, Habitaclia e Milanuncios continuam opções de planejamento, não integrações ativas.

## Ativação do Idealista

Solicitar ao suporte profissional a conexão de um CRM próprio KOHAUS para criar, atualizar e retirar anúncios. Pedir:
- Autorização/homologação do CRM e documentação da interface de publicação.
- Credenciais e identificador da conta, entregues em canal seguro.
- Ambiente de teste, limites e regras de validação por operação/tipologia.
- Forma de consultar o resultado, identificador externo e erros.
- Regras para fotos, localização e retirada de anúncios.

A API pública documentada em https://developers.idealista.com/ é Search API, para consultar imóveis publicados. Não confirma permissão de envio.

## Implementação após autorização

1. Criar conector servidor conforme a documentação recebida; segredos somente no servidor.
2. Validar sessão e função admin/editor antes de qualquer envio; ler os dados salvos do imóvel no servidor.
3. Aplicar requisitos específicos do portal; proteger imóveis off-market contra envio de fotos/endereço sem autorização.
4. Criar registro persistente por imóvel/portal com estado, identificador externo, tentativa e erros sanitizados. Usar idempotência/controle de concorrência para evitar anúncios duplicados.
5. Publicar somente por ação explícita; depois consultar confirmação ou receber webhook autenticado. “Enviado” não equivale a “Publicado”.
6. Exibir erros de campo no CRM, permitir corrigir e reenviar; suportar atualização e retirada.
7. Testar falhas, repetição de clique, limites, permissões e sincronização antes de ativar em produção.

## Outros portais

Fotocasa Pro documenta ativação de CRM externo e geração de API key após configuração pela equipe:
https://pro.fotocasa.es/bienvenida-pack-basic/

A contratação da pasarela e mudança de CRM são tratadas nas condições:
https://pro.fotocasa.es/condiciones/clausulas-start/

Confirmar cobertura de Habitaclia/Milanuncios e custos no contrato antes de implementar. Não presumir publicação gratuita nem disponibilidade para um CRM próprio.
