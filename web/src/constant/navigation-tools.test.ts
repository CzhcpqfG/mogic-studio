import { describe, expect, it } from "vitest";

import { navigationGroups, navigationTools } from "./navigation-tools";

describe("user navigation order", () => {
    it("keeps the unified Agent as the only generation entry in workspace navigation", () => {
        expect(navigationGroups.map((group) => group.label)).toEqual(["创作", "项目", "资产"]);
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("image");
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("video");
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("drama");
    });

    it("keeps personal assets in the requested asset order", () => {
        expect(navigationTools.filter((tool) => tool.group === "assets").map((tool) => tool.label)).toEqual(["素材", "提示词", "词库"]);
    });
});
