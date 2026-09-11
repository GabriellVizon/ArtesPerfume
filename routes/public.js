const express = require("express");

function httpsUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value.trim());
        return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch { return null; }
}

function criarRotasPublicas({ buscarPosts, produtos, env = process.env, bancoConfigurado = false } = {}) {
    const router = express.Router();

    router.get("/config", (req, res) => {
        const whatsapp = String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
        res.set("Cache-Control", "public, max-age=300").json({
            brandName: env.PUBLIC_BRAND_NAME || "Aura Noir",
            brandSubtitle: env.PUBLIC_BRAND_SUBTITLE || "Atelier",
            whatsapp: /^\d{10,15}$/.test(whatsapp) ? whatsapp : null,
            instagramUrl: httpsUrl(env.PUBLIC_INSTAGRAM_URL)
        });
    });

    router.get("/instagram", async (req, res, next) => {
        try {
            const resultado = await buscarPosts();
            res.set("Cache-Control", "no-store").json(resultado.posts);
        } catch (erro) { next(erro); }
    });

    router.get("/catalogo", async (req, res, next) => {
        try {
            const resultado = await produtos.listar();
            res.set("Cache-Control", "no-store");
            res.set("X-Catalogo-Modo", resultado.mode);
            res.json(resultado.produtos);
        } catch (erro) { next(erro); }
    });

    router.get("/catalogo/:id", async (req, res, next) => {
        try {
            const resultado = await produtos.listar();
            const produto = resultado.produtos.find(item => String(item.id) === String(req.params.id));
            if (!produto) return res.status(404).json({ erro: "Perfume não encontrado.", codigo: "NOT_FOUND" });
            res.set("Cache-Control", "no-store");
            res.set("X-Catalogo-Modo", resultado.mode);
            res.json(produto);
        } catch (erro) { next(erro); }
    });

    router.get("/status", async (req, res, next) => {
        try {
            const resultado = await buscarPosts();
            res.set("Cache-Control", "no-store").json({
                modo: resultado.mode,
                atualizadoEm: resultado.atualizadoEm,
                limitado: resultado.limitado,
                hashtag: env.CATALOGO_HASHTAG || "puxarparaocatalogo",
                bancoConfigurado
            });
        } catch (erro) { next(erro); }
    });

    return router;
}

module.exports = { criarRotasPublicas };
