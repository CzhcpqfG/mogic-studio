import { describe, expect, it } from "vitest";

import { buildWebsiteStructuredData, serializeStructuredData } from "./structured-data";

describe("structured data", () => {
    it("builds the public website identity with its configured logo", () => {
        expect(
            buildWebsiteStructuredData({
                name: "墨术",
                description: "视觉创作平台",
                url: "https://example.com/",
                logoUrl: "https://example.com/logo.svg",
            }),
        ).toMatchObject({
            "@type": "WebSite",
            "@id": "https://example.com/#website",
            publisher: { "@type": "Organization", logo: { url: "https://example.com/logo.svg" } },
        });
    });

    it("escapes script-closing content while preserving valid JSON", () => {
        const serialized = serializeStructuredData({ description: '</script><script>alert("x")</script>' });

        expect(serialized).not.toContain("<");
        expect(JSON.parse(serialized)).toEqual({ description: '</script><script>alert("x")</script>' });
    });
});
