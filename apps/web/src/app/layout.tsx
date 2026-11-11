import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Contexts from "./context";
import { ThemeProvider } from "../components/theme/provider";
import { Toaster } from "@/components/ui/sonner";

// Plus Jakarta Sans was tried first; as bundled by next/font it rendered with
// uneven letter spacing on Linux Chromium. Inter renders cleanly everywhere.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
	title: { default: "GridSense", template: "%s · GridSense" },
	description: "Live sensor readings and remote switch control for your sites.",
	applicationName: "GridSense",
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f8fafc" },
		{ media: "(prefers-color-scheme: dark)", color: "#070b14" },
	],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={cn(sans.variable, mono.variable, "font-sans")}>
				<Contexts>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						{children}
						<Toaster position="top-right" closeButton />
					</ThemeProvider>
				</Contexts>
			</body>
		</html>
	);
}
