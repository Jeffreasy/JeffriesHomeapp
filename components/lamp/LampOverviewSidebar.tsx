"use client";

import { ChevronRight, Home } from "lucide-react";
import { Panel, SectionHeader } from "./LampCards";
import type { RoomGroup } from "./LampUtils";

export function LampOverviewSidebar({ groups, unassignedCount }: { groups: RoomGroup[]; unassignedCount: number }) {
  return (
    <Panel>
      <SectionHeader
        icon={Home}
        label="Kamers"
        title="Overzicht"
        sub={`${groups.length + (unassignedCount > 0 ? 1 : 0)} groepen`}
      />
      {groups.length === 0 && unassignedCount === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
          Nog geen kamerindeling.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <RoomOverviewRow key={group.room.id} group={group} />
          ))}
          {unassignedCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200">Niet toegewezen</p>
                <p className="mt-0.5 text-xs text-slate-500">{unassignedCount} lampen</p>
              </div>
              <ChevronRight size={15} className="text-slate-600" />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function RoomOverviewRow({ group }: { group: RoomGroup }) {
  const allOnline = group.onlineCount === group.devices.length && group.devices.length > 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-200">{group.room.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {group.onlineCount}/{group.devices.length} online - {group.onCount} aan
        </p>
      </div>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          allOnline ? "bg-emerald-400" : group.onlineCount > 0 ? "bg-amber-400" : "bg-rose-400"
        }`}
      />
    </div>
  );
}
