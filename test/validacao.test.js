const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizarProduto, calcularEstoque } = require("../services/validacaoProduto");
const { lerCookies, cookieSessao, limparCookie } = require("../middleware/cookies");

test("validação aceita preço brasileiro com milhar", () => {
    assert.equal(sanitizarProduto({ preco: "1.299,90" }).preco, 1299.9);
    assert.equal(sanitizarProduto({ preco: "89.90" }).preco, 89.9);
});

test("validação rejeita URL insegura e estoque negativo", () => {
    assert.throws(() => sanitizarProduto({ imagem: "http://inseguro.test/a.jpg" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => calcularEstoque(0, { delta: -1 }), { code: "VALIDATION_ERROR" });
});

test("validação aceita foto enviada em data URL segura", () => {
    const imagem = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    assert.equal(sanitizarProduto({ imagem }).imagem, imagem);
    assert.throws(() => sanitizarProduto({ imagem: "data:image/svg+xml;base64,PHN2Zz4=" }), { code: "VALIDATION_ERROR" });
});

test("cookie de sessão é HttpOnly e pode ser removido", () => {
    const cookie = cookieSessao("ap_session", "abc123", { secure: true, maxAgeSeconds: 60 });
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Secure/);
    assert.equal(lerCookies("x=1; ap_session=abc123").ap_session, "abc123");
    assert.match(limparCookie("ap_session"), /Max-Age=0/);
});
