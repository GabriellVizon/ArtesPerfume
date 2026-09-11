const crypto = require("node:crypto");
const { AppError } = require("../errors/AppError");

function normalizarEmail(email) {
    if (typeof email !== "string") return "";
    return email.trim().toLowerCase();
}

function criarRepositorioAuth(pool) {
    if (!pool) return criarRepositorioAuthNulo();

    async function buscarUsuarioPorEmail(email) {
        const { rows } = await pool.query(
            "SELECT * FROM admin_users WHERE LOWER(email) = LOWER($1) LIMIT 1",
            [normalizarEmail(email)]
        );
        return rows[0] || null;
    }

    async function buscarUsuarioPorId(id) {
        const { rows } = await pool.query("SELECT * FROM admin_users WHERE id = $1 LIMIT 1", [id]);
        return rows[0] || null;
    }

    async function criarUsuario({ email, passwordHash }) {
        const id = crypto.randomUUID();
        try {
            const { rows } = await pool.query(
                `INSERT INTO admin_users (id, email, password_hash)
                 VALUES ($1, $2, $3)
                 RETURNING id, email, active, created_at, updated_at, last_login_at`,
                [id, normalizarEmail(email), passwordHash]
            );
            return rows[0];
        } catch (erro) {
            if (erro.code === "23505") {
                throw new AppError("Já existe um administrador com este email.", "EMAIL_IN_USE", 409);
            }
            throw erro;
        }
    }

    async function atualizarSenha(userId, passwordHash) {
        const { rows } = await pool.query(
            `UPDATE admin_users
             SET password_hash = $2, updated_at = NOW()
             WHERE id = $1 AND active = TRUE
             RETURNING id, email, active`,
            [userId, passwordHash]
        );
        if (!rows[0]) throw new AppError("Administrador não encontrado.", "NOT_FOUND", 404);
        return rows[0];
    }

    async function marcarLogin(userId) {
        await pool.query("UPDATE admin_users SET last_login_at = NOW() WHERE id = $1", [userId]);
    }

    async function criarSessao({ tokenHash, userId, expiresAt }) {
        await pool.query(
            `INSERT INTO admin_sessions (token_hash, user_id, expires_at)
             VALUES ($1, $2, $3)`,
            [tokenHash, userId, expiresAt]
        );
    }

    async function buscarSessao(tokenHash) {
        const { rows } = await pool.query(
            `SELECT s.token_hash, s.user_id, s.expires_at, s.last_seen_at,
                    u.email, u.active, u.password_hash
             FROM admin_sessions s
             JOIN admin_users u ON u.id = s.user_id
             WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active = TRUE
             LIMIT 1`,
            [tokenHash]
        );
        return rows[0] || null;
    }

    async function tocarSessao(tokenHash) {
        await pool.query("UPDATE admin_sessions SET last_seen_at = NOW() WHERE token_hash = $1", [tokenHash]);
    }

    async function removerSessao(tokenHash) {
        await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
    }

    async function removerSessoesDoUsuario(userId) {
        await pool.query("DELETE FROM admin_sessions WHERE user_id = $1", [userId]);
    }

    async function limparSessoesExpiradas() {
        const resultado = await pool.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()");
        return resultado.rowCount;
    }

    return {
        buscarUsuarioPorEmail,
        buscarUsuarioPorId,
        criarUsuario,
        atualizarSenha,
        marcarLogin,
        criarSessao,
        buscarSessao,
        tocarSessao,
        removerSessao,
        removerSessoesDoUsuario,
        limparSessoesExpiradas
    };
}

function criarRepositorioAuthNulo() {
    const indisponivel = async () => {
        throw new AppError(
            "O PostgreSQL ainda não está configurado. Configure DATABASE_URL para usar o login administrativo.",
            "DATABASE_NOT_CONFIGURED",
            503
        );
    };
    return {
        buscarUsuarioPorEmail: indisponivel,
        buscarUsuarioPorId: indisponivel,
        criarUsuario: indisponivel,
        atualizarSenha: indisponivel,
        marcarLogin: indisponivel,
        criarSessao: indisponivel,
        buscarSessao: indisponivel,
        tocarSessao: indisponivel,
        removerSessao: indisponivel,
        removerSessoesDoUsuario: indisponivel,
        limparSessoesExpiradas: indisponivel
    };
}

module.exports = { criarRepositorioAuth, criarRepositorioAuthNulo, normalizarEmail };
