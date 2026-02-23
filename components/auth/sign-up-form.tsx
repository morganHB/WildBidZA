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

export function SignUpForm({
  nextPath = "/dashboard",
  reason,
}: {
  nextPath?: string;
  reason?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const intentQuery = buildIntentQuery(safeNextPath, reason);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
      idNumber: "",
      password: "",
      confirmPassword: "",
      popiaConsent: false,
      termsAccepted: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const supabase = createSupabaseBrowserClient();
    const callbackQuery = new URLSearchParams({ next: safeNextPath });
    const redirectTo = buildBrowserRedirectUrl(`/auth/callback?${callbackQuery.toString()}`);

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: values.displayName,
          phone: values.phone,
          id_number: values.idNumber,
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
        body: JSON.stringify({
          display_name: values.displayName,
          phone: values.phone,
          id_number: values.idNumber,
        }),
      }).catch(() => undefined);

      toast.success("Account created. Complete your profile while waiting for approval.");
      router.push(safeNextPath);
      router.refresh();
      return;
    }

    toast.success("Account created. Check your email and confirm your account, then sign in.");
    router.push(`/sign-in?verify=1${intentQuery ? `&${intentQuery.slice(1)}` : ""}`);
    router.refresh();
  });

  return (
    <Card className="w-full max-w-lg rounded-[2.5rem] border border-stone-200 bg-white shadow-[0_38px_95px_-42px_rgba(0,0,0,0.45)]">
      <CardHeader>
        <CardTitle className="text-3xl font-black uppercase italic tracking-tight text-stone-900">
          Create your bidder account
        </CardTitle>
        <CardDescription className="font-medium text-stone-500">
          Every account is reviewed before bidding is enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <GoogleAuthButton mode="signup" nextPath={safeNextPath} />

        <div className="relative text-center text-xs text-stone-500">
          <span className="bg-card px-2">or sign up with email</span>
          <div className="absolute left-0 right-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-stone-200" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" {...form.register("displayName")} />
            {form.formState.errors.displayName ? (
              <p className="text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Cellphone number</Label>
              <Input id="phone" type="tel" autoComplete="tel" placeholder="0821234567" {...form.register("phone")} />
              {form.formState.errors.phone ? (
                <p className="text-xs text-red-600">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="id-number">ID number</Label>
              <Input id="id-number" inputMode="numeric" placeholder="13-digit South African ID" {...form.register("idNumber")} />
              {form.formState.errors.idNumber ? (
                <p className="text-xs text-red-600">{form.formState.errors.idNumber.message}</p>
              ) : null}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={form.watch("termsAccepted")}
                onCheckedChange={(value) => form.setValue("termsAccepted", Boolean(value), { shouldValidate: true })}
              />
              <span>
                I accept the{" "}
                <Link className="font-medium text-red-700" href="/terms">
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link className="font-medium text-red-700" href="/privacy">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {form.formState.errors.termsAccepted ? (
              <p className="text-xs text-red-600">{form.formState.errors.termsAccepted.message}</p>
            ) : null}

            <label className="flex items-start gap-3">
              <Checkbox
                checked={form.watch("popiaConsent")}
                onCheckedChange={(value) => form.setValue("popiaConsent", Boolean(value), { shouldValidate: true })}
              />
              <span>I consent to processing of personal data under POPIA for auction operations and compliance checks.</span>
            </label>
            {form.formState.errors.popiaConsent ? (
              <p className="text-xs text-red-600">{form.formState.errors.popiaConsent.message}</p>
            ) : null}
          </div>

          <Button
            className="w-full rounded-xl bg-red-700 text-white hover:bg-stone-900"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
        </form>

        <p className="text-sm text-stone-500">
          Already registered?{" "}
          <Link href={`/sign-in${intentQuery}`} className="font-medium text-red-700">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
