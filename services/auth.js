const crypto = require("node:crypto");
const { AppError } = require("../errors/AppError");
const { gerarHashSenha, verificarSenha, validarSenhaNova } = require("./senha");
const { normalizarEmail } = require("../repositories/authRepository");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sha256(valor) {
    return crypto.createHash("sha256").update(valor).digest("hex");
}

function criarServicoAuth({ repo, env = process.env, now = () => new Date() } = {}) {
    if (!repo) throw new TypeError("repo é obrigatório");
    const ttlHoras = Math.min(168, Math.max(1, Number(env.SESSION_TTL_HOURS || 8)));

    async function login(email, senha) {
        const emailNormalizado = normalizarEmail(email);
        if (!EMAIL.test(emailNormalizado) || typeof senha !== "string") {
            throw new AppError("Email ou senha inválidos.", "INVALID_CREDENTIALS", 401);
        }
        const usuario = await repo.buscarUsuarioPorEmail(emailNormalizado);
        const valido = usuario?.active === true && await verificarSenha(senha, usuario.password_hash);
        if (!valido) throw new AppError("Email ou senha inválidos.", "INVALID_CREDENTIALS", 401);

        await repo.limparSessoesExpiradas();
        const token = crypto.randomBytes(32).toString("base64url");
        const tokenHash = sha256(token);
        const expiresAt = new Date(now().getTime() + ttlHoras * 60 * 60 * 1000);
        await repo.criarSessao({ tokenHash, userId: usuario.id, expiresAt });
        await repo.marcarLogin(usuario.id);
        return { token, expiresAt, usuario: { id: usuario.id, email: usuario.email } };
    }

    async function autenticar(token) {
        if (typeof token !== "string" || token.length < 32 || token.length > 256) return null;
        const tokenHash = sha256(token);
        const sessao = await repo.buscarSessao(tokenHash);
        if (!sessao) return null;
        await repo.tocarSessao(tokenHash);
        return {
            tokenHash,
            usuario: { id: sessao.user_id, email: sessao.email }
        };
    }

    async function logout(token) {
        if (typeof token !== "string" || !token) return;
        await repo.removerSessao(sha256(token));
    }

    async function alterarSenha({ userId, senhaAtual, novaSenha }) {
        validarSenhaNova(novaSenha);
        const usuario = await repo.buscarUsuarioPorId(userId);
        if (!usuario || usuario.active !== true || !(await verificarSenha(senhaAtual, usuario.password_hash))) {
            throw new AppError("A senha atual está incorreta.", "INVALID_CURRENT_PASSWORD", 401);
        }
        if (senhaAtual === novaSenha) {
            throw new AppError("A nova senha deve ser diferente da senha atual.", "VALIDATION_ERROR", 422);
        }
        const hash = await gerarHashSenha(novaSenha);
        await repo.atualizarSenha(userId, hash);
        await repo.removerSessoesDoUsuario(userId);
        return { alterada: true };
    }

    return { login, autenticar, logout, alterarSenha, ttlHoras };
}

module.exports = { criarServicoAuth, sha256 };
