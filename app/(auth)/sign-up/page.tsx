import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const safeNextPath = params.next?.startsWith("/") ? params.next : "/dashboard";

  return <SignUpForm nextPath={safeNextPath} reason={params.reason} />;
}
