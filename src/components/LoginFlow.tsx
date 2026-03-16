"use client";

import { useState, useEffect } from "react";

interface LoginFlowProps {
  onAuthenticated: () => void;
}

type Step = "idle" | "verifying" | "token_input";

export default function LoginFlow({ onAuthenticated }: LoginFlowProps) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [puppeteerAvailable, setPuppeteerAvailable] = useState<boolean | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Check if Puppeteer login is available (only works locally with Chrome)
  useEffect(() => {
    fetch("/api/auth/capabilities")
      .then((r) => r.json())
      .then((d) => setPuppeteerAvailable(d.puppeteer))
      .catch(() => setPuppeteerAvailable(false));
  }, []);

  const startTinderLogin = async () => {
    setStep("verifying");
    setError(null);

    try {
      const res = await fetch("/api/auth/tinder-login", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      onAuthenticated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg === "Login cancelled" ? "Login window was closed" : msg);
      setStep("idle");
    }
  };

  const submitToken = async () => {
    if (!manualToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: manualToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAuthenticated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid token");
    } finally {
      setLoading(false);
    }
  };

  // Show token input as primary when Puppeteer isn't available
  const showTokenPrimary = puppeteerAvailable === false;

  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-3xl bg-[#1a1a1a] border border-white/5 p-8">
        {/* Flame */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--tinder-gradient)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M11.7 2c-.1 0-.3.1-.4.2C8 5.3 7.2 7.3 7.8 9.4c.1.3 0 .5-.2.7-.2.1-.5.1-.7 0C5.5 9 4.6 7.2 4.5 5.3c0-.2-.1-.3-.3-.3s-.3.1-.4.2C1.5 8.4.5 12 2.1 15.3c1.5 3 4.7 4.8 8.1 4.7 3.4.1 6.5-1.7 8.1-4.7 1.7-3.4.5-7.1-2-10.1-.6-.7-1.3-1.4-2-2-.1-.1-.2-.2-.4-.2-.1 0-.3.1-.3.3-.1 1.6-.7 3.2-1.7 4.4-.1.1-.2.2-.4.2-.2 0-.3-.1-.4-.2-.4-.6-.5-1.3-.3-2-.1-1.3-.2-2.5-.8-3.5-.1-.1-.2-.2-.3-.2z" />
            </svg>
          </div>
        </div>

        {/* TEE badge */}
        <div className="flex items-center justify-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[10px] text-green-400">Secure TEE — token never leaves this server</span>
        </div>

        {/* Idle — main view */}
        {step === "idle" && !showTokenPrimary && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">Verify your identity</h2>
              <p className="text-gray-500 text-xs mt-1">
                Login to your Tinder account to verify
              </p>
            </div>

            <button
              onClick={startTinderLogin}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: "var(--tinder-gradient)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M11.7 2c-.1 0-.3.1-.4.2C8 5.3 7.2 7.3 7.8 9.4c.1.3 0 .5-.2.7-.2.1-.5.1-.7 0C5.5 9 4.6 7.2 4.5 5.3c0-.2-.1-.3-.3-.3s-.3.1-.4.2C1.5 8.4.5 12 2.1 15.3c1.5 3 4.7 4.8 8.1 4.7 3.4.1 6.5-1.7 8.1-4.7 1.7-3.4.5-7.1-2-10.1-.6-.7-1.3-1.4-2-2-.1-.1-.2-.2-.4-.2-.1 0-.3.1-.3.3-.1 1.6-.7 3.2-1.7 4.4-.1.1-.2.2-.4.2-.2 0-.3-.1-.4-.2-.4-.6-.5-1.3-.3-2-.1-1.3-.2-2.5-.8-3.5-.1-.1-.2-.2-.3-.2z" />
              </svg>
              Verify with Tinder
            </button>

            <div className="text-center">
              <button
                onClick={() => { setStep("token_input"); setError(null); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Use auth token instead
              </button>
            </div>
          </div>
        )}

        {/* Token input as primary (hosted/Docker) or secondary */}
        {(step === "token_input" || (step === "idle" && showTokenPrimary)) && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">Verify your identity</h2>
              <p className="text-gray-500 text-xs mt-1">
                Paste your Tinder auth token to verify your account
              </p>
            </div>

            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitToken()}
              placeholder="Paste your auth token here"
              className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#FD297B]/50 text-center text-sm font-mono"
              autoFocus
            />

            <button
              onClick={submitToken}
              disabled={loading || !manualToken.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: "var(--tinder-gradient)" }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            {/* How to get token */}
            <button
              onClick={() => setShowTokenHelp(!showTokenHelp)}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showTokenHelp ? "Hide instructions" : "How do I get my auth token?"}
            </button>

            {showTokenHelp && (
              <div className="rounded-xl bg-[#111] border border-white/10 p-4 text-left space-y-3">
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-300 font-medium">From Tinder Web:</p>
                  <ol className="text-[11px] text-gray-500 space-y-1.5 list-decimal list-inside">
                    <li>Open <span className="text-gray-300">tinder.com</span> and log in</li>
                    <li>Open DevTools (<span className="text-gray-300 font-mono">F12</span> or <span className="text-gray-300 font-mono">Cmd+Opt+I</span>)</li>
                    <li>Go to <span className="text-gray-300">Network</span> tab</li>
                    <li>Filter by <span className="text-gray-300 font-mono">api.gotinder.com</span></li>
                    <li>Click any request and find the <span className="text-gray-300 font-mono">X-Auth-Token</span> header</li>
                    <li>Copy that value and paste it above</li>
                  </ol>
                </div>
                <div className="border-t border-white/5 pt-2">
                  <p className="text-[10px] text-gray-600">
                    Your token is encrypted (AES-256) and only used to fetch your stats. It never leaves this server.
                  </p>
                </div>
              </div>
            )}

            {/* Back to Puppeteer login if available */}
            {puppeteerAvailable && step === "token_input" && (
              <button
                onClick={() => { setStep("idle"); setError(null); }}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-300"
              >
                Back to Tinder login
              </button>
            )}
          </div>
        )}

        {/* Verifying — loading state while Tinder window is open */}
        {step === "verifying" && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white mb-2">Verifying...</h2>
              <p className="text-gray-500 text-xs">
                A Tinder login window has opened.<br />
                Sign in to verify your identity.
              </p>
            </div>

            {/* Animated status */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[#FD297B] border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FD297B" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2 w-full">
                <StepIndicator label="Opening Tinder login" done />
                <StepIndicator label="Waiting for authentication" active />
                <StepIndicator label="Extracting verification token" />
                <StepIndicator label="Sealing in TEE" />
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-600">
              This window will close automatically after login
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? "bg-green-500/20" : active ? "bg-[#FD297B]/20" : "bg-white/5"
      }`}>
        {done ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : active ? (
          <div className="w-2 h-2 rounded-full bg-[#FD297B] animate-pulse" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        )}
      </div>
      <span className={`text-xs ${done ? "text-green-400" : active ? "text-white" : "text-gray-600"}`}>
        {label}
      </span>
    </div>
  );
}
