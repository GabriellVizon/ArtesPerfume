const { AppError } = require("../errors/AppError");

function mesmaOrigem(req, res, next) {
    const origin = req.get("Origin");
    if (!origin) return next();
    try {
        const origem = new URL(origin);
        const host = req.get("Host");
        if (origem.host !== host) {
            throw new AppError("Origem da requisição não autorizada.", "INVALID_ORIGIN", 403);
        }
        next();
    } catch (erro) {
        if (erro instanceof AppError) return next(erro);
        next(new AppError("Origem da requisição não autorizada.", "INVALID_ORIGIN", 403));
    }
}

module.exports = { mesmaOrigem };
