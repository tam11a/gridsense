import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
			<LogoMark className="h-10 w-10" />
			<p className="mt-8 font-mono text-sm text-primary">404</p>
			<h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
			<p className="mt-2 max-w-sm text-sm text-muted-foreground">The link may be old, or the page has moved.</p>
			<Button asChild className="mt-6">
				<Link href="/dashboard">Go to overview</Link>
			</Button>
		</main>
	);
}
