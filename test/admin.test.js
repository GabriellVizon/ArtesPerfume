const test = require("node:test");
const assert = require("node:assert/strict");
const { criarApp } = require("../server");
const { criarServicoAuth } = require("../services/auth");
const { gerarHashSenha } = require("../services/senha");
const { criarProdutosRepoMemoria, criarAuthRepoMemoria, servidorTemporario } = require("./helpers");

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

async function appAutenticado() {
    const authRepo = criarAuthRepoMemoria();
    await authRepo.criarUsuario({ email: "admin@exemplo.com", passwordHash: await gerarHashSenha("senha-forte-123") });
    const env = {
        CATALOGO_HASHTAG: "puxarparaocatalogo",
        WHATSAPP_NUMBER: "5511999999999",
        SESSION_COOKIE_NAME: "ap_session",
        SESSION_TTL_HOURS: "8",
        LOGIN_MAX_ATTEMPTS: "5",
        LOGIN_WINDOW_MINUTES: "15"
    };
    const auth = criarServicoAuth({ repo: authRepo, env });
    return criarApp(buscarInstagram, {
        pool: null,
        produtosRepo: criarProdutosRepoMemoria(),
        authRepo,
        auth,
        env
    });
}

async function login(base, senha = "senha-forte-123") {
    const resposta = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@exemplo.com", senha })
    });
    return { resposta, cookie: resposta.headers.get("set-cookie")?.split(";")[0] };
}

function jsonHeaders(cookie) {
    return { "Content-Type": "application/json", Cookie: cookie };
}

test("rotas admin exigem sessão", async () => {
    await servidorTemporario(await appAutenticado(), async base => {
        const resposta = await fetch(`${base}/api/admin/produtos`);
        assert.equal(resposta.status, 401);
        assert.equal((await resposta.json()).codigo, "UNAUTHORIZED");
    });
});

test("login, CRUD, dashboard e logout funcionam de ponta a ponta", async () => {
    await servidorTemporario(await appAutenticado(), async base => {
        const { resposta, cookie } = await login(base);
        assert.equal(resposta.status, 200);
        assert.ok(cookie.startsWith("ap_session="));
        assert.match(resposta.headers.get("set-cookie"), /HttpOnly/i);
        assert.match(resposta.headers.get("set-cookie"), /SameSite=Lax/i);

        const criadoResp = await fetch(`${base}/api/admin/produtos`, {
            method: "POST",
            headers: jsonHeaders(cookie),
            body: JSON.stringify({ nome: "Produto Manual", preco: 59.9, estoque: 2, destaque: true })
        });
        assert.equal(criadoResp.status, 201);
        const criado = await criadoResp.json();

        const estoque = await fetch(`${base}/api/admin/produtos/${criado.id}/estoque`, {
            method: "PATCH", headers: jsonHeaders(cookie), body: JSON.stringify({ delta: 2 })
        });
        assert.equal((await estoque.json()).estoque, 4);

        const dashboard = await (await fetch(`${base}/api/admin/dashboard`, { headers: { Cookie: cookie } })).json();
        assert.equal(dashboard.total, 2);
        assert.equal(dashboard.manuais, 1);

        const logout = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: jsonHeaders(cookie), body: "{}" });
        assert.equal(logout.status, 200);
        const depois = await fetch(`${base}/api/admin/dashboard`, { headers: { Cookie: cookie } });
        assert.equal(depois.status, 401);
    });
});

test("rate limit bloqueia excesso de tentativas inválidas", async () => {
    await servidorTemporario(await appAutenticado(), async base => {
        for (let i = 0; i < 5; i++) {
            const { resposta } = await login(base, "senha-incorreta-123");
            assert.equal(resposta.status, 401);
        }
        const { resposta } = await login(base, "senha-incorreta-123");
        assert.equal(resposta.status, 429);
        assert.ok(Number(resposta.headers.get("retry-after")) >= 1);
    });
});

test("troca de senha encerra a sessão atual", async () => {
    await servidorTemporario(await appAutenticado(), async base => {
        const { cookie } = await login(base);
        const troca = await fetch(`${base}/api/auth/change-password`, {
            method: "POST",
            headers: jsonHeaders(cookie),
            body: JSON.stringify({ senhaAtual: "senha-forte-123", novaSenha: "senha-nova-bem-forte-456" })
        });
        assert.equal(troca.status, 200);
        assert.equal((await troca.json()).requerNovoLogin, true);
        assert.equal((await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } })).status, 401);
        assert.equal((await login(base, "senha-nova-bem-forte-456")).resposta.status, 200);
    });
});
