"use client";

import React, { useState, useEffect, useCallback } from "react";
import LoginFlow from "./LoginFlow";

interface VerificationData {
  userName: string;
  verified: boolean;
  verifiedAt: string;
}

type View = "loading" | "login" | "verified";

export default function Dashboard() {
  const [view, setView] = useState<View>("loading");
  const [verification, setVerification] = useState<VerificationData | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.authenticated) {
        setVerification({
          userName: data.userName || "User",
          verified: true,
          verifiedAt: data.verifiedAt || new Date().toISOString(),
        });
        setView("verified");
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

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setVerification(null);
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

          {view === "verified" && (
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

        {/* Login / Verify */}
        {view === "login" && (
          <div className="py-16">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold mb-2">
                <span style={{ background: "var(--tinder-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Rizz Master
                </span>
              </h1>
              <p className="text-gray-500">Verify your Tinder identity to unlock access</p>
            </div>
            <LoginFlow onAuthenticated={() => checkAuth()} />
          </div>
        )}

        {/* Verified */}
        {view === "verified" && verification && (
          <div className="py-16">
            <div className="max-w-md mx-auto">
              {/* Verified badge card */}
              <div className="rounded-3xl bg-[#1a1a1a] border border-white/5 p-8 text-center">
                {/* Animated checkmark */}
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ background: "var(--tinder-gradient)" }} />
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--tinder-gradient)" }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Verified status */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-green-400">Verified</span>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">
                  {verification.userName}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  Tinder identity confirmed via TEE
                </p>

                {/* TEE security info */}
                <div className="rounded-2xl bg-[#111] border border-white/5 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span className="text-xs font-medium text-green-400">Secure TEE Verification</span>
                  </div>
                  <ul className="space-y-2 text-left">
                    <li className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      Token encrypted at rest (AES-256)
                    </li>
                    <li className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      Credentials never leave your machine
                    </li>
                    <li className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      httpOnly cookie — inaccessible to JS
                    </li>
                  </ul>
                </div>

                {/* Access badges */}
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Unlocked Access
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <AccessBadge label="Smoothly Premium" icon="star" unlocked />
                  <AccessBadge label="Rizz Analytics" icon="chart" unlocked />
                  <AccessBadge label="Match Insights" icon="heart" unlocked />
                  <AccessBadge label="Vibe Check" icon="shield" unlocked />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AccessBadge({ label, icon, unlocked }: { label: string; icon: string; unlocked: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    star: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    chart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    heart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    shield: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  };

  return (
    <div className={`rounded-xl border p-3 flex items-center gap-2 transition-all ${
      unlocked
        ? "bg-white/5 border-white/10 text-white"
        : "bg-white/[0.02] border-white/5 text-gray-600"
    }`}>
      <div className={unlocked ? "text-[#FD297B]" : "text-gray-700"}>
        {icons[icon]}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
