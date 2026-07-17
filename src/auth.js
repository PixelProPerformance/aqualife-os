import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
