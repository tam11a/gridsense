import { cn } from "@/lib/utils";

export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon: React.ReactNode;
	title: string;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center",
				className
			)}
		>
			<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground [&>svg]:h-6 [&>svg]:w-6">
				{icon}
			</div>
			<h3 className="font-semibold">{title}</h3>
			{description && (
				<p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
			)}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}
