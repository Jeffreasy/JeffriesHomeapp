import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { JEFFREY_USER_ID } from "./lib/config";

const crons = cronJobs();

/**
 * Dagelijkse rooster sync — elke dag om 06:00 UTC (08:00 Amsterdam zomertijd)
 */
crons.daily(
  "sync-schedule-daily",
  { hourUTC: 6, minuteUTC: 0 },
  internal.actions.syncSchedule.syncFromCalendar,
  { userId: JEFFREY_USER_ID }
);

/**
 * Geagendeerde Google Calendar sync (Primaire Agenda)
 */
crons.interval(
  "sync-personal-events-interval",
  { hours: 1 },
  internal.actions.syncPersonalEvents.syncFromCalendar,
  { userId: JEFFREY_USER_ID }
);

/**
 * Dagelijkse Todoist sync — elke dag om 07:00 UTC
 */
crons.daily(
  "sync-todoist-daily",
  { hourUTC: 7, minuteUTC: 0 },
  internal.actions.syncTodoist.syncTodoist,
  { userId: JEFFREY_USER_ID }
);

/**
 * Pending calendar events verwerken — elk uur.
 * Gebruik "Verwerk nu" knop in de UI voor directe verwerking.
 */
crons.interval(
  "process-pending-calendar",
  { hours: 1 },
  internal.actions.processPendingCalendar.processPending,
  { userId: JEFFREY_USER_ID }
);

export default crons;
