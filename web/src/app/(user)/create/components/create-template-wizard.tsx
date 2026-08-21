"use client";

import { ArrowLeft, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { buildTemplatePrompt, templateDefaultAnswers, type TaskTemplate, type TaskTemplateOptionStyle } from "@/lib/task-templates";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/use-theme-store";

import { TaskTemplateIcon } from "./create-task-shelf";

const FONT_STACKS: Record<TaskTemplateOptionStyle["font"], string> = {
    serif: '"Noto Serif SC","Source Han Serif SC","Songti SC",SimSun,serif',
    hand: '"Kaiti SC","STKaiti",KaiTi,"TW-Kai",cursive',
    display: "system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif",
    sans: "inherit",
};

function OptionCard({
    label,
    hint,
    style,
    selected,
    onSelect,
}: {
    label: string;
    hint?: string;
    style: TaskTemplateOptionStyle;
    selected?: boolean;
    onSelect: () => void;
}) {
    const theme = useThemeStore((state) => state.theme);
    const dark = theme === "dark";
    return (
        <button
            type="button"
            aria-pressed={selected}
            className={cn(
                "group relative flex aspect-[4/3] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border p-3 text-center transition",
                selected ? "border-[#565ccb] ring-2 ring-[#565ccb]/30 dark:border-[#818cf8] dark:ring-[#818cf8]/30" : "border-transparent hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(32,36,42,0.1)] dark:hover:shadow-black/30",
            )}
            style={{ background: dark ? style.bgDark : style.bg }}
            onClick={onSelect}
        >
            <span
                className="text-base font-semibold leading-snug sm:text-lg"
                style={{ color: style.text, fontFamily: FONT_STACKS[style.font], fontWeight: style.font === "display" ? 800 : 600 }}
            >
                {label}
            </span>
            {hint ? (
                <span className="text-xs leading-none opacity-70" style={{ color: style.text }}>
                    {hint}
                </span>
            ) : null}
            <span aria-hidden className="absolute right-2 top-2 size-1.5 rounded-full opacity-60" style={{ background: style.accent }} />
        </button>
    );
}

export function CreateTemplateWizard({
    template,
    submitting,
    onExit,
    onComplete,
}: {
    template: TaskTemplate;
    submitting?: boolean;
    onExit: () => void;
    onComplete: (prompt: string) => void;
}) {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>(() => templateDefaultAnswers(template));
    const question = template.questions[step];
    const isLast = step === template.questions.length - 1;
    const lastSelected = isLast ? answers[question.key] : undefined;

    const choose = (index: number) => {
        const next = { ...answers, [question.key]: index };
        setAnswers(next);
        if (!isLast) setStep(step + 1);
    };

    return (
        <div data-testid={`create-template-wizard-${template.id}`} className="flex w-full flex-col rounded-2xl border border-[#e3e7eb] bg-white p-4 dark:border-[#343a42] dark:bg-[#181b20] sm:p-6">
            <div className="flex items-center gap-2.5">
                <button
                        type="button"
                        aria-label="上一步"
                        className={cn("flex size-8 items-center justify-center rounded-lg text-[#68727e] transition hover:bg-[#f1f3f5] hover:text-[#20242a] dark:text-[#aab2bc] dark:hover:bg-[#23272d] dark:hover:text-white", step === 0 && "invisible")}
                        onClick={() => setStep(Math.max(0, step - 1))}
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#f1f3f6] text-[#596572] dark:bg-[#23272d] dark:text-[#aab2bc]">
                    <TaskTemplateIcon template={template} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#20242a] dark:text-[#e6eaef]">{template.title}</p>
                    <p className="text-xs text-[#8b949f] dark:text-[#7f8996]">
                        第 {step + 1} / {template.questions.length} 题 · 选一个感觉就行
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="退出向导"
                    className="flex size-8 items-center justify-center rounded-lg text-[#68727e] transition hover:bg-[#f1f3f5] hover:text-[#20242a] dark:text-[#aab2bc] dark:hover:bg-[#23272d] dark:hover:text-white"
                    onClick={onExit}
                >
                    <X className="size-4" />
                </button>
            </div>

            <div className="mt-3 flex items-center gap-1.5" aria-hidden>
                {template.questions.map((item, index) => (
                    <button
                        key={item.key}
                        type="button"
                        tabIndex={-1}
                        className={cn("h-1.5 rounded-full transition-all", index === step ? "w-6 bg-[#565ccb] dark:bg-[#818cf8]" : "w-3 bg-[#e3e7eb] dark:bg-[#343a42]", index < step && "cursor-pointer hover:bg-[#c9d2dc] dark:hover:bg-[#4a525d]")}
                        onClick={() => index < step && setStep(index)}
                    />
                ))}
            </div>

            <p className="mt-4 text-center text-[15px] font-semibold text-[#20242a] dark:text-[#e6eaef] sm:text-base">{question.question}</p>

            <div className={cn("mt-3 grid gap-2 sm:gap-2.5", question.options.length > 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
                {question.options.map((option, index) => (
                    <OptionCard key={option.label} label={option.label} hint={option.hint} style={option.style} selected={isLast && answers[question.key] === index} onSelect={() => choose(index)} />
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
                <button
                    type="button"
                    disabled={submitting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e3e7eb] bg-white px-3.5 text-sm font-medium text-[#596572] transition hover:border-[#cfd6dd] hover:bg-[#f7f8fa] disabled:opacity-50 dark:border-[#343a42] dark:bg-[#181b20] dark:text-[#b7c0ca] dark:hover:border-[#4a525d] dark:hover:bg-[#20242a]"
                    onClick={() => onComplete(buildTemplatePrompt(template, templateDefaultAnswers(template)))}
                >
                    <Sparkles className="size-4" />
                    你看着办
                </button>
                {isLast ? (
                    <button
                        type="button"
                        disabled={lastSelected == null || submitting}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#20242a] px-5 text-sm font-semibold text-white transition hover:bg-[#343b44] disabled:opacity-40 dark:bg-[#e6eaef] dark:text-[#181b20] dark:hover:bg-white"
                        onClick={() => lastSelected != null && onComplete(buildTemplatePrompt(template, answers))}
                    >
                        {submitting ? "正在开始…" : "就这样，开始创作"}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
