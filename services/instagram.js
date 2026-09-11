const axios = require("axios");

class InstagramError extends Error {
    constructor(message, code = "INSTAGRAM_UNAVAILABLE", status = 502) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

function configuracao(env = process.env) {
    const mode = env.CATALOGO_MODE || (env.INSTAGRAM_USER_ID || env.INSTAGRAM_ACCESS_TOKEN ? "instagram" : "demo");
    if (!["demo", "instagram"].includes(mode)) throw new InstagramError("CATALOGO_MODE deve ser demo ou instagram.", "CONFIGURATION_ERROR", 503);
    return { mode, userId: env.INSTAGRAM_USER_ID, token: env.INSTAGRAM_ACCESS_TOKEN,
        version: env.META_API_VERSION, login: env.INSTAGRAM_LOGIN_MODE || "facebook" };
}

function criarClienteInstagram({ env = process.env, http = axios, now = Date.now } = {}) {
    let cache = null;
    let pendente = null;
    async function carregar(config) {
        if (!config.userId || !config.token || !/^v\d+\.\d+$/.test(config.version || "") || !/^\d+$/.test(config.userId) || !["facebook", "instagram"].includes(config.login)) {
            throw new InstagramError("Configure o ID, token, versão da API e tipo de login da Meta no servidor.", "CONFIGURATION_ERROR", 503);
        }
        const host = config.login === "instagram" ? "graph.instagram.com" : "graph.facebook.com";
        const endpoint = `https://${host}/${config.version}/${config.userId}/media`;
        const posts = new Map();
        let after;
        const cursors = new Set();
        try {
            // Limite explícito: até 1.000 posts por atualização, com orçamento de tempo.
            const deadline = now() + 30000;
            for (let pagina = 0; pagina < 10; pagina++) {
                if (now() >= deadline) throw new Error("timeout");
                const resposta = await http.get(endpoint, {
                    headers: { Authorization: `Bearer ${config.token}` },
                    params: { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}", limit: 100, ...(after ? { after } : {}) },
                    timeout: Math.min(10000, deadline - now()), maxRedirects: 0
                });
                const payload = resposta.data;
                if (!Array.isArray(payload?.data)) throw new Error("invalid_response");
                for (const post of payload.data) if (post.id) posts.set(post.id, post);
                if (!payload.paging?.next) return { posts: [...posts.values()], limitado: false };
                const next = payload.paging?.cursors?.after;
                if (!next || cursors.has(next)) throw new Error("invalid_pagination");
                cursors.add(next);
                after = next;
            }
            return { posts: [...posts.values()], limitado: true };
        } catch (erro) {
            const code = erro.response?.data?.error?.code;
            if (code === 190) throw new InstagramError("A conexão com o Instagram expirou. Renove o token no servidor.", "TOKEN_EXPIRED", 503);
            if (code === 10 || code === 200) throw new InstagramError("A Meta não autorizou a leitura dos posts. Confira as permissões do aplicativo.", "PERMISSION_DENIED", 503);
            // Nunca incluir resposta bruta, URL autenticada ou token nos logs/retornos.
            throw new InstagramError("Não foi possível atualizar os posts do Instagram. Tente novamente em alguns minutos.");
        }
    }
    return async function buscarPostsInstagram() {
        const config = configuracao(env);
        if (config.mode === "demo") return { mode: "demo", posts: require("../data/posts"), atualizadoEm: null, limitado: false };
        if (cache && now() - cache.time < 60000) return cache.value;
        if (!pendente) {
            pendente = carregar(config).then(resultado => {
                const value = { ...resultado, mode: "instagram", atualizadoEm: new Date(now()).toISOString() };
                cache = { time: now(), value };
                return value;
            }).finally(() => { pendente = null; });
        }
        return pendente;
    };
}

const buscarPostsInstagram = criarClienteInstagram();
module.exports = { buscarPostsInstagram, criarClienteInstagram, InstagramError };
