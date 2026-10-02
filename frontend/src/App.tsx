import { useEffect, useState } from "react";
import { health } from "./api/client";
import { Dashboard } from "./pages/Dashboard";
import { Directory } from "./pages/Directory";
import { Leaderboard } from "./pages/Leaderboard";
import { OrgChart } from "./pages/OrgChart";
import { Finance } from "./pages/Finance";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { Ask } from "./pages/Ask";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { Logo } from "./components/Logo";
import {
    IconAsk,
    IconDashboard,
    IconPeople,
    IconTrophy,
    IconKey,
    IconOrg,
    IconWallet,
    IconBook,
} from "./components/icons";

type Route = "ask" | "dashboard" | "directory" | "orgchart" | "leaderboard" | "finance" | "knowledge";

const PAGES: Record<Route, { title: string; sub: string }> = {
    ask: {
        title: "Knowledge Assistant",
        sub: "Ask grounded questions over your company corpus. Every answer cites its sources.",
    },
    dashboard: { title: "Overview", sub: "Live analytics aggregated from the indexed company data." },
    directory: { title: "People Directory", sub: "Search and filter the full employee directory." },
    orgchart: { title: "Org Chart", sub: "The company reporting hierarchy, built from the directory." },
    leaderboard: { title: "Performance Leaderboard", sub: "Top performers across the organization this quarter." },
    finance: { title: "Cost Centers", sub: "Departmental budgets, spend, and utilization." },
    knowledge: { title: "Knowledge Base", sub: "What lives in the corpus — and example questions you can ask." },
};

const NAV: { id: Route; label: string; icon: React.ReactNode }[] = [
    { id: "ask", label: "Ask", icon: <IconAsk /> },
    { id: "dashboard", label: "Overview", icon: <IconDashboard /> },
    { id: "directory", label: "Directory", icon: <IconPeople /> },
    { id: "orgchart", label: "Org Chart", icon: <IconOrg /> },
    { id: "leaderboard", label: "Leaderboard", icon: <IconTrophy /> },
    { id: "finance", label: "Cost Centers", icon: <IconWallet /> },
    { id: "knowledge", label: "Knowledge Base", icon: <IconBook /> },
];

export function App() {
    const [route, setRoute] = useState<Route>("ask");
    const [keyModal, setKeyModal] = useState(false);
    const [healthy, setHealthy] = useState<"pending" | "ok" | "err">("pending");

    useEffect(() => {
        health()
            .then(() => setHealthy("ok"))
            .catch(() => setHealthy("err"));
    }, []);

    const page = PAGES[route];

    return (
        <div className="app">
            <div className="backdrop" aria-hidden="true" />
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="brand">
                        <Logo className="brand-logo" />
                        <div className="brand-text">
                            <div className="brand-name">
                                Yash <span>Academy</span>
                            </div>
                            <div className="brand-sub">Knowledge Platform</div>
                        </div>
                    </div>

                    <nav className="nav">
                        {NAV.map((n) => (
                            <button
                                key={n.id}
                                className={`nav-item ${route === n.id ? "active" : ""}`}
                                onClick={() => setRoute(n.id)}
                            >
                                {n.icon}
                                {n.label}
                            </button>
                        ))}
                    </nav>

                    <div className="topbar-right">
                        <span className="health">
                            <span className={`health-dot ${healthy}`} />
                            {healthy === "ok" ? "Connected" : healthy === "err" ? "Offline" : "Checking…"}
                        </span>
                        <button className="btn" onClick={() => setKeyModal(true)}>
                            <IconKey /> API key
                        </button>
                    </div>
                </div>
            </header>

            <main className="main">
                {route !== "ask" && (
                    <div className="page-head">
                        <h1 className="page-title">{page.title}</h1>
                        <p className="page-sub">{page.sub}</p>
                    </div>
                )}

                {route === "ask" && <Ask />}
                {route === "dashboard" && <Dashboard />}
                {route === "directory" && <Directory />}
                {route === "orgchart" && <OrgChart />}
                {route === "leaderboard" && <Leaderboard />}
                {route === "finance" && <Finance />}
                {route === "knowledge" && <KnowledgeBase />}
            </main>

            <footer className="footer">
                <div className="footer-inner">
                    <span>
                        <strong>Yash Academy</strong> · Enterprise Knowledge Platform
                    </span>
                    <span>Powered by AWS Bedrock + OpenSearch</span>
                </div>
            </footer>

            {keyModal && <ApiKeyModal onClose={() => setKeyModal(false)} />}
        </div>
    );
}
