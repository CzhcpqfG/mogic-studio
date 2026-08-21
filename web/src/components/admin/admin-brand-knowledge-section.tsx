"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Input, Switch } from "antd";
import { BookOpen, FolderSync, Image as ImageIcon, Plus, Save, Trash2, Upload } from "lucide-react";

import { Panel, PanelHeader } from "@/components/admin/admin-panel";
import { LabeledControl, SectionTitle } from "@/components/admin/admin-settings-controls";
import type { BrandKnowledgeDocument } from "@/lib/auth/store-types";

type BrandKnowledgeAsset = { id: string; storageKey: string; title: string };

export function AdminBrandKnowledgeSection() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState<BrandKnowledgeDocument[]>([]);
    const [assets, setAssets] = useState<BrandKnowledgeAsset[]>([]);
    const [uploading, setUploading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/settings", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "加载失败");
            setDocuments(payload.settings?.brandKnowledge?.documents || []);
            setAssets(payload.settings?.brandKnowledge?.assets || []);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "品牌知识库加载失败");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        void load();
    }, [load]);

    const saveDocuments = async (next: BrandKnowledgeDocument[]) => {
        setSaving(true);
        try {
            const response = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brandKnowledge: { documents: next, assets } }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "保存失败");
            setDocuments(payload.settings?.brandKnowledge?.documents || next);
            message.success("品牌知识已保存");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "品牌知识保存失败");
        } finally {
            setSaving(false);
        }
    };

    const updateDocument = (id: string, patch: Partial<BrandKnowledgeDocument>) => {
        setDocuments((current) => current.map((document) => (document.id === id ? { ...document, ...patch } : document)));
    };

    const uploadAsset = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            message.error("请选择图片文件");
            return;
        }
        setUploading(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("读取图片失败"));
                reader.readAsDataURL(file);
            });
            const response = await fetch("/api/admin/brand-knowledge/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dataUrl, title: file.name.replace(/\.[^.]+$/, "") }),
            });
            const payload = await response.json();
            if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "上传失败");
            setAssets((current) => [...current, payload.data.asset]);
            message.success("品牌素材已上传");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "品牌素材上传失败");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const syncSeed = async () => {
        setSyncing(true);
        try {
            const response = await fetch("/api/admin/brand-knowledge/sync-seed", { method: "POST" });
            const payload = await response.json();
            if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "同步失败");
            message.success(payload.msg || "已从文件夹同步品牌知识");
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "品牌知识库同步失败");
        } finally {
            setSyncing(false);
        }
    };

    const removeAsset = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/brand-knowledge/assets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
            const payload = await response.json();
            if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "移除失败");
            setAssets((current) => current.filter((asset) => asset.id !== id));
            message.success("品牌素材已移除");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "品牌素材移除失败");
        }
    };

    return (
        <Panel>
            <PanelHeader
                title="品牌知识库"
                description="配置企业品牌与产品知识，创作 Agent 会自动遵循这些信息；产品图可作为官方参考素材供 Agent 选用。"
                actions={
                    <>
                        <Button loading={syncing} icon={<FolderSync className="size-4" />} onClick={() => void syncSeed()}>
                            从文件夹同步
                        </Button>
                        <Button type="primary" loading={saving} icon={<Save className="size-4" />} onClick={() => void saveDocuments(documents)}>
                            保存品牌知识
                        </Button>
                    </>
                }
            />
            <div className="space-y-5 p-4 sm:p-5">
                <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-900/40">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <SectionTitle icon={<BookOpen className="size-4" />} title="品牌与产品说明" />
                        <Button
                            icon={<Plus className="size-4" />}
                            onClick={() =>
                                setDocuments((current) => [
                                    ...current,
                                    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: "", content: "", enabled: true },
                                ])
                            }
                        >
                            新增文档
                        </Button>
                    </div>
                    {loading ? <div className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">正在加载...</div> : null}
                    {!loading && !documents.length ? (
                        <div className="rounded-md border border-dashed border-stone-300 bg-white p-4 text-xs leading-5 text-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-400">
                            还没有品牌文档。可以添加「品牌介绍」「产品清单」「风格规范」等说明，Agent 创作时会自动参考。也可以把 <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">brand-knowledge/documents/*.md</code> 放入部署目录后点击「从文件夹同步」。
                        </div>
                    ) : null}
                    <div className="space-y-3">
                        {documents.map((document) => (
                            <div key={document.id} className="rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <LabeledControl label="文档标题">
                                        <Input
                                            value={document.title}
                                            maxLength={60}
                                            placeholder="例如：品牌介绍 / 产品清单 / 风格规范"
                                            onChange={(event) => updateDocument(document.id, { title: event.target.value })}
                                        />
                                    </LabeledControl>
                                    <div className="flex items-end gap-2 pb-[1px]">
                                        <span className="text-xs text-stone-500 dark:text-stone-400">启用</span>
                                        <Switch size="small" checked={document.enabled} onChange={(checked) => updateDocument(document.id, { enabled: checked })} />
                                        <Button
                                            type="text"
                                            danger
                                            icon={<Trash2 className="size-4" />}
                                            aria-label={`删除文档 ${document.title || "未命名"}`}
                                            onClick={() => setDocuments((current) => current.filter((item) => item.id !== document.id))}
                                        />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <LabeledControl label="内容（Markdown / 纯文本）">
                                        <Input.TextArea
                                            value={document.content}
                                            rows={5}
                                            maxLength={8000}
                                            showCount
                                            placeholder={"例如：\n本店主打手工烘焙面包，招牌产品是全麦可颂和碱水结。\n视觉风格：暖色调、木质质感、自然光。"}
                                            onChange={(event) => updateDocument(document.id, { content: event.target.value })}
                                        />
                                    </LabeledControl>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-900/40">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <SectionTitle icon={<ImageIcon className="size-4" />} title="产品图素材" />
                        <Button loading={uploading} icon={<Upload className="size-4" />} onClick={() => fileInputRef.current?.click()}>
                            上传产品图
                        </Button>
                    </div>
                    <p className="text-xs leading-5 text-stone-500 dark:text-stone-400">用户提到自己的产品但没有附图时，Agent 会从这些官方图中选择合适的作为参考。</p>
                    {assets.length ? (
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                            {assets.map((asset) => (
                                <figure key={asset.id} className="group relative overflow-hidden rounded-md border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/api/reference-assets/${asset.storageKey}`} alt={asset.title} title={asset.title} className="aspect-square w-full object-cover" loading="lazy" />
                                    <button
                                        type="button"
                                        aria-label={`移除素材 ${asset.title}`}
                                        className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-zinc-900/70 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-600"
                                        onClick={() => void removeAsset(asset.id)}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                    <figcaption className="truncate px-2 py-1 text-[11px] text-stone-500 dark:text-stone-400">{asset.title}</figcaption>
                                </figure>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border border-dashed border-stone-300 bg-white p-4 text-xs leading-5 text-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-400">
                            还没有产品图。上传门店实拍、产品包装或菜单照片后，Agent 在相关创作中会自动引用。
                        </div>
                    )}
                </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAsset(file);
            }} />
        </Panel>
    );
}
