import { ReactNode } from "react";
import { C } from "@/lib/adminColors";

interface AdminCardProps {
  noPadding?: boolean;
  className?: string;
  children: ReactNode;
}

/** Card base da área admin: branco, borda subtil, sombra ligeira. */
export default function AdminCard({ noPadding, className = "", children }: AdminCardProps) {
  return (
    <div
      className={`admin-card ${className}`}
      style={{
        background: "var(--admin-card-bg, #ffffff)",
        borderRadius: 14,
        border: `1.5px solid ${C.cardBorder}`,
        boxShadow: "0 1px 4px rgba(13,45,94,0.04)",
        padding: noPadding ? 0 : 24,
      }}
    >
      {children}
    </div>
  );
}
