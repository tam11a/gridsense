"use client";

import { useEffect, useState } from "react";
import { Fan, Hand, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LiveSwitch } from "@/hooks/live";
import { errorMessage, useSwitchAction } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Switch } from "@/lib/types";
import { cn } from "@/lib/utils";

/** How long to wait for the device to confirm a command. */
const CONFIRM_TIMEOUT_MS = 15_000;

export function SwitchCard({
	sw,
	live,
	remote,
	canControl,
	canManage,
	now,
	onRename,
	onDelete,
}: {
	sw: Switch;
	live: LiveSwitch;
	remote: boolean;
	canControl: boolean;
	canManage: boolean;
	now: number;
	onRename: () => void;
	onDelete: () => void;
}) {
	const action = useSwitchAction();
	const [pending, setPending] = useState<boolean | null>(null);

	// Clear "Starting…/Stopping…" once the device reports the new state.
	useEffect(() => {
		if (pending !== null && live.state === pending) setPending(null);
	}, [live.state, live.at, pending]);

	useEffect(() => {
		if (pending === null) return;
		const t = setTimeout(() => {
			setPending(null);
			toast.warning(`${sw.label} didn't confirm`, {
				description: "The command was sent but the device hasn't reported back. Check that it's online.",
			});
		}, CONFIRM_TIMEOUT_MS);
		return () => clearTimeout(t);
	}, [pending, sw.label]);

	const send = async (target: boolean) => {
		setPending(target);
		try {
			await action.mutateAsync({ id: sw.id, action: target });
		} catch (err) {
			setPending(null);
			toast.error(`Couldn't ${target ? "start" : "stop"} ${sw.label}`, {
				description: errorMessage(err),
			});
		}
	};

	const on = live.state;
	const busy = pending !== null;

	return (
		<Card
			className={cn(
				"flex flex-col p-4 transition",
				on && "border-success/40 bg-success/[0.04]"
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<div className="truncate font-medium">{sw.label}</div>
					<div className="font-mono text-[11px] text-muted-foreground">ID {sw.id}</div>
				</div>
				{canManage && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" aria-label={`${sw.label} options`}>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onRename}>
								<Pencil className="mr-2 h-4 w-4" /> Rename
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
								<Trash2 className="mr-2 h-4 w-4" /> Remove
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			<div className="my-5 flex items-center gap-3">
				<span
					className={cn(
						"flex h-12 w-12 items-center justify-center rounded-xl transition",
						on ? "bg-success text-white" : "bg-muted text-muted-foreground"
					)}
				>
					<Fan className={cn("h-6 w-6", on && "animate-spin-slow")} />
				</span>
				<div>
					<div className={cn("font-semibold", on ? "text-success" : "text-muted-foreground")}>
						{busy ? (pending ? "Starting…" : "Stopping…") : on ? "Running" : "Stopped"}
					</div>
					<div className="text-xs text-muted-foreground">
						{live.at ? `since ${timeAgo(live.at, now)}` : "no report yet"}
					</div>
				</div>
			</div>

			<div className="mt-auto">
				{!remote ? (
					<div className="flex items-center justify-center gap-1.5 rounded-md bg-warning/10 py-2 text-xs font-medium text-warning">
						<Hand className="h-3.5 w-3.5" /> Manual control on site
					</div>
				) : canControl ? (
					<Button
						className="w-full"
						variant={on ? "outline" : "default"}
						disabled={busy}
						onClick={() => send(!on)}
					>
						{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{on ? "Stop" : "Start"}
					</Button>
				) : (
					<div className="rounded-md bg-muted py-2 text-center text-xs text-muted-foreground">
						View only
					</div>
				)}
			</div>
		</Card>
	);
}
