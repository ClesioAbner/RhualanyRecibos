import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  testId,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-8 md:p-10",
        "border border-border/70",
        "text-center",
      )}
      data-testid={testId}
    >
      <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-gradient-to-br from-primary/14 via-accent/10 to-transparent border border-border/60 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.35)]">
        {icon}
      </div>
      <h3 className="mt-4 text-xl md:text-2xl">{title}</h3>
      {description && <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
