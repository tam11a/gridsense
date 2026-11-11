import { Activity, Gauge, Power, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SignForm } from "./sign-form";

const FEATURES = [
	{ icon: Activity, title: "Live readings", text: "Temperature and humidity from every site, as it happens." },
	{ icon: Power, title: "Remote control", text: "Start and stop aerators and pumps, with confirmation from the device." },
	{ icon: Gauge, title: "History", text: "Trends over hours, days or a month, ready to export." },
	{ icon: ShieldCheck, title: "Team access", text: "Administrators, operators and viewers each see what they need." },
];

export default function SignInPage() {
	return (
		<main className="grid min-h-svh lg:grid-cols-2">
			<section className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
				<div className="bg-grid absolute inset-0 opacity-60 [--foreground:0_0%_100%]" aria-hidden />
				<div
					className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"
					aria-hidden
				/>
				<div className="relative">
					<Logo className="[&_svg_rect]:fill-white/15 [&_span_span]:text-white" />
				</div>
				<div className="relative max-w-md">
					<h1 className="text-4xl font-semibold leading-tight tracking-tight">
						Every site, every sensor, one screen.
					</h1>
					<p className="mt-4 text-primary-foreground/80">
						GridSense keeps watch over your ponds, tanks and rooms, and lets you act the moment something changes.
					</p>
					<ul className="mt-10 grid gap-5 sm:grid-cols-2">
						{FEATURES.map(({ icon: Icon, title, text }) => (
							<li key={title}>
								<Icon className="h-5 w-5 opacity-90" />
								<div className="mt-2 font-medium">{title}</div>
								<div className="text-sm text-primary-foreground/70">{text}</div>
							</li>
						))}
					</ul>
				</div>
				<div className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} GridSense</div>
			</section>

			<section className="flex flex-col items-center justify-center px-6 py-12">
				<div className="w-full max-w-sm">
					<Logo className="mb-10 lg:hidden" />
					<SignForm />
				</div>
			</section>
		</main>
	);
}
