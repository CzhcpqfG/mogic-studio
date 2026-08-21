export const DEFAULT_SITE_TITLE = "Mogic-Studio";

export function resolveSiteTitle(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : DEFAULT_SITE_TITLE;
}
