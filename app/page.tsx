"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useBridgeStatus } from "@/hooks/useDevices";
import { useSchedule } from "@/hooks/useSchedule";
import { useSalary } from "@/hooks/useSalary";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { usePersonalEvents } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardLampPanel } from "@/components/dashboard/DashboardLampPanel";
import { OverviewPanel } from "@/components/dashboard/DashboardOverviewPanel";
import { DashboardUtilityPanel } from "@/components/dashboard/DashboardUtilityPanel";
import {
  type DashboardDateInfo,
  formatCurrency,
  getDashboardDateInfo,
} from "@/components/dashboard/DashboardUtils";
import { BridgeStatusNotice } from "@/components/lamp/BridgeStatusNotice";
import { AppIcon } from "@/components/ui/AppIcon";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { getLightingSummary } from "@/lib/lighting";
import { calculateScheduleSalaryForecast } from "@/lib/salaryForecast";

export default function DashboardPage() {
  const [dateInfo, setDateInfo] = useState<DashboardDateInfo | null>(null);
  const mounted = dateInfo !== null;

  useEffect(() => {
    const updateDateInfo = () => setDateInfo(getDashboardDateInfo());
    const timeout = window.setTimeout(updateDateInfo, 0);
    const interval = window.setInterval(updateDateInfo, 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const queryClient = useQueryClient();
  const {
    data: devices = [],
    isLoading: devicesLoading,
    error: devicesError,
  } = useDevices();
  const { sendBatch, isPending: lightingPending } = useLampCommand();
  const {
    bridge,
    isOffline: bridgeOffline,
    isLoading: bridgeStatusLoading,
    isError: bridgeStatusError,
    isStatusKnown: isBridgeStatusKnown,
  } = useBridgeStatus();
  const {
    diensten: scheduleRecords,
    nextDienst: nextShift,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useSchedule();
  const {
    huidig: currentSalary,
    isLoading: salaryLoading,
    isError: salaryError,
    refetch: refetchSalary,
  } = useSalary();
  const payslips = useLoonstroken();
  const {
    upcoming: upcomingEvents,
    conflictMap,
    withConflicts,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = usePersonalEvents({ diensten: scheduleRecords });
  const { hidden: privacyOn, toggle: togglePrivacy, mask, isServerUnknown: isPrivacyUnknown } = usePrivacy("finance");

  // Keep the first server/client paint deterministic; device persistence remains opt-in.
  const dashboardDevices = useMemo(
    () => (mounted ? devices : []),
    [devices, mounted],
  );
  const lightingSummary = useMemo(
    () => getLightingSummary(dashboardDevices),
    [dashboardDevices],
  );
  const { onlineDevices, allOnlineOn: allOn } = lightingSummary;

  const personalUpcomingEvents = useMemo(
    () => upcomingEvents.filter((event) => event.kalender !== "Rooster"),
    [upcomingEvents],
  );
  const nextEvent = personalUpcomingEvents[0] ?? null;
  const hardConflicts = withConflicts.filter(
    (event) => conflictMap.get(event.eventId)?.level === "hard",
  ).length;
  const actionableConflicts = personalUpcomingEvents.filter((event) => {
    const conflict = conflictMap.get(event.eventId);
    if (!conflict || conflict.level === "info") return false;
    return !(conflict.level === "soft" && event.heledag);
  }).length;

  const scheduleForecast = useMemo(
    () =>
      calculateScheduleSalaryForecast(scheduleRecords, dateInfo?.period, {
        salaryRecords: currentSalary ? [currentSalary] : [],
        loonstroken: payslips.records,
      }),
    [currentSalary, dateInfo?.period, payslips.records, scheduleRecords],
  );
  const confirmedNet = dateInfo
    ? payslips.byPeriode.get(dateInfo.period)?.netto
    : undefined;
  const forecastNet =
    currentSalary && currentSalary.nettoPrognose > 0
      ? currentSalary.nettoPrognose
      : scheduleForecast?.nettoPrognose;
  const netValue = confirmedNet ?? forecastNet;
  const financeLoading = salaryLoading || payslips.isLoading;
  const financeFailed = Boolean(salaryError || payslips.isError);
  const netLabel = confirmedNet ? "Netto salaris" : "Netto prognose";
  const netDisplay =
    typeof netValue === "number"
      ? mask(formatCurrency(netValue))
      : financeLoading
        ? "Laden..."
        : financeFailed
          ? "Kon niet laden"
          : "-";
  const netSub =
    typeof netValue !== "number" && financeFailed
      ? "Salarisdata niet beschikbaar"
      : confirmedNet
        ? "Loonstrook bevestigd"
        : currentSalary && currentSalary.nettoPrognose > 0
          ? "Salarisberekening"
          : scheduleForecast
            ? `${scheduleForecast.aantalDiensten} diensten / ${scheduleForecast.totaalUren}u rooster`
            : scheduleLoading || financeLoading
              ? "Rooster laden"
              : "Geen roosterdata deze maand";

  const hasLoadingData =
    devicesLoading ||
    scheduleLoading ||
    salaryLoading ||
    eventsLoading ||
    payslips.isLoading;
  const hasFailedData = Boolean(
    devicesError || scheduleError || financeFailed || eventsError,
  );

  const retryFailedSources = () => {
    if (devicesError) {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    }
    if (scheduleError) void refetchSchedule();
    if (salaryError) void refetchSalary();
    if (payslips.isError) void payslips.refetch();
    if (eventsError) void refetchEvents();
  };

  const toggleAll = () => {
    if (lightingPending) return;
    void sendBatch(onlineDevices, { on: !allOn });
  };

  return (
    <div className="text-slate-100">
      <DashboardHeader
        greeting={dateInfo?.greeting ?? "Welkom"}
        today={dateInfo?.todayLabel ?? "vandaag"}
        privacyOn={privacyOn}
        isPrivacyUnknown={isPrivacyUnknown}
        togglePrivacy={togglePrivacy}
        allOn={allOn}
        onlineDevicesCount={onlineDevices.length}
        lightingPending={lightingPending}
        toggleAll={toggleAll}
      />

      <AppPageShell width="standard" className="app-page-shell--after-topbar space-y-4">
        {hasLoadingData && (
          <div className="flex min-h-9 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            <AppIcon name="activity" tone="blue" size="xs" />
            Gegevens worden bijgewerkt
          </div>
        )}

        {hasFailedData && !hasLoadingData && (
          <div
            role="alert"
            className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            <span className="flex min-w-0 items-center gap-2">
              <AppIcon name="warning" tone="rose" size="xs" />
              <span className="truncate">Sommige gegevens konden niet worden bijgewerkt</span>
            </span>
            <button
              type="button"
              onClick={retryFailedSources}
              className="min-h-9 shrink-0 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 font-semibold text-rose-100 transition-colors hover:bg-rose-500/20"
            >
              Opnieuw
            </button>
          </div>
        )}

        <BridgeStatusNotice
          bridge={bridge}
          isOffline={bridgeOffline}
          isLoading={bridgeStatusLoading}
          isError={bridgeStatusError}
          isStatusKnown={isBridgeStatusKnown}
        />

        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <DashboardLampPanel
            className="min-w-0"
            devices={dashboardDevices}
            loading={!mounted || devicesLoading}
            failed={Boolean(devicesError)}
            onRetry={() => {
              void queryClient.invalidateQueries({ queryKey: ["devices"] });
            }}
          />

          <OverviewPanel
            nextDienst={nextShift}
            nextEvent={nextEvent}
            nettoLabel={netLabel}
            nettoValue={netDisplay}
            nettoSub={netSub}
            conflicts={actionableConflicts}
            hardConflicts={hardConflicts}
            todayIso={dateInfo?.todayIso}
            appointmentsLoading={eventsLoading}
            appointmentsFailed={Boolean(eventsError)}
            scheduleLoading={scheduleLoading}
            scheduleFailed={Boolean(scheduleError)}
            financeLoading={financeLoading}
            financeFailed={financeFailed}
          />
        </section>

        <DashboardUtilityPanel />
      </AppPageShell>
    </div>
  );
}
