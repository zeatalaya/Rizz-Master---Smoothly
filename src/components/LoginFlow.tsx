"use client";

import { useState } from "react";

interface LoginFlowProps {
  onAuthenticated: () => void;
}

type Step = "phone" | "code";

export default function LoginFlow({ onAuthenticated }: LoginFlowProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("code");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAuthenticated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-3xl bg-[#1a1a1a] border border-white/5 p-8">
        {/* Tinder flame icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--tinder-gradient)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M11.7 2c-.1 0-.3.1-.4.2C8 5.3 7.2 7.3 7.8 9.4c.1.3 0 .5-.2.7-.2.1-.5.1-.7 0C5.5 9 4.6 7.2 4.5 5.3c0-.2-.1-.3-.3-.3s-.3.1-.4.2C1.5 8.4.5 12 2.1 15.3c1.5 3 4.7 4.8 8.1 4.7 3.4.1 6.5-1.7 8.1-4.7 1.7-3.4.5-7.1-2-10.1-.6-.7-1.3-1.4-2-2-.1-.1-.2-.2-.4-.2-.1 0-.3.1-.3.3-.1 1.6-.7 3.2-1.7 4.4-.1.1-.2.2-.4.2-.2 0-.3-.1-.4-.2-.4-.6-.5-1.3-.3-2-.1-1.3-.2-2.5-.8-3.5-.1-.1-.2-.2-.3-.2z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-1">
          {step === "phone" ? "Log in to Tinder" : "Enter your code"}
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          {step === "phone"
            ? "We'll send an SMS to verify your account"
            : `Code sent to ${phone}`}
        </p>

        {/* TEE badge */}
        <div className="flex items-center justify-center gap-2 mb-6 px-3 py-2 rounded-full bg-green-500/10 border border-green-500/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[11px] text-green-400">Secure TEE — your token is encrypted & never exposed</span>
        </div>

        <div className="space-y-4">
          {step === "phone" && (
            <>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#FD297B]/50 text-center text-lg tracking-wider"
                autoFocus
              />
              <button
                onClick={sendCode}
                disabled={loading || !phone.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{ background: "var(--tinder-gradient)" }}
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <input
                type="tel"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                placeholder="• • • • • •"
                maxLength={6}
                className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#FD297B]/50 text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
              <button
                onClick={verifyCode}
                disabled={loading || code.length < 6}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{ background: "var(--tinder-gradient)" }}
              >
                {loading ? "Verifying..." : "Verify & Connect"}
              </button>
              <button
                onClick={() => { setStep("phone"); setCode(""); setError(null); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
              >
                Use a different number
              </button>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
