import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { auditActorFromRequest, safeRecordAuditLog } from "@/lib/server/audit-log-store";
import { importBrandKnowledgeSeed } from "@/lib/server/brand-knowledge-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ code: 401, data: null, msg: "请先登录" }, { status: 401 });
    if (!hasAdminPermission(user, "system.manage")) return NextResponse.json({ code: 403, data: null, msg: "当前管理员没有管理系统设置的职责权限" }, { status: 403 });
    try {
        const result = await importBrandKnowledgeSeed(user.id);
        await safeRecordAuditLog({
            action: "admin.brand-knowledge.seed-sync",
            actor: auditActorFromRequest(request, user),
            target: { type: "settings", id: "brand-knowledge" },
            metadata: { documents: result.documents, assetsImported: result.assetsImported, assetsSkipped: result.assetsSkipped, assetsFailed: result.assetsFailed },
        });
        const parts = [`同步 ${result.documents} 篇文档`, `导入 ${result.assetsImported} 张图片`];
        if (result.assetsFailed) parts.push(`${result.assetsFailed} 张失败`);
        return NextResponse.json({ code: 0, data: result, msg: parts.join("、") }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        console.error("Brand knowledge seed sync failed", error);
        return NextResponse.json({ code: 500, data: null, msg: error instanceof Error ? error.message : "品牌知识库同步失败" }, { status: 500 });
    }
}
