import type { MetadataRoute } from "next";

import { absoluteSiteUrl, siteMetadataBase } from "@/lib/server/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = siteMetadataBase();
    const staticEntries: MetadataRoute.Sitemap = ["/", "/announcements", "/terms", "/privacy"].map((path) => ({
        url: absoluteSiteUrl(path, base),
        changeFrequency: path === "/" ? "daily" : path === "/announcements" ? "weekly" : "yearly",
        priority: path === "/" ? 1 : path === "/announcements" ? 0.6 : 0.3,
    }));
    return staticEntries;
}
