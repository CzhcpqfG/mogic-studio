import { describe, expect, it } from "vitest";

import { generationRuntimeEnvironment, resolveGenerationWorkerOrigin } from "./generation-runtime.mjs";

describe("generation runtime environment", () => {
    it("uses distinct configured maintenance and worker tokens", () => {
        const maintenanceToken = "a".repeat(32);
        const workerToken = "b".repeat(32);
        const result = generationRuntimeEnvironment({ environment: { MOGIC_STUDIO_MAINTENANCE_TOKEN: maintenanceToken, MOGIC_STUDIO_WORKER_TOKEN: workerToken, PORT: "3100" } });

        expect(result).toMatchObject({ ephemeralToken: false, environment: { MOGIC_STUDIO_MAINTENANCE_TOKEN: maintenanceToken, MOGIC_STUDIO_WORKER_TOKEN: workerToken, MOGIC_STUDIO_WORKER_API_ORIGIN: "http://127.0.0.1:3100" } });
    });

    it("generates a process-local token only for development", () => {
        const result = generationRuntimeEnvironment({ environment: {}, allowEphemeralToken: true });

        expect(result.ephemeralToken).toBe(true);
        expect(result.environment.MOGIC_STUDIO_MAINTENANCE_TOKEN).toHaveLength(64);
        expect(result.environment.MOGIC_STUDIO_WORKER_TOKEN).toHaveLength(64);
        expect(result.environment.MOGIC_STUDIO_WORKER_TOKEN).not.toBe(result.environment.MOGIC_STUDIO_MAINTENANCE_TOKEN);
    });

    it("fails production startup before the app can run without a valid token", () => {
        expect(() => generationRuntimeEnvironment({ environment: { MOGIC_STUDIO_MAINTENANCE_TOKEN: "short", MOGIC_STUDIO_WORKER_TOKEN: "b".repeat(32) } })).toThrow("distinct and contain at least 32 characters");
        expect(() => generationRuntimeEnvironment({ environment: { MOGIC_STUDIO_MAINTENANCE_TOKEN: "a".repeat(32), MOGIC_STUDIO_WORKER_TOKEN: "a".repeat(32) } })).toThrow("distinct and contain at least 32 characters");
    });

    it("normalizes a Render private hostport to an HTTP origin", () => {
        expect(resolveGenerationWorkerOrigin({ environment: { MOGIC_STUDIO_WORKER_API_ORIGIN: "mogic-studio:3000" } })).toBe("http://mogic-studio:3000");
    });
});
