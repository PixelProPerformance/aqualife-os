# Comissão Aqualife — pesquisa e proposta da Fase 5

Consulta em 27/10/2026. O usuário propôs 10% e determinou que cada lojista vincule sua própria conta Mercado Pago e arque com as taxas do provedor. Os 10% são proposta comercial; não estão ativados nem cobrados nesta entrega.

## Comparação com referências públicas

| Marketplace | Condição publicada | Limite da comparação |
|---|---|---|
| Amazon Brasil | 10%–15% conforme categoria; produtos para animais de estimação 12% | Há planos, mínimos e serviços logísticos opcionais. A página mantém data da tabela 20/01/2025, embora ainda seja a referência pública consultada. |
| Mercado Livre | Clássico 10%–14%; Premium 15%–19% | Categoria, tipo de anúncio, financiamento, logística e outros parâmetros alteram o custo efetivo. Não somar automaticamente taxas separadas como se o pacote fosse igual ao da Aqualife. |
| Magalu | Campanha de 18% para 9,9%, novos vendedores, 90 dias ou R$100 mil em vendas | Condição promocional, modelo de repasse e tarifa por item; não equivale a uma taxa permanente universal. |
| Americanas | Termo público prevê comissão conforme tabela vigente e condições próprias de parcelamento | Não foi possível verificar tabela pública atual por categoria em fonte primária. O FAQ antigo não abriu e o portal informa migração em 15/09/2025. Não usar tabelas históricas de terceiros como taxa confirmada de 2026. |

Fontes primárias:
- Amazon: https://venda.amazon.com.br/precos
- Mercado Livre: https://vendedores.mercadolivre.com.br/nota/como-funcionam-as-taxas-do-mercado-livre?guideKeyId=GE70&moduleKeyId=MO332
- Custos variáveis Mercado Livre, documentação atualizada em 03/09/2026: https://developers.mercadolivre.com.br/pt_br/comissao-por-vender
- Magalu: https://universo.magalu.com/blog/artigo/comissaonovosvendedores
- Condições/repasse Magalu: https://universo.magalu.com/
- Tarifa por item Magalu, atualização 20/10/2026: https://universo.magalu.com/blog/artigo/atualizacao-tarifa-item-magalu-marketplace
- Portal Americanas: https://portal.americanasmarketplace.com.br/
- Termo Americanas (documento 2024, não comprova taxa numérica atual): https://venda.americanas.com.br/hubfs/Termo%20de%20Servi%C3%A7o%20Americanas%20Marketplace%20-%20SJU_05.11.2024%20%281%29.pdf?hsLang=pt-br

## Avaliação

10% é um ponto de partida plausível para um marketplace especializado. Isso é uma inferência comercial a partir das referências, não prova de rentabilidade nem garantia de que a Aqualife será mais barata em todos os meios de pagamento.

A Aqualife terá de cobrir tecnologia, suporte, aquisição de compradores, moderação, tributos sobre sua receita e perdas que lhe couberem. A margem do lojista depende também de custo do produto, impostos, embalagem, descontos, devoluções, frete e financiamento. Medir no piloto receita líquida Aqualife por pedido, custo de aquisição, suporte e margem do lojista antes de prometer taxa sustentável.

## Regra proposta para implementação financeira posterior

- Comissão Aqualife: 10% do subtotal efetivamente vendido dos produtos, após descontos suportados pelo lojista; excluir frete. Base e tratamento de subsídios/cuponagem ainda devem constar da política comercial final.
- Taxas Mercado Pago de processamento, prazo de recebimento, antecipação e parcelamento contratados pelo vendedor: custo do lojista; não deduzir da comissão Aqualife para absorvê-las.
- Conta e autorização individual por loja via OAuth. ID digitado não comprova autorização; a identidade deve ser obtida pelo servidor e ligada à loja. Nunca pedir Access Token ou senha manual.
- Checkout independente por vendedor caso habilitado apenas Split 1:1. Não consolidar vários lojistas em uma cobrança da conta Aqualife.
- Aplicar valor da comissão em centavos via marketplace_fee (Checkout Pro), não presumir um parâmetro percentual. Congelar versão/base/valor na tentativa do subpedido. Definir arredondamento consistente e testar centavos.
- Mostrar separadamente ao lojista bruto, comissão Aqualife, taxas reais do provedor e líquido. Não inventar taxa fixa universal do Mercado Pago.
- Estorno deve acompanhar valores e estados confirmados pelo provedor; comissão proporcional e eventuais taxas não restituídas precisam de conciliação e política explícita. Não prometer que atribuição comercial elimina responsabilidades contratuais de fraude/chargeback perante o provedor.
- Configuração/contrato comercial não deve iniciar cobranças por si só; só liberar depois dos testes financeiros completos e critérios de publicação.

Exemplo exclusivamente ilustrativo, sem frete: produtos R$100, comissão Aqualife R$10; se a taxa real do Mercado Pago fosse R$4, o lojista receberia R$86 antes de seus demais custos. R$4 é hipótese de cálculo, não tarifa cotada. Custo combinado seria 14%; isso pode superar ofertas concorrentes de 12% que incluam processamento.

A documentação oficial de Split 1:1 informa que a tarifa do Mercado Pago é descontada do vendedor e a comissão do marketplace é informada separadamente. Validar o extrato real das duas contas no teste antes de assumir a distribuição final.
Fonte: https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace

## Bloqueios atuais

Ainda não há aplicação Marketplace nem contas de teste. Não houve autorização externa, cobrança, estorno ou conciliação Mercado Pago. Produção segue na Fase 4. A pesquisa não elimina esses bloqueios nem encerra a Fase 5.

