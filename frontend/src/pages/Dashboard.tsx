import { useEffect, useState } from "react";
import { fetchStats, ApiError } from "../api/client";
import type { Stats } from "../api/types";
import { StatTile } from "../components/StatTile";
import { BarChart } from "../components/BarChart";
import { formatUsd, formatUsdFull, spendPct } from "../lib/format";

export function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        fetchStats()
            .then((s) => alive && setStats(s))
            .catch((e: unknown) => {
                if (!alive) return;
                const msg = e instanceof ApiError ? e.message : "Could not reach the API. Is the backend running?";
                setError(msg);
            })
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="status-line">
                <span className="spinner" /> Loading corpus analytics…
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="banner err">
                {error ?? "No data available."} {" "}
                If authentication is enabled, set your API key from the top-right button.
            </div>
        );
    }

    const t = stats.totals;

    return (
        <div className="stack">
            <div className="grid grid-4">
                <StatTile label="Employees" value={t.employees} foot="indexed in the corpus" />
                <StatTile label="Departments" value={t.departments} foot="across the org" />
                <StatTile label="Annual budget" value={formatUsd(t.annual_budget_usd)} foot={formatUsdFull(t.annual_budget_usd)} />
                <StatTile
                    label="YTD spend"
                    value={formatUsd(t.ytd_spend_usd)}
                    foot={`${spendPct(t.ytd_spend_usd, t.annual_budget_usd)}% of budget`}
                />
            </div>

            <div className="grid grid-2">
                <div className="card fade-in">
                    <h3 className="card-title">Headcount by department</h3>
                    <BarChart data={stats.by_department} />
                </div>
                <div className="card fade-in">
                    <h3 className="card-title">Seniority distribution (level)</h3>
                    <BarChart data={stats.by_level} />
                </div>
            </div>

            <div className="card fade-in">
                <h3 className="card-title">Cost centers</h3>
                <div className="table-wrap">
                    <table className="data">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Owner</th>
                                <th>Headcount</th>
                                <th>Budget</th>
                                <th>Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.cost_centers.map((c) => {
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
