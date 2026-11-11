"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api";

/** Small single-field dialog for naming a switch or sensor (new or existing). */
export function NameDialog({
	open,
	onOpenChange,
	title,
	label = "Name",
	initial = "",
	placeholder,
	submitLabel = "Save",
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	label?: string;
	initial?: string;
	placeholder?: string;
	submitLabel?: string;
	onSubmit: (name: string) => Promise<unknown>;
}) {
	const [value, setValue] = useState(initial);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (open) {
			setValue(initial);
			setError(null);
		}
	}, [open, initial]);

	return (
		<Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
			<DialogContent className="sm:max-w-sm">
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						setBusy(true);
						setError(null);
						try {
							await onSubmit(value.trim());
							onOpenChange(false);
						} catch (err) {
							setError(errorMessage(err));
						} finally {
							setBusy(false);
						}
					}}
					className="space-y-4"
				>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="name-dialog-input">{label}</Label>
						<Input
							id="name-dialog-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder={placeholder}
							maxLength={60}
							autoFocus
						/>
						{error && <p className="text-sm font-medium text-destructive">{error}</p>}
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
							Cancel
						</Button>
						<Button type="submit" disabled={busy}>
							{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
