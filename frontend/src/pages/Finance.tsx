import { useEffect, useState } from "react";
import { fetchStats, ApiError } from "../api/client";
import type { CostCenter } from "../api/types";
import { StatTile } from "../components/StatTile";
import { formatUsd, formatUsdFull, spendPct } from "../lib/format";

export function Finance() {
    const [centers, setCenters] = useState<CostCenter[]>([]);
    const [totals, setTotals] = useState<{ budget: number; spend: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        fetchStats()
            .then((s) => {
                if (!alive) return;
                setCenters(s.cost_centers);
                setTotals({ budget: s.totals.annual_budget_usd, spend: s.totals.ytd_spend_usd });
            })
            .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : "Could not load finance data."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    if (loading)
        return (
            <div className="row">
                <span className="spinner" /> Loading cost centers…
            </div>
        );
    if (error) return <div className="banner err">{error}</div>;

    const headcount = centers.reduce((n, c) => n + c.headcount, 0);

    return (
        <div className="stack">
            {totals && (
                <div className="grid grid-4">
                    <StatTile label="Annual budget" value={formatUsd(totals.budget)} foot={formatUsdFull(totals.budget)} />
                    <StatTile label="YTD spend" value={formatUsd(totals.spend)} foot={`${spendPct(totals.spend, totals.budget)}% of budget`} />
                    <StatTile label="Cost centers" value={centers.length} foot="tracked" />
                    <StatTile label="Total headcount" value={headcount} foot="allocated to centers" />
                </div>
            )}

            <div className="card fade-in">
                <h3 className="card-title">Cost centers · budget utilization</h3>
                <div className="table-wrap">
                    <table className="data">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Owner</th>
                                <th>Headcount</th>
                                <th>Budget</th>
                                <th>YTD spend</th>
                                <th>Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {centers.map((c) => {
                                const pct = spendPct(c.ytd_spend_usd, c.annual_budget_usd);
                                return (
                                    <tr key={c.cost_center_code}>
                                        <td>
                                            <code>{c.cost_center_code}</code>
                                        </td>
                                        <td>{c.name}</td>
                                        <td className="muted">{c.owner_name}</td>
                                        <td>{c.headcount}</td>
                                        <td>{formatUsd(c.annual_budget_usd)}</td>
                                        <td className="muted">{formatUsd(c.ytd_spend_usd)}</td>
                                        <td>
                                            <div className="row">
                                                <div className="relevance-track">
                                                    <div className="relevance-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                                                </div>
                                                <span className="bar-val">{pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
