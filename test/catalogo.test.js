const test = require("node:test");
const assert = require("node:assert/strict");
const { transformarPostEmProduto, extrairPreco } = require("../services/catalogo");
const opcoes = { hashtag: "puxarparaocatalogo", whatsapp: "5511999999999" };
const post = { id: "1", caption: "Perfume Floral\nFragrância delicada.\nR$ 1.299,90\n#PUXARPARAOCATALOGO", media_type: "IMAGE", media_url: "https://example.com/perfume.jpg" };
test("transforma legenda em produto", () => {
    const produto = transformarPostEmProduto(post, opcoes);
    assert.equal(produto.nome, "Perfume Floral");
    assert.equal(produto.descricao, "Fragrância delicada.");
    assert.equal(produto.preco, 1299.9);
    assert.equal(produto.whatsapp, "5511999999999");
});
test("ignora legenda ausente e hashtags com sufixos", () => {
    for (const caption of [undefined, "Bom dia!", "#puxarparaocatalogoextra", "#puxarparaocatalogo_2", "#puxarparaocatalogoção"]) {
        assert.equal(transformarPostEmProduto({ ...post, caption }, opcoes), null);
    }
    assert.equal(transformarPostEmProduto(null, opcoes), null);
});
test("valida preços brasileiros", () => {
    for (const [texto, esperado] of [["R$ 89,90", 89.9], ["R$99", 99], ["R$ 1.299", 1299], ["R$ 0,00", 0], ["Consultar", null], ["R$ 12,3,4", null], ["R$ 89.90", null]]) {
        assert.equal(extrairPreco(texto), esperado, texto);
    }
});
test("usa capa do vídeo e primeira mídia do carrossel", () => {
    const video = { media_type: "VIDEO", media_url: "https://example.com/video.mp4", thumbnail_url: "https://example.com/capa.jpg" };
    assert.equal(transformarPostEmProduto({ ...post, ...video }, opcoes).imagem, video.thumbnail_url);
    assert.equal(transformarPostEmProduto({ ...post, media_type: "CAROUSEL_ALBUM", children: { data: [video] } }, opcoes).imagem, video.thumbnail_url);
    assert.equal(transformarPostEmProduto({ ...post, ...video, thumbnail_url: undefined }, opcoes).imagem, null);
});
test("configura hashtag e rejeita links inválidos", () => {
    const produto = transformarPostEmProduto({ ...post, caption: "Floral\n#catalogo", media_url: "javascript:alert(1)", permalink: "javascript:alert(1)" }, { hashtag: "#catalogo", whatsapp: "" });
    assert.equal(produto.nome, "Floral");
    assert.equal(produto.imagem, null);
    assert.equal(produto.instagram, null);
    assert.equal(produto.whatsapp, null);
});
