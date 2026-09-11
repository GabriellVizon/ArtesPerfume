const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { criarPool } = require("./pool");

async function main() {
    const pool = criarPool(process.env, { required: true });
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    try {
        await pool.query(sql);
        console.log("Migrações concluídas com sucesso.");
    } finally {
        await pool.end();
    }
}

main().catch(erro => {
    console.error("Falha ao executar migrações:", erro.message);
    process.exitCode = 1;
});
