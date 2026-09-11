const test = require("node:test");
const assert = require("node:assert/strict");
const { criarServicoProdutos } = require("../services/produtos");
const { criarProdutosRepoMemoria } = require("./helpers");

const buscarInstagram = async () => ({
    mode: "instagram",
    atualizadoEm: "2026-09-10T00:00:00.000Z",
    limitado: false,
    posts: [{
        id: "ig_1",
        caption: "Perfume da Meta\nDescrição original\nR$ 120,00\n#puxarparaocatalogo",
        media_type: "IMAGE",
        media_url: "https://example.com/meta.jpg",
        permalink: "https://instagram.com/p/abc"
    }]
});

function servico() {
    return criarServicoProdutos({
        buscarPosts: buscarInstagram,
        repo: criarProdutosRepoMemoria(),
        env: { CATALOGO_HASHTAG: "puxarparaocatalogo", WHATSAPP_NUMBER: "5511999999999" }
    });
}

test("CRUD manual e estoque funcionam com repositório assíncrono", async () => {
    const produtos = servico();
    const criado = await produtos.criar({ nome: "Manual", preco: "59,90", estoque: 2, destaque: true });
    assert.equal(criado.origem, "manual");
    assert.equal(criado.preco, 59.9);
    assert.equal((await produtos.estoque(criado.id, { delta: 3 })).estoque, 5);
    assert.equal((await produtos.atualizar(criado.id, { recomendado: true })).recomendado, true);
    assert.equal((await produtos.listar()).produtos.length, 2);
    await produtos.remover(criado.id);
    assert.equal((await produtos.listar()).produtos.length, 1);
});

test("produto do Instagram recebe override e pode ser arquivado", async () => {
    const produtos = servico();
    const editado = await produtos.atualizar("ig_1", { nome: "Nome da Loja", estoque: 4, recomendado: true });
    assert.equal(editado.nome, "Nome da Loja");
    assert.equal(editado.estoque, 4);
    assert.equal((await produtos.listar()).produtos[0].nome, "Nome da Loja");
    await produtos.remover("ig_1");
    assert.deepEqual((await produtos.listar()).produtos, []);
    assert.equal((await produtos.listar({ admin: true })).produtos[0].arquivado, true);
});

test("dashboard consolida origens e status", async () => {
    const produtos = servico();
    await produtos.criar({ nome: "Manual", estoque: 0, recomendado: true });
    await produtos.atualizar("ig_1", { destaque: true });
    const d = await produtos.dashboard();
    assert.equal(d.total, 2);
    assert.equal(d.manuais, 1);
    assert.equal(d.instagram, 1);
    assert.equal(d.semEstoque, 1);
    assert.equal(d.destaques, 1);
    assert.equal(d.recomendados, 1);
});
