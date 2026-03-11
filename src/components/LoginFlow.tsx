"use client";

import { useState } from "react";

interface LoginFlowProps {
  onAuthenticated: (name: string) => void;
}

const BOOKMARKLET_CODE = `javascript:void(function(){try{var t=Object.keys(localStorage).find(function(k){return k.indexOf('TinderWeb/')!==-1&&localStorage.getItem(k).indexOf('api_token')!==-1});if(t){var d=JSON.parse(localStorage.getItem(t));var token=d.api_token||d.token;if(token){navigator.clipboard.writeText(token);alert('Token copied! Paste it in Rizz Master.');}else{alert('Token key found but empty. Try logging into Tinder first.');}}else{var r=indexedDB.open('tinder-web');r.onsuccess=function(e){var db=e.target.result;if(db.objectStoreNames.contains('keyvaluepairs')){var tx=db.transaction('keyvaluepairs','readonly');var store=tx.objectStore('keyvaluepairs');var g=store.get('TinderWeb/APIToken');g.onsuccess=function(){if(g.result){navigator.clipboard.writeText(g.result);alert('Token copied! Paste it in Rizz Master.');}else{alert('No token found. Make sure you are logged into tinder.com');}};g.onerror=function(){alert('Could not read token. Try the manual method.');};}else{alert('No Tinder data found. Log into tinder.com first.');}};r.onerror=function(){alert('Could not access Tinder storage. Try the manual method.');};}}catch(e){alert('Error: '+e.message);}})();`;

export default function LoginFlow({ onAuthenticated }: LoginFlowProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const connect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAuthenticated(data.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-3xl bg-[#1a1a1a] border border-white/5 p-8">
        {/* Flame icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "var(--tinder-gradient)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M11.7 2c-.1 0-.3.1-.4.2C8 5.3 7.2 7.3 7.8 9.4c.1.3 0 .5-.2.7-.2.1-.5.1-.7 0C5.5 9 4.6 7.2 4.5 5.3c0-.2-.1-.3-.3-.3s-.3.1-.4.2C1.5 8.4.5 12 2.1 15.3c1.5 3 4.7 4.8 8.1 4.7 3.4.1 6.5-1.7 8.1-4.7 1.7-3.4.5-7.1-2-10.1-.6-.7-1.3-1.4-2-2-.1-.1-.2-.2-.4-.2-.1 0-.3.1-.3.3-.1 1.6-.7 3.2-1.7 4.4-.1.1-.2.2-.4.2-.2 0-.3-.1-.4-.2-.4-.6-.5-1.3-.3-2-.1-1.3-.2-2.5-.8-3.5-.1-.1-.2-.2-.3-.2z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-1">Connect Your Tinder</h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Two easy ways to securely connect your account
        </p>

        {/* TEE badge */}
        <div className="flex items-center justify-center gap-2 mb-6 px-3 py-2 rounded-full bg-green-500/10 border border-green-500/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[11px] text-green-400">TEE secured — token encrypted & never stored in plaintext</span>
        </div>

        {/* Method 1: Bookmarklet */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold" style={{ background: "var(--tinder-gradient)" }}>1</span>
            Quick method — Bookmarklet
          </h3>
          <div className="bg-[#111] rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-400">
              Drag this button to your bookmarks bar:
            </p>
            <div className="flex justify-center">
              <a
                href={BOOKMARKLET_CODE}
                onClick={(e) => e.preventDefault()}
                draggable
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white cursor-grab active:cursor-grabbing border border-white/10 hover:border-white/20 transition-colors"
                style={{ background: "linear-gradient(135deg, #FD297B, #FF5864)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M11.7 2c-.1 0-.3.1-.4.2C8 5.3 7.2 7.3 7.8 9.4c.1.3 0 .5-.2.7-.2.1-.5.1-.7 0C5.5 9 4.6 7.2 4.5 5.3c0-.2-.1-.3-.3-.3s-.3.1-.4.2C1.5 8.4.5 12 2.1 15.3c1.5 3 4.7 4.8 8.1 4.7 3.4.1 6.5-1.7 8.1-4.7 1.7-3.4.5-7.1-2-10.1-.6-.7-1.3-1.4-2-2-.1-.1-.2-.2-.4-.2-.1 0-.3.1-.3.3-.1 1.6-.7 3.2-1.7 4.4-.1.1-.2.2-.4.2-.2 0-.3-.1-.4-.2-.4-.6-.5-1.3-.3-2-.1-1.3-.2-2.5-.8-3.5-.1-.1-.2-.2-.3-.2z" />
                </svg>
                Get Rizz Token
              </a>
            </div>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal pl-4">
              <li>Drag the button above to your bookmarks bar</li>
              <li>Go to <strong className="text-gray-300">tinder.com</strong> and log in</li>
              <li>Click the <strong className="text-gray-300">Get Rizz Token</strong> bookmark</li>
              <li>Your token is auto-copied — paste it below</li>
            </ol>
          </div>
        </div>

        {/* Method 2: Manual */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold" style={{ background: "var(--tinder-gradient)" }}>2</span>
            Manual method
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-xs text-gray-500 hover:text-gray-300 ml-auto"
            >
              {showManual ? "Hide" : "Show"} steps
            </button>
          </h3>

          {showManual && (
            <div className="bg-[#111] rounded-xl p-4 mb-3">
              <ol className="text-xs text-gray-400 space-y-2 list-decimal pl-4">
                <li>Open <strong className="text-gray-300">tinder.com</strong> in Chrome</li>
                <li>Log in to your Tinder account</li>
                <li>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">F12</kbd> to open DevTools</li>
                <li>Go to the <strong className="text-gray-300">Network</strong> tab</li>
                <li>Swipe or click around in Tinder</li>
                <li>Click any request to <code className="text-[#FD297B]">api.gotinder.com</code></li>
                <li>Find the <code className="text-[#FD297B]">X-Auth-Token</code> header and copy its value</li>
              </ol>
              <div className="mt-3 p-2 rounded-lg bg-white/5 text-[10px] text-gray-500">
                Alternative: In DevTools → Application → Local Storage → tinder.com, look for a key containing &quot;api_token&quot;
              </div>
            </div>
          )}
        </div>

        {/* Token input */}
        <div className="space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            placeholder="Paste your token here"
            className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#FD297B]/50 text-sm"
            autoFocus
          />

          <button
            onClick={connect}
            disabled={loading || !token.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ background: "var(--tinder-gradient)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </span>
            ) : (
              "Connect & Analyze"
            )}
          </button>

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
