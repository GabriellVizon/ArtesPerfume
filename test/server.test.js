const test = require("node:test");
const assert = require("node:assert/strict");
const { criarApp } = require("../server");
const { InstagramError } = require("../services/instagram");
const { criarProdutosRepoMemoria, criarAuthRepoMemoria, servidorTemporario } = require("./helpers");

function appCom(buscar) {
    return criarApp(buscar, {
        pool: null,
        produtosRepo: criarProdutosRepoMemoria(),
        authRepo: criarAuthRepoMemoria(),
        env: { CATALOGO_HASHTAG: "puxarparaocatalogo", WHATSAPP_NUMBER: "5511999999999" }
    });
}

test("API pública preserva catálogo e informa origem", async () => {
    const buscar = async () => ({ mode: "demo", posts: [{ id: "1", caption: "Floral\nR$ 89,90\n#puxarparaocatalogo" }], atualizadoEm: null, limitado: false });
    await servidorTemporario(appCom(buscar), async base => {
        const response = await fetch(`${base}/api/catalogo`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("X-Catalogo-Modo"), "demo");
        assert.equal((await response.json())[0].preco, 89.9);
        const status = await (await fetch(`${base}/api/status`)).json();
        assert.equal(status.modo, "demo");
        assert.equal(status.bancoConfigurado, false);
        const detalhe = await fetch(`${base}/api/catalogo/1`);
        assert.equal(detalhe.status, 200);
        assert.equal((await detalhe.json()).nome, "Floral");
        const config = await (await fetch(`${base}/api/config`)).json();
        assert.equal(config.whatsapp, "5511999999999");
        assert.equal(config.brandName, "Aura Noir");
        assert.equal((await fetch(base)).status, 200);
    });
});

test("health informa banco não configurado no desenvolvimento", async () => {
    const buscar = async () => ({ mode: "demo", posts: [], atualizadoEm: null, limitado: false });
    await servidorTemporario(appCom(buscar), async base => {
        const resposta = await fetch(`${base}/health`);
        assert.equal(resposta.status, 200);
        assert.deepEqual(await resposta.json(), { status: "ok", database: "not_configured" });
    });
});

test("health retorna 503 se banco configurado estiver indisponível", async () => {
    const buscar = async () => ({ mode: "demo", posts: [], atualizadoEm: null, limitado: false });
    const pool = { async query() { throw new Error("down"); } };
    const app = criarApp(buscar, {
        pool,
        produtosRepo: criarProdutosRepoMemoria(),
        authRepo: criarAuthRepoMemoria(),
        env: { CATALOGO_HASHTAG: "puxarparaocatalogo" }
    });
    await servidorTemporario(app, async base => {
        const resposta = await fetch(`${base}/health`);
        assert.equal(resposta.status, 503);
        assert.deepEqual(await resposta.json(), { status: "degraded", database: "unavailable" });
    });
});

test("falha da Meta retorna erro sem catálogo fictício", async () => {
    const buscar = async () => { throw new InstagramError("Conexão expirada", "TOKEN_EXPIRED", 503); };
    await servidorTemporario(appCom(buscar), async base => {
        const response = await fetch(`${base}/api/catalogo`);
        assert.equal(response.status, 503);
        assert.equal((await response.json()).codigo, "TOKEN_EXPIRED");
    });
});

test("Helmet aplica cabeçalhos de segurança", async () => {
    const buscar = async () => ({ mode: "demo", posts: [], atualizadoEm: null, limitado: false });
    await servidorTemporario(appCom(buscar), async base => {
        const resposta = await fetch(`${base}/health`);
        assert.equal(resposta.headers.get("x-content-type-options"), "nosniff");
        assert.ok(resposta.headers.get("content-security-policy"));
        assert.equal(resposta.headers.get("x-frame-options"), "SAMEORIGIN");
    });
});
