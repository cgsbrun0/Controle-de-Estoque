CREATE TABLE usuarios(
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL COLLATE NOCASE UNIQUE,
 senha_hash TEXT NOT NULL,
 estoque_id TEXT NOT NULL,
 criado_em TEXT NOT NULL
);
CREATE TABLE sessoes(
 token_hash TEXT PRIMARY KEY,
 usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 expira_em INTEGER NOT NULL
);
CREATE INDEX sessoes_expiracao ON sessoes(expira_em);
ALTER TABLE movimentos ADD autor TEXT;
