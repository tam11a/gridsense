"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className }: { value: string; className?: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {
					/* clipboard blocked (e.g. plain http); the value is still selectable */
				}
			}}
			className={cn(
				"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground",
				className
			)}
			aria-label={copied ? "Copied" : `Copy ${value}`}
		>
			{copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
		</button>
	);
}

/** Monospace value with a copy button. */
export function CopyField({ value, className }: { value: string; className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/50 py-0.5 pl-2 pr-0.5 font-mono text-xs",
				className
			)}
		>
			<span className="truncate select-all">{value}</span>
			<CopyButton value={value} />
		</span>
	);
}
