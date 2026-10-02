export function formatUsd(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
}

export function formatUsdFull(value: number): string {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function initials(first: string, last: string): string {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function spendPct(spend: number, budget: number): number {
    if (!budget) return 0;
    return Math.round((spend / budget) * 100);
}
