// Shapes mirror the FastAPI response models in app/api/main.py and the
// dashboard payload from /stats.

export interface Citation {
    marker: number;
    title: string;
    score: number;
}

export interface QueryResponse {
    question: string;
    answer: string;
    citations: Citation[];
    model_id: string;
}

export interface QueryRequest {
    question: string;
    k: number;
    mode: "hybrid" | "vector";
}

export interface Employee {
    employee_id: string;
    first_name: string;
    preferred_name?: string;
    last_name: string;
    corporate_email: string;
    job_title: string;
    department: string;
    cost_center: string;
    office_location: string;
    employment_status: string;
    employment_type?: string;
    level?: string;
    level_rank?: number;
    reporting_line: {
        manager_id: string | null;
        manager_name: string;
        direct_reports_count: number;
    };
    metadata_tags: string[];
}

export interface LeaderboardEntry {
    employee_id: string;
    name: string;
    department: string;
    metric_type: string;
    appraisal_score: number;
    leaderboard_rank: number;
    [key: string]: unknown;
}

export interface CostCenter {
    cost_center_code: string;
    name: string;
    owner_name: string;
    parent_cost_center: string | null;
    annual_budget_usd: number;
    ytd_spend_usd: number;
    headcount: number;
    currency: string;
}

export interface NameCount {
    name: string;
    count: number;
}

export interface Stats {
    totals: {
        employees: number;
        departments: number;
        cost_centers: number;
        annual_budget_usd: number;
        ytd_spend_usd: number;
    };
    by_department: NameCount[];
    by_status: NameCount[];
    by_level: NameCount[];
    leaderboard: LeaderboardEntry[];
    cost_centers: CostCenter[];
    employees: Employee[];
}
