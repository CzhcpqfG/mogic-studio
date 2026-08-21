import { describe, expect, it } from "vitest";

import { normalizeBrandKnowledge } from "./store-normalizers";

describe("normalizeBrandKnowledge", () => {
    it("returns empty defaults for missing or invalid values", () => {
        expect(normalizeBrandKnowledge(undefined)).toEqual({ documents: [], assets: [] });
        expect(normalizeBrandKnowledge({ documents: "nope" as never, assets: null as never })).toEqual({ documents: [], assets: [] });
    });

    it("keeps enabled documents with trimmed fields and drops empty ones", () => {
        const result = normalizeBrandKnowledge({
            documents: [
                { id: "doc-1", title: " 品牌介绍 ", content: " 手工烘焙 ", enabled: false },
                { id: "", title: "", content: "" } as never,
                { title: "产品清单", content: "全麦可颂" } as never,
            ],
            assets: [],
        });

        expect(result.documents).toHaveLength(2);
        expect(result.documents[0]).toEqual({ id: "doc-1", title: "品牌介绍", content: "手工烘焙", enabled: false });
        expect(result.documents[1].enabled).toBe(true);
        expect(result.documents[1].id).toBeTruthy();
    });

    it("caps document and asset counts and requires storage keys", () => {
        const documents = Array.from({ length: 25 }, (_, index) => ({ id: `doc-${index}`, title: `文档 ${index}`, content: "内容", enabled: true }));
        const assets = Array.from({ length: 35 }, (_, index) => ({ id: `asset-${index}`, storageKey: index < 32 ? `permanent/image/key-${index}` : "   ", title: `图 ${index}` }));

        const result = normalizeBrandKnowledge({ documents, assets });

        expect(result.documents).toHaveLength(20);
        expect(result.assets).toHaveLength(30);
        expect(result.assets.every((asset) => asset.storageKey)).toBe(true);
    });
});
