import { describe, expect, it } from "vitest";

import { DEFAULT_SITE_SETTINGS } from "./store-foundation";
import { normalizeSiteSettings, normalizeSiteSocial } from "./store-normalizers";

describe("site settings", () => {
    it("uses the bundled browser icon when older settings have no icon URL", () => {
        expect(normalizeSiteSettings({ logoUrl: "/custom-logo.svg" }).iconUrl).toBe(DEFAULT_SITE_SETTINGS.iconUrl);
    });

    it("accepts a configured browser icon independently from the logo", () => {
        const settings = normalizeSiteSettings({ logoUrl: "/brand.svg", iconUrl: "https://cdn.example.com/favicon.ico" });

        expect(settings.logoUrl).toBe("/brand.svg");
        expect(settings.iconUrl).toBe("https://cdn.example.com/favicon.ico");
    });

    it("defaults public contacts to the MOGIC email and disabled QQ group", () => {
        const settings = normalizeSiteSettings({});

        expect(settings.socials.email).toMatchObject({ enabled: true, url: "mailto:csyqlz@gmail.com" });
        expect(settings.socials.telegram).toMatchObject({ enabled: false, url: "" });
        expect(settings.socials.x).toMatchObject({ enabled: false, url: "" });
        expect(settings.socials.instagram).toMatchObject({ enabled: false, url: "" });
        expect(DEFAULT_SITE_SETTINGS.friendLinks).toContainEqual(expect.objectContaining({ id: "qq-mogic-open-source", url: "", enabled: false }));
        expect(settings.friendLinks).not.toContainEqual(expect.objectContaining({ id: "qq-mogic-open-source" }));
    });

    it("updates only bundled brand defaults when the site title changes", () => {
        const settings = normalizeSiteSettings({
            ...DEFAULT_SITE_SETTINGS,
            title: "墨术",
        });

        expect(settings).toMatchObject({
            title: "墨术",
            seoTitle: "墨术",
            seoKeywords: expect.stringContaining("墨术"),
            footerCopyright: expect.stringContaining("墨术"),
        });
        expect(settings.friendLinks).toContainEqual(expect.objectContaining({ id: "mogic-studio-home", label: "墨术" }));
    });

    it("preserves explicitly customized brand copy when the title changes", () => {
        const settings = normalizeSiteSettings({
            ...DEFAULT_SITE_SETTINGS,
            title: "墨术",
            seoTitle: "独立 SEO 标题",
            seoKeywords: "自定义,关键词",
            footerCopyright: "© 独立运营主体",
            friendLinks: [{ id: "mogic-studio-home", label: "官方网站", url: "https://github.com/CzhcpqfG/mogic-studio", enabled: true }],
        });

        expect(settings).toMatchObject({ seoTitle: "独立 SEO 标题", seoKeywords: "自定义,关键词", footerCopyright: "© 独立运营主体" });
        expect(settings.friendLinks[0]?.label).toBe("官方网站");
    });

    it("preserves customized footer links and social contacts", () => {
        const settings = normalizeSiteSettings({
            footerCopyright: "© Monster Studio. All rights reserved.",
            termsUrl: "/custom-terms",
            termsVersion: "2026.2",
            privacyUrl: "https://example.com/privacy",
            privacyVersion: "3.1",
            socials: {
                email: { enabled: true, label: "QQ", url: "mailto:owner@example.com" },
                telegram: { enabled: true, label: "Telegram 社群", url: "https://t.me/example" },
                x: { enabled: false, label: "X", url: "https://x.com/example" },
                instagram: { enabled: true, label: "Instagram", url: "https://instagram.com/example" },
            },
        });

        expect(settings).toMatchObject({
            footerCopyright: "© Monster Studio. All rights reserved.",
            termsUrl: "/custom-terms",
            termsVersion: "2026.2",
            privacyUrl: "https://example.com/privacy",
            privacyVersion: "3.1",
            socials: {
                email: { enabled: true, label: "QQ", url: "mailto:owner@example.com" },
                telegram: { enabled: true, label: "Telegram 社群", url: "https://t.me/example" },
                x: { enabled: false, label: "X", url: "https://x.com/example" },
                instagram: { enabled: true, label: "Instagram", url: "https://instagram.com/example" },
            },
        });
    });

    it("normalizes common social handles and addresses without dropping them", () => {
        const settings = normalizeSiteSettings({
            socials: {
                email: { enabled: true, label: "邮箱", url: "owner@example.com" },
                telegram: { enabled: true, label: "Telegram", url: "t.me/mogic_group" },
                x: { enabled: true, label: "X", url: "@mogic_studio" },
                instagram: { enabled: true, label: "Instagram", url: "instagram.com/mogic.pro" },
            },
        });

        expect(settings.socials).toEqual({
            email: { enabled: true, label: "邮箱", url: "mailto:owner@example.com" },
            telegram: { enabled: true, label: "Telegram", url: "https://t.me/mogic_group" },
            x: { enabled: true, label: "X", url: "https://x.com/mogic_studio" },
            instagram: { enabled: true, label: "Instagram", url: "https://instagram.com/mogic.pro" },
        });
        expect(normalizeSiteSettings(settings).socials).toEqual(settings.socials);
    });

    it("does not restore friend links that an administrator explicitly deleted", () => {
        const settings = normalizeSiteSettings({ friendLinks: [] });

        expect(settings.friendLinks).toEqual([]);
        expect(normalizeSiteSettings(settings).friendLinks).toEqual([]);
    });

    it("accepts a plain contact email and preserves an explicitly cleared contact", () => {
        const configured = normalizeSiteSettings({
            socials: {
                ...DEFAULT_SITE_SETTINGS.socials,
                email: { enabled: true, label: "商务邮箱", url: "owner@example.com" },
            },
        });
        expect(configured.socials.email).toEqual({ enabled: true, label: "商务邮箱", url: "mailto:owner@example.com" });

        const cleared = normalizeSiteSettings({
            socials: {
                ...configured.socials,
                email: { enabled: false, label: "", url: "" },
            },
        });
        expect(cleared.socials.email).toEqual({ enabled: false, label: "", url: "" });
        expect(normalizeSiteSettings(cleared).socials.email).toEqual({ enabled: false, label: "", url: "" });
    });

    it("uses social defaults only for properties omitted by older settings", () => {
        expect(normalizeSiteSocial("email", { enabled: false })).toEqual({ ...DEFAULT_SITE_SETTINGS.socials.email, enabled: false });
    });
});
