import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
  testId,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow && (
          <div
            className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground"
            data-testid={testId ? `${testId}-eyebrow` : undefined}
          >
            {eyebrow}
          </div>
        )}
        <h1
          className={cn(
            "text-3xl md:text-4xl",
            "leading-[1.05] tracking-tight",
          )}
          data-testid={testId ? `${testId}-title` : undefined}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed"
            data-testid={testId ? `${testId}-subtitle` : undefined}
          >
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="md:pb-1">{right}</div>}
    </div>
  );
}
