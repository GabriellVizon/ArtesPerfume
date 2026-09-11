const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { criarPool } = require("./pool");

async function main() {
    const pool = criarPool(process.env, { required: true });
    try {
        const { rows } = await pool.query("SELECT NOW() AS agora");
        console.log("PostgreSQL conectado:", rows[0].agora.toISOString());
    } finally {
        await pool.end();
    }
}

main().catch(erro => {
    console.error("Falha na conexão com PostgreSQL:", erro.message);
    process.exitCode = 1;
});
