"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = {
  id: string;
  name: string;
};

export function AuctionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());

    if (!value || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    router.push(`/auctions?${next.toString()}`);
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search breeds, species, titles..."
            className="h-11 rounded-xl border-stone-200 bg-stone-50 pl-9"
            defaultValue={params.get("q") ?? ""}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateParam("q", (event.currentTarget as HTMLInputElement).value.trim());
              }
            }}
          />
        </div>
        <Select value={params.get("categoryId") ?? "all"} onValueChange={(value) => updateParam("categoryId", value)}>
          <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.get("province") ?? "all"} onValueChange={(value) => updateParam("province", value)}>
          <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50">
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All provinces</SelectItem>
            {SOUTH_AFRICA_PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.get("sort") ?? "ending_soon"} onValueChange={(value) => updateParam("sort", value)}>
          <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-stone-50">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ending_soon">Ending soonest</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="highest_price">Highest price</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={0}
          placeholder="Min R"
          className="h-11 rounded-xl border-stone-200 bg-stone-50"
          defaultValue={params.get("minPrice") ?? ""}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              updateParam("minPrice", (event.currentTarget as HTMLInputElement).value.trim());
            }
          }}
        />
        <Input
          type="number"
          min={0}
          placeholder="Max R"
          className="h-11 rounded-xl border-stone-200 bg-stone-50"
          defaultValue={params.get("maxPrice") ?? ""}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              updateParam("maxPrice", (event.currentTarget as HTMLInputElement).value.trim());
            }
          }}
        />
        <Button
          variant="secondary"
          className="h-11 rounded-xl"
          onClick={() => {
            router.push("/auctions");
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
