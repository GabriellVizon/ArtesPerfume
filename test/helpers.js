const crypto = require("node:crypto");
const { sanitizarProduto } = require("../services/validacaoProduto");
const { AppError } = require("../errors/AppError");

function criarProdutosRepoMemoria() {
    const manuais = new Map();
    const overrides = new Map();

    function normalizarManual(id, entrada, anterior = {}) {
        const patch = sanitizarProduto(entrada, { criacao: !anterior.id });
        return {
            id,
            nome: patch.nome ?? anterior.nome,
            descricao: patch.descricao !== undefined ? patch.descricao : (anterior.descricao ?? null),
            preco: patch.preco !== undefined ? patch.preco : (anterior.preco ?? null),
            volumeMl: patch.volumeMl !== undefined ? patch.volumeMl : (anterior.volumeMl ?? null),
            imagem: patch.imagem !== undefined ? patch.imagem : (anterior.imagem ?? null),
            instagram: patch.instagram !== undefined ? patch.instagram : (anterior.instagram ?? null),
            estoque: patch.estoque !== undefined ? patch.estoque : (anterior.estoque ?? 0),
            ativo: patch.ativo !== undefined ? patch.ativo : (anterior.ativo ?? true),
            destaque: patch.destaque !== undefined ? patch.destaque : (anterior.destaque ?? false),
            recomendado: patch.recomendado !== undefined ? patch.recomendado : (anterior.recomendado ?? false),
            novo: patch.novo !== undefined ? patch.novo : (anterior.novo ?? true),
            arquivado: patch.arquivado !== undefined ? patch.arquivado : (anterior.arquivado ?? false)
        };
    }

    return {
        async listarManuais() { return [...manuais.values()]; },
        async buscarManual(id) { return manuais.get(String(id)) || null; },
        async criarManual(entrada) {
            const id = crypto.randomUUID();
            const produto = normalizarManual(id, entrada);
            manuais.set(id, produto);
            return produto;
        },
        async atualizarManual(id, entrada) {
            const anterior = manuais.get(String(id));
            if (!anterior) throw new AppError("Produto não encontrado.", "NOT_FOUND", 404);
            const produto = normalizarManual(String(id), entrada, anterior);
            manuais.set(String(id), produto);
            return produto;
        },
        async removerManual(id) { return manuais.delete(String(id)); },
        async listarOverrides() { return Object.fromEntries(overrides); },
        async buscarOverride(id) { return overrides.get(String(id)) || null; },
        async atualizarOverride(id, entrada) {
            const patch = sanitizarProduto(entrada);
            const atual = overrides.get(String(id)) || { id: String(id) };
            const novo = { ...atual, ...patch, id: String(id) };
            overrides.set(String(id), novo);
            return novo;
        }
    };
}

function criarAuthRepoMemoria() {
    const usuarios = new Map();
    const sessoes = new Map();
    return {
        _usuarios: usuarios,
        _sessoes: sessoes,
        async buscarUsuarioPorEmail(email) {
            return [...usuarios.values()].find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
        },
        async buscarUsuarioPorId(id) { return usuarios.get(String(id)) || null; },
        async criarUsuario({ email, passwordHash }) {
            if ([...usuarios.values()].some(u => u.email.toLowerCase() === email.toLowerCase())) {
                throw new AppError("Já existe um administrador com este email.", "EMAIL_IN_USE", 409);
            }
            const usuario = { id: crypto.randomUUID(), email: email.toLowerCase(), password_hash: passwordHash, active: true };
            usuarios.set(usuario.id, usuario);
            return usuario;
        },
        async atualizarSenha(userId, passwordHash) {
            const usuario = usuarios.get(String(userId));
            if (!usuario) throw new AppError("Administrador não encontrado.", "NOT_FOUND", 404);
            usuario.password_hash = passwordHash;
            return usuario;
        },
        async marcarLogin(userId) {
            const usuario = usuarios.get(String(userId));
            if (usuario) usuario.last_login_at = new Date();
        },
        async criarSessao({ tokenHash, userId, expiresAt }) {
            sessoes.set(tokenHash, { token_hash: tokenHash, user_id: userId, expires_at: expiresAt, last_seen_at: new Date() });
        },
        async buscarSessao(tokenHash) {
            const sessao = sessoes.get(tokenHash);
            if (!sessao || sessao.expires_at <= new Date()) return null;
            const usuario = usuarios.get(sessao.user_id);
            if (!usuario?.active) return null;
            return { ...sessao, email: usuario.email, active: usuario.active, password_hash: usuario.password_hash };
        },
        async tocarSessao(tokenHash) {
            const sessao = sessoes.get(tokenHash);
            if (sessao) sessao.last_seen_at = new Date();
        },
        async removerSessao(tokenHash) { sessoes.delete(tokenHash); },
        async removerSessoesDoUsuario(userId) {
            for (const [hash, sessao] of sessoes) if (sessao.user_id === userId) sessoes.delete(hash);
        },
        async limparSessoesExpiradas() { return 0; }
    };
}

async function servidorTemporario(app, executar) {
    const servidor = app.listen(0, "127.0.0.1");
    await new Promise(resolve => servidor.once("listening", resolve));
    try { await executar(`http://127.0.0.1:${servidor.address().port}`); }
    finally { await new Promise(resolve => servidor.close(resolve)); }
}

module.exports = { criarProdutosRepoMemoria, criarAuthRepoMemoria, servidorTemporario };
