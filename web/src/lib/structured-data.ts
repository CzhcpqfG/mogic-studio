type WebsiteStructuredDataInput = {
    name: string;
    description: string;
    url: string;
    logoUrl: string;
};

export function serializeStructuredData(value: unknown) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildWebsiteStructuredData(input: WebsiteStructuredDataInput) {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${input.url}#website`,
        url: input.url,
        name: input.name,
        description: input.description,
        publisher: {
            "@type": "Organization",
            name: input.name,
            logo: { "@type": "ImageObject", url: input.logoUrl },
        },
    };
}
