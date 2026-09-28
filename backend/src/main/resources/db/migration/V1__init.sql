CREATE TABLE tenant (
    id                   uuid PRIMARY KEY,
    host                 text NOT NULL UNIQUE,
    digisac_account_id   text NOT NULL,
    name                 text NOT NULL,
    status               text NOT NULL CHECK (status IN ('PENDENTE', 'ATIVA', 'BLOQUEADA', 'CREDENCIAL_INVALIDA')),
    valid_until          date,
    gclick_enabled       boolean NOT NULL DEFAULT false,
    digisac_token_enc    bytea NOT NULL,
    gclick_client_id_enc bytea,
    gclick_secret_enc    bytea,
    notify_contact_id    text,
    registered_by        text NOT NULL,
    created_at           timestamptz NOT NULL,
    updated_at           timestamptz NOT NULL
);

CREATE TABLE dept_permission (
    tenant_id             uuid NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    department_id         text NOT NULL,
    all_services          boolean NOT NULL,
    service_ids           text[] NOT NULL,
    all_targets           boolean NOT NULL,
    target_department_ids text[] NOT NULL,
    updated_by            text NOT NULL,
    updated_at            timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, department_id)
);

CREATE TABLE ticket_history (
    id                 uuid PRIMARY KEY,
    tenant_id          uuid NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    user_id            text NOT NULL,
    user_name          text NOT NULL,
    contact_id         text NOT NULL,
    contact_name       text NOT NULL,
    service_id         text NOT NULL,
    department_id      text NOT NULL,
    assigned_user_id   text,
    gclick_client_name text,
    had_comment        boolean NOT NULL,
    created_at         timestamptz NOT NULL
);

CREATE INDEX ticket_history_tenant_created ON ticket_history (tenant_id, created_at DESC);
