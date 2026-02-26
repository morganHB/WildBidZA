import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; authError?: string; next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const safeNextPath = params.next?.startsWith("/") ? params.next : "/dashboard";

  return (
    <SignInForm
      verifyRequested={params.verify === "1"}
      authError={params.authError === "1"}
      nextPath={safeNextPath}
      reason={params.reason}
    />
  );
}
