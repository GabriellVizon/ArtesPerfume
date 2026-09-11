const { transformarPostEmProduto } = require("./catalogo");
const { AppError } = require("../errors/AppError");
const { calcularEstoque } = require("./validacaoProduto");

const PADRAO_ADMIN = Object.freeze({
    estoque: null,
    ativo: true,
    destaque: false,
    recomendado: false,
    novo: false,
    arquivado: false
});

function aplicarAdmin(produto, configuracao = {}, origem = "instagram") {
    const override = {};
    for (const [campo, valor] of Object.entries(configuracao || {})) {
        if (["id", "criadoEm", "atualizadoEm"].includes(campo)) continue;
        if (valor !== null && valor !== undefined) override[campo] = valor;
    }
    const combinado = { ...produto, ...PADRAO_ADMIN, ...override, origem };
    combinado.disponivel = combinado.estoque === null ? true : combinado.estoque > 0;
    return combinado;
}

function criarServicoProdutos({ buscarPosts, repo, env = process.env } = {}) {
    if (typeof buscarPosts !== "function") throw new TypeError("buscarPosts é obrigatório");
    if (!repo) throw new TypeError("repo é obrigatório");

    function opcoesCatalogo() {
        return {
            hashtag: env.CATALOGO_HASHTAG || "puxarparaocatalogo",
            whatsapp: env.WHATSAPP_NUMBER || ""
        };
    }

    function normalizarManual(produto) {
        const whatsapp = String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
        return aplicarAdmin({
            ...produto,
            whatsapp: /^\d{10,15}$/.test(whatsapp) ? whatsapp : null
        }, produto, "manual");
    }

    async function carregarInstagram() {
        const [resultado, configuracoes] = await Promise.all([buscarPosts(), repo.listarOverrides()]);
        const produtos = resultado.posts
            .map(post => transformarPostEmProduto(post, opcoesCatalogo()))
            .filter(Boolean)
            .map(produto => aplicarAdmin(
                produto,
                configuracoes[String(produto.id)] || {},
                resultado.mode === "demo" ? "demo" : "instagram"
            ));
        return { resultado, produtos };
    }

    async function listar({ admin = false } = {}) {
        const [{ resultado, produtos: instagram }, manuaisRaw] = await Promise.all([
            carregarInstagram(),
            repo.listarManuais()
        ]);
        const manuais = manuaisRaw.map(normalizarManual);
        const todos = [...manuais, ...instagram];
        const filtrados = admin ? todos : todos.filter(produto => produto.ativo && !produto.arquivado);
        return { ...resultado, produtos: filtrados };
    }

    async function buscarPorId(id) {
        const manual = await repo.buscarManual(id);
        if (manual) return normalizarManual(manual);
        const { produtos } = await carregarInstagram();
        return produtos.find(produto => String(produto.id) === String(id)) || null;
    }

    async function criar(entrada) {
        return normalizarManual(await repo.criarManual(entrada));
    }

    async function atualizar(id, entrada) {
        const manual = await repo.buscarManual(id);
        if (manual) return normalizarManual(await repo.atualizarManual(id, entrada));
        const existente = await buscarPorId(id);
        if (!existente) throw new AppError("Produto não encontrado.", "NOT_FOUND", 404);
        const configuracao = await repo.atualizarOverride(id, entrada);
        return aplicarAdmin(existente, configuracao, existente.origem);
    }

    async function remover(id) {
        if (await repo.removerManual(id)) return { removido: true, id, origem: "manual" };
        const existente = await buscarPorId(id);
        if (!existente) throw new AppError("Produto não encontrado.", "NOT_FOUND", 404);
        await repo.atualizarOverride(id, { ativo: false, arquivado: true });
        return { removido: true, id, origem: existente.origem, arquivado: true };
    }

    async function estoque(id, entrada) {
        const existente = await buscarPorId(id);
        if (!existente) throw new AppError("Produto não encontrado.", "NOT_FOUND", 404);
        const novoEstoque = calcularEstoque(existente.estoque, entrada || {});
        const manual = await repo.buscarManual(id);
        if (manual) return normalizarManual(await repo.atualizarManual(id, { estoque: novoEstoque }));
        const configuracao = await repo.atualizarOverride(id, { estoque: novoEstoque });
        return aplicarAdmin(existente, configuracao, existente.origem);
    }

    async function dashboard() {
        const { produtos } = await listar({ admin: true });
        const visiveis = produtos.filter(p => !p.arquivado);
        return {
            total: visiveis.length,
            ativos: visiveis.filter(p => p.ativo).length,
            inativos: visiveis.filter(p => !p.ativo).length,
            semEstoque: visiveis.filter(p => p.estoque === 0).length,
            estoqueControlado: visiveis.filter(p => Number.isInteger(p.estoque)).length,
            unidadesEmEstoque: visiveis.reduce((total, p) => total + (Number.isInteger(p.estoque) ? p.estoque : 0), 0),
            destaques: visiveis.filter(p => p.destaque).length,
            recomendados: visiveis.filter(p => p.recomendado).length,
            novos: visiveis.filter(p => p.novo).length,
            instagram: visiveis.filter(p => p.origem === "instagram").length,
            demo: visiveis.filter(p => p.origem === "demo").length,
            manuais: visiveis.filter(p => p.origem === "manual").length,
            arquivados: produtos.filter(p => p.arquivado).length
        };
    }

    return { listar, buscarPorId, criar, atualizar, remover, estoque, dashboard };
}

module.exports = { criarServicoProdutos, aplicarAdmin };
