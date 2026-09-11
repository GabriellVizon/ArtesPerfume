# ArtesPerfume V3 — Protótipo funcional

Versão de apresentação para validação visual com a cliente. Mantém a base técnica da V2 (Node.js, PostgreSQL, autenticação administrativa e integração preparada com Instagram/Meta) e aplica a identidade visual do protótipo aprovado para apresentação.

## Telas públicas

- `/` — Início com hero, destaques e resumo do catálogo.
- `/catalogo.html` — Catálogo dinâmico, busca, filtros, favoritos e modal de visão rápida.
- `/detalhes.html?id=ID_DO_PRODUTO` — Página dinâmica de detalhes para qualquer perfume.
- `/favoritos.html` — Favoritos salvos em `localStorage`, sem exigir cadastro do visitante.

### Fluxo de interesse

O projeto não possui carrinho ou checkout. Na tela de detalhes o CTA principal é **Tenho interesse**. O WhatsApp é aberto com o nome e o preço do perfume já inseridos na mensagem.

Quando o produto está sem estoque, o CTA passa a ser **Consultar disponibilidade**.

## Telas administrativas

- `/admin/` — Login real por email e senha.
- `/admin/dashboard.html` — Dashboard, métricas reais, lista de produtos e controle rápido de estoque.
- `/admin/produto.html` — Cadastro de perfume.
- `/admin/produto.html?id=ID` — Edição do perfume e curadoria visual.

A administração continua usando sessão segura em cookie `HttpOnly` e PostgreSQL.

## Recursos preservados da V2

- PostgreSQL.
- Produtos manuais.
- Overrides de produtos vindos do Instagram.
- Estoque.
- Ativo/inativo.
- Destaque.
- Recomendado.
- Novo.
- Arquivamento.
- Login administrativo.
- Logout.
- Troca de senha.
- Rate limit de login.
- Helmet/CSP.
- `/health`.
- Modo `demo`.
- Integração preparada com Instagram profissional.
- Filtro `#puxarparaocatalogo`.

## Novas rotas públicas da V3

```text
GET /api/config
GET /api/catalogo
GET /api/catalogo/:id
GET /api/status
GET /api/instagram
```

`/api/config` expõe somente configurações públicas sanitizadas, como nome visual da marca, WhatsApp e URL pública do Instagram. Tokens e segredos nunca são retornados.

## Configuração

Na pasta que contém `package.json`:

```powershell
npm install
npm run setup
```

Se você já configurou o Supabase/PostgreSQL na V2, reutilize sua `DATABASE_URL` no `.env` local. O ZIP não inclui `.env` nem credenciais.

Depois:

```powershell
npm run db:migrate
npm run db:check
npm run dev
```

Se ainda não existir administrador:

```powershell
npm run admin:create -- --email=admin@exemplo.com
```

## Variáveis visuais opcionais

```env
PUBLIC_BRAND_NAME=Aura Noir
PUBLIC_BRAND_SUBTITLE=Atelier
PUBLIC_INSTAGRAM_URL=https://instagram.com/sua-conta
```

A marca "Aura Noir" é apenas o nome do protótipo atual e pode ser trocada sem alterar a estrutura da aplicação.

## Modo demonstração

Para apresentar à cliente antes da Meta estar conectada:

```env
CATALOGO_MODE=demo
```

A V3 inclui cinco perfumes ilustrativos no modo demo. Quando o Instagram real for configurado, as mesmas telas passam a consumir os produtos reais automaticamente.

## Instagram real

Depois da aprovação visual:

```env
CATALOGO_MODE=instagram
INSTAGRAM_LOGIN_MODE=facebook
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
META_API_VERSION=
```

O token deve permanecer somente no servidor.

## Testes

```powershell
npm test
```

Os scripts JavaScript da V3 foram mantidos sem etapa de build para facilitar a manutenção do protótipo.

## Deploy

O projeto mantém `Dockerfile`, `render.yaml`, `.env.production.example` e `DEPLOY.md` da V2. O deploy deve ser feito depois da aprovação do protótipo e antes da conexão final com o Instagram real.


### Upload de fotos no painel

Na V3.1, ao cadastrar ou editar um perfume, o administrador pode escolher uma foto diretamente do celular ou computador. A imagem é reduzida/otimizada no navegador e salva no campo de imagem do produto no PostgreSQL. Também é possível continuar usando uma URL HTTPS.

A tela pública de Contato foi removida. O fluxo público principal agora é Início → Catálogo → Detalhes → Favoritos, com atendimento pelo WhatsApp a partir dos perfumes.
