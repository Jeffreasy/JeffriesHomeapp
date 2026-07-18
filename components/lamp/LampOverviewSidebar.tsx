"use client";

import { ChevronRight, Home } from "lucide-react";
import { SectionHeader } from "./LampCards";
import type { RoomGroup } from "./LampUtils";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export function LampOverviewSidebar({
  groups,
  unassignedCount,
}: {
  groups: RoomGroup[];
  unassignedCount: number;
}) {
  return (
    <Surface>
      <SectionHeader
        icon={Home}
        label="Kamers"
        title="Overzicht"
        sub={String(groups.length + (unassignedCount > 0 ? 1 : 0)) + " groepen"}
      />
      {groups.length === 0 && unassignedCount === 0 ? (
        <p className={cn(surfaceVariants({ tone: "subtle", radius: "md", padding: "md" }), "border-dashed text-center text-sm text-[var(--color-text-muted)]")}>
          Nog geen kamerindeling.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <RoomOverviewRow key={group.room.id} group={group} />
          ))}
          {unassignedCount > 0 ? (
            <div className={cn(surfaceVariants({ tone: "subtle", radius: "md", padding: "sm" }), "flex items-center justify-between gap-3")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">Niet toegewezen</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{unassignedCount} lampen</p>
              </div>
              <ChevronRight size={15} className="text-[var(--color-text-subtle)]" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      )}
    </Surface>
  );
}

function RoomOverviewRow({ group }: { group: RoomGroup }) {
  const allOnline = group.onlineCount === group.devices.length && group.devices.length > 0;

  return (
    <div className={cn(surfaceVariants({ tone: "subtle", radius: "md", padding: "sm" }), "flex items-center justify-between gap-3")}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--color-text)]">{group.room.name}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {group.onlineCount}/{group.devices.length} online · {group.onCount} aan
        </p>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          allOnline
            ? "bg-[var(--color-success)]"
            : group.onlineCount > 0
              ? "bg-[var(--color-warning)]"
              : "bg-[var(--color-danger)]",
        )}
      />
    </div>
  );
}
