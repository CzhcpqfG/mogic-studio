import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settingsStore: { value?: unknown } = {};

vi.mock("@/lib/auth/store-settings-actions", () => ({
    getAuthSettings: vi.fn(async () => settingsStore.value ?? { brandKnowledge: { documents: [], assets: [] } }),
    setAuthSettings: vi.fn(async (patch: { brandKnowledge?: unknown }) => {
        settingsStore.value = { ...(settingsStore.value as object), ...patch };
        return settingsStore.value;
    }),
}));

vi.mock("@/lib/server/reference-asset-store", () => ({
    writePersistentMediaDataUrl: vi.fn(async (dataUrl: string) => {
        expect(dataUrl).toMatch(/^data:image\//);
        return { token: `permanent/image/mock-${dataUrl.length}`, bytes: dataUrl.length, mimeType: "image/png", storage: "local" };
    }),
}));

import { importBrandKnowledgeSeed } from "./brand-knowledge-seed";

let seedDir: string;

beforeEach(async () => {
    seedDir = await mkdtemp(path.join(tmpdir(), "brand-seed-"));
    process.env.MOGIC_STUDIO_BRAND_KNOWLEDGE_DIR = seedDir;
    settingsStore.value = { brandKnowledge: { documents: [], assets: [] } };
});

afterEach(async () => {
    delete process.env.MOGIC_STUDIO_BRAND_KNOWLEDGE_DIR;
    await rm(seedDir, { recursive: true, force: true });
});

describe("importBrandKnowledgeSeed", () => {
    it("returns empty result when the seed folder is missing", async () => {
        const result = await importBrandKnowledgeSeed("admin-1");
        expect(result).toMatchObject({ documents: 0, assetsImported: 0 });
        expect(result.seedDir).toContain("brand-seed-");
    });

    it("imports markdown documents and images with stable ids", async () => {
        await mkdir(path.join(seedDir, "documents"), { recursive: true });
        await mkdir(path.join(seedDir, "assets"), { recursive: true });
        await writeFile(path.join(seedDir, "documents", "01-品牌介绍.md"), "本店主打手工烘焙。");
        await writeFile(path.join(seedDir, "documents", "忽略文件.txt"), "");
        await writeFile(path.join(seedDir, "assets", "可颂.png"), Buffer.from("89504e47", "hex"));
        await writeFile(path.join(seedDir, "assets", "备注.txt"), "不是图片");

        const result = await importBrandKnowledgeSeed("admin-1");
        const state = settingsStore.value as { brandKnowledge: { documents: Array<{ id: string; title: string; content: string; enabled: boolean }>; assets: Array<{ id: string; storageKey: string; title: string }> } };

        expect(result.documents).toBe(1);
        expect(result.assetsImported).toBe(1);
        expect(state.brandKnowledge.documents[0]).toMatchObject({ title: "01-品牌介绍", content: "本店主打手工烘焙。", enabled: true });
        expect(state.brandKnowledge.documents[0].id).toMatch(/^seed-doc-/);
        expect(state.brandKnowledge.assets[0]).toMatchObject({ title: "可颂" });
        expect(state.brandKnowledge.assets[0].storageKey).toContain("permanent/image/");
    });

    it("keeps manual documents and reuses already imported assets on resync", async () => {
        await mkdir(path.join(seedDir, "assets"), { recursive: true });
        await writeFile(path.join(seedDir, "assets", "可颂.png"), Buffer.from("89504e47", "hex"));
        await importBrandKnowledgeSeed("admin-1");
        const firstState = settingsStore.value as { brandKnowledge: { assets: Array<{ id: string; storageKey: string }> } };

        settingsStore.value = {
            brandKnowledge: {
                documents: [{ id: "manual-doc", title: "手动文档", content: "内容", enabled: false }],
                assets: firstState.brandKnowledge.assets,
            },
        };
        const result = await importBrandKnowledgeSeed("admin-1");

        expect(result.assetsSkipped).toBe(1);
        expect(result.assetsImported).toBe(0);
        const state = settingsStore.value as { brandKnowledge: { documents: Array<{ id: string }>; assets: Array<{ storageKey: string }> } };
        expect(state.brandKnowledge.documents.map((document) => document.id)).toEqual(["manual-doc"]);
        expect(state.brandKnowledge.assets).toHaveLength(1);
    });

    it("updates seeded document content when the file changes", async () => {
        await mkdir(path.join(seedDir, "documents"), { recursive: true });
        const docPath = path.join(seedDir, "documents", "产品清单.md");
        await writeFile(docPath, "旧内容");
        await importBrandKnowledgeSeed("admin-1");
        await writeFile(docPath, "新内容：全麦可颂、碱水结");
        await importBrandKnowledgeSeed("admin-1");

        const state = settingsStore.value as { brandKnowledge: { documents: Array<{ content: string }> } };
        expect(state.brandKnowledge.documents).toHaveLength(1);
        expect(state.brandKnowledge.documents[0].content).toBe("新内容：全麦可颂、碱水结");
    });
});
