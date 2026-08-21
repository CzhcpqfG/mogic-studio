import { describe, expect, it } from "vitest";

import { BUILTIN_TASK_TEMPLATES, buildTemplatePrompt, templateDefaultAnswers } from "./task-templates";

describe("task templates", () => {
    it("keeps every builtin template well-formed", () => {
        expect(BUILTIN_TASK_TEMPLATES.length).toBeGreaterThanOrEqual(5);
        for (const template of BUILTIN_TASK_TEMPLATES) {
            expect(template.questions.length).toBeGreaterThanOrEqual(1);
            expect(template.questions.length).toBeLessThanOrEqual(3);
            for (const question of template.questions) {
                expect(question.options.length).toBeGreaterThanOrEqual(2);
                expect(question.options.length).toBeLessThanOrEqual(4);
                for (const option of question.options) {
                    expect(option.promptFragment.length).toBeGreaterThan(0);
                    expect(option.label.length).toBeGreaterThan(0);
                }
            }
            if (template.surface === "video") {
                expect(template.preferences?.mode).toBe("video");
            }
        }
    });

    it("builds a prompt from intro and chosen fragments only", () => {
        const template = BUILTIN_TASK_TEMPLATES[0];
        const prompt = buildTemplatePrompt(template, { [template.questions[0].key]: 1 });
        expect(prompt).toContain(template.intro);
        expect(prompt).toContain(template.questions[0].options[1].promptFragment);
        expect(prompt).not.toContain(template.questions[0].options[0].promptFragment);
        expect(prompt).not.toContain(template.questions[1].options[0].promptFragment);
    });

    it("defaults answers to the first option of every question", () => {
        const template = BUILTIN_TASK_TEMPLATES[0];
        const answers = templateDefaultAnswers(template);
        expect(Object.keys(answers)).toEqual(template.questions.map((question) => question.key));
        for (const question of template.questions) expect(answers[question.key]).toBe(0);
    });

    it("skips unanswered questions when building prompts", () => {
        const template = BUILTIN_TASK_TEMPLATES[0];
        expect(buildTemplatePrompt(template, {})).toBe(template.intro);
    });
});
