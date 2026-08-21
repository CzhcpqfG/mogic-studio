import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { readJsonBodyResult } from "@/lib/auth/request";
import { getAuthSettings, setAuthSettings } from "@/lib/auth/store";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { auditActorFromRequest, safeRecordAuditLog } from "@/lib/server/audit-log-store";
import { uploadBrandKnowledgeAsset } from "@/lib/server/brand-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    if (!hasAdminPermission(user, "system.manage")) return NextResponse.json({ code: 403, data: null, msg: "当前管理员没有管理系统设置的职责权限" }, { status: 403 });
    try {
        const body = await readJsonBodyResult<{ dataUrl?: string; title?: string }>(request, MAX_BYTES);
        if (!body.ok) return NextResponse.json({ code: body.status, data: null, msg: body.message }, { status: body.status });
        const dataUrl = String(body.data.dataUrl || "");
        const title = String(body.data.title || "").trim().slice(0, 60) || "品牌素材";
        if (!dataUrl.startsWith("data:image/")) return NextResponse.json({ code: 400, data: null, msg: "请上传图片文件" }, { status: 400 });
        const asset = await uploadBrandKnowledgeAsset(dataUrl, user.id, title);
        const current = await getAuthSettings();
        await setAuthSettings({ brandKnowledge: { documents: current.brandKnowledge.documents, assets: [...current.brandKnowledge.assets, asset] } });
        await safeRecordAuditLog({
            action: "admin.brand-knowledge.asset.upload",
            actor: auditActorFromRequest(request, user),
            target: { type: "settings", id: asset.id },
            metadata: { storageKey: asset.storageKey, title: asset.title },
        });
        return NextResponse.json({ code: 0, data: { asset }, msg: "OK" }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        console.error("Brand knowledge asset upload failed", error);
        return NextResponse.json({ code: 500, data: null, msg: error instanceof Error ? error.message : "品牌素材上传失败" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    if (!hasAdminPermission(user, "system.manage")) return NextResponse.json({ code: 403, data: null, msg: "当前管理员没有管理系统设置的职责权限" }, { status: 403 });
    try {
        const id = new URL(request.url).searchParams.get("id") || "";
        const current = await getAuthSettings();
        await setAuthSettings({ brandKnowledge: { documents: current.brandKnowledge.documents, assets: current.brandKnowledge.assets.filter((asset) => asset.id !== id) } });
        await safeRecordAuditLog({
            action: "admin.brand-knowledge.asset.remove",
            actor: auditActorFromRequest(request, user),
            target: { type: "settings", id },
            metadata: {},
        });
        return NextResponse.json({ code: 0, data: null, msg: "OK" }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        console.error("Brand knowledge asset remove failed", error);
        return NextResponse.json({ code: 500, data: null, msg: error instanceof Error ? error.message : "品牌素材移除失败" }, { status: 500 });
    }
}
