"use client";

import { useState, useEffect, useCallback } from "react";
import LoginFlow from "./LoginFlow";
import StatsCard from "./StatsCard";
import MatchList from "./MatchList";
import type { TinderStats } from "@/lib/tinder-api";

type View = "loading" | "login" | "fetching" | "dashboard";

export default function Dashboard() {
  const [view, setView] = useState<View>("loading");
  const [stats, setStats] = useState<TinderStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.authenticated) {
        fetchStats();
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

  const fetchStats = async () => {
    setView("fetching");
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
      setView("dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
      setView("dashboard");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStats(null);
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

          {view === "dashboard" && (
            <div className="flex items-center gap-3">
              <button
                onClick={fetchStats}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 text-sm transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 text-sm transition-colors"
              >
                Logout
              </button>
            </div>
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
              <p className="text-gray-500">Smoothly analyze your Tinder game</p>
            </div>
            <LoginFlow onAuthenticated={() => fetchStats()} />
          </div>
        )}

        {/* Fetching data */}
        {view === "fetching" && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#FD297B] border-t-transparent animate-spin" />
            <p className="text-gray-500">Analyzing your rizz...</p>
          </div>
        )}

        {/* Dashboard */}
        {view === "dashboard" && stats && (
          <div className="space-y-6 pb-12">
            {/* Welcome */}
            <div>
              <h1 className="text-2xl font-bold">
                Hey {stats.myName} <span className="text-2xl">👋</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">Here&apos;s your rizz report</p>
            </div>

            {/* Primary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatsCard icon="🔥" label="Total Matches" value={stats.totalMatches} />
              <StatsCard icon="💘" label="Likes You" value={stats.likesYouCount} />
              <StatsCard icon="💬" label="Conversations" value={stats.totalConversations} />
              <StatsCard
                icon="📊"
                label="Conv. Rate"
                value={stats.conversationRate !== null ? `${stats.conversationRate.toFixed(1)}%` : "—"}
              />
            </div>

            {/* Conversation breakdown */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Conversation Breakdown
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatsCard icon="🚀" label="You Started" value={stats.conversationsYouStarted} />
                <StatsCard icon="💌" label="Got Replies" value={stats.conversationsStartedWithReply} />
                <StatsCard
                  icon="✨"
                  label="Reply Rate"
                  value={stats.replyRate !== null ? `${stats.replyRate.toFixed(1)}%` : "—"}
                />
                <StatsCard icon="😏" label="They Started" value={stats.conversationsTheyStarted} />
              </div>
            </div>

            {/* Visual bar: who starts convos */}
            {stats.totalConversations > 0 && (
              <div className="rounded-2xl bg-[#1a1a1a] border border-white/5 p-5">
                <h3 className="text-sm text-gray-400 mb-3">Who starts conversations?</h3>
                <div className="flex rounded-full overflow-hidden h-3">
                  <div
                    className="transition-all duration-700"
                    style={{
                      width: `${(stats.conversationsYouStarted / stats.totalConversations) * 100}%`,
                      background: "var(--tinder-gradient)",
                    }}
                  />
                  <div
                    className="bg-gray-600 transition-all duration-700"
                    style={{
                      width: `${(stats.conversationsTheyStarted / stats.totalConversations) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>You ({stats.conversationsYouStarted})</span>
                  <span>Them ({stats.conversationsTheyStarted})</span>
                </div>
              </div>
            )}

            {/* Match list */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Matches ({stats.matches.length})
              </h2>
              <MatchList matches={stats.matches} />
            </div>
          </div>
        )}

        {/* Error */}
        {view === "dashboard" && error && !stats && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--tinder-gradient)" }}
            >
              Retry
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
