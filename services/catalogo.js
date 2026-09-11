const HASHTAG_PADRAO = "puxarparaocatalogo";
const TAGS = /#[\p{L}\p{N}_]+/gu;

function urlSegura(valor) {
    if (typeof valor !== "string") return null;
    try {
        const url = new URL(valor);
        return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch { return null; }
}

function extrairPreco(legenda) {
    const valor = legenda.match(/R\$\s*([\d.,]+)/i)?.[1];
    if (!valor || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{2})?$/.test(valor)) return null;
    const preco = Number(valor.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(preco) && Number.isSafeInteger(Math.round(preco * 100)) ? preco : null;
}

function transformarPostEmProduto(post, opcoes = {}) {
    if (!post || typeof post.caption !== "string") return null;
    const hashtag = String(opcoes.hashtag ?? process.env.CATALOGO_HASHTAG ?? HASHTAG_PADRAO)
        .replace(/^#/, "").toLocaleLowerCase("pt-BR");
    const tags = post.caption.match(TAGS) || [];
    if (!tags.some(tag => tag.slice(1).toLocaleLowerCase("pt-BR") === hashtag)) return null;
    const linhas = post.caption.split(/\r?\n/)
        .map(linha => linha.replace(TAGS, "").trim())
        .filter(linha => linha && !/^(?:preço\s*:\s*)?R\$\s*[\d.,]+\s*$/i.test(linha));
    const midia = post.media_type === "CAROUSEL_ALBUM" ? post.children?.data?.[0] || post : post;
    const imagem = midia.media_type === "VIDEO" ? urlSegura(midia.thumbnail_url)
        : urlSegura(midia.media_url) || urlSegura(midia.thumbnail_url);
    const whatsapp = String(opcoes.whatsapp ?? process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
    return {
        id: post.id, nome: linhas[0] || "Produto", preco: extrairPreco(post.caption), imagem,
        descricao: linhas.slice(1).join(" "),
        whatsapp: /^\d{10,15}$/.test(whatsapp) ? whatsapp : null,
        instagram: urlSegura(post.permalink)
    };
}
module.exports = { transformarPostEmProduto, extrairPreco };
