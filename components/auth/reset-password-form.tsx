"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildBrowserRedirectUrl } from "@/lib/auth/redirect";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const supabase = createSupabaseBrowserClient();
    const redirectTo = buildBrowserRedirectUrl("/sign-in");

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Reset email sent.");
  });

  return (
    <Card className="w-full max-w-md rounded-[2.5rem] border border-stone-200 bg-white shadow-[0_38px_95px_-42px_rgba(0,0,0,0.45)]">
      <CardHeader>
        <CardTitle className="text-3xl font-black uppercase italic tracking-tight text-stone-900">Reset password</CardTitle>
        <CardDescription className="font-medium text-stone-500">
          We will send a secure reset link to your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl bg-red-700 text-white hover:bg-stone-900"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reset email
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
