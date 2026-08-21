import type { CreativeGenerationPreferences } from "@/lib/creative-runtime-contract";

export type TaskTemplateOptionStyle = {
    /** 浅色主题卡片背景 */
    bg: string;
    /** 深色主题卡片背景 */
    bgDark: string;
    /** 示例文字颜色 */
    text: string;
    /** 点缀色（角标/描边） */
    accent: string;
    font: "serif" | "hand" | "display" | "sans";
};

export type TaskTemplateOption = {
    label: string;
    hint?: string;
    promptFragment: string;
    style: TaskTemplateOptionStyle;
};

export type TaskTemplateQuestion = {
    key: string;
    question: string;
    options: TaskTemplateOption[];
};

export type TaskTemplateSurface = "image" | "video";

export type TaskTemplate = {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    surface: TaskTemplateSurface;
    /** 组装提示词时的固定开头，描述任务本身 */
    intro: string;
    preferences?: CreativeGenerationPreferences;
    questions: TaskTemplateQuestion[];
};

export function buildTemplatePrompt(template: TaskTemplate, answers: Record<string, number>): string {
    const parts = [template.intro];
    for (const question of template.questions) {
        const index = answers[question.key];
        if (index == null) continue;
        const fragment = question.options[index]?.promptFragment;
        if (fragment) parts.push(fragment);
    }
    return parts.join("，");
}

export function templateDefaultAnswers(template: TaskTemplate): Record<string, number> {
    const answers: Record<string, number> = {};
    for (const question of template.questions) answers[question.key] = 0;
    return answers;
}

/**
 * 内置默认任务包：裸部署的开箱下限。
 * 行业定制包通过 brand-knowledge/tasks/*.json 种子同步追加（后续接入）。
 */
