const express = require("express");
const { cookieSessao, limparCookie, lerCookies } = require("../middleware/cookies");
const { criarLoginRateLimit } = require("../middleware/rateLimit");
const { mesmaOrigem } = require("../middleware/sameOrigin");
const { boolEnv } = require("../db/pool");

function criarRotasAuth({ auth, exigirAuth, env = process.env, loginRateLimit } = {}) {
    const router = express.Router();
    const nomeCookie = env.SESSION_COOKIE_NAME || "ap_session";
    const secure = boolEnv(env.SESSION_COOKIE_SECURE) || env.NODE_ENV === "production";
    const limiter = loginRateLimit || criarLoginRateLimit({ env });

    router.post("/login", mesmaOrigem, limiter, async (req, res, next) => {
        try {
            const resultado = await auth.login(req.body?.email, req.body?.senha);
            req.loginRateLimit?.sucesso();
            res.setHeader("Set-Cookie", cookieSessao(nomeCookie, resultado.token, {
                secure,
                maxAgeSeconds: auth.ttlHoras * 60 * 60
            }));
            res.set("Cache-Control", "no-store").json({ usuario: resultado.usuario, expiraEm: resultado.expiresAt });
        } catch (erro) {
            if (erro.code === "INVALID_CREDENTIALS") req.loginRateLimit?.falhou();
            next(erro);
        }
    });

    router.get("/me", exigirAuth, (req, res) => {
        res.set("Cache-Control", "no-store").json({ usuario: req.admin });
    });

    router.post("/logout", mesmaOrigem, async (req, res, next) => {
        try {
            const token = lerCookies(req.headers.cookie)[nomeCookie];
            await auth.logout(token);
            res.setHeader("Set-Cookie", limparCookie(nomeCookie, { secure }));
            res.set("Cache-Control", "no-store").json({ saiu: true });
        } catch (erro) { next(erro); }
    });

    router.post("/change-password", mesmaOrigem, exigirAuth, async (req, res, next) => {
        try {
            await auth.alterarSenha({
                userId: req.admin.id,
                senhaAtual: req.body?.senhaAtual,
                novaSenha: req.body?.novaSenha
            });
            res.setHeader("Set-Cookie", limparCookie(nomeCookie, { secure }));
            res.set("Cache-Control", "no-store").json({ alterada: true, requerNovoLogin: true });
        } catch (erro) { next(erro); }
    });

    return router;
}

module.exports = { criarRotasAuth };
