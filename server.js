const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const express = require("express");
const helmet = require("helmet");
const { buscarPostsInstagram } = require("./services/instagram");
const { criarPool, verificarBanco } = require("./db/pool");
const { criarRepositorioProdutos } = require("./repositories/produtosRepository");
const { criarRepositorioAuth } = require("./repositories/authRepository");
const { criarServicoProdutos } = require("./services/produtos");
const { criarServicoAuth } = require("./services/auth");
const { criarMiddlewareAuth } = require("./middleware/auth");
const { criarRotasPublicas } = require("./routes/public");
const { criarRotasAdmin } = require("./routes/admin");
const { criarRotasAuth } = require("./routes/auth");

function criarApp(buscar = buscarPostsInstagram, opcoes = {}) {
    const env = opcoes.env || process.env;
    const pool = opcoes.pool !== undefined ? opcoes.pool : criarPool(env);
    const produtosRepo = opcoes.produtosRepo || criarRepositorioProdutos(pool);
    const authRepo = opcoes.authRepo || criarRepositorioAuth(pool);
    const produtos = opcoes.produtos || criarServicoProdutos({ buscarPosts: buscar, repo: produtosRepo, env });
    const auth = opcoes.auth || criarServicoAuth({ repo: authRepo, env });
    const exigirAuth = opcoes.exigirAuth || criarMiddlewareAuth({ auth, env });
    const app = express();

    if (env.NODE_ENV === "production") app.set("trust proxy", 1);
    app.disable("x-powered-by");

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"]
            }
        },
        referrerPolicy: { policy: "no-referrer" }
    }));
    app.use(express.json({ limit: "4mb" }));

    app.get("/health", async (req, res) => {
        const banco = await verificarBanco(pool);
        const ok = !banco.configurado || banco.ok;
        res.status(ok ? 200 : 503).set("Cache-Control", "no-store").json({
            status: ok ? "ok" : "degraded",
            database: banco.configurado ? (banco.ok ? "ok" : "unavailable") : "not_configured"
        });
    });

    app.use("/api/auth", criarRotasAuth({ auth, exigirAuth, env, loginRateLimit: opcoes.loginRateLimit }));
    app.use("/api/admin", criarRotasAdmin({ produtos, exigirAuth }));
    app.use("/api", criarRotasPublicas({ buscarPosts: buscar, produtos, env, bancoConfigurado: Boolean(pool) }));

    app.use(express.static(path.join(__dirname, "public"), {
        etag: true,
        maxAge: env.NODE_ENV === "production" ? "1h" : 0
    }));

    app.use("/api", (req, res) => {
        res.status(404).json({ erro: "Rota não encontrada.", codigo: "NOT_FOUND" });
    });

    app.use((erro, req, res, next) => {
        if (res.headersSent) return next(erro);
        if (erro?.type === "entity.parse.failed") {
            return res.status(400).json({ erro: "JSON inválido.", codigo: "INVALID_JSON" });
        }
        const status = Number.isInteger(erro.status) ? erro.status : 500;
        if (status >= 500 && !erro.code) console.error("Erro interno:", erro.message);
        res.status(status).json({
            erro: erro.code ? erro.message : "Não foi possível concluir a operação.",
            codigo: erro.code || "INTERNAL_ERROR"
        });
    });

    return app;
}

if (require.main === module) {
    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || "127.0.0.1";
    const app = criarApp();
    app.listen(port, host, () => {
        console.log(`ArtesPerfume disponível em http://${host}:${port}`);
        if (!process.env.DATABASE_URL) {
            console.warn("PostgreSQL não configurado: o catálogo demo funciona, mas o painel administrativo ficará indisponível.");
        }
    });
}

module.exports = { criarApp };
