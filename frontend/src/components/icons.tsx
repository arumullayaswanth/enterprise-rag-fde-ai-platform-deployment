// Inline icon set — no icon-font dependency.
type P = { className?: string };
const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

export const IconAsk = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
);

export const IconDashboard = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
    </svg>
);

export const IconPeople = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

export const IconTrophy = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
);

export const IconKey = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
    </svg>
);

export const IconOrg = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <rect x="9" y="2" width="6" height="5" rx="1" />
        <rect x="2" y="17" width="6" height="5" rx="1" />
        <rect x="16" y="17" width="6" height="5" rx="1" />
        <path d="M12 7v4M5 17v-3h14v3" />
    </svg>
);

export const IconWallet = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
);

export const IconBook = (p: P) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);
