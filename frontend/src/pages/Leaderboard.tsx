import { useEffect, useState } from "react";
import { fetchStats, ApiError } from "../api/client";
import type { LeaderboardEntry } from "../api/types";

const RANK_CLASS = ["gold", "silver", "bronze"];

// The performance records carry different headline numbers per metric type
// (sales revenue, tickets resolved, incidents, etc.). This picks the most
// meaningful one to show in the "Headline" column.
function headline(e: LeaderboardEntry): string {
    if (typeof e.revenue_closed_usd === "number")
        return `$${(e.revenue_closed_usd / 1_000_000).toFixed(2)}M closed · ${e.quota_attainment_pct}% quota`;
    if (typeof e.tickets_resolved === "number") return `${e.tickets_resolved} tickets · ${e.avg_resolution_hours}h avg`;
    if (typeof e.incidents_resolved === "number")
        return `${e.incidents_resolved} incidents · ${e.uptime_contribution_pct}% uptime`;
    if (typeof e.story_points_delivered === "number")
        return `${e.story_points_delivered} pts · ${e.pull_requests_merged} PRs`;
    if (typeof e.models_shipped === "number") return `${e.models_shipped} models · ${e.avg_model_accuracy_pct}% acc`;
    if (typeof e.test_cases_authored === "number")
        return `${e.test_cases_authored} tests · ${e.defects_caught} defects`;
    if (typeof e.designs_shipped === "number") return `${e.designs_shipped} designs · ${e.usability_score} UX`;
    if (typeof e.features_launched === "number")
        return `${e.features_launched} features · ${e.adoption_rate_pct}% adoption`;
    return e.metric_type;
}

export function Leaderboard() {
    const [rows, setRows] = useState<LeaderboardEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        fetchStats()
            .then((s) => alive && setRows(s.leaderboard))
            .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : "Could not load the leaderboard."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="status-line">
                <span className="spinner" /> Loading leaderboard…
            </div>
        );
    }
    if (error) return <div className="banner err">{error}</div>;

    return (
        <div className="card fade-in">
            <h3 className="card-title">Top performers · Q3-2026</h3>
            <div className="table-wrap">
                <table className="data">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Headline</th>
                            <th>Appraisal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((e) => (
                            <tr key={e.employee_id}>
                                <td>
                                    <span className={`rank ${RANK_CLASS[e.leaderboard_rank - 1] ?? ""}`}>{e.leaderboard_rank}</span>
                                </td>
                                <td>{e.name}</td>
                                <td className="muted">{e.department}</td>
                                <td>{headline(e)}</td>
                                <td>
                                    <span className="pill ok">{e.appraisal_score.toFixed(1)} / 5.0</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
