interface Props {
    label: string;
    value: string | number;
    foot?: string;
}

export function StatTile({ label, value, foot }: Props) {
    return (
        <div className="stat fade-in">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {foot && <div className="stat-foot">{foot}</div>}
        </div>
    );
}
