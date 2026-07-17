import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => console.error("[DB] erro no pool:", err.message));

export async function query(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    console.error("[DB] erro:", err.message, "|", sql.slice(0, 100));
    throw err;
  }
}

export async function testarConexao() {
  try {
    const r = await pool.query("SELECT NOW() as t");
    console.log("[DB] Railway PostgreSQL conectado:", r.rows[0].t);
    return true;
  } catch (err) {
    console.error("[DB] falha:", err.message);
    return false;
  }
}
