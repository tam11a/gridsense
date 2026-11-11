import { cn } from "@/lib/utils";
import type { Presence } from "@/hooks/live";

const tone: Record<Presence, string> = {
	online: "bg-success",
	offline: "bg-muted-foreground/40",
	checking: "bg-warning",
};

export function StatusDot({
	status,
	className,
}: {
	status: Presence;
	className?: string;
}) {
	return (
		<span className={cn("relative inline-flex h-2.5 w-2.5 shrink-0", className)}>
			{status === "online" && (
				<span className="absolute inline-flex h-full w-full rounded-full bg-success/60 animate-live-ping" />
			)}
			<span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", tone[status])} />
		</span>
	);
}

const label: Record<Presence, string> = {
	online: "Online",
	offline: "Offline",
	checking: "Checking…",
};

export function PresenceBadge({ status }: { status: Presence }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
				status === "online" && "border-success/30 bg-success/10 text-success",
				status === "offline" && "text-muted-foreground",
				status === "checking" && "border-warning/30 bg-warning/10 text-warning"
			)}
		>
			<StatusDot status={status} className="h-2 w-2 [&>span]:h-2 [&>span]:w-2" />
			{label[status]}
		</span>
	);
}

export function Pill({
	children,
	tone = "muted",
	className,
}: {
	children: React.ReactNode;
	tone?: "muted" | "success" | "warning" | "danger" | "primary";
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
				tone === "muted" && "bg-muted text-muted-foreground",
				tone === "success" && "bg-success/10 text-success",
				tone === "warning" && "bg-warning/10 text-warning",
				tone === "danger" && "bg-destructive/10 text-destructive",
				tone === "primary" && "bg-primary/10 text-primary",
				className
			)}
		>
			{children}
		</span>
	);
}
