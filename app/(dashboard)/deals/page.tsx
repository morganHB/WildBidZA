import Link from "next/link";
import { MessageSquareMore } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthPage } from "@/lib/auth/guard";
import { getDealConversations } from "@/lib/deals/queries";
import { relativeFromNow } from "@/lib/utils/datetime";

function normalizeText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function parseDateFromInput(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = endOfDay
    ? new Date(`${value}T23:59:59.999`)
    : new Date(`${value}T00:00:00.000`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ lot?: string; user?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireAuthPage();
  const conversations = await getDealConversations(user.id);

  const lotFilter = normalizeText(params.lot);
  const userFilter = normalizeText(params.user);
  const endedFrom = parseDateFromInput(params.from, false);
  const endedTo = parseDateFromInput(params.to, true);

  const filteredConversations = conversations.filter((conversation) => {
    if (lotFilter && !conversation.auction_title.toLowerCase().includes(lotFilter)) {
      return false;
    }

    if (userFilter && !conversation.counterpart_name.toLowerCase().includes(userFilter)) {
      return false;
    }

    const endedAt = new Date(conversation.end_time);
    if (endedFrom && endedAt < endedFrom) {
      return false;
    }

    if (endedTo && endedAt > endedTo) {
      return false;
    }

    return true;
  });

  const activeFilterCount = [lotFilter, userFilter, endedFrom, endedTo].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Deal Chats</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter chats</CardTitle>
          <CardDescription>
            Find chats by lot/auction name, partner name, or auction ended date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="GET" action="/deals">
            <input
              type="text"
              name="lot"
              defaultValue={params.lot ?? ""}
              placeholder="Lot / auction name"
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />
            <input
              type="text"
              name="user"
              defaultValue={params.user ?? ""}
              placeholder="Chat partner name"
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Apply
              </Button>
              <Button asChild type="button" variant="outline" className="flex-1">
                <Link href="/deals">Clear</Link>
              </Button>
            </div>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            Showing {filteredConversations.length} of {conversations.length} chats
            {activeFilterCount > 0
              ? ` with ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
              : ""}
            .
          </p>
        </CardContent>
      </Card>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            No deal chats yet. A chat becomes available after an auction ends with a winner.
          </CardContent>
        </Card>
      ) : filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            No chats matched your filters. Try a broader lot name, user name, or date range.
          </CardContent>
        </Card>
      ) : (
        filteredConversations.map((conversation) => (
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
                    <p className="line-clamp-1 max-w-xl text-slate-700 dark:text-slate-300">
                      {conversation.last_message.message}
                    </p>
                    <p className="text-xs text-slate-500">
                      {conversation.last_message.sender_name} | {relativeFromNow(conversation.last_message.created_at)}
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
