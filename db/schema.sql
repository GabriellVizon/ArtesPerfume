BEGIN;

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_uidx
    ON admin_users (LOWER(email));

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx
    ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS admin_sessions_user_idx
    ON admin_sessions (user_id);

CREATE TABLE IF NOT EXISTS manual_products (
    id UUID PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(1200),
    preco NUMERIC(12,2),
    imagem TEXT,
    instagram_url TEXT,
    estoque INTEGER,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    destaque BOOLEAN NOT NULL DEFAULT FALSE,
    recomendado BOOLEAN NOT NULL DEFAULT FALSE,
    novo BOOLEAN NOT NULL DEFAULT TRUE,
    arquivado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT manual_products_preco_check CHECK (preco IS NULL OR preco >= 0),
    CONSTRAINT manual_products_estoque_check CHECK (estoque IS NULL OR estoque >= 0)
);

CREATE TABLE IF NOT EXISTS product_overrides (
    source_id TEXT PRIMARY KEY,
    nome VARCHAR(120),
    descricao VARCHAR(1200),
    preco NUMERIC(12,2),
    imagem TEXT,
    instagram_url TEXT,
    estoque INTEGER,
    ativo BOOLEAN,
    destaque BOOLEAN,
    recomendado BOOLEAN,
    novo BOOLEAN,
    arquivado BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT product_overrides_preco_check CHECK (preco IS NULL OR preco >= 0),
    CONSTRAINT product_overrides_estoque_check CHECK (estoque IS NULL OR estoque >= 0)
);

COMMIT;
