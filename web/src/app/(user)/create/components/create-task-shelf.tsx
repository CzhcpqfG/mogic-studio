"use client";

import { BadgePercent, Box, Clapperboard, MessageCircleHeart, PackageOpen, Store, type LucideIcon } from "lucide-react";

import { BUILTIN_TASK_TEMPLATES, type TaskTemplate } from "@/lib/task-templates";
import { cn } from "@/lib/utils";

const TASK_TEMPLATE_ICONS: Record<string, LucideIcon> = {
    "package-open": PackageOpen,
    store: Store,
    box: Box,
    "message-heart": MessageCircleHeart,
    "badge-percent": BadgePercent,
    clapperboard: Clapperboard,
};

export function TaskTemplateIcon({ template, className }: { template: Pick<TaskTemplate, "icon">; className?: string }) {
    const Icon = TASK_TEMPLATE_ICONS[template.icon] ?? PackageOpen;
    return <Icon className={className} aria-hidden />;
}

export function CreateTaskShelf({ onSelect }: { onSelect: (template: TaskTemplate) => void }) {
    return (
        <div data-testid="create-task-shelf" className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {BUILTIN_TASK_TEMPLATES.map((template) => (
                <button
                    key={template.id}
                    type="button"
                    data-testid={`create-task-card-${template.id}`}
                    className="group flex h-full flex-col items-start gap-2 rounded-xl border border-[#e3e7eb] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[#c9d2dc] hover:shadow-[0_8px_24px_rgba(32,36,42,0.08)] dark:border-[#343a42] dark:bg-[#181b20] dark:hover:border-[#4a525d] dark:hover:shadow-black/30 sm:p-4"
                    onClick={() => onSelect(template)}
                >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-[#f1f3f6] text-[#596572] transition group-hover:bg-[#e8ecf1] group-hover:text-[#20242a] dark:bg-[#23272d] dark:text-[#aab2bc] dark:group-hover:bg-[#2b3037] dark:group-hover:text-white">
                        <TaskTemplateIcon template={template} className="size-4" />
                    </span>
                    <span className="flex w-full flex-col gap-0.5">
                        <span className={cn("text-sm font-semibold leading-tight text-[#20242a] dark:text-[#e6eaef]", template.surface === "video" && "after:ml-1.5 after:inline-block after:rounded after:bg-[#e8ecf1] after:px-1 after:align-middle after:text-[10px] after:font-medium after:text-[#8b949f] after:content-['视频'] dark:after:bg-[#23272d] dark:after:text-[#aab2bc]")}>
                            {template.title}
                        </span>
                        <span className="text-xs leading-snug text-[#8b949f] dark:text-[#7f8996]">{template.subtitle}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}
