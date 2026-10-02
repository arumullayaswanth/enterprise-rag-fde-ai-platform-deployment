// Yash Academy wordmark + mark. A graduation cap over a knowledge "spark",
// drawn inline so there is no external asset dependency.
export function Logo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Yash Academy">
            <defs>
                <linearGradient id="ya-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#ya-g)" />
            {/* graduation cap */}
            <path d="M24 13 L37 19 L24 25 L11 19 Z" fill="#fff" />
            <path d="M16 22 L16 29 C16 31 20 33 24 33 C28 33 32 31 32 29 L32 22" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="37" cy="19" r="1.6" fill="#fff" />
            <path d="M37 20.5 L37 27" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}
