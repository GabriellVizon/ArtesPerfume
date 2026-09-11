const { Pool } = require("pg");
const { AppError } = require("../errors/AppError");

function boolEnv(valor) {
    return ["1", "true", "yes", "on"].includes(String(valor || "").toLowerCase());
}

function criarPool(env = process.env, opcoes = {}) {
    const connectionString = env.DATABASE_URL;
    const required = opcoes.required ?? env.NODE_ENV === "production";

    if (!connectionString) {
        if (required) {
            throw new AppError(
                "DATABASE_URL é obrigatória em produção.",
                "DATABASE_NOT_CONFIGURED",
                503
            );
        }
        return null;
    }

    return new Pool({
        connectionString,
        max: Number(env.DB_POOL_MAX || 10),
        idleTimeoutMillis: Number(env.DB_IDLE_TIMEOUT_MS || 30000),
        connectionTimeoutMillis: Number(env.DB_CONNECTION_TIMEOUT_MS || 5000),
        ssl: boolEnv(env.DB_SSL) ? { rejectUnauthorized: false } : undefined
    });
}

async function verificarBanco(pool) {
    if (!pool) return { configurado: false, ok: false };
    try {
        await pool.query("SELECT 1");
        return { configurado: true, ok: true };
    } catch {
        return { configurado: true, ok: false };
    }
}

module.exports = { criarPool, verificarBanco, boolEnv };
