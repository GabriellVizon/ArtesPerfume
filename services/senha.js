const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { AppError } = require("../errors/AppError");

const scryptAsync = promisify(crypto.scrypt);
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function validarSenhaNova(senha) {
    if (typeof senha !== "string" || senha.length < 10 || senha.length > 128) {
        throw new AppError(
            "A senha deve ter entre 10 e 128 caracteres.",
            "VALIDATION_ERROR",
            422
        );
    }
    return senha;
}

async function gerarHashSenha(senha) {
    validarSenhaNova(senha);
    const salt = crypto.randomBytes(16);
    const hash = await scryptAsync(senha, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
    return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${Buffer.from(hash).toString("base64url")}`;
}

async function verificarSenha(senha, armazenado) {
    if (typeof senha !== "string" || typeof armazenado !== "string") return false;
    const partes = armazenado.split("$");
    if (partes.length !== 6 || partes[0] !== "scrypt") return false;
    const n = Number(partes[1]);
    const r = Number(partes[2]);
    const p = Number(partes[3]);
    const salt = Buffer.from(partes[4], "base64url");
    const esperado = Buffer.from(partes[5], "base64url");
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p) || esperado.length !== KEYLEN) return false;
    try {
        const obtido = Buffer.from(await scryptAsync(senha, salt, esperado.length, { N: n, r, p, maxmem: 64 * 1024 * 1024 }));
        return obtido.length === esperado.length && crypto.timingSafeEqual(obtido, esperado);
    } catch {
        return false;
    }
}

module.exports = { gerarHashSenha, verificarSenha, validarSenhaNova };
