"use client";

import { useState, useRef, useEffect } from "react";

interface LoginFlowProps {
  onAuthenticated: () => void;
}

type Step = "phone" | "phone_otp" | "email_otp";

export default function LoginFlow({ onAuthenticated }: LoginFlowProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [refreshToken, setRefreshToken] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deviceIds, setDeviceIds] = useState<any>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submittingRef = useRef(false);

  // Auto-submit when all OTP digits filled
  useEffect(() => {
    if (step === "phone_otp" && otp.every((d) => d !== "") && !submittingRef.current) {
      submittingRef.current = true;
      submitOtp(otp.join(""), "phone").finally(() => { submittingRef.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  useEffect(() => {
    if (step === "email_otp" && emailOtp.every((d) => d !== "") && !submittingRef.current) {
      submittingRef.current = true;
      submitOtp(emailOtp.join(""), "email").finally(() => { submittingRef.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailOtp, step]);

  const handleOtpChange = (
    index: number,
    value: string,
    otpState: string[],
    setOtpState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newOtp = [...otpState];
    newOtp[index] = digit;
    setOtpState(newOtp);
    if (digit && index < 5) {
      // Use requestAnimationFrame to ensure focus happens after React re-render
      requestAnimationFrame(() => {
        refs.current[index + 1]?.focus();
        refs.current[index + 1]?.select();
      });
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    otpState: string[],
    setOtpState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === "Backspace" && !otpState[index] && index > 0) {
      const newOtp = [...otpState];
      newOtp[index - 1] = "";
      setOtpState(newOtp);
      refs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (
    e: React.ClipboardEvent,
    setOtpState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = Array(6).fill("");
      pasted.split("").forEach((d, i) => { newOtp[i] = d; });
      setOtpState(newOtp);
      const focusIdx = Math.min(pasted.length, 5);
      refs.current[focusIdx]?.focus();
    }
  };

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
      if (!res.ok) throw new Error(data.error || data._debug?.message || "Request failed");

      if (data.step === "otp_sent") {
        setSmsSent(data.smsSent);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        if (data._deviceIds) setDeviceIds(data._deviceIds);
        setStep("phone_otp");
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else if (data.step === "error") {
        throw new Error(data.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (code: string, type: "phone" | "email") => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, type, phone: phone.trim(), refreshToken, deviceIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.step === "login_success") {
        onAuthenticated();
      } else if (data.step === "email_required") {
        setMaskedEmail(data.email || "your email");
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        setStep("email_otp");
        setTimeout(() => emailOtpRefs.current[0]?.focus(), 100);
      } else if (data.step === "error") {
        throw new Error(data.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      if (type === "phone") {
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      } else {
        setEmailOtp(["", "", "", "", "", ""]);
        emailOtpRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const OtpInput = ({
    otpState,
    setOtpState,
    refs,
  }: {
    otpState: string[];
    setOtpState: React.Dispatch<React.SetStateAction<string[]>>;
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  }) => (
    <div className="flex gap-2 justify-center" onPaste={(e) => handleOtpPaste(e, setOtpState, refs)}>
      {otpState.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onFocus={(e) => e.target.select()}
          onChange={(e) => handleOtpChange(i, e.target.value, otpState, setOtpState, refs)}
          onKeyDown={(e) => handleOtpKeyDown(i, e, otpState, setOtpState, refs)}
          className="w-12 h-14 rounded-xl bg-[#111] border border-white/10 text-white text-center text-xl font-mono focus:outline-none focus:border-[#FD297B]/50 transition-colors caret-transparent"
        />
      ))}
    </div>
  );

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
          <span className="text-[10px] text-green-400">Secure TEE — encrypted end-to-end</span>
        </div>

        {/* Step: Phone */}
        {step === "phone" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">What&apos;s your phone number?</h2>
              <p className="text-gray-500 text-xs mt-1">We&apos;ll send a code to verify your Tinder account</p>
            </div>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
              placeholder="+351 917 470 069"
              className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#FD297B]/50 text-center text-lg tracking-wider"
              autoFocus
            />

            <button
              onClick={sendCode}
              disabled={loading || !phone.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: "var(--tinder-gradient)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Sending...
                </span>
              ) : "Continue"}
            </button>
          </div>
        )}

        {/* Step: Phone OTP */}
        {step === "phone_otp" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">Enter your code</h2>
              <p className="text-gray-500 text-xs mt-1">
                {smsSent ? `Sent to ${phone}` : `Enter the code for ${phone}`}
              </p>
            </div>

            <OtpInput otpState={otp} setOtpState={setOtp} refs={otpRefs} />

            {loading && (
              <div className="flex justify-center">
                <svg className="animate-spin h-5 w-5 text-[#FD297B]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
            )}

            <button
              onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(null); }}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300"
            >
              Use a different number
            </button>
          </div>
        )}

        {/* Step: Email OTP */}
        {step === "email_otp" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">Verify your email</h2>
              <p className="text-gray-500 text-xs mt-1">Code sent to {maskedEmail}</p>
            </div>

            <OtpInput otpState={emailOtp} setOtpState={setEmailOtp} refs={emailOtpRefs} />

            {loading && (
              <div className="flex justify-center">
                <svg className="animate-spin h-5 w-5 text-[#FD297B]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {["phone", "phone_otp", "email_otp"].map((s, i) => (
            <div
              key={s}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: step === s ? "24px" : "8px",
                background: ["phone", "phone_otp", "email_otp"].indexOf(step) >= i
                  ? "var(--tinder-gradient)"
                  : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
