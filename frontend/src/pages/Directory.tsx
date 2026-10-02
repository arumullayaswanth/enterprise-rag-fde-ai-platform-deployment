import { useEffect, useMemo, useState } from "react";
import { fetchStats, ApiError } from "../api/client";
import type { Employee } from "../api/types";
import { initials } from "../lib/format";

export function Directory() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [dept, setDept] = useState("All");

    useEffect(() => {
        let alive = true;
        fetchStats()
            .then((s) => alive && setEmployees(s.employees))
            .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : "Could not load the directory."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    const departments = useMemo(
        () => ["All", ...Array.from(new Set(employees.map((e) => e.department))).sort()],
        [employees]
    );

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return employees.filter((e) => {
            if (dept !== "All" && e.department !== dept) return false;
            if (!needle) return true;
            return (
                `${e.first_name} ${e.last_name}`.toLowerCase().includes(needle) ||
                e.job_title.toLowerCase().includes(needle) ||
                e.corporate_email.toLowerCase().includes(needle)
            );
        });
    }, [employees, q, dept]);

    if (loading) {
        return (
            <div className="status-line">
                <span className="spinner" /> Loading directory…
            </div>
        );
    }
    if (error) return <div className="banner err">{error}</div>;

    return (
        <div className="stack">
            <div className="card">
                <div className="controls">
                    <div>
                        <input
                            className="text"
                            placeholder="Search by name, title, or email…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: "0 0 220px" }}>
                        <select value={dept} onChange={(e) => setDept(e.target.value)}>
                            {departments.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="row spread" style={{ marginBottom: "0.8rem" }}>
                    <h3 className="card-title" style={{ margin: 0 }}>
                        {filtered.length} {filtered.length === 1 ? "person" : "people"}
                    </h3>
                </div>
                <div className="table-wrap">
                    <table className="data">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Title</th>
                                <th>Department</th>
                                <th>Level</th>
                                <th>Manager</th>
                                <th>Location</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e) => (
                                <tr key={e.employee_id}>
                                    <td>
                                        <div className="person">
                                            <div className="avatar">{initials(e.first_name, e.last_name)}</div>
                                            <div>
                                                <div>
                                                    {e.first_name} {e.last_name}
                                                </div>
                                                <div className="person-sub">{e.corporate_email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{e.job_title}</td>
                                    <td className="muted">{e.department}</td>
                                    <td>
                                        <span className="pill">{e.level ?? "—"}</span>
                                    </td>
                                    <td className="muted">{e.reporting_line.manager_name}</td>
                                    <td className="muted">{e.office_location}</td>
                                    <td>
                                        <span className={`pill ${e.employment_status === "Active" ? "ok" : "warn"}`}>
                                            {e.employment_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="empty">
                                        No one matches that search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
