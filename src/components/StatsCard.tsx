"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
}

export default function StatsCard({ label, value, icon, accent }: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[#1a1a1a] border border-white/5 p-5 transition-all duration-300 hover:border-white/10 hover:translate-y-[-2px]">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: accent || "var(--tinder-gradient)" }}
      />
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
