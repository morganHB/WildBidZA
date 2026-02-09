"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildBrowserRedirectUrl } from "@/lib/auth/redirect";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      popiaConsent: false,
      termsAccepted: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const supabase = createSupabaseBrowserClient();
    const redirectTo = buildBrowserRedirectUrl("/auth/callback?next=/dashboard");

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: values.displayName,
          popia_consent: values.popiaConsent,
          terms_accepted: values.termsAccepted,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user && data.session) {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: values.displayName }),
      }).catch(() => undefined);

      toast.success("Account created. Complete your profile while waiting for approval.");
      router.push("/dashboard");
      router.refresh();
      return;
    }

    toast.success("Account created. Check your email and confirm your account, then sign in.");
    router.push("/sign-in?verify=1");
    router.refresh();
  });

  return (
    <Card className="w-full max-w-lg rounded-3xl border-white/70 bg-white/90 shadow-2xl shadow-brand-200/45 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Create your bidder account</CardTitle>
        <CardDescription>Every account is reviewed before bidding is enabled.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <GoogleAuthButton mode="signup" />
        <div className="relative text-center text-xs text-slate-500">
          <span className="bg-card px-2">or sign up with email</span>
          <div className="absolute left-0 right-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" {...form.register("displayName")} />
            {form.formState.errors.displayName ? (
              <p className="text-xs text-red-500">{form.formState.errors.displayName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-xs text-red-500">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <label className="flex items-start gap-3">
              <Checkbox checked={form.watch("termsAccepted")} onCheckedChange={(v) => form.setValue("termsAccepted", Boolean(v), { shouldValidate: true })} />
              <span>
                I accept the <Link className="text-brand-600" href="/terms">Terms & Conditions</Link> and <Link className="text-brand-600" href="/privacy">Privacy Policy</Link>.
              </span>
            </label>
            {form.formState.errors.termsAccepted ? (
              <p className="text-xs text-red-500">{form.formState.errors.termsAccepted.message}</p>
            ) : null}
            <label className="flex items-start gap-3">
              <Checkbox checked={form.watch("popiaConsent")} onCheckedChange={(v) => form.setValue("popiaConsent", Boolean(v), { shouldValidate: true })} />
              <span>I consent to processing of personal data under POPIA for auction operations and compliance checks.</span>
            </label>
            {form.formState.errors.popiaConsent ? (
              <p className="text-xs text-red-500">{form.formState.errors.popiaConsent.message}</p>
            ) : null}
          </div>
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
        </form>

        <p className="text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/sign-in" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
