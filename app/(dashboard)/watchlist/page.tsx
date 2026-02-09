import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthPage } from "@/lib/auth/guard";
import { getWatchlist } from "@/lib/auctions/queries";

export default async function WatchlistPage() {
  const { user } = await requireAuthPage();
  const watchlist = await getWatchlist(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
      {watchlist.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">No auctions in your watchlist.</CardContent>
        </Card>
      ) : (
        watchlist.map((item: any) => (
          <Card key={item.auction.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/auctions/${item.auction.id}`} className="hover:text-brand-600">
                  {item.auction.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-slate-500">
              <p>Status: {item.auction.status}</p>
              <p>Ends: {new Date(item.auction.end_time).toLocaleString("en-ZA")}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
