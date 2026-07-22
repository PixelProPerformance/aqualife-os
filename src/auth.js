import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "./db.js";

const SECRET = (process.env.JWT_SECRET || "aqualife-dev-TROQUE-EM-PRODUCAO").trim();
const EXPIRY  = "12h";

export async function hashSenha(senha) {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verificarToken(token) {
  try { return jwt.verify(token, SECRET); }
  catch { return null; }
}

/** Middleware — injeta req.usuario ou responde 401. */
export async function exigeLogin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ erro: "não autenticado" });

  const payload = verificarToken(auth.slice(7));
  if (!payload) return res.status(401).json({ erro: "token inválido ou expirado" });

  // Revalida que o usuário ainda existe e está ativo
  try {
    const r = await query(
      "SELECT id, name, email, role, organization_id FROM app_user WHERE id=$1 AND ativo=true",
      [payload.id]
    );
    if (!r.rows[0]) return res.status(401).json({ erro: "usuário não encontrado" });
    req.usuario = r.rows[0];
    next();
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
}

/** Middleware — exige papel admin ou gestor. */
export function exigeAdmin(req, res, next) {
  if (!["admin", "gestor"].includes(req.usuario?.role))
    return res.status(403).json({ erro: "acesso restrito à administração" });
  next();
}

// ============================================================
// RECUPERAÇÃO DE SENHA
// ============================================================
// Nota: o envio real de e-mail entra numa fase seguinte (SMTP/Resend).
// Por agora o link é devolvido/registado no log para permitir testar o fluxo
// end-to-end sem depender de um provedor de e-mail configurado.

const RESET_EXPIRY_MIN = 60;

/** Gera um token de recuperação de senha válido por 60 minutos. */
export async function solicitarRecuperacaoSenha(email) {
  const r = await query("SELECT id FROM app_user WHERE email=$1 AND ativo=true", [email]);
  const usuario = r.rows[0];
  // Não revela se o e-mail existe ou não (evita enumeração de contas).
  if (!usuario) return { ok: true };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MIN * 60 * 1000);

  await query(
    "INSERT INTO password_reset_token (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [usuario.id, token, expiresAt]
  );

  return { ok: true, token }; // server.js decide se expõe o token (dev) ou só envia e-mail (prod)
}

/** Valida o token e troca a senha do usuário. */
export async function redefinirSenha(token, novaSenha) {
  const r = await query(
    "SELECT id, user_id, expires_at, used FROM password_reset_token WHERE token=$1",
    [token]
  );
  const registro = r.rows[0];
  if (!registro) return { ok: false, erro: "token inválido" };
  if (registro.used) return { ok: false, erro: "token já utilizado" };
  if (new Date(registro.expires_at) < new Date()) return { ok: false, erro: "token expirado" };

  const hash = await hashSenha(novaSenha);
  await query("UPDATE app_user SET senha_hash=$1 WHERE id=$2", [hash, registro.user_id]);
  await query("UPDATE password_reset_token SET used=true WHERE id=$1", [registro.id]);

  return { ok: true };
}
