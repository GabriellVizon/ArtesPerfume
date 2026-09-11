const { lerCookies } = require("./cookies");

function criarMiddlewareAuth({ auth, env = process.env } = {}) {
    const nome = env.SESSION_COOKIE_NAME || "ap_session";
    return async function exigirAuth(req, res, next) {
        try {
            const token = lerCookies(req.headers.cookie)[nome];
            const sessao = await auth.autenticar(token);
            if (!sessao) {
                return res.status(401).json({ erro: "Sessão administrativa inválida ou expirada.", codigo: "UNAUTHORIZED" });
            }
            req.admin = sessao.usuario;
            req.adminSession = { token, tokenHash: sessao.tokenHash };
            next();
        } catch (erro) {
            next(erro);
        }
    };
}

module.exports = { criarMiddlewareAuth };
