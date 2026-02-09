import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; authError?: string }>;
}) {
  const params = await searchParams;
  return <SignInForm verifyRequested={params.verify === "1"} authError={params.authError === "1"} />;
}
