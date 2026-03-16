"use client";

import React, { useState, useEffect, useCallback } from "react";
import LoginFlow from "./LoginFlow";
import type { TinderStats } from "@/lib/tinder-api";

interface RizzCriterion {
  label: string;
  required: number;
  actual: number;
  passed: boolean;
  icon: string;
}

function evaluateRizzMaster(stats: TinderStats): { criteria: RizzCriterion[]; isRizzMaster: boolean } {
  const criteria: RizzCriterion[] = [
    {
      label: "Matches",
      required: 10,
      actual: stats.totalMatches,
      passed: stats.totalMatches >= 10,
      icon: "fire",
    },
    {
      label: "Conversations started with replies",
      required: 5,
      actual: stats.conversationsStartedWithReply,
      passed: stats.conversationsStartedWithReply >= 5,
      icon: "chat",
    },
    {
      label: "Likes received",
      required: 50,
      actual: stats.likesYouCount,
      passed: stats.likesYouCount >= 50,
      icon: "heart",
    },
  ];

  return {
    criteria,
    isRizzMaster: criteria.every((c) => c.passed),
  };
}

type View = "loading" | "login" | "evaluating" | "result";

export default function Dashboard() {
  const [view, setView] = useState<View>("loading");
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState<TinderStats | null>(null);
  const [criteria, setCriteria] = useState<RizzCriterion[]>([]);
  const [isRizzMaster, setIsRizzMaster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teeVerified, setTeeVerified] = useState(false);
  const [attestationQuote, setAttestationQuote] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.authenticated) {
        setUserName(data.userName || "User");
        fetchAndEvaluate();
      } else {
        setView("login");
      }
    } catch {
      setView("login");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchAndEvaluate = async () => {
    setView("evaluating");
    setError(null);
    try {
      const res = await fetch("/api/tinder-stats");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setView("login");
          return;
        }
        throw new Error(data.error);
      }
      setStats(data);
      setUserName(data.myName || userName);
      setTeeVerified(!!data.teeVerified);
      setAttestationQuote(data.attestation?.quote || null);
      const result = evaluateRizzMaster(data);
      setCriteria(result.criteria);
      setIsRizzMaster(result.isRizzMaster);
      setView("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
      setView("result");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStats(null);
    setCriteria([]);
    setView("login");
  };

  return (
    <div className="min-h-dvh bg-[#111]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#111]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--tinder-gradient)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M11.7 2c-.1 0-.3.1-.4.2C8 5.3 7.2 7.3 7.8 9.4c.1.3 0 .5-.2.7-.2.1-.5.1-.7 0C5.5 9 4.6 7.2 4.5 5.3c0-.2-.1-.3-.3-.3s-.3.1-.4.2C1.5 8.4.5 12 2.1 15.3c1.5 3 4.7 4.8 8.1 4.7 3.4.1 6.5-1.7 8.1-4.7 1.7-3.4.5-7.1-2-10.1-.6-.7-1.3-1.4-2-2-.1-.1-.2-.2-.4-.2-.1 0-.3.1-.3.3-.1 1.6-.7 3.2-1.7 4.4-.1.1-.2.2-.4.2-.2 0-.3-.1-.4-.2-.4-.6-.5-1.3-.3-2-.1-1.3-.2-2.5-.8-3.5-.1-.1-.2-.2-.3-.2z" />
              </svg>
            </div>
            <span className="font-bold text-lg">
              <span style={{ background: "var(--tinder-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Rizz Master
              </span>
            </span>
          </div>

          {(view === "result" || view === "evaluating") && (
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 text-sm transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Loading */}
        {view === "loading" && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-10 h-10 rounded-full border-2 border-[#FD297B] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Login */}
        {view === "login" && (
          <div className="py-16">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold mb-2">
                <span style={{ background: "var(--tinder-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Rizz Master
                </span>
              </h1>
              <p className="text-gray-500">Verify your Tinder identity to check your rizz</p>
            </div>
            <LoginFlow onAuthenticated={() => checkAuth()} />
          </div>
        )}

        {/* Evaluating */}
        {view === "evaluating" && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#FD297B] border-t-transparent animate-spin" />
            <p className="text-gray-500">Evaluating your rizz...</p>
          </div>
        )}

        {/* Result */}
        {view === "result" && (
          <div className="py-10">
            <div className="max-w-md mx-auto space-y-5">

              {/* Rizz Master verdict */}
              <div className="rounded-3xl bg-[#1a1a1a] border border-white/5 p-8 text-center">
                {/* Badge */}
                <div className="flex justify-center mb-5">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center relative">
                    <div
                      className="absolute inset-0 rounded-full animate-pulse opacity-20"
                      style={{ background: isRizzMaster ? "var(--tinder-gradient)" : "rgba(255,255,255,0.1)" }}
                    />
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: isRizzMaster ? "var(--tinder-gradient)" : "#333" }}
                    >
                      {isRizzMaster ? (
                        <span className="text-4xl">&#128081;</span>
                      ) : (
                        <span className="text-4xl">&#128148;</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status pill */}
                {isRizzMaster ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FD297B]/10 border border-[#FD297B]/30 mb-4">
                    <span className="text-sm font-bold" style={{ background: "var(--tinder-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      RIZZ MASTER
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
                    <span className="text-sm font-medium text-gray-400">Not yet a Rizz Master</span>
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-1">{userName}</h2>
                <p className="text-gray-500 text-sm mb-6">
                  {isRizzMaster
                    ? "Your rizz game is officially certified"
                    : "Keep working on your game to earn the title"}
                </p>

                {/* Criteria checklist */}
                <div className="rounded-2xl bg-[#111] border border-white/5 p-4 text-left space-y-0">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
                    Rizz Master Criteria
                  </h3>
                  {criteria.map((c, i) => (
                    <CriterionRow key={i} criterion={c} />
                  ))}
                </div>
              </div>

              {/* Stats breakdown (if we have data) */}
              {stats && (
                <div className="rounded-3xl bg-[#1a1a1a] border border-white/5 p-6">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Your Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCell label="Total Matches" value={stats.totalMatches} />
                    <StatCell label="Likes You" value={stats.likesYouCount} />
                    <StatCell label="Conversations" value={stats.totalConversations} />
                    <StatCell label="You Started" value={stats.conversationsYouStarted} />
                    <StatCell label="Got Replies" value={stats.conversationsStartedWithReply} />
                    <StatCell label="They Started" value={stats.conversationsTheyStarted} />
                    <StatCell label="Reply Rate" value={stats.replyRate !== null ? `${stats.replyRate.toFixed(1)}%` : "—"} />
                    <StatCell label="Conv. Rate" value={stats.conversationRate !== null ? `${stats.conversationRate.toFixed(1)}%` : "—"} />
                  </div>
                </div>
              )}

              {/* Retry on error */}
              {error && !stats && (
                <div className="text-center">
                  <p className="text-red-400 text-sm mb-3">{error}</p>
                  <button
                    onClick={fetchAndEvaluate}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: "var(--tinder-gradient)" }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* TEE attestation */}
              <div className={`rounded-2xl border p-4 ${
                teeVerified
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-[#1a1a1a] border-white/5"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {teeVerified ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11.5 14.5 15 9.5" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                  <span className={`text-[10px] font-medium ${teeVerified ? "text-green-400" : "text-gray-500"}`}>
                    {teeVerified ? "TDX Attestation Verified" : "TEE not available (run in dstack)"}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600">
                  {teeVerified
                    ? "Evaluation computed inside Intel TDX Confidential VM with hardware attestation"
                    : "Deploy with docker-compose to enable hardware TEE attestation via dstack"}
                </p>
                {attestationQuote && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400">
                      View TDX Quote
                    </summary>
                    <pre className="mt-1 text-[9px] text-gray-600 break-all whitespace-pre-wrap max-h-24 overflow-y-auto bg-black/30 rounded p-2">
                      {attestationQuote}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: RizzCriterion }) {
  const icons: Record<string, React.ReactNode> = {
    fire: <span className="text-sm">&#128293;</span>,
    chat: <span className="text-sm">&#128172;</span>,
    heart: <span className="text-sm">&#128151;</span>,
  };

  const pct = Math.min((criterion.actual / criterion.required) * 100, 100);

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 border-b border-white/5 last:border-0">
      {/* Icon */}
      <div className="flex-shrink-0 w-6 text-center">{icons[criterion.icon]}</div>

      {/* Label + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-300">{criterion.label}</span>
          <span className={`text-xs font-mono ${criterion.passed ? "text-green-400" : "text-gray-500"}`}>
            {criterion.actual}/{criterion.required}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: criterion.passed ? "#22c55e" : "var(--tinder-gradient)",
            }}
          />
        </div>
      </div>

      {/* Check / X */}
      <div className="flex-shrink-0 w-5">
        {criterion.passed ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#111] border border-white/5 p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}
