"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, useLogin } from "@/lib/api";
import { authService } from "@/lib/auth.service";

const schema = z.object({
	email: z.string().trim().email("Enter a valid email"),
	password: z.string().min(1, "Enter your password"),
});

export function SignForm() {
	const router = useRouter();
	const login = useLogin();
	const [show, setShow] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: { email: "", password: "" },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		setError(null);
		try {
			const res = await login.mutateAsync(values);
			authService.setToken(res.data.token);
			toast.success(`Welcome back, ${res.data.user.first_name}`);
			router.replace("/dashboard");
			router.refresh();
		} catch (err) {
			setError(errorMessage(err));
		}
	});

	return (
		<>
			<h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
			<p className="mt-1 text-sm text-muted-foreground">Welcome back. Enter your details to continue.</p>

			<Form {...form}>
				<form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
					{error && (
						<div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</div>
					)}
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input type="email" placeholder="you@company.com" autoComplete="email" autoFocus {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Password</FormLabel>
								<div className="relative">
									<FormControl>
										<Input type={show ? "text" : "password"} autoComplete="current-password" className="pr-10" {...field} />
									</FormControl>
									<button
										type="button"
										onClick={() => setShow((s) => !s)}
										className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
										aria-label={show ? "Hide password" : "Show password"}
									>
										{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
						{login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Sign in
					</Button>
					<p className="text-center text-xs text-muted-foreground">
						Forgot your password? Ask your GridSense administrator to reset it.
					</p>
				</form>
			</Form>
		</>
	);
}
