"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export function SignInForm({
  verifyRequested = false,
  authError = false,
}: {
  verifyRequested?: boolean;
  authError?: boolean;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Welcome back");
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card className="w-full max-w-md rounded-3xl border-white/70 bg-white/90 shadow-2xl shadow-brand-200/45 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue bidding on verified South African auctions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {verifyRequested ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            Check your inbox and click the confirmation link, then sign in.
          </div>
        ) : null}
        {authError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            Auth link is invalid or expired. Please request a fresh link and try again.
          </div>
        ) : null}
        <GoogleAuthButton mode="signin" />
        <div className="relative text-center text-xs text-slate-500">
          <span className="bg-card px-2">or continue with email</span>
          <div className="absolute left-0 right-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-slate-200 dark:bg-slate-700" />
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link href="/reset-password" className="hover:text-slate-900 dark:hover:text-slate-100">
            Forgot password?
          </Link>
          <Link href="/sign-up" className="font-medium text-brand-600">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
