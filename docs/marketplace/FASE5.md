# Fase 5 — integração financeira (em andamento)

## Estado e limite desta entrega

Primeira entrega: conexão OAuth Mercado Pago em homologação. Não encerra a Fase 5. O usuário confirmou em 27/10/2026 que ainda não existe aplicação Marketplace nem contas de teste.

A aplicação continua sem cobrar, estornar, conciliar pagamentos reais ou expedir. O checkout da loja antiga e os módulos Care, Academy e Aquabook permanecem independentes. As APIs financeiras bloqueadas na Fase 4 continuam bloqueadas. Nenhum saldo, repasse, reembolso ou pagamento fictício é apresentado como recurso operacional.

## Conexão implementada

Apenas no projeto staging clever-youth e com configuração completa. Owner de loja aprovada inicia OAuth; staff consulta estado, sem tokens ou identificador de conta. Sem formulário para Access Token/senha. Fluxo state aleatório, PKCE S256, cookie HTTPS HttpOnly/SameSite=Lax e validade de 10 minutos. Código trocado apenas no servidor. Retorno consumido antes da chamada externa, sem reutilização; falha exige nova autorização. Membership e usuário ativo são conferidos novamente ao concluir. Desconexão e novo fluxo invalidam retornos anteriores.

Conta precisa coincidir com o user_id do token, constar da lista explícita de contas de teste e ter tag test_user retornada por /users/me. Prefixo APP_USR não demonstra sozinho se uma conta é real ou de teste. Uma conta Mercado Pago não é compartilhada entre duas lojas. Troca de titular depende de revisão, sem substituição automática.

Tokens e verifier criptografados com AES-256-GCM, nonce aleatório e contexto ligado ao vendedor/finalidade. Segredo da aplicação e chave de criptografia ficam no ambiente; nunca no frontend ou em logs. Renovação serializada por loja; invalid_grant/401 apaga tokens locais e exige autorização novamente. Desconexão local remove os tokens mesmo com configuração indisponível ou loja suspensa; não afirma que revogou a autorização no provedor. Revogação também deve ser feita na gestão da conta Mercado Pago. Logs retornam apenas códigos redigidos; respostas sem cache e sem referrer.

Migração 0007 aditiva, explícita e idempotente: duas tabelas para conexão e tentativa OAuth. Não grava nem altera marketplace_payment, comissão, estoque ou reservas. Não aplicar em produção nesta entrega parcial.

## Configuração externa necessária

Criar no portal Mercado Pago Developers uma aplicação de pagamentos online, modelo Marketplace, Checkout Pro. Usar PKCE. Criar contas de teste brasileiras: integrador, dois vendedores e comprador. A criação/aceite dos termos e a autorização das contas devem ser concluídas pelo responsável; não pedir senhas no chat.

Cadastrar exatamente o Redirect URI:
https://aqualife-os-production-a81a.up.railway.app/api/marketplace/mp/oauth/callback

No serviço staging aqualife-os, configurar por meio seguro:
- MARKETPLACE_MP_CLIENT_ID (identificador da aplicação)
- MARKETPLACE_MP_CLIENT_SECRET (segredo; preferir variável selada)
- MARKETPLACE_MP_ENCRYPTION_KEY (32 bytes aleatórios em hexadecimal; guardar com segurança fora do banco e preferir variável selada; não reutilizar JWT_SECRET)
- MARKETPLACE_MP_REDIRECT_URI (URL acima)
- MARKETPLACE_MP_TEST_USER_IDS (IDs dos dois vendedores de teste, separados por vírgula)
- MARKETPLACE_MP_OAUTH_ENABLED=true, somente depois de migrar 0007 e confirmar as contas de teste.

Não solicitar tokens manuais aos lojistas. Não habilitar no projeto de produção; o código recusa esse projeto mesmo com variáveis presentes. Perder a chave exige novas autorizações; sua rotação precisa de procedimento de recriptografia ou desconexão/reautorização. Backup de banco não substitui cofre de segredos.

## Demais critérios obrigatórios da Fase 5

Ainda pendentes: confirmar elegibilidade efetiva da conta/aplicação ao modelo de split; definir comissão comercial; pagamentos independentes por vendedor se 1:1; checkout e transições de reserva/estoque sem corrida com expiração; webhook autenticado e consulta ao provedor (não confiar no corpo/retorno de navegador); ledger de bruto/taxa/comissão/líquido reais; pagamentos parciais do carrinho; duplicidade e entrega fora de ordem; resultado ambíguo e recuperação após timeout; estorno total/parcial com idempotência e conciliação.

Homologar com contas Mercado Pago reais de teste: duas lojas isoladas, aprovação, rejeição, pendência, expiração, reconexão, revogação, retry e estornos. Conferir collector, currency, amount, external_reference e live_mode do pagamento ao reconciliar; nenhum evento pode liquidar outro subpedido. Proibir pedido em expedição ou valor extra sem fluxo aprovado. Pagamento confirmado após expiração deve seguir tratamento financeiro explícito, jamais reacender estoque automaticamente ou fingir estorno concluído.

Revisar comissões e regras fiscais/comerciais antes de liberar dinheiro real. Não assumir acesso a Split 1:N. A Fase 6 (Melhor Envio/expedição/fiscal) não foi iniciada.

## Testes e publicação

Testes unitários de configuração, criptografia, PKCE, identidade e cliente HTTP; integração PostgreSQL/API em schema temporário com dublê do provedor EXCLUSIVAMENTE dentro do teste automatizado. Isso valida código e isolamento, não comprova a integração externa. CI inclui todos os testes e regressões anteriores.

Publicação somente após homologação externa e demais critérios financeiros; esta branch/PR permanece draft. Staging pode receber esta base com cobranças bloqueadas, backup externo/restauração antes da migração, SQL/API e conferência visual. Produção permanece na Fase 4. Rollback desta base: retornar app do staging ao merge Fase 4 1c7206dd8eb77e853d27c031d646f8ecd1c1f04f; manter tabelas aditivas; nenhum DROP, nenhum efeito financeiro.

## Fontes oficiais consultadas em 27/10/2026

- https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation
- https://www.mercadopago.com.br/developers/pt/docs/security/oauth/management
- https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/prerequisites
- https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/test-accounts

O modelo 1:1 usa token OAuth por vendedor. 1:N depende de habilitação comercial. Estorno proporcional pode falhar por insuficiência de saldo do vendedor; não prometer disponibilidade sem confirmação do provedor.

