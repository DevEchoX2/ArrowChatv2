import { Badge } from "@/lib/types";
import { Star, Shield, CheckCircle, Zap } from "lucide-react";

const BADGE_ICONS: Record<string, React.ReactNode> = {
  premium: <Star size={10} />,
  staff: <Shield size={10} />,
  verified: <CheckCircle size={10} />,
  founder: <Zap size={10} />,
};

const BADGE_STYLES: Record<string, string> = {
  premium: "border-white/40 bg-white/10 text-white/80",
  staff: "border-white/80 bg-white/20 text-white",
  verified: "border-white/30 bg-white/5 text-white/60",
  founder: "border-white/50 bg-white/10 text-white/70",
  early_adopter: "border-white/20 bg-white/5 text-white/50",
  custom: "border-white/20 bg-white/5 text-white/50",
};

interface Props {
  badge: Badge;
}

export function BadgeChip({ badge }: Props) {
  const style = BADGE_STYLES[badge.type] ?? BADGE_STYLES.custom;
  const icon = BADGE_ICONS[badge.type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style}`}
    >
      {icon}
      {badge.label}
    </span>
  );
}
