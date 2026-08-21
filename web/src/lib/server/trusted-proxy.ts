export function getTrustedProxyHops() {
    const value = Number(process.env.MOGIC_STUDIO_TRUSTED_PROXY_HOPS || 0);
    return Number.isInteger(value) && value > 0 ? Math.min(value, 10) : 0;
}
