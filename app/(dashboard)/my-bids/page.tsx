import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatZar } from "@/lib/utils/currency";
import { requireAuthPage } from "@/lib/auth/guard";
import { getMyBids } from "@/lib/auctions/queries";

export default async function MyBidsPage() {
  const { user } = await requireAuthPage();
  const bids = await getMyBids(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">My Bids</h1>
      {bids.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">You have not placed any bids yet.</CardContent>
        </Card>
      ) : (
        bids.map((row: any) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <Link href={`/auctions/${row.auction.id}`} className="hover:text-brand-600">
                  {row.auction.title}
                </Link>
                <Badge variant={row.auction.status === "live" ? "success" : "secondary"}>{row.auction.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>Your bid: <span className="font-semibold">{formatZar(row.amount)}</span></p>
              <p>{new Date(row.created_at).toLocaleString("en-ZA")}</p>
              <p>
                {row.auction.status === "ended"
                  ? row.auction.winner_user_id === user.id
                    ? "You won"
                    : "Auction ended"
                  : "Auction active"}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