export const BUILTIN_TASK_TEMPLATES: TaskTemplate[] = [
    {
        id: "product-launch-poster",
        title: "商品上新海报",
        subtitle: "选好感觉，三步出图",
        icon: "package-open",
        surface: "image",
        intro: "为我的商品设计一张上新宣传海报，画面以商品为主角，信息层级清晰",
        preferences: { image: { count: 2 } },
        questions: [
            {
                key: "placement",
                question: "这张图主要用在哪里？",
                options: [
                    {
                        label: "朋友圈 / 社群",
                        hint: "竖版，生活感强",
                        promptFragment: "用于朋友圈和社群传播，竖版构图，带生活气息和亲切感",
                        style: { bg: "#fdf6ec", bgDark: "#2b2418", text: "#8a5a2b", accent: "#e8a54b", font: "hand" },
                    },
                    {
                        label: "门店张贴",
                        hint: "远看也清楚的大字",
                        promptFragment: "用于门店现场张贴，重点信息字号大而醒目，三米外也能看清",
                        style: { bg: "#fdecec", bgDark: "#2b1818", text: "#b03a2e", accent: "#e05545", font: "display" },
                    },
                    {
                        label: "电商主图",
                        hint: "方图，商品突出",
                        promptFragment: "用作电商平台主图，方形构图，商品占比大、卖点简洁",
                        style: { bg: "#edf3fd", bgDark: "#18202b", text: "#2c5aa8", accent: "#4d7fd6", font: "sans" },
                    },
                ],
            },
            {
                key: "mood",
                question: "想要哪种感觉？",
                options: [
                    {
                        label: "清新自然",
                        promptFragment: "整体清新自然，浅色留白多，光线明亮通透",
                        style: { bg: "#eef7ee", bgDark: "#18231a", text: "#3a7a44", accent: "#63b46e", font: "sans" },
                    },
                    {
                        label: "浓郁诱人",
                        promptFragment: "整体浓郁诱人，暖色调饱满，质感厚重有食欲感",
                        style: { bg: "#f9ede0", bgDark: "#291d12", text: "#9c5a1e", accent: "#d68a3f", font: "serif" },
                    },
                    {
                        label: "简约高级",
                        promptFragment: "整体简约高级，克制配色，大量留白，精致排版",
                        style: { bg: "#f0f0f2", bgDark: "#1c1c20", text: "#3d3d46", accent: "#82828f", font: "serif" },
                    },
                ],
            },
            {
                key: "focus",
                question: "最想突出什么？",
                options: [
                    { label: "新品上市", promptFragment: "突出新品上市的仪式感", style: { bg: "#f3eefd", bgDark: "#201a2b", text: "#6b46a8", accent: "#9a72d6", font: "display" } },
                    { label: "价格优惠", promptFragment: "突出价格优惠力度，价格信息醒目", style: { bg: "#fdeeea", bgDark: "#2b1c18", text: "#c04a2e", accent: "#ef7a55", font: "display" } },
                    { label: "品牌质感", promptFragment: "突出品牌质感与调性，弱化促销感", style: { bg: "#eceff4", bgDark: "#191d24", text: "#39465c", accent: "#6b7fa3", font: "serif" } },
                ],
            },
        ],
    },
    {
        id: "store-promotion",
        title: "门店宣传图",
        subtitle: "让顾客还没进门就被吸引",
        icon: "store",
        surface: "image",
        intro: "为我的门店设计一张宣传图，突出空间氛围和到店理由",
        preferences: { image: { size: "3:4", count: 2 } },
        questions: [
            {
                key: "subject",
                question: "画面主角是什么？",
                options: [
                    { label: "门头招牌", hint: "路人一眼认出你", promptFragment: "以门头招牌为主角，强调辨识度和进店吸引力", style: { bg: "#eef2fb", bgDark: "#171d29", text: "#31549b", accent: "#5b83cf", font: "display" } },
                    { label: "店内环境", hint: "展示空间与氛围", promptFragment: "以店内环境为主角，展示空间舒适度和氛围", style: { bg: "#faf3ea", bgDark: "#282016", text: "#95662a", accent: "#cb9750", font: "serif" } },
                    { label: "招牌产品特写", hint: "馋哭路人的那种", promptFragment: "以招牌产品的诱人特写为主角，激发食欲和购买欲", style: { bg: "#fbeeee", bgDark: "#291818", text: "#a83e3e", accent: "#dd6a6a", font: "display" } },
                ],
            },
            {
                key: "time",
                question: "什么时段的氛围？",
                options: [
                    { label: "清晨明亮", promptFragment: "清晨时段的明亮光线，干净清爽的开始感", style: { bg: "#eef6fa", bgDark: "#16222a", text: "#2e6b85", accent: "#57a3c4", font: "sans" } },
                    { label: "午后温暖", promptFragment: "午后慵懒温暖的阳光氛围", style: { bg: "#f9efe2", bgDark: "#281e13", text: "#a06a25", accent: "#d99c48", font: "hand" } },
                    { label: "夜晚灯光", promptFragment: "夜晚温馨灯光氛围，有烟火气", style: { bg: "#f0e9f7", bgDark: "#1e1826", text: "#6d4b96", accent: "#a37fd0", font: "serif" } },
                ],
            },
        ],
    },
    {
        id: "product-white-background",
        title: "产品白底图",
        subtitle: "上架、打印都能用的标准图",
        icon: "box",
        surface: "image",
        intro: "为我的产品生成一张干净的商品展示图，产品清晰完整、适合正式用途",
        preferences: { image: { size: "1:1", count: 2 } },
        questions: [
            {
                key: "background",
                question: "背景怎么处理？",
                options: [
                    { label: "纯白背景", hint: "平台上传的标准款", promptFragment: "纯白色背景，无阴影干扰，符合电商平台规范", style: { bg: "#ffffff", bgDark: "#232323", text: "#5a5a66", accent: "#c9c9d4", font: "sans" } },
                    { label: "浅灰渐变", hint: "比纯白更有质感", promptFragment: "浅灰色柔和渐变背景，带轻微高级感", style: { bg: "#f2f3f5", bgDark: "#1d1f23", text: "#4a4e58", accent: "#9aa0ac", font: "sans" } },
                    { label: "场景感阴影", hint: "像被专业拍摄过", promptFragment: "带自然投影和轻微场景感的布光，像专业棚拍效果", style: { bg: "#eff1ee", bgDark: "#1a1d1a", text: "#46503f", accent: "#87927a", font: "serif" } },
                ],
            },
        ],
    },
    {
        id: "social-media-image",
        title: "社交媒体配图",
        subtitle: "发圈发笔记都合适",
        icon: "message-heart",
        surface: "image",
        intro: "为我生成一张社交媒体配图，画面有记忆点，适合日常内容发布",
        preferences: { image: { count: 2 } },
        questions: [
            {
                key: "format",
                question: "发在哪个平台？",
                options: [
                    { label: "小红书笔记", hint: "竖版 3:4", promptFragment: "小红书笔记配图，竖版 3:4 构图，信息密度适中", style: { bg: "#fdeff2", bgDark: "#2a181c", text: "#bb4a67", accent: "#ef7d97", font: "hand" } },
                    { label: "朋友圈", hint: "方图不出错", promptFragment: "朋友圈配图，方形构图，缩略图状态下也好看", style: { bg: "#eaf3ee", bgDark: "#161f1b", text: "#33705a", accent: "#5da586", font: "sans" } },
                    { label: "公众号封面", hint: "横版 16:9", promptFragment: "公众号头图封面，横版 16:9，标题区域留足空间", style: { bg: "#edf0f8", bgDark: "#181c26", text: "#3d4f80", accent: "#6f86bd", font: "display" } },
                ],
            },
            {
                key: "vibe",
                question: "情绪基调？",
                options: [
                    { label: "治愈轻松", promptFragment: "治愈系轻松氛围，柔和色彩", style: { bg: "#f0f6ef", bgDark: "#181f17", text: "#4a7a42", accent: "#82b378", font: "hand" } },
                    { label: "元气活力", promptFragment: "元气活力感，明快撞色，有能量", style: { bg: "#fef3e2", bgDark: "#2a2113", text: "#c47f1d", accent: "#f5ae4e", font: "display" } },
                    { label: "高级冷静", promptFragment: "高级冷静的调性，低饱和配色", style: { bg: "#eeeff2", bgDark: "#1b1c21", text: "#414551", accent: "#8b90a0", font: "serif" } },
                ],
            },
        ],
    },
    {
        id: "campaign-graphic",
        title: "活动促销图",
        subtitle: "开业、节日、周年庆都能用",
        icon: "badge-percent",
        surface: "image",
        intro: "为我设计一张活动宣传图，活动信息和行动号召清晰有力",
        preferences: { image: { size: "3:4", count: 2 } },
        questions: [
            {
                key: "occasion",
                question: "是什么场合？",
                options: [
                    { label: "开业开业礼", promptFragment: "新店开业主题，喜庆且有仪式感", style: { bg: "#fdeeea", bgDark: "#2a1a15", text: "#bf4426", accent: "#f07a50", font: "display" } },
                    { label: "节日热点", promptFragment: "结合节日热点的主题氛围", style: { bg: "#fdeef5", bgDark: "#2a1720", text: "#bc3f74", accent: "#ef74a8", font: "hand" } },
                    { label: "会员回馈", promptFragment: "会员答谢回馈主题，强调专属感", style: { bg: "#edf1fa", bgDark: "#171c29", text: "#33508f", accent: "#6383cd", font: "serif" } },
                ],
            },
            {
                key: "intensity",
                question: "促销感要多强？",
                options: [
                    { label: "热闹直接", hint: "折扣信息放大", promptFragment: "热闹直接的促销表达，优惠信息放大醒目", style: { bg: "#fdecec", bgDark: "#2a1616", text: "#c22f2f", accent: "#f26060", font: "display" } },
                    { label: "克制体面", hint: "有促销但不掉价", promptFragment: "克制的促销表达，保持品牌体面，优惠信息优雅呈现", style: { bg: "#f1f0ec", bgDark: "#1e1d19", text: "#56503f", accent: "#98906f", font: "serif" } },
                ],
            },
        ],
    },
    {
        id: "product-showcase-video",
        title: "产品展示短视频",
        subtitle: "适合朋友圈和短视频号",
        icon: "clapperboard",
        surface: "video",
        intro: "为我的产品生成一段展示短视频，突出产品质感和使用场景",
        preferences: { mode: "video", video: { seconds: 5, count: 1 } },
        questions: [
            {
                key: "pace",
                question: "喜欢什么节奏？",
                options: [
                    { label: "快节奏卡点", hint: "抓眼球", promptFragment: "快节奏剪辑感，镜头切换利落，有卡点冲击力", style: { bg: "#eef0fb", bgDark: "#181a29", text: "#4048a8", accent: "#737de0", font: "display" } },
                    { label: "舒缓展示", hint: "慢慢看细节", promptFragment: "舒缓的镜头运动，稳定展示产品细节和质感", style: { bg: "#f0f4f2", bgDark: "#171d1b", text: "#3f6157", accent: "#6f9a8c", font: "serif" } },
                ],
            },
            {
                key: "format",
                question: "画幅比例？",
                options: [
                    { label: "竖版 9:16", hint: "朋友圈 / 视频号", promptFragment: "竖版 9:16 画幅，适配手机全屏观看", style: { bg: "#f4eefa", bgDark: "#1f1926", text: "#7040a8", accent: "#a678dd", font: "sans" } },
                    { label: "横版 16:9", hint: "大屏播放", promptFragment: "横版 16:9 画幅，适合大屏和网页播放", style: { bg: "#eef4f8", bgDark: "#151f26", text: "#2f6480", accent: "#5b9cc0", font: "sans" } },
                ],
            },
        ],
    },
];
