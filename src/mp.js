/**
 * AQUALIFE OS — INTEGRAÇÃO MERCADO PAGO
 * ================================================================
 * As credenciais NUNCA ficam fixas no código: são lidas da tabela
 * integracao_config (cadastradas pelo admin no painel).
 *
 * Dois fluxos:
 *   1) Checkout Pro (preference)  → pagamento único (anual Pix / anual 12x)
 *   2) Assinaturas (preapproval)  → recorrência mensal no cartão (R$34,90)
 * ================================================================
 */

import { query } from "./db.js";

const MP_BASE = "https://api.mercadopago.com";

/** Lê uma credencial da tabela integracao_config. */
export async function getConfig(chave) {
  const r = await query("SELECT valor FROM integracao_config WHERE chave=$1", [chave]);
  return r.rows[0]?.valor || null;
}

/** Salva/atualiza uma credencial (upsert). */
export async function setConfig(chave, valor) {
  await query(
    `INSERT INTO integracao_config (chave, valor, atualizado_em)
     VALUES ($1, $2, NOW())
     ON CONFLICT (chave) DO UPDATE SET valor=$2, atualizado_em=NOW()`,
    [chave, valor]
  );
}

/** Retorna o Access Token do MP ou lança erro claro se não configurado. */
async function accessToken() {
  const tk = await getConfig("mercadopago_access_token");
  if (!tk) throw new Error("Mercado Pago não configurado. Cadastre o Access Token no painel admin.");
  return tk;
}

async function mpFetch(path, { method = "GET", body, token, idempotencyKey } = {}) {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${token || (await accessToken())}`,
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  const resp = await fetch(MP_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json?.message || json?.error || `Mercado Pago HTTP ${resp.status}`;
    const err = new Error(msg);
    err.mpStatus = resp.status;
    err.mpBody = json;
    throw err;
  }
  return json;
}

/**
 * Cria uma preference (Checkout Pro) para pagamento único.
 * opts: { titulo, valorCents, payerEmail, externalReference, backUrls, notificationUrl,
 *         apenasPix, parcelasMax }
 */
export async function criarPreference(opts) {
  const {
    titulo, valorCents, payerEmail, externalReference,
    backUrls, notificationUrl, apenasPix = false, parcelasMax = 12,
  } = opts;

  const payment_methods = { installments: parcelasMax, default_installments: parcelasMax };
  if (apenasPix) {
    // Deixa apenas Pix disponível: exclui cartão e boleto
    payment_methods.excluded_payment_types = [
      { id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" },
    ];
  }

  const body = {
    items: [{
      title: titulo,
      quantity: 1,
      unit_price: Number((valorCents / 100).toFixed(2)),
      currency_id: "BRL",
    }],
    payer: payerEmail ? { email: payerEmail } : undefined,
    external_reference: externalReference,
    back_urls: backUrls,
    auto_return: "approved",
    notification_url: notificationUrl,
    payment_methods,
    statement_descriptor: "AQUALIFE CARE",
  };

  return mpFetch("/checkout/preferences", {
    method: "POST",
    body,
    idempotencyKey: externalReference,
  });
}

/**
 * Cria uma assinatura recorrente (preapproval) — cobra o cartão todo mês.
 * opts: { valorCents, payerEmail, externalReference, backUrl, motivo, frequenciaMeses }
 */
export async function criarPreapproval(opts) {
  const {
    valorCents, payerEmail, externalReference, backUrl,
    motivo = "Aqualife Care Standard", frequenciaMeses = 1,
  } = opts;

  const body = {
    reason: motivo,
    external_reference: externalReference,
    payer_email: payerEmail,
    back_url: backUrl,
    auto_recurring: {
      frequency: frequenciaMeses,
      frequency_type: "months",
      transaction_amount: Number((valorCents / 100).toFixed(2)),
      currency_id: "BRL",
    },
    status: "pending",
  };

  return mpFetch("/preapproval", {
    method: "POST",
    body,
    idempotencyKey: externalReference,
  });
}

/** Consulta um pagamento pelo id (usado no webhook). */
export async function getPagamento(paymentId) {
  return mpFetch(`/v1/payments/${paymentId}`);
}

/** Consulta uma assinatura (preapproval) pelo id (usado no webhook). */
export async function getPreapproval(preapprovalId) {
  return mpFetch(`/preapproval/${preapprovalId}`);
}
