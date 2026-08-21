type PointsResponseValue = {
    pointsBalance?: unknown;
    permanentPointsBalance?: unknown;
    dailyPointsBalance?: unknown;
    dailyPointsExpiresAt?: unknown;
};

export function pointsResponseHeaders(value: unknown) {
    const headers = new Headers();
    const points = typeof value === "object" && value ? (value as PointsResponseValue) : { pointsBalance: value };
    setNumberHeader(headers, "x-mogic-studio-points-remaining", points.pointsBalance);
    setNumberHeader(headers, "x-mogic-studio-points-permanent", points.permanentPointsBalance);
    setNumberHeader(headers, "x-mogic-studio-points-daily", points.dailyPointsBalance);
    if (typeof points.dailyPointsExpiresAt === "string" && points.dailyPointsExpiresAt) headers.set("x-mogic-studio-points-daily-expires-at", points.dailyPointsExpiresAt);
    return headers;
}

function setNumberHeader(headers: Headers, name: string, value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) headers.set(name, String(value));
}
