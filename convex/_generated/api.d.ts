/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_deletePersonalEvent from "../actions/deletePersonalEvent.js";
import type * as actions_getGmailBody from "../actions/getGmailBody.js";
import type * as actions_processPendingCalendar from "../actions/processPendingCalendar.js";
import type * as actions_sendGmail from "../actions/sendGmail.js";
import type * as actions_syncGmail from "../actions/syncGmail.js";
import type * as actions_syncPersonalEvents from "../actions/syncPersonalEvents.js";
import type * as actions_syncSchedule from "../actions/syncSchedule.js";
import type * as actions_syncTodoist from "../actions/syncTodoist.js";
import type * as actions_updatePersonalEvent from "../actions/updatePersonalEvent.js";
import type * as ai_agents_agenda from "../ai/agents/agenda.js";
import type * as ai_agents_automations from "../ai/agents/automations.js";
import type * as ai_agents_brain from "../ai/agents/brain.js";
import type * as ai_agents_dashboard from "../ai/agents/dashboard.js";
import type * as ai_agents_email from "../ai/agents/email.js";
import type * as ai_agents_finance from "../ai/agents/finance.js";
import type * as ai_agents_habits from "../ai/agents/habits.js";
import type * as ai_agents_lampen from "../ai/agents/lampen.js";
import type * as ai_agents_laventecare from "../ai/agents/laventecare.js";
import type * as ai_agents_notes from "../ai/agents/notes.js";
import type * as ai_agents_rooster from "../ai/agents/rooster.js";
import type * as ai_grok_capabilities from "../ai/grok/capabilities.js";
import type * as ai_grok_chat from "../ai/grok/chat.js";
import type * as ai_grok_pendingActions from "../ai/grok/pendingActions.js";
import type * as ai_grok_prompt from "../ai/grok/prompt.js";
import type * as ai_grok_tools_calendar from "../ai/grok/tools/calendar.js";
import type * as ai_grok_tools_definitions from "../ai/grok/tools/definitions.js";
import type * as ai_grok_tools_email from "../ai/grok/tools/email.js";
import type * as ai_grok_tools_executor from "../ai/grok/tools/executor.js";
import type * as ai_grok_tools_finance from "../ai/grok/tools/finance.js";
import type * as ai_grok_tools_habits from "../ai/grok/tools/habits.js";
import type * as ai_grok_tools_laventecare from "../ai/grok/tools/laventecare.js";
import type * as ai_grok_tools_notes from "../ai/grok/tools/notes.js";
import type * as ai_grok_tools_policy from "../ai/grok/tools/policy.js";
import type * as ai_grok_tools_schedule from "../ai/grok/tools/schedule.js";
import type * as ai_grok_tools_smarthome from "../ai/grok/tools/smarthome.js";
import type * as ai_grok_types from "../ai/grok/types.js";
import type * as ai_registry from "../ai/registry.js";
import type * as ai_router from "../ai/router.js";
import type * as auditLogs from "../auditLogs.js";
import type * as automations from "../automations.js";
import type * as backup from "../backup.js";
import type * as brainPreferences from "../brainPreferences.js";
import type * as bridgeHealth from "../bridgeHealth.js";
import type * as chatMessages from "../chatMessages.js";
import type * as crons from "../crons.js";
import type * as deviceCommands from "../deviceCommands.js";
import type * as devices from "../devices.js";
import type * as emails from "../emails.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as laventecare from "../laventecare.js";
import type * as lib_autoCategorie from "../lib/autoCategorie.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_fields from "../lib/fields.js";
import type * as lib_googleAuth from "../lib/googleAuth.js";
import type * as lib_habitConstants from "../lib/habitConstants.js";
import type * as lib_laventecareKnowledge from "../lib/laventecareKnowledge.js";
import type * as lib_salaryCalc from "../lib/salaryCalc.js";
import type * as loonstroken from "../loonstroken.js";
import type * as notes from "../notes.js";
import type * as personalEvents from "../personalEvents.js";
import type * as privacySettings from "../privacySettings.js";
import type * as rooms from "../rooms.js";
import type * as salary from "../salary.js";
import type * as schedule from "../schedule.js";
import type * as settings from "../settings.js";
import type * as syncStatus from "../syncStatus.js";
import type * as telegram_api from "../telegram/api.js";
import type * as telegram_bot from "../telegram/bot.js";
import type * as telegram_notifications from "../telegram/notifications.js";
import type * as transactions from "../transactions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/deletePersonalEvent": typeof actions_deletePersonalEvent;
  "actions/getGmailBody": typeof actions_getGmailBody;
  "actions/processPendingCalendar": typeof actions_processPendingCalendar;
  "actions/sendGmail": typeof actions_sendGmail;
  "actions/syncGmail": typeof actions_syncGmail;
  "actions/syncPersonalEvents": typeof actions_syncPersonalEvents;
  "actions/syncSchedule": typeof actions_syncSchedule;
  "actions/syncTodoist": typeof actions_syncTodoist;
  "actions/updatePersonalEvent": typeof actions_updatePersonalEvent;
  "ai/agents/agenda": typeof ai_agents_agenda;
  "ai/agents/automations": typeof ai_agents_automations;
  "ai/agents/brain": typeof ai_agents_brain;
  "ai/agents/dashboard": typeof ai_agents_dashboard;
  "ai/agents/email": typeof ai_agents_email;
  "ai/agents/finance": typeof ai_agents_finance;
  "ai/agents/habits": typeof ai_agents_habits;
  "ai/agents/lampen": typeof ai_agents_lampen;
  "ai/agents/laventecare": typeof ai_agents_laventecare;
  "ai/agents/notes": typeof ai_agents_notes;
  "ai/agents/rooster": typeof ai_agents_rooster;
  "ai/grok/capabilities": typeof ai_grok_capabilities;
  "ai/grok/chat": typeof ai_grok_chat;
  "ai/grok/pendingActions": typeof ai_grok_pendingActions;
  "ai/grok/prompt": typeof ai_grok_prompt;
  "ai/grok/tools/calendar": typeof ai_grok_tools_calendar;
  "ai/grok/tools/definitions": typeof ai_grok_tools_definitions;
  "ai/grok/tools/email": typeof ai_grok_tools_email;
  "ai/grok/tools/executor": typeof ai_grok_tools_executor;
  "ai/grok/tools/finance": typeof ai_grok_tools_finance;
  "ai/grok/tools/habits": typeof ai_grok_tools_habits;
  "ai/grok/tools/laventecare": typeof ai_grok_tools_laventecare;
  "ai/grok/tools/notes": typeof ai_grok_tools_notes;
  "ai/grok/tools/policy": typeof ai_grok_tools_policy;
  "ai/grok/tools/schedule": typeof ai_grok_tools_schedule;
  "ai/grok/tools/smarthome": typeof ai_grok_tools_smarthome;
  "ai/grok/types": typeof ai_grok_types;
  "ai/registry": typeof ai_registry;
  "ai/router": typeof ai_router;
  auditLogs: typeof auditLogs;
  automations: typeof automations;
  backup: typeof backup;
  brainPreferences: typeof brainPreferences;
  bridgeHealth: typeof bridgeHealth;
  chatMessages: typeof chatMessages;
  crons: typeof crons;
  deviceCommands: typeof deviceCommands;
  devices: typeof devices;
  emails: typeof emails;
  habits: typeof habits;
  http: typeof http;
  laventecare: typeof laventecare;
  "lib/autoCategorie": typeof lib_autoCategorie;
  "lib/config": typeof lib_config;
  "lib/fields": typeof lib_fields;
  "lib/googleAuth": typeof lib_googleAuth;
  "lib/habitConstants": typeof lib_habitConstants;
  "lib/laventecareKnowledge": typeof lib_laventecareKnowledge;
  "lib/salaryCalc": typeof lib_salaryCalc;
  loonstroken: typeof loonstroken;
  notes: typeof notes;
  personalEvents: typeof personalEvents;
  privacySettings: typeof privacySettings;
  rooms: typeof rooms;
  salary: typeof salary;
  schedule: typeof schedule;
  settings: typeof settings;
  syncStatus: typeof syncStatus;
  "telegram/api": typeof telegram_api;
  "telegram/bot": typeof telegram_bot;
  "telegram/notifications": typeof telegram_notifications;
  transactions: typeof transactions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
