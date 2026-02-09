import Link from "next/link";
import { MessageSquareMore } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthPage } from "@/lib/auth/guard";
import { getDealConversations } from "@/lib/deals/queries";
import { relativeFromNow } from "@/lib/utils/datetime";

export default async function DealsPage() {
  const { user } = await requireAuthPage();
  const conversations = await getDealConversations(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Deal Chats</h1>
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            No deal chats yet. A chat becomes available after an auction ends with a winner.
          </CardContent>
        </Card>
      ) : (
        conversations.map((conversation) => (
          <Card key={conversation.id}>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{conversation.auction_title}</CardTitle>
                <Badge variant={conversation.auction_status === "ended" ? "secondary" : "success"}>
                  {conversation.auction_status}
                </Badge>
              </div>
              <CardDescription>
                You are the {conversation.role}. Chat partner: {conversation.counterpart_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="space-y-1">
                {conversation.last_message ? (
                  <>
                    <p className="line-clamp-1 max-w-xl text-slate-700 dark:text-slate-300">{conversation.last_message.message}</p>
                    <p className="text-xs text-slate-500">
                      {conversation.last_message.sender_name} • {relativeFromNow(conversation.last_message.created_at)}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">No messages yet.</p>
                )}
              </div>
              <Button asChild variant="outline">
                <Link href={`/deals/${conversation.auction_id}`}>
                  <MessageSquareMore className="mr-2 h-4 w-4" />
                  Open chat
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
