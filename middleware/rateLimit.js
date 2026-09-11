function criarLoginRateLimit({ env = process.env, now = Date.now } = {}) {
    const max = Math.max(1, Number(env.LOGIN_MAX_ATTEMPTS || 5));
    const janelaMs = Math.max(1, Number(env.LOGIN_WINDOW_MINUTES || 15)) * 60 * 1000;
    const tentativas = new Map();

    function chave(req) {
        return req.ip || req.socket?.remoteAddress || "unknown";
    }

    function middleware(req, res, next) {
        const id = chave(req);
        const instante = now();
        let estado = tentativas.get(id);
        if (!estado || estado.resetAt <= instante) {
            estado = { count: 0, resetAt: instante + janelaMs };
            tentativas.set(id, estado);
        }
        if (estado.count >= max) {
            const segundos = Math.max(1, Math.ceil((estado.resetAt - instante) / 1000));
            res.setHeader("Retry-After", String(segundos));
            return res.status(429).json({
                erro: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
                codigo: "RATE_LIMITED"
            });
        }
        req.loginRateLimit = {
            falhou() { estado.count += 1; },
            sucesso() { tentativas.delete(id); }
        };
        next();
    }

    return middleware;
}

module.exports = { criarLoginRateLimit };
