import type { Metadata } from "next";
import { Outfit as Font_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { CookiesProvider } from "next-client-cookies/server";
import Contexts from "./context";
import { ThemeProvider } from "../components/theme/provider";
import { Toaster as Sonner } from "@/components/ui/sonner"; // Toasts
import { Toaster } from "@/components/ui/toaster";

const font_sans = Font_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: { default: "GridSense", template: "%s · GridSense" },
	description:
		"GridSense: live sensor readings and remote switch control for your devices.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={cn(font_sans.className, "bg-background")}
				suppressHydrationWarning
			>
				<CookiesProvider>
					<Contexts>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							{children}
							<Sonner /> {/* Toasts */}
							<Toaster />
						</ThemeProvider>
					</Contexts>
				</CookiesProvider>
			</body>
		</html>
	);
}
