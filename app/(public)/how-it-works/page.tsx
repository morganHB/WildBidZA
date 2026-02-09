import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants/app";

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">How {APP_NAME} Works</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>1. Register</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Sign up with email or Google and complete your profile. All accounts start pending approval.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Get approved</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Admin verifies your access. Approved bidders can bid, and approved sellers can publish listings.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>3. Bid live</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Place secure bids in real time with anti-sniping protection and clear winner outcomes.
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-slate-500">
        Ready to start? <Link href="/sign-up" className="text-brand-600">Create your account</Link>
      </p>
    </main>
  );
}
