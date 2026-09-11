const fs = require("node:fs");
const path = require("node:path");

const raiz = path.join(__dirname, "..");
const origem = path.join(raiz, ".env.example");
const destino = path.join(raiz, ".env");

if (fs.existsSync(destino)) {
    console.log(".env já existe; nenhum valor foi sobrescrito.");
} else {
    fs.copyFileSync(origem, destino);
    console.log(".env criado a partir de .env.example.");
}

console.log("\nPróximos passos:");
console.log("1. Suba o PostgreSQL: docker compose up -d db");
console.log("2. Rode as migrações: npm run db:migrate");
console.log("3. Crie o primeiro admin: npm run admin:create -- --email=seu@email.com");
console.log("4. Inicie: npm run dev");
