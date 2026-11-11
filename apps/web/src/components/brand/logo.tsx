import { cn } from "@/lib/utils";

/** GridSense mark: a sensor pulse running across a grid of nodes. */
export function LogoMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			aria-hidden="true"
			className={cn("h-8 w-8 shrink-0", className)}
		>
			<rect
				width="32"
				height="32"
				rx="9"
				className="fill-primary"
			/>
			<g className="fill-primary-foreground opacity-40">
				{[9, 16, 23].flatMap((y) =>
					[9, 16, 23].map((x) => (
						<circle
							key={`${x}-${y}`}
							cx={x}
							cy={y}
							r="1.5"
						/>
					))
				)}
			</g>
			<polyline
				points="4.5,17 10.5,17 13,10.5 17.5,22.5 20,15 22,17 27.5,17"
				fill="none"
				strokeWidth="2.4"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="stroke-primary-foreground"
			/>
		</svg>
	);
}

export function Logo({
	className,
	markClassName,
}: {
	className?: string;
	markClassName?: string;
}) {
	return (
		<span className={cn("inline-flex items-center gap-2.5", className)}>
			<LogoMark className={markClassName} />
			<span className="text-lg font-semibold tracking-tight">
				Grid<span className="text-primary">Sense</span>
			</span>
		</span>
	);
}
