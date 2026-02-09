import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants/app";

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Contact {APP_NAME}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Email: support@wildbidza.co.za</p>
          <p>Phone: +27 10 000 0000</p>
          <p>Hours: Mon-Fri, 08:00-17:00 (Africa/Johannesburg)</p>
        </CardContent>
      </Card>
    </main>
  );
}
