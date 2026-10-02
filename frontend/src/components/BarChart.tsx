import type { NameCount } from "../api/types";

interface Props {
    data: NameCount[];
}

export function BarChart({ data }: Props) {
    const max = Math.max(1, ...data.map((d) => d.count));
    return (
        <div className="bars">
            {data.map((d) => (
                <div className="bar-row" key={d.name}>
                    <span className="bar-name" title={d.name}>
                        {d.name}
                    </span>
                    <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                    <span className="bar-val">{d.count}</span>
                </div>
            ))}
        </div>
    );
}
