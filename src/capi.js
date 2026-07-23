/**
 * AQUALIFE OS — META CONVERSIONS API (CAPI)
 * ================================================================
 * Dispara eventos do lado do SERVIDOR para a Meta (Graph API).
 * Usado para o Purchase: quando o Mercado Pago confirma o pagamento,
 * enviamos o evento por aqui — 100% confiável, sem depender de o
 * cliente voltar ao site.
 *
 * Deduplicação: usamos o mesmo event_id (a referência externa do
 * pedido) que o navegador usa no eventID, para a Meta não contar a
 * mesma compra duas vezes.
 *
 * Credenciais lidas de integracao_config (nunca fixas no código).
 * Falha silenciosa — marketing nunca quebra o fluxo de pagamento.
 * ================================================================
 */

import crypto from "crypto";
import { getConfig } from "./mp.js";

const GRAPH_VERSION = "v21.0";

/** SHA-256 (hex) de um valor normalizado — exigido pela Meta para dados pessoais. */
function hash(v) {
  if (!v) return null;
  return crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");
}

/** Monta o user_data com identificadores hasheados (e-mail, telefone). */
function userData({ email, phone } = {}) {
  const ud = {};
  if (email) ud.em = [hash(email)];
  if (phone) {
    const digits = String(phone).replace(/\D/g, "");
    if (digits) ud.ph = [hash(digits)];
  }
  return ud;
}

/**
 * Envia um evento à CAPI. Retorna { ok, motivo }.
 * opts: { eventName, eventId, value, currency, email, phone, eventSourceUrl }
 */
export async function enviarEventoCAPI(opts) {
  try {
    const pixelId = await getConfig("meta_pixel_id");
    const token   = await getConfig("meta_capi_token");
    if (!pixelId || !token) return { ok: false, motivo: "capi_nao_configurada" };

    const testCode = await getConfig("meta_test_event_code");
    const evento = {
      event_name: opts.eventName || "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: opts.eventId || undefined,          // deduplicação com o navegador
      action_source: "website",
      event_source_url: opts.eventSourceUrl || "https://www.aqualifeaquarismo.com/site.html",
      user_data: userData({ email: opts.email, phone: opts.phone }),
      custom_data: {
        currency: opts.currency || "BRL",
        value: Number(opts.value || 0),
      },
    };

    const body = { data: [evento] };
    if (testCode) body.test_event_code = testCode;

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = json?.error?.message || `Graph HTTP ${resp.status}`;
      console.error("[capi] falha:", msg);
      return { ok: false, motivo: msg };
    }
    return { ok: true, events_received: json.events_received };
  } catch (err) {
    console.error("[capi] erro:", err.message);
    return { ok: false, motivo: err.message };
  }
}

/** Atalho para Purchase. */
export function enviarPurchaseCAPI({ eventId, valueCents, email, phone, eventSourceUrl }) {
  return enviarEventoCAPI({
    eventName: "Purchase",
    eventId,
    value: (valueCents || 0) / 100,
    currency: "BRL",
    email, phone, eventSourceUrl,
  });
}
