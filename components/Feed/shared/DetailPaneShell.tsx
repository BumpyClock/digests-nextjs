import type { ReactNode } from "react";

interface DetailPaneShellProps {
  children: ReactNode;
  className?: string;
}

export function DetailPaneShell({ children, className }: DetailPaneShellProps) {
  return <div className={["h-full border rounded-md overflow-hidden bg-card", className].filter(Boolean).join(" ")}>{children}</div>;
}
