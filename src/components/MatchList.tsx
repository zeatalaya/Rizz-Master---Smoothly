"use client";

import { MatchSummary } from "@/lib/tinder-api";

interface MatchListProps {
  matches: MatchSummary[];
}

export default function MatchList({ matches }: MatchListProps) {
  const sorted = [...matches].sort((a, b) => {
    const da = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
    const db = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
    return db - da;
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">💬</p>
        <p>No matches yet. Keep swiping!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((match) => (
        <div
          key={match.id}
          className="flex items-center gap-4 rounded-xl bg-[#1a1a1a] border border-white/5 p-4 transition-all hover:border-white/10"
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden"
            style={{ background: "var(--tinder-gradient)" }}
          >
            {match.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.photoUrl} alt={match.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {match.name[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{match.name}</span>
              {match.youStarted && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#FD297B]/30 text-[#FD297B]">
                  You first
                </span>
              )}
              {match.theyReplied && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 text-green-400">
                  Replied
                </span>
              )}
            </div>
            {match.lastMessage ? (
              <p className="text-sm text-gray-500 truncate mt-0.5">{match.lastMessage}</p>
            ) : (
              <p className="text-sm text-gray-600 italic mt-0.5">No messages yet</p>
            )}
          </div>

          {/* Meta */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-medium text-gray-300">{match.messageCount}</div>
            <div className="text-[10px] text-gray-600">msgs</div>
          </div>
        </div>
      ))}
    </div>
  );
}
