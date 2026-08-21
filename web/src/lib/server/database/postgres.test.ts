import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
    connect: vi.fn(),
    pool: vi.fn(),
}));

vi.mock("pg", () => ({
    Pool: mocks.pool,
}));

import { ensurePostgresSchema, initializePostgresSchema, postgresQuery, withPostgresTransaction } from "./postgres";

describe("PostgreSQL schema lifecycle", () => {
    beforeEach(() => {
        delete (globalThis as Record<string, unknown>).__mogicStudioPostgresPool;
        delete (globalThis as Record<string, unknown>).__mogicStudioPostgresSchemaReady;
        process.env.DATABASE_URL = "postgres://mogic:test@localhost:5432/mogic";
        delete process.env.MOGIC_STUDIO_DATABASE_SSL;
        delete process.env.MOGIC_STUDIO_DATABASE_SSL_CA;
        delete process.env.MOGIC_STUDIO_DATABASE_SSL_REJECT_UNAUTHORIZED;
        mocks.query.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
        mocks.connect.mockReset().mockResolvedValue({ query: mocks.query, release: vi.fn() });
        mocks.pool.mockReset().mockImplementation(function PoolMock() {
            return { query: mocks.query, connect: mocks.connect };
        });
    });

    it("verifies PostgreSQL TLS certificates by default and accepts an explicit CA", async () => {
        process.env.MOGIC_STUDIO_DATABASE_SSL = "1";
        process.env.MOGIC_STUDIO_DATABASE_SSL_CA = "-----BEGIN CERTIFICATE-----\\ncertificate\\n-----END CERTIFICATE-----";
        mocks.query.mockResolvedValueOnce({ rows: [{ table_name: null }] });

        await expect(ensurePostgresSchema()).rejects.toThrow("PostgreSQL schema has not been initialized");

        expect(mocks.pool).toHaveBeenCalledWith(
            expect.objectContaining({
                ssl: {
                    rejectUnauthorized: true,
                    ca: "-----BEGIN CERTIFICATE-----\ncertificate\n-----END CERTIFICATE-----",
                },
            }),
        );
    });

    it("only disables PostgreSQL certificate verification through an explicit override", async () => {
        process.env.MOGIC_STUDIO_DATABASE_SSL = "1";
        process.env.MOGIC_STUDIO_DATABASE_SSL_REJECT_UNAUTHORIZED = "0";
        mocks.query.mockResolvedValueOnce({ rows: [{ table_name: null }] });

        await expect(ensurePostgresSchema()).rejects.toThrow("PostgreSQL schema has not been initialized");

        expect(mocks.pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: { rejectUnauthorized: false } }));
    });

    it("serializes concurrent repository queries on one transaction client", async () => {
        let active = false;
        const statements: string[] = [];
        const release = vi.fn();
        const clientQuery = vi.fn(async (statement: string) => {
            statements.push(statement);
            if (statement === "BEGIN" || statement === "COMMIT" || statement === "ROLLBACK") return { rows: [], rowCount: 0 };
            if (active) throw new Error("transaction client received concurrent queries");
            active = true;
            await new Promise((resolve) => setTimeout(resolve, 0));
            active = false;
            return { rows: [], rowCount: 0 };
        });
        mocks.connect.mockResolvedValue({ query: clientQuery, release });

        await withPostgresTransaction(async (client) => {
            await Promise.all([client.query("SELECT 1"), client.query("SELECT 2"), client.query("SELECT 3")]);
        });

        expect(statements).toEqual(["BEGIN", "SELECT 1", "SELECT 2", "SELECT 3", "COMMIT"]);
        expect(release).toHaveBeenCalledOnce();
    });

    it("does not execute schema DDL when an ordinary caller reaches an empty database", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [{ table_name: null }] });

        await expect(ensurePostgresSchema()).rejects.toThrow("PostgreSQL schema has not been initialized");

        expect(mocks.query).toHaveBeenCalledTimes(1);
        expect(mocks.query.mock.calls[0]?.[0]).toContain("to_regclass");
        expect(mocks.query.mock.calls[0]?.[0]).not.toContain("CREATE TABLE");
    });

    it("prefixes SQL identifiers without rewriting ordinary string literals", async () => {
        await postgresQuery("SELECT 'users' AS target_type, $$users.read$$ AS permission FROM users WHERE action = 'users.read'");

        expect(mocks.query).toHaveBeenCalledWith("SELECT 'users' AS target_type, $$users.read$$ AS permission FROM mogic_studio_users WHERE action = 'users.read'", undefined);
    });

    it("executes schema DDL only through explicit initialization", async () => {
        await initializePostgresSchema();

        expect(mocks.query).toHaveBeenCalledTimes(4);
        expect(mocks.query.mock.calls[0]?.[0]).toBe("BEGIN");
        expect(mocks.query.mock.calls[1]).toEqual(["SELECT pg_advisory_xact_lock(hashtext($1))", ["mogic-studio:schema"]]);
        const ddl = String(mocks.query.mock.calls[2]?.[0]);
        expect(mocks.query.mock.calls[3]?.[0]).toBe("COMMIT");
        expect(ddl).toContain("CREATE TABLE IF NOT EXISTS mogic_studio_schema_migrations");
        expect(ddl).toContain("CREATE TABLE IF NOT EXISTS mogic_studio_generation_worker_heartbeats");
        expect(ddl).toContain("CREATE SEQUENCE IF NOT EXISTS mogic_studio_user_account_id_seq");
        expect(ddl).toContain("account_id bigint NOT NULL DEFAULT nextval('mogic_studio_user_account_id_seq')");
        expect(ddl).toMatch(/SELECT setval\(\s*'mogic_studio_user_account_id_seq'/);
        expect(ddl).toContain("users.read");
        expect(ddl).toContain("users.manage");
        expect(ddl).not.toContain("mogic_studio_users.read");
        expect(ddl).not.toContain("mogic_studio_users.manage");
        expect(ddl).toContain("terms_version text");
        expect(ddl).toContain("policy_accepted_at timestamptz");
        expect(ddl).toContain("mfa_secret_ciphertext text");
        expect(ddl).toContain("CONSTRAINT users_mfa_enabled_secret CHECK");
        expect(ddl).toContain("CONSTRAINT users_registration_consent_complete CHECK");
        expect(ddl).toContain("ALTER TABLE mogic_studio_users ADD CONSTRAINT users_admin_permissions_array");
        expect(ddl).toContain("conname = 'mogic_studio_local_media_assets_storage_provider_check'");
        expect(ddl).toContain("ADD CONSTRAINT mogic_studio_local_media_assets_storage_provider_check CHECK");
        expect(ddl).toContain("CREATE UNIQUE INDEX IF NOT EXISTS mogic_studio_users_account_id_idx ON mogic_studio_users (account_id)");
        expect(ddl).toContain("CREATE INDEX IF NOT EXISTS mogic_studio_billing_orders_provider_payment_idx ON mogic_studio_billing_orders (provider, provider_payment_id)");
        expect(ddl).toContain("webhook_secret_ciphertext text NOT NULL DEFAULT ''");
        expect(ddl).toContain("CREATE UNIQUE INDEX IF NOT EXISTS mogic_studio_generation_tasks_channel_upstream_idx ON mogic_studio_generation_tasks (channel_id, upstream_task_id)");
        expect(ddl).toContain("signature_timestamp timestamptz NOT NULL");
        expect(ddl).toContain("conflict_count integer NOT NULL DEFAULT 0");
        expect(ddl).toContain("user_id text NOT NULL REFERENCES mogic_studio_users(id) ON DELETE CASCADE");
        expect(ddl).toContain("CREATE TABLE IF NOT EXISTS mogic_studio_account_deletion_requests");
        expect(ddl).toContain("'review_pending', 'reviewing', 'review_unavailable'");
        expect(ddl).toContain("task_type = 'agent' AND status = 'success' AND execution_phase IN ('review_pending', 'reviewing')");

        const tableNames = [...ddl.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z][a-z0-9_]*)/gi)].map((match) => match[1]).sort();
        expect(tableNames).toHaveLength(51);
        expect(tableNames.every((name) => name.startsWith("mogic_studio_"))).toBe(true);
        expect(tableNames).not.toContain("mogic_studio_check_ins");
        expect(ddl).toContain("DROP TABLE IF EXISTS mogic_studio_check_ins");
        expect(ddl).not.toContain("20260731_generation_task_recovery");

        const indexNames = [...ddl.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z][a-z0-9_]*)/gi)].map((match) => match[1]);
        expect(indexNames.length).toBeGreaterThan(0);
        expect(indexNames.every((name) => name.startsWith("mogic_studio_"))).toBe(true);

        const uniqueConstraintNames = [...ddl.matchAll(/CREATE\s+UNIQUE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z][a-z0-9_]*)/gi)].map((match) => match[1]);
        expect(uniqueConstraintNames.length).toBeGreaterThan(0);
        expect(uniqueConstraintNames.every((name) => name.startsWith("mogic_studio_"))).toBe(true);
    });

    it("continues applying additive schema updates after the sentinel table exists", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [{ table_name: "mogic_studio_users" }] });

        await ensurePostgresSchema();

        expect(mocks.query).toHaveBeenCalledTimes(5);
        expect(mocks.query.mock.calls[0]?.[0]).toContain("to_regclass");
        expect(mocks.query.mock.calls[2]).toEqual(["SELECT pg_advisory_xact_lock(hashtext($1))", ["mogic-studio:schema"]]);
        expect(mocks.query.mock.calls[3]?.[0]).toContain("CREATE TABLE IF NOT EXISTS mogic_studio_schema_migrations");
    });
});
