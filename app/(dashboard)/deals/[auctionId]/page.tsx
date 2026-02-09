import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { DealChat } from "@/components/deals/deal-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuthPage } from "@/lib/auth/guard";
import { getDealConversationByAuction } from "@/lib/deals/queries";
import { formatAuctionDateLong } from "@/lib/utils/datetime";

export default async function DealChatPage({ params }: { params: Promise<{ auctionId: string }> }) {
  const { user } = await requireAuthPage();
  const { auctionId } = await params;
  const conversation = await getDealConversationByAuction(user.id, auctionId);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="w-fit px-2">
        <Link href="/deals">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to deal chats
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Auction</p>
            <p className="font-semibold">{conversation.auction_title}</p>
            <p className="text-xs text-slate-500">Ended {formatAuctionDateLong(conversation.end_time)}</p>
          </div>
          <Badge variant={conversation.auction_status === "ended" ? "secondary" : "success"}>
            {conversation.auction_status}
          </Badge>
        </CardContent>
      </Card>

      <DealChat
        auctionId={conversation.auction_id}
        conversationId={conversation.id}
        currentUserId={user.id}
        counterpartName={conversation.counterpart_name}
        initialMessages={conversation.messages}
      />
    </div>
  );
}
