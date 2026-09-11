const { AppError } = require("../errors/AppError");

const CAMPOS_STATUS = ["ativo", "destaque", "recomendado", "novo", "arquivado"];

function texto(valor, campo, { obrigatorio = false, max = 500 } = {}) {
    if (valor === undefined) return undefined;
    if (valor === null && !obrigatorio) return null;
    if (typeof valor !== "string") throw new AppError(`${campo} deve ser texto.`, "VALIDATION_ERROR", 422);
    const limpo = valor.trim();
    if (obrigatorio && !limpo) throw new AppError(`${campo} é obrigatório.`, "VALIDATION_ERROR", 422);
    if (limpo.length > max) throw new AppError(`${campo} excede o tamanho permitido.`, "VALIDATION_ERROR", 422);
    return limpo || null;
}

function numeroPreco(valor) {
    if (valor === undefined) return undefined;
    if (valor === null || valor === "") return null;
    let numero;
    if (typeof valor === "number") numero = valor;
    else {
        const bruto = String(valor).trim();
        const normalizado = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
        numero = Number(normalizado);
    }
    if (!Number.isFinite(numero) || numero < 0 || numero > 9999999999.99) {
        throw new AppError("preco deve ser um número válido maior ou igual a zero.", "VALIDATION_ERROR", 422);
    }
    return Math.round(numero * 100) / 100;
}

function inteiroEstoque(valor) {
    if (valor === undefined) return undefined;
    if (valor === null || valor === "") return null;
    const numero = Number(valor);
    if (!Number.isSafeInteger(numero) || numero < 0 || numero > 9999999) {
        throw new AppError("estoque deve ser um número inteiro maior ou igual a zero.", "VALIDATION_ERROR", 422);
    }
    return numero;
}

function booleano(valor, campo) {
    if (valor === undefined) return undefined;
    if (typeof valor !== "boolean") throw new AppError(`${campo} deve ser true ou false.`, "VALIDATION_ERROR", 422);
    return valor;
}

const MAX_IMAGEM_DATA_URL = 3_000_000;
const IMAGEM_DATA_URL_REGEX = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/i;

function urlHttps(valor, campo) {
    if (valor === undefined) return undefined;
    if (valor === null || valor === "") return null;
    if (typeof valor !== "string") throw new AppError(`${campo} deve ser uma URL HTTPS.`, "VALIDATION_ERROR", 422);
    try {
        const url = new URL(valor.trim());
        if (url.protocol !== "https:" || url.username || url.password) throw new Error("invalid");
        return url.href;
    } catch {
        throw new AppError(`${campo} deve ser uma URL HTTPS válida.`, "VALIDATION_ERROR", 422);
    }
}

function imagemSegura(valor) {
    if (valor === undefined) return undefined;
    if (valor === null || valor === "") return null;
    if (typeof valor !== "string") {
        throw new AppError("imagem deve ser uma foto enviada ou uma URL HTTPS.", "VALIDATION_ERROR", 422);
    }

    const limpo = valor.trim();
    if (limpo.startsWith("data:")) {
        if (limpo.length > MAX_IMAGEM_DATA_URL) {
            throw new AppError("A imagem enviada ficou muito grande. Escolha outra foto ou reduza o tamanho.", "VALIDATION_ERROR", 422);
        }
        if (!IMAGEM_DATA_URL_REGEX.test(limpo)) {
            throw new AppError("Formato de imagem não permitido. Use JPG, PNG ou WEBP.", "VALIDATION_ERROR", 422);
        }
        return limpo;
    }

    return urlHttps(limpo, "imagem");
}

function sanitizarProduto(entrada, { criacao = false } = {}) {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
        throw new AppError("Envie um objeto JSON válido.", "VALIDATION_ERROR", 422);
    }
    const patch = {};
    if (criacao || entrada.nome !== undefined) patch.nome = texto(entrada.nome, "nome", { obrigatorio: criacao, max: 120 });
    if (entrada.descricao !== undefined) patch.descricao = texto(entrada.descricao, "descricao", { max: 1200 });
    if (entrada.preco !== undefined) patch.preco = numeroPreco(entrada.preco);
    if (entrada.imagem !== undefined) patch.imagem = imagemSegura(entrada.imagem);
    if (entrada.instagram !== undefined) patch.instagram = urlHttps(entrada.instagram, "instagram");
    if (entrada.estoque !== undefined) patch.estoque = inteiroEstoque(entrada.estoque);
    for (const campo of CAMPOS_STATUS) if (entrada[campo] !== undefined) patch[campo] = booleano(entrada[campo], campo);
    return patch;
}

function calcularEstoque(atual, entrada) {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
        throw new AppError("Envie estoque ou delta.", "VALIDATION_ERROR", 422);
    }
    if (entrada.estoque !== undefined) return inteiroEstoque(entrada.estoque);
    if (entrada.delta !== undefined) {
        const delta = Number(entrada.delta);
        if (!Number.isSafeInteger(delta) || Math.abs(delta) > 9999999) {
            throw new AppError("delta deve ser um número inteiro válido.", "VALIDATION_ERROR", 422);
        }
        const base = Number.isInteger(atual) ? atual : 0;
        return inteiroEstoque(base + delta);
    }
    throw new AppError("Envie estoque ou delta.", "VALIDATION_ERROR", 422);
}

module.exports = { sanitizarProduto, calcularEstoque, CAMPOS_STATUS, imagemSegura };
