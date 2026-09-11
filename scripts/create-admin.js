const path = require("node:path");
const crypto = require("node:crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { criarPool } = require("../db/pool");
const { criarRepositorioAuth, normalizarEmail } = require("../repositories/authRepository");
const { gerarHashSenha } = require("../services/senha");

function argumento(nome) {
    const prefixo = `--${nome}=`;
    return process.argv.slice(2).find(item => item.startsWith(prefixo))?.slice(prefixo.length);
}

async function main() {
    const email = normalizarEmail(argumento("email") || process.env.ADMIN_BOOTSTRAP_EMAIL || "");
    if (!email || !email.includes("@")) {
        throw new Error("Informe o email: npm run admin:create -- --email=admin@exemplo.com");
    }

    const senhaInformada = argumento("password") || process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const senha = senhaInformada || crypto.randomBytes(18).toString("base64url");
    const passwordHash = await gerarHashSenha(senha);
    const pool = criarPool(process.env, { required: true });
    const repo = criarRepositorioAuth(pool);
    try {
        const usuario = await repo.criarUsuario({ email, passwordHash });
        console.log(`Administrador criado: ${usuario.email}`);
        if (!senhaInformada) {
            console.log("Senha temporária gerada (copie agora):");
            console.log(senha);
            console.log("Entre no painel e troque a senha em Conta > Alterar senha.");
        }
    } finally {
        await pool.end();
    }
}

main().catch(erro => {
    console.error("Não foi possível criar o administrador:", erro.message);
    process.exitCode = 1;
});
