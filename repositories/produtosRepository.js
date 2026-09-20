const crypto = require("node:crypto");
const { AppError } = require("../errors/AppError");
const { sanitizarProduto } = require("../services/validacaoProduto");

const COLUNAS = Object.freeze({
    nome: "nome",
    descricao: "descricao",
    preco: "preco",
    volumeMl: "volume_ml",
    imagem: "imagem",
    instagram: "instagram_url",
    estoque: "estoque",
    ativo: "ativo",
    destaque: "destaque",
    recomendado: "recomendado",
    novo: "novo",
    arquivado: "arquivado"
});

function mapear(row) {
    if (!row) return null;
    return {
        id: row.id || row.source_id,
        nome: row.nome ?? null,
        descricao: row.descricao ?? null,
        preco: row.preco === null || row.preco === undefined ? null : Number(row.preco),
        volumeMl: row.volume_ml === null || row.volume_ml === undefined ? null : Number(row.volume_ml),
        imagem: row.imagem ?? null,
        instagram: row.instagram_url ?? null,
        estoque: row.estoque === null || row.estoque === undefined ? null : Number(row.estoque),
        ativo: row.ativo,
        destaque: row.destaque,
        recomendado: row.recomendado,
        novo: row.novo,
        arquivado: row.arquivado,
        criadoEm: row.created_at?.toISOString?.() || row.created_at || null,
        atualizadoEm: row.updated_at?.toISOString?.() || row.updated_at || null
    };
}

function criarRepositorioProdutos(pool) {
    if (!pool) return criarRepositorioProdutosNulo();

    async function listarManuais() {
        const { rows } = await pool.query("SELECT * FROM manual_products ORDER BY created_at DESC");
        return rows.map(mapear);
    }

    async function buscarManual(id) {
        const { rows } = await pool.query("SELECT * FROM manual_products WHERE id = $1", [id]);
        return mapear(rows[0]);
    }

    async function criarManual(entrada) {
        const dados = sanitizarProduto(entrada, { criacao: true });
        const id = crypto.randomUUID();
        const produto = {
            nome: dados.nome,
            descricao: dados.descricao ?? null,
            preco: dados.preco ?? null,
            volumeMl: dados.volumeMl ?? null,
            imagem: dados.imagem ?? null,
            instagram: dados.instagram ?? null,
            estoque: dados.estoque !== undefined ? dados.estoque : 0,
            ativo: dados.ativo ?? true,
            destaque: dados.destaque ?? false,
            recomendado: dados.recomendado ?? false,
            novo: dados.novo ?? true,
            arquivado: dados.arquivado ?? false
        };
        const { rows } = await pool.query(
            `INSERT INTO manual_products
             (id,nome,descricao,preco,volume_ml,imagem,instagram_url,estoque,ativo,destaque,recomendado,novo,arquivado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [id, produto.nome, produto.descricao, produto.preco, produto.volumeMl, produto.imagem, produto.instagram,
                produto.estoque, produto.ativo, produto.destaque, produto.recomendado, produto.novo, produto.arquivado]
        );
        return mapear(rows[0]);
    }

    async function atualizarManual(id, entrada) {
        const patch = sanitizarProduto(entrada);
        if (patch.nome === null) throw new AppError("nome não pode ser vazio.", "VALIDATION_ERROR", 422);
        const entradas = Object.entries(patch);
        if (!entradas.length) return buscarManual(id);
        const valores = [id];
        const sets = entradas.map(([campo, valor], i) => {
            valores.push(valor);
            return `${COLUNAS[campo]} = $${i + 2}`;
        });
        const { rows } = await pool.query(
            `UPDATE manual_products SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            valores
        );
        if (!rows[0]) throw new AppError("Produto não encontrado.", "NOT_FOUND", 404);
        return mapear(rows[0]);
    }

    async function removerManual(id) {
        const resultado = await pool.query("DELETE FROM manual_products WHERE id = $1", [id]);
        return resultado.rowCount > 0;
    }

    async function listarOverrides() {
        const { rows } = await pool.query("SELECT * FROM product_overrides");
        const mapa = {};
        for (const row of rows) mapa[String(row.source_id)] = mapear(row);
        return mapa;
    }

    async function buscarOverride(id) {
        const { rows } = await pool.query("SELECT * FROM product_overrides WHERE source_id = $1", [String(id)]);
        return mapear(rows[0]);
    }

    async function atualizarOverride(id, entrada) {
        const patch = sanitizarProduto(entrada);
        const entradas = Object.entries(patch);
        if (!entradas.length) return buscarOverride(id);
        const colunas = entradas.map(([campo]) => COLUNAS[campo]);
        const valores = entradas.map(([, valor]) => valor);
        const placeholders = valores.map((_, i) => `$${i + 2}`);
        const updates = colunas.map(coluna => `${coluna} = EXCLUDED.${coluna}`);
        const { rows } = await pool.query(
            `INSERT INTO product_overrides (source_id, ${colunas.join(", ")})
             VALUES ($1, ${placeholders.join(", ")})
             ON CONFLICT (source_id) DO UPDATE SET ${updates.join(", ")}, updated_at = NOW()
             RETURNING *`,
            [String(id), ...valores]
        );
        return mapear(rows[0]);
    }

    return { listarManuais, buscarManual, criarManual, atualizarManual, removerManual, listarOverrides, buscarOverride, atualizarOverride };
}

function criarRepositorioProdutosNulo() {
    const indisponivel = async () => {
        throw new AppError(
            "O PostgreSQL ainda não está configurado. Configure DATABASE_URL para usar a administração.",
            "DATABASE_NOT_CONFIGURED",
            503
        );
    };
    return {
        listarManuais: async () => [],
        buscarManual: async () => null,
        criarManual: indisponivel,
        atualizarManual: indisponivel,
        removerManual: indisponivel,
        listarOverrides: async () => ({}),
        buscarOverride: async () => null,
        atualizarOverride: indisponivel
    };
}

module.exports = { criarRepositorioProdutos, criarRepositorioProdutosNulo, mapear };
