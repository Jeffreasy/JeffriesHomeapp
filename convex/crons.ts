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

/**
 * Gmail sync — elke 5 minuten.
 * Incrementele sync via Gmail History API; full sync bij eerste run.
 */
crons.interval(
  "sync-gmail",
  { minutes: 5 },
  internal.actions.syncGmail.syncFromGmail,
  { userId: JEFFREY_USER_ID }
);

/**
 * Verwijderde emails opruimen — elke dag om 03:00 UTC (05:00 Amsterdam)
 * Purget emails die >7 dagen geleden als verwijderd zijn gemarkeerd.
 */
crons.daily(
  "purge-deleted-emails",
  { hourUTC: 3, minuteUTC: 0 },
  internal.emails.purgeDeletedInternal,
  { userId: JEFFREY_USER_ID }
);

export default crons;
