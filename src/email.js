/**
 * AQUALIFE OS — ENVIO DE E-MAILS (SMTP)
 * ================================================================
 * Configuração SMTP lida da tabela integracao_config (nunca fixa
 * no código). Funciona com qualquer provedor: Gmail (App Password),
 * Resend, Brevo, SendGrid, Mailgun, etc.
 *
 * Filosofia: e-mail é acessório. Se o SMTP não estiver configurado
 * ou falhar, registamos no log e seguimos — nunca quebramos o fluxo
 * principal (login, pagamento) por causa de um e-mail.
 * ================================================================
 */

import nodemailer from "nodemailer";
import { getConfig } from "./mp.js"; // reaproveita o leitor de integracao_config

const AGUA = "#0E7490", TINTA = "#0B2A3A";

/** Monta o transporte SMTP a partir das credenciais no banco. */
async function transporte() {
  const host = await getConfig("smtp_host");
  const user = await getConfig("smtp_user");
  const pass = await getConfig("smtp_pass");
  if (!host || !user || !pass) return null; // SMTP não configurado

  const port = parseInt(await getConfig("smtp_port")) || 587;
  const secure = (await getConfig("smtp_secure")) === "true" || port === 465;

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

/** Envelope HTML padrão da marca. */
function moldura(titulo, corpoHtml) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f7f9;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:${TINTA};border-radius:14px 14px 0 0;padding:22px 28px">
        <div style="color:#fff;font-size:20px;font-weight:bold">🐠 Aqualife Aquarismo</div>
      </div>
      <div style="background:#fff;border-radius:0 0 14px 14px;padding:28px">
        <h1 style="color:${TINTA};font-size:20px;margin:0 0 14px">${titulo}</h1>
        ${corpoHtml}
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:18px">
        Aqualife Aquarismo · Manutenção técnica de aquários e lagos<br>
        Brasil: +55 21 97106-4054 · Portugal: +351 966 121 075
      </p>
    </div></body></html>`;
}

function botao(url, texto) {
  return `<a href="${url}" style="display:inline-block;background:${AGUA};color:#fff;
    text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:bold;margin:8px 0">${texto}</a>`;
}

/** Envia via Resend (HTTP API sobre HTTPS — não é bloqueado pelo Railway). */
async function enviarViaResend({ apiKey, from, replyTo, para, assunto, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to: [para],
      subject: assunto,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json?.message || json?.error?.message || `Resend HTTP ${resp.status}`;
    return { ok: false, motivo: msg };
  }
  return { ok: true };
}

/**
 * Envia um e-mail. Retorna { ok, motivo }.
 * Nunca lança — em caso de erro devolve ok:false para o chamador decidir.
 *
 * Prioridade: se houver chave do Resend, usa Resend (HTTPS, funciona no
 * Railway). Senão, tenta SMTP. Senão, devolve "nao_configurado".
 */
export async function enviarEmail({ para, assunto, html }) {
  try {
    const from = (await getConfig("smtp_from")) || (await getConfig("smtp_user")) || "onboarding@resend.dev";
    const replyTo = await getConfig("email_reply_to");

    // 1) Resend (recomendado no Railway)
    const resendKey = await getConfig("resend_api_key");
    if (resendKey) {
      return await enviarViaResend({ apiKey: resendKey, from, replyTo, para, assunto, html });
    }

    // 2) SMTP (fallback)
    const tp = await transporte();
    if (!tp) return { ok: false, motivo: "email_nao_configurado" };
    await tp.sendMail({ from, to: para, subject: assunto, html, replyTo: replyTo || undefined });
    return { ok: true };
  } catch (err) {
    console.error("[email] falha ao enviar:", err.message);
    return { ok: false, motivo: err.message };
  }
}

// ---------------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------------

export function emailRecuperacaoSenha(link) {
  return {
    assunto: "Recuperação de senha — Aqualife",
    html: moldura("Recuperar sua senha", `
      <p style="color:#334155;font-size:15px;line-height:1.6">
        Recebemos um pedido para redefinir a senha da sua conta Aqualife.
        Clique no botão abaixo para criar uma nova senha. O link é válido por 60 minutos.</p>
      <p>${botao(link, "Criar nova senha")}</p>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6">
        Se você não pediu isto, pode ignorar este e-mail — sua senha continua a mesma.</p>`),
  };
}

export function emailConfirmacaoPagamento({ nome, plano, valorCents, validade }) {
  const valor = "R$ " + (valorCents / 100).toFixed(2).replace(".", ",");
  const val = validade ? new Date(validade).toLocaleDateString("pt-BR") : null;
  return {
    assunto: "Pagamento confirmado — Aqualife Care",
    html: moldura("Pagamento confirmado ✅", `
      <p style="color:#334155;font-size:15px;line-height:1.6">
        Olá${nome ? `, ${nome.split(" ")[0]}` : ""}! Recebemos o seu pagamento e a sua
        assinatura <b>${plano}</b> já está ativa.</p>
      <table style="width:100%;font-size:14px;color:#334155;margin:12px 0">
        <tr><td style="padding:6px 0;color:#94a3b8">Valor</td><td style="text-align:right"><b>${valor}</b></td></tr>
        ${val ? `<tr><td style="padding:6px 0;color:#94a3b8">Acesso válido até</td><td style="text-align:right"><b>${val}</b></td></tr>` : ""}
      </table>
      <p>${botao("https://app.aqualifeaquarismo.com/dashboard.html", "Ir para o meu painel")}</p>`),
  };
}

export function emailBoasVindasFundador({ nome }) {
  return {
    assunto: "🎉 Bem-vindo(a), Membro Fundador — Aqualife Care",
    html: moldura("Você é um Membro Fundador! 🎉", `
      <p style="color:#334155;font-size:15px;line-height:1.6">
        Olá${nome ? `, ${nome.split(" ")[0]}` : ""}! Que alegria ter você entre os primeiros.
        Como Membro Fundador do Aqualife Care, você garante:</p>
      <ul style="color:#334155;font-size:14px;line-height:1.9">
        <li>Preço congelado enquanto a assinatura permanecer ativa</li>
        <li>Acesso antecipado às novas funcionalidades</li>
        <li>Badge exclusivo "Founding Member" no seu perfil</li>
        <li>Prioridade no suporte e convites para testes beta</li>
      </ul>
      <p style="color:#334155;font-size:15px;line-height:1.6">
        Obrigado por construir esse ecossistema com a gente. 🐠</p>
      <p>${botao("https://app.aqualifeaquarismo.com/dashboard.html", "Explorar a plataforma")}</p>`),
  };
}

export function emailTeste() {
  return {
    assunto: "Teste de envio — Aqualife",
    html: moldura("Funcionou! ✅", `
      <p style="color:#334155;font-size:15px;line-height:1.6">
        Se você recebeu este e-mail, o SMTP do Aqualife está configurado corretamente
        e os e-mails automáticos (recuperação de senha, confirmação de pagamento) já vão funcionar.</p>`),
  };
}
