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

function buildIntentQuery(nextPath: string, reason?: string) {
  const query = new URLSearchParams();

  if (nextPath.startsWith("/")) {
    query.set("next", nextPath);
  }

  if (reason) {
    query.set("reason", reason);
  }

  const raw = query.toString();
  return raw ? `?${raw}` : "";
}

export function SignInForm({
  verifyRequested = false,
  authError = false,
  nextPath = "/dashboard",
  reason,
}: {
  verifyRequested?: boolean;
  authError?: boolean;
  nextPath?: string;
  reason?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const intentQuery = buildIntentQuery(safeNextPath, reason);

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
    router.push(safeNextPath);
    router.refresh();
  });

  return (
    <Card className="w-full max-w-md rounded-[2.5rem] border border-stone-200 bg-white shadow-[0_38px_95px_-42px_rgba(0,0,0,0.45)]">
      <CardHeader>
        <CardTitle className="text-3xl font-black uppercase italic tracking-tight text-stone-900">Welcome back</CardTitle>
        <CardDescription className="font-medium text-stone-500">
          Sign in to continue bidding on verified South African auctions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {verifyRequested ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            Check your inbox and click the confirmation link, then sign in.
          </div>
        ) : null}
        {authError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            Auth link is invalid or expired. Please request a fresh link and try again.
          </div>
        ) : null}
        {reason === "bid-login" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
            You must log in to place bids in live auctions.
          </div>
        ) : null}

        <GoogleAuthButton mode="signin" nextPath={safeNextPath} />

        <div className="relative text-center text-xs text-stone-500">
          <span className="bg-card px-2">or continue with email</span>
          <div className="absolute left-0 right-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-stone-200" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <Button
            className="w-full rounded-xl bg-red-700 text-white hover:bg-stone-900"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm text-stone-500">
          <Link href={`/reset-password${intentQuery}`} className="transition hover:text-stone-900">
            Forgot password?
          </Link>
          <Link href={`/sign-up${intentQuery}`} className="font-medium text-red-700">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
