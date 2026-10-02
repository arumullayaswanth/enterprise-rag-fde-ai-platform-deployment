import { useEffect, useMemo, useState } from "react";
import { fetchStats, ApiError } from "../api/client";
import type { Employee } from "../api/types";
import { initials } from "../lib/format";

interface Node {
    emp: Employee;
    children: Node[];
}

// Build the reporting tree from the self-referencing manager_id links. The CEO
// has manager_id = null, so they become the root.
function buildTree(employees: Employee[]): Node[] {
    const byId = new Map<string, Node>();
    employees.forEach((emp) => byId.set(emp.employee_id, { emp, children: [] }));
    const roots: Node[] = [];
    byId.forEach((node) => {
        const mgr = node.emp.reporting_line.manager_id;
        const parent = mgr ? byId.get(mgr) : undefined;
        if (parent) parent.children.push(node);
        else roots.push(node);
    });
    return roots;
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
    const e = node.emp;
    return (
        <div style={{ marginLeft: depth === 0 ? 0 : "1.5rem" }}>
            <div className="org-node">
                <div className="avatar">{initials(e.first_name, e.last_name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>
                        {e.first_name} {e.last_name}
                    </div>
                    <div className="person-sub">
                        {e.job_title} · {e.department}
                    </div>
                </div>
                {e.reporting_line.direct_reports_count > 0 && (
                    <span className="pill">{e.reporting_line.direct_reports_count} reports</span>
                )}
                <span className="pill">{e.level ?? "—"}</span>
            </div>
            {node.children.length > 0 && (
                <div className="org-children">
                    {node.children
                        .sort((a, b) => (b.emp.level_rank ?? 0) - (a.emp.level_rank ?? 0))
                        .map((c) => (
                            <TreeNode key={c.emp.employee_id} node={c} depth={depth + 1} />
                        ))}
                </div>
            )}
        </div>
    );
}

export function OrgChart() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        fetchStats()
            .then((s) => alive && setEmployees(s.employees))
            .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : "Could not load the org chart."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    const tree = useMemo(() => buildTree(employees), [employees]);

    if (loading)
        return (
            <div className="row">
                <span className="spinner" /> Building the org chart…
            </div>
        );
    if (error) return <div className="banner err">{error}</div>;

    return (
        <div className="card fade-in">
            <h3 className="card-title">Reporting hierarchy</h3>
            {tree.map((root) => (
                <TreeNode key={root.emp.employee_id} node={root} depth={0} />
            ))}
        </div>
    );
}
