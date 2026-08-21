import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getAuthSettings, setAuthSettings } from "@/lib/auth/store-settings-actions";
import type { BrandKnowledgeDocument, BrandKnowledgeSettings } from "@/lib/auth/store-types";
import { writePersistentMediaDataUrl } from "@/lib/server/reference-asset-store";

const SEED_DOCUMENT_PREFIX = "seed-doc-";
const SEED_ASSET_PREFIX = "seed-asset-";
const MAX_SEED_DOCUMENTS = 20;
const MAX_SEED_ASSETS = 30;
const DOCUMENT_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

export function brandKnowledgeSeedDir() {
    return process.env.MOGIC_STUDIO_BRAND_KNOWLEDGE_DIR?.trim() || path.join(process.cwd(), "brand-knowledge");
}

export type BrandKnowledgeSeedResult = {
    seedDir: string;
    documents: number;
    assetsImported: number;
    assetsSkipped: number;
    assetsFailed: number;
};

export async function importBrandKnowledgeSeed(ownerUserId: string): Promise<BrandKnowledgeSeedResult> {
    const seedDir = brandKnowledgeSeedDir();
    const settings = await getAuthSettings();
    const existing: BrandKnowledgeSettings = settings.brandKnowledge ?? { documents: [], assets: [] };
    const result: BrandKnowledgeSeedResult = { seedDir, documents: 0, assetsImported: 0, assetsSkipped: 0, assetsFailed: 0 };

    const documentFiles = (await listSeedFiles(path.join(seedDir, "documents"), DOCUMENT_EXTENSIONS)).sort();
    const seededDocuments: BrandKnowledgeDocument[] = [];
    for (const filePath of documentFiles) {
        if (seededDocuments.length >= MAX_SEED_DOCUMENTS) break;
        const fileName = path.basename(filePath);
        const [content, title] = await Promise.all([readFile(filePath, "utf8"), Promise.resolve(fileName.replace(/\.[^.]+$/, "").trim())]);
        if (!title || !content.trim()) continue;
        seededDocuments.push({ id: stableSeedId(SEED_DOCUMENT_PREFIX, fileName), title: title.slice(0, 60), content: content.slice(0, 8000), enabled: true });
    }
    result.documents = seededDocuments.length;

    const assetFiles = (await listSeedFiles(path.join(seedDir, "assets"), new Set(Object.keys(IMAGE_MIME_BY_EXTENSION)))).sort();
    const seededAssets = [...existing.assets.filter((asset) => !asset.id.startsWith(SEED_ASSET_PREFIX))];
    for (const filePath of assetFiles) {
        if (seededAssets.filter((asset) => asset.id.startsWith(SEED_ASSET_PREFIX)).length >= MAX_SEED_ASSETS) break;
        const fileName = path.basename(filePath);
        const id = stableSeedId(SEED_ASSET_PREFIX, fileName);
        const alreadyImported = existing.assets.find((asset) => asset.id === id);
        if (alreadyImported) {
            if (!seededAssets.some((asset) => asset.id === id)) seededAssets.push(alreadyImported);
            result.assetsSkipped += 1;
            continue;
        }
        try {
            const bytes = await readFile(filePath);
            const mimeType = IMAGE_MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()];
            const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
            const stored = await writePersistentMediaDataUrl(dataUrl, "image", { ownerUserId, source: "brand-knowledge", originalName: fileName });
            seededAssets.push({ id, storageKey: stored.token, title: fileName.replace(/\.[^.]+$/, "").trim().slice(0, 60) || fileName });
            result.assetsImported += 1;
        } catch (error) {
            result.assetsFailed += 1;
            console.warn(`Brand knowledge seed asset skipped: ${fileName}`, error);
        }
    }

    const manualDocuments = existing.documents.filter((document) => !document.id.startsWith(SEED_DOCUMENT_PREFIX));
    await setAuthSettings({ brandKnowledge: { documents: [...manualDocuments, ...seededDocuments], assets: seededAssets } });
    return result;
}

async function listSeedFiles(dir: string, extensions: Set<string>) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries.filter((entry) => entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())).map((entry) => path.join(dir, entry.name));
    } catch {
        return [];
    }
}

function stableSeedId(prefix: string, value: string) {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) hash = (((hash << 5) + hash + value.charCodeAt(index)) | 0) >>> 0;
    return `${prefix}${hash.toString(36)}`;
}
