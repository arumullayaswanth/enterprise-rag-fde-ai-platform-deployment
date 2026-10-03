import { useEffect, useRef, useState } from "react";
import { askQuestion, ApiError } from "../api/client";
import type { Citation, QueryResponse } from "../api/types";
import { renderMarkdown } from "../lib/markdown";

const SUGGESTIONS = [
    "Who does Yaswanth Reddy report to?",
    "List everyone on the Payments Platform team.",
    "Who is #1 on the sales leaderboard this quarter?",
    "What is the budget for the Payments Platform cost center?",
    "What skills does Lucas Fernandez have?",
    "What is the response time for a SEV1 incident?",
];

const NO_HITS_MESSAGE = "I could not find anything relevant in the indexed documents.";

type Msg =
    | { role: "user"; text: string }
    | { role: "bot"; kind: "answer"; data: QueryResponse; elapsed: number; mode: string }
    | { role: "bot"; kind: "notfound"; question: string }
    | { role: "bot"; kind: "error"; text: string };

function isNotFound(res: QueryResponse): boolean {
    return res.citations.length === 0 || res.answer.trim() === NO_HITS_MESSAGE;
}

export function Ask() {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [k, setK] = useState(5);
    const [mode, setMode] = useState<"hybrid" | "vector">("hybrid");
    const [busy, setBusy] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, busy]);

    async function send(text?: string) {
        const q = (text ?? input).trim();
        if (!q || busy) return;
        setInput("");
        setMessages((m) => [...m, { role: "user", text: q }]);
        setBusy(true);
        const start = performance.now();
        try {
            const res = await askQuestion({ question: q, k, mode });
            const elapsed = (performance.now() - start) / 1000;
            setMessages((m) => [
                ...m,
                isNotFound(res)
                    ? { role: "bot", kind: "notfound", question: q }
                    : { role: "bot", kind: "answer", data: res, elapsed, mode },
            ]);
        } catch (e: unknown) {
            let msg = "Something went wrong reaching the knowledge service.";
            if (e instanceof ApiError) {
                if (e.status === 401) msg = "Unauthorized. Add your API key from the top bar.";
                else if (e.status === 429) msg = e.message || "Bedrock model quota not available yet. Request a quota increase for Titan Text Embeddings V2 and Nova Lite, then try again.";
                else if (e.status >= 500) msg = "The knowledge service is not ready yet. The search backend may be offline.";
                else msg = e.message;
            }
            setMessages((m) => [...m, { role: "bot", kind: "error", text: msg }]);
        } finally {
            setBusy(false);
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    return (
        <div className="chat">
            <div className="chat-scroll" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="chat-welcome">
                        <div className="orb" />
                        <h2>Hi, I'm your Yash Academy assistant</h2>
                        <p>Ask me anything about your company — people, teams, policies, performance, or budgets. Every answer cites its sources.</p>
                        <div className="suggestions">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} className="suggestion" onClick={() => send(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <MessageBubble key={i} msg={m} />
                ))}

                {busy && (
                    <div className="msg bot">
                        <div className="msg-avatar">YA</div>
                        <div className="msg-bubble">
                            <div className="typing">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div className="composer">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        maxLength={2000}
                        placeholder="Message Yash Academy…  (Enter to send, Shift+Enter for a new line)"
                    />
                    <button className="composer-send" disabled={busy || !input.trim()} onClick={() => send()} aria-label="Send">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <div className="composer-opts">
                    <div className="opt">
                        <span className="opt-label">
                            Passages
                            <span className="info" tabIndex={0} aria-label="How many document chunks to retrieve. More means broader context but slower." data-tip="How many chunks to retrieve. More = broader context, slower.">i</span>
                        </span>
                        <select className="text" value={k} onChange={(e) => setK(Number(e.target.value))}>
                            <option value={3}>3 · fastest</option>
                            <option value={5}>5 · balanced</option>
                            <option value={8}>8 · thorough</option>
                            <option value={12}>12 · exhaustive</option>
                        </select>
                    </div>
                    <div className="opt">
                        <span className="opt-label">
                            Strategy
                            <span className="info" tabIndex={0} aria-label="Hybrid blends semantic vectors with keyword matching for best recall. Vector is pure semantic similarity." data-tip="Hybrid = vectors + keywords (best recall). Vector = pure semantic similarity.">i</span>
                        </span>
                        <select
                            className="text"
                            value={mode}
                            onChange={(e) => setMode(e.target.value as "hybrid" | "vector")}
                        >
                            <option value="hybrid">Hybrid · vector + keyword</option>
                            <option value="vector">Vector only · semantic</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ msg }: { msg: Msg }) {
    if (msg.role === "user") {
        return (
            <div className="msg user">
                <div className="msg-avatar">You</div>
                <div className="msg-bubble">{msg.text}</div>
            </div>
        );
    }

    return (
        <div className="msg bot">
            <div className="msg-avatar">YA</div>
            <div className="msg-bubble">
                {msg.kind === "answer" && <AnswerContent data={msg.data} elapsed={msg.elapsed} mode={msg.mode} />}
                {msg.kind === "notfound" && <NotFound question={msg.question} />}
                {msg.kind === "error" && <div className="banner err">{msg.text}</div>}
            </div>
        </div>
    );
}

function AnswerContent({ data, elapsed, mode }: { data: QueryResponse; elapsed: number; mode: string }) {
    return (
        <>
            <div className="answer-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.answer) }} />
            {data.citations.length > 0 && (
                <div className="sources">
                    {data.citations.map((c: Citation) => (
                        <div className="source-item" key={c.marker}>
                            <span className="source-num">{c.marker}</span>
                            <span className="source-title">{c.title}</span>
                            <div className="relevance-track">
                                <div className="relevance-fill" style={{ width: `${Math.min(c.score * 100, 100)}%` }} />
                            </div>
                            <span className="relevance-val">{c.score.toFixed(3)}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="meta-row">
                <span>model: {data.model_id}</span>
                <span>mode: {mode}</span>
                <span>passages: {data.citations.length}</span>
                <span>latency: {elapsed.toFixed(2)}s</span>
            </div>
        </>
    );
}

function NotFound({ question }: { question: string }) {
    return (
        <div className="not-found">
            <img
                className="not-found-img"
                src="/not-found.png"
                alt="Nothing found"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
            <h3 className="not-found-title">No answer in the knowledge base</h3>
            <p className="not-found-text">
                I couldn't find anything that answers <strong>“{question}”</strong>. Try rephrasing, or ask about
                people, teams, policies, performance, or budgets.
            </p>
        </div>
    );
}
