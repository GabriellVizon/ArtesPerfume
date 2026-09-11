# Deploy da ArtesPerfume V2

A V2 foi preparada para rodar com PostgreSQL e HTTPS em produção.

## Variáveis obrigatórias

Em produção configure:

```env
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=postgresql://...
DB_SSL=true
SESSION_COOKIE_SECURE=true
WHATSAPP_NUMBER=55DDDNUMERO
```

Quando o Instagram estiver pronto:

```env
CATALOGO_MODE=instagram
CATALOGO_HASHTAG=puxarparaocatalogo
INSTAGRAM_LOGIN_MODE=facebook
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
META_API_VERSION=
```

Enquanto isso, mantenha `CATALOGO_MODE=demo`.

## Ordem de deploy

1. Crie o PostgreSQL.
2. Configure `DATABASE_URL`.
3. Rode `npm run db:migrate`.
4. Inicie o servidor com `npm start`.
5. Crie o primeiro administrador com `npm run admin:create -- --email=seu@email.com` em um shell seguro da hospedagem.
6. Valide `/health`, `/api/status`, `/` e `/admin/`.

## Render

O projeto inclui `render.yaml` como ponto de partida. Antes de aplicar o Blueprint, revise plano, nome dos recursos e variáveis. Os segredos da Meta e o WhatsApp devem ser preenchidos no painel, nunca commitados.

## Railway / outros provedores

Use os mesmos comandos:

- Build: `npm install`
- Migration: `npm run db:migrate`
- Start: `npm start`
- Health check: `/health`

O provedor deve expor `PORT` automaticamente e permitir conexões PostgreSQL pela `DATABASE_URL`.

## Segurança

- O login usa email + senha com `scrypt` e salt aleatório.
- A sessão usa um token aleatório de alta entropia em cookie `HttpOnly` e `SameSite=Lax`.
- O banco armazena apenas SHA-256 do token da sessão.
- Em produção o cookie deve usar `Secure` e o app deve estar atrás de HTTPS.
- O login possui limite básico de tentativas por IP.
- O Helmet aplica cabeçalhos de segurança e CSP.
- Requisições administrativas de alteração validam a origem do navegador.

Se houver múltiplas instâncias do servidor, considere mover o rate limit de login para Redis ou outro armazenamento compartilhado.
