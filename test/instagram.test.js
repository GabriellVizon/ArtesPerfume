const test = require("node:test");
const assert = require("node:assert/strict");
const { criarClienteInstagram } = require("../services/instagram");
const env = { CATALOGO_MODE: "instagram", INSTAGRAM_USER_ID: "123", INSTAGRAM_ACCESS_TOKEN: "token-de-teste", META_API_VERSION: "v25.0" };

test("modo demo não chama a Meta", async () => {
    const buscar = criarClienteInstagram({ env: {}, http: { get() { assert.fail("chamada inesperada"); } } });
    assert.equal((await buscar()).mode, "demo");
});
test("credenciais incompletas não viram dados fictícios", async () => {
    await assert.rejects(criarClienteInstagram({ env: { INSTAGRAM_USER_ID: "123" } })(), { code: "CONFIGURATION_ERROR" });
});
test("pagina, elimina duplicatas e compartilha cache entre chamadas", async () => {
    let chamadas = 0;
    const http = { async get(url, options) {
        chamadas++;
        assert.equal(url, "https://graph.facebook.com/v25.0/123/media");
        assert.equal(options.headers.Authorization, "Bearer token-de-teste");
        assert.equal(options.params.access_token, undefined);
        return options.params.after ? { data: { data: [{ id: "1" }, { id: "2" }] } }
            : { data: { data: [{ id: "1" }], paging: { next: "https://untrusted.example/", cursors: { after: "cursor" } } } };
    } };
    const buscar = criarClienteInstagram({ env, http });
    const [a, b] = await Promise.all([buscar(), buscar()]);
    assert.deepEqual(a.posts.map(p => p.id), ["1", "2"]);
    assert.deepEqual(a, b);
    await buscar();
    assert.equal(chamadas, 2);
});
test("token expirado retorna mensagem sem segredos e permite nova tentativa", async () => {
    let chamadas = 0;
    const buscar = criarClienteInstagram({ env, http: { async get() {
        chamadas++;
        if (chamadas === 1) throw { response: { data: { error: { code: 190, message: "token-de-teste" } } } };
        return { data: { data: [] } };
    } } });
    await assert.rejects(buscar(), erro => erro.code === "TOKEN_EXPIRED" && !erro.message.includes("token-de-teste"));
    assert.deepEqual((await buscar()).posts, []);
});
test("catálogo vazio real continua vazio e usa o host de Instagram Login", async () => {
    const buscar = criarClienteInstagram({ env: { ...env, INSTAGRAM_LOGIN_MODE: "instagram" }, http: { async get(url) {
        assert.ok(url.startsWith("https://graph.instagram.com/"));
        return { data: { data: [] } };
    } } });
    const resultado = await buscar();
    assert.equal(resultado.mode, "instagram");
    assert.deepEqual(resultado.posts, []);
});
