import type { SiteFriendLink, SiteSocialSettings } from "@/lib/auth/store-types";
import type { CreateAgentMode } from "@/lib/create-agent-prompt";

export type HomeSiteSettings = {
    title: string;
    logoUrl: string;
    seoDescription: string;
    footerCopyright: string;
    termsUrl: string;
    privacyUrl: string;
    friendLinks: SiteFriendLink[];
    socials: SiteSocialSettings;
};

export type HomeNavigationItem = {
    label: string;
    href: string;
    action: "link" | "protected" | "billing";
};

export const HOME_NAVIGATION = [
    { label: "创作 Agent", href: "/create", action: "protected" },
    { label: "价格方案", href: "/billing", action: "billing" },
] as const satisfies readonly HomeNavigationItem[];

export const HOME_CREATION_MODES = [
    {
        id: "agent",
        label: "智能模式",
        icon: "agent",
        examples: ["生成一张科幻城市概念图", "制作一段产品宣传视频", "为电商产品生成详情页", "创作一个短剧分镜脚本"],
    },
    {
        id: "image",
        label: "AI 绘图",
        icon: "image",
        examples: ["生成电影感的未来城市概念图", "为美妆新品制作竖版宣传海报", "为电商产品生成详情页", "把参考图改成清透夏日广告"],
    },
    {
        id: "video",
        label: "AI 视频",
        icon: "video",
        examples: ["制作一段 10 秒新品发布短片", "生成竖屏咖啡品牌氛围广告", "让镜头缓慢向前推进", "制作一段产品功能演示视频"],
    },
    {
        id: "audio",
        label: "AI 音频",
        icon: "audio",
        examples: ["生成温暖自然的品牌介绍旁白", "制作沉稳的发布会开场音频", "将文案转换为轻快女声配音", "为短片生成自然男声旁白"],
    },
] as const;

export type HomeCreationMode = CreateAgentMode;

export const HOME_STEPS = [
    { number: "01", title: "描述想法", description: "用自然语言描述创意，或直接上传参考素材", icon: "edit" },
    { number: "02", title: "智能规划", description: "Agent 自动理解意图，规划方案与模型参数", icon: "wand" },
    { number: "03", title: "生成与迭代", description: "多模态生成创作内容，支持反馈优化与重试", icon: "rocket" },
    { number: "04", title: "保存与导出", description: "成果保存在创作会话，随时回看与下载复用", icon: "download" },
] as const;

export const HOME_ADVANTAGES = [
    { title: "100+ 创作模板", description: "覆盖多行业与多场景", icon: "layers" },
    { title: "多模型协同", description: "按任务智能匹配能力", icon: "network" },
    { title: "长任务不中断", description: "稳定续取创作进度", icon: "history" },
    { title: "企业级存储", description: "可靠保存创作资产", icon: "cloud" },
] as const;
