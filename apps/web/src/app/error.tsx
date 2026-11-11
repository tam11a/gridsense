"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
			<LogoMark className="h-10 w-10" />
			<h1 className="mt-8 text-2xl font-semibold tracking-tight">Something went wrong</h1>
			<p className="mt-2 max-w-sm text-sm text-muted-foreground">
				GridSense couldn’t load this page. It’s usually a brief connection problem.
			</p>
			<Button className="mt-6" onClick={reset}>
				Try again
			</Button>
		</main>
	);
}
