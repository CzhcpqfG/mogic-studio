import { BookMarked, FileText, Images, Maximize2, Sparkles } from "lucide-react";

export const navigationGroups = [
    { id: "create", label: "创作" },
    { id: "projects", label: "项目" },
    { id: "assets", label: "资产" },
] as const;

export const navigationTools = [
    {
        slug: "create",
        label: "Agent",
        description: "统一创作入口",
        group: "create",
        icon: Sparkles,
        primary: true,
    },
    {
        slug: "canvas",
        label: "画布",
        description: "节点式多媒体创作",
        group: "projects",
        icon: Maximize2,
    },
    {
        slug: "assets",
        label: "素材",
        description: "图片、视频与音频",
        group: "assets",
        icon: Images,
    },
    {
        slug: "my-prompts",
        label: "提示词",
        description: "个人提示词",
        group: "assets",
        icon: BookMarked,
    },
    {
        slug: "prompts",
        label: "词库",
        description: "公共提示词",
        group: "assets",
        icon: FileText,
    },
] as const;

export type NavigationToolSlug = (typeof navigationTools)[number]["slug"];
export type NavigationGroupId = (typeof navigationGroups)[number]["id"];

export function navigationToolForPathname(pathname: string) {
    const slug = pathname.split("/").filter(Boolean)[0];
    return navigationTools.find((tool) => tool.slug === slug);
}
