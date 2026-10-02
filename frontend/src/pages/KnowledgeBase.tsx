// Describes what lives in the indexed corpus so users know what they can ask.
// Mirrors the folders under sample-data/ that the ingestion pipeline loads.

const CATEGORIES = [
    {
        title: "Employee Directory",
        tag: "Structured · JSON",
        desc: "Profiles, titles, departments, levels, reporting lines, locations, and employment status for every person.",
        asks: ["Who does Yaswanth Reddy report to?", "List everyone in Design."],
    },
    {
        title: "Performance & Leaderboard",
        tag: "Structured · JSON",
        desc: "Quarterly performance metrics, appraisal scores, and the top-performer leaderboard.",
        asks: ["Who is #1 on the sales leaderboard?", "What is Tomas Novak's appraisal score?"],
    },
    {
        title: "Cost Centers",
        tag: "Structured · JSON",
        desc: "Departmental budgets, year-to-date spend, headcount, and ownership.",
        asks: ["What is the budget for Payments Platform?", "Which cost center spends the most?"],
    },
    {
        title: "Job Descriptions",
        tag: "Unstructured · Markdown",
        desc: "Role profiles with responsibilities, required background, and everyday expectations.",
        asks: ["What does a Security Engineer do?", "What is expected of a Product Manager?"],
    },
    {
        title: "Skill Matrices & Resumes",
        tag: "Unstructured · Markdown",
        desc: "Individual skill proficiencies, experience, project tags, and certifications.",
        asks: ["What skills does Lucas Fernandez have?", "Who knows Kubernetes?"],
    },
    {
        title: "Governance & Policies",
        tag: "Unstructured · Markdown",
        desc: "SOPs and handbooks: incident response, PTO and leave, data access and governance.",
        asks: ["What is the SEV1 response time?", "How much parental leave is paid?"],
    },
    {
        title: "Collaboration Logs",
        tag: "Unstructured · Markdown",
        desc: "Jira and Asana project activity, cross-team dependencies, and status.",
        asks: ["What is blocking the Kafka schema migration?", "What is Daniel Okafor working on?"],
    },
    {
        title: "Announcements",
        tag: "Unstructured · Text",
        desc: "Company-wide updates and leadership communications.",
        asks: ["What were the Q3 2026 org changes?"],
    },
];

export function KnowledgeBase() {
    return (
        <div className="grid grid-2">
            {CATEGORIES.map((c) => (
                <div className="card fade-in" key={c.title}>
                    <div className="row spread" style={{ marginBottom: "0.6rem" }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{c.title}</h3>
                        <span className="pill">{c.tag}</span>
                    </div>
                    <p className="muted" style={{ margin: "0 0 0.9rem", fontSize: "0.9rem" }}>
                        {c.desc}
                    </p>
                    <div className="kb-asks">
                        {c.asks.map((a) => (
                            <span className="kb-ask" key={a}>
                                “{a}”
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
