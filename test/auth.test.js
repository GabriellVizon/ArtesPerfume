const test = require("node:test");
const assert = require("node:assert/strict");
const { gerarHashSenha, verificarSenha } = require("../services/senha");
const { criarServicoAuth, sha256 } = require("../services/auth");
const { criarAuthRepoMemoria } = require("./helpers");

test("senha usa hash com salt e valida corretamente", async () => {
    const a = await gerarHashSenha("senha-forte-123");
    const b = await gerarHashSenha("senha-forte-123");
    assert.notEqual(a, b);
    assert.equal(await verificarSenha("senha-forte-123", a), true);
    assert.equal(await verificarSenha("errada-12345", a), false);
});

test("login cria sessão persistida apenas pelo hash do token", async () => {
    const repo = criarAuthRepoMemoria();
    const passwordHash = await gerarHashSenha("senha-forte-123");
    const usuario = await repo.criarUsuario({ email: "Admin@Exemplo.com", passwordHash });
    const auth = criarServicoAuth({ repo, env: { SESSION_TTL_HOURS: "8" } });
    const login = await auth.login("admin@exemplo.com", "senha-forte-123");
    assert.equal(login.usuario.id, usuario.id);
    assert.ok(login.token.length >= 32);
    assert.equal(repo._sessoes.has(login.token), false);
    assert.equal(repo._sessoes.has(sha256(login.token)), true);
    assert.equal((await auth.autenticar(login.token)).usuario.email, "admin@exemplo.com");
});

test("login não revela se email existe", async () => {
    const repo = criarAuthRepoMemoria();
    const auth = criarServicoAuth({ repo });
    await assert.rejects(auth.login("naoexiste@exemplo.com", "senha-forte-123"), erro =>
        erro.code === "INVALID_CREDENTIALS" && erro.message === "Email ou senha inválidos."
    );
});

test("troca de senha invalida todas as sessões", async () => {
    const repo = criarAuthRepoMemoria();
    const passwordHash = await gerarHashSenha("senha-antiga-123");
    const usuario = await repo.criarUsuario({ email: "admin@exemplo.com", passwordHash });
    const auth = criarServicoAuth({ repo });
    const login = await auth.login(usuario.email, "senha-antiga-123");
    await auth.alterarSenha({ userId: usuario.id, senhaAtual: "senha-antiga-123", novaSenha: "senha-nova-456" });
    assert.equal(await auth.autenticar(login.token), null);
    await assert.rejects(auth.login(usuario.email, "senha-antiga-123"), { code: "INVALID_CREDENTIALS" });
    assert.ok((await auth.login(usuario.email, "senha-nova-456")).token);
});
