import type { QueryRequest, QueryResponse, Stats } from "./types";

// All calls go through /api, which the Vite dev server proxies to the backend
// and which maps to the same origin in production. The API key, when the
// backend requires one, is held in localStorage and sent as x-api-key.

const BASE = "/api";
const API_KEY_STORAGE = "yashacademy.apiKey";

export function getApiKey(): string {
    return localStorage.getItem(API_KEY_STORAGE) ?? "";
}

export function setApiKey(key: string): void {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
}

function headers(json = false): HeadersInit {
    const h: Record<string, string> = {};
    if (json) h["Content-Type"] = "application/json";
    const key = getApiKey();
    if (key) h["x-api-key"] = key;
    return h;
}

async function parse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        } catch {
            /* non-JSON error body; keep the status text */
        }
        throw new ApiError(detail, res.status);
    }
    return res.json() as Promise<T>;
}

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export async function health(): Promise<{ status: string }> {
    return parse(await fetch(`${BASE}/health`));
}

export async function fetchStats(): Promise<Stats> {
    return parse<Stats>(await fetch(`${BASE}/stats`, { headers: headers() }));
}

export async function askQuestion(req: QueryRequest): Promise<QueryResponse> {
    const res = await fetch(`${BASE}/query`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(req),
    });
    return parse<QueryResponse>(res);
}
