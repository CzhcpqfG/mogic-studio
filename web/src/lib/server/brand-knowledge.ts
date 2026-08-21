import { randomUUID } from "node:crypto";

import { writePersistentMediaDataUrl } from "@/lib/server/reference-asset-store";

export const BRAND_KNOWLEDGE_MEDIA_SOURCE = "brand-knowledge";

export type BrandKnowledgeAssetUpload = {
    id: string;
    storageKey: string;
    title: string;
};

export async function uploadBrandKnowledgeAsset(dataUrl: string, adminUserId: string, title: string): Promise<BrandKnowledgeAssetUpload> {
    const stored = await writePersistentMediaDataUrl(dataUrl, "image", {
        ownerUserId: adminUserId,
        source: BRAND_KNOWLEDGE_MEDIA_SOURCE,
        originalName: title,
    });
    return { id: randomUUID(), storageKey: stored.token, title };
}
