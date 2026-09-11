const express = require("express");
const { mesmaOrigem } = require("../middleware/sameOrigin");

function criarRotasAdmin({ produtos, exigirAuth } = {}) {
    const router = express.Router();
    router.use(exigirAuth);

    router.get("/dashboard", async (req, res, next) => {
        try { res.set("Cache-Control", "no-store").json(await produtos.dashboard()); }
        catch (erro) { next(erro); }
    });

    router.get("/produtos", async (req, res, next) => {
        try {
            const resultado = await produtos.listar({ admin: true });
            res.set("Cache-Control", "no-store").json(resultado.produtos);
        } catch (erro) { next(erro); }
    });

    router.get("/produtos/:id", async (req, res, next) => {
        try {
            const produto = await produtos.buscarPorId(req.params.id);
            if (!produto) return res.status(404).json({ erro: "Produto não encontrado.", codigo: "NOT_FOUND" });
            res.set("Cache-Control", "no-store").json(produto);
        } catch (erro) { next(erro); }
    });

    router.post("/produtos", mesmaOrigem, async (req, res, next) => {
        try { res.status(201).set("Cache-Control", "no-store").json(await produtos.criar(req.body)); }
        catch (erro) { next(erro); }
    });

    router.patch("/produtos/:id", mesmaOrigem, async (req, res, next) => {
        try { res.set("Cache-Control", "no-store").json(await produtos.atualizar(req.params.id, req.body)); }
        catch (erro) { next(erro); }
    });

    router.patch("/produtos/:id/estoque", mesmaOrigem, async (req, res, next) => {
        try { res.set("Cache-Control", "no-store").json(await produtos.estoque(req.params.id, req.body)); }
        catch (erro) { next(erro); }
    });

    router.delete("/produtos/:id", mesmaOrigem, async (req, res, next) => {
        try { res.set("Cache-Control", "no-store").json(await produtos.remover(req.params.id)); }
        catch (erro) { next(erro); }
    });

    return router;
}

module.exports = { criarRotasAdmin };
