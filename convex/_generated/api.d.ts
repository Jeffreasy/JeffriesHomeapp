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
import type * as ai_agents_automations from "../ai/agents/automations.js";
import type * as ai_agents_dashboard from "../ai/agents/dashboard.js";
import type * as ai_agents_email from "../ai/agents/email.js";
import type * as ai_agents_finance from "../ai/agents/finance.js";
import type * as ai_agents_lampen from "../ai/agents/lampen.js";
import type * as ai_agents_rooster from "../ai/agents/rooster.js";
import type * as ai_grok_chat from "../ai/grok/chat.js";
import type * as ai_grok_prompt from "../ai/grok/prompt.js";
import type * as ai_grok_tools_calendar from "../ai/grok/tools/calendar.js";
import type * as ai_grok_tools_definitions from "../ai/grok/tools/definitions.js";
import type * as ai_grok_tools_email from "../ai/grok/tools/email.js";
import type * as ai_grok_tools_executor from "../ai/grok/tools/executor.js";
import type * as ai_grok_tools_finance from "../ai/grok/tools/finance.js";
import type * as ai_grok_tools_schedule from "../ai/grok/tools/schedule.js";
import type * as ai_grok_tools_smarthome from "../ai/grok/tools/smarthome.js";
import type * as ai_grok_types from "../ai/grok/types.js";
import type * as ai_registry from "../ai/registry.js";
import type * as ai_router from "../ai/router.js";
import type * as automations from "../automations.js";
import type * as chatMessages from "../chatMessages.js";
import type * as crons from "../crons.js";
import type * as deviceCommands from "../deviceCommands.js";
import type * as devices from "../devices.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as lib_autoCategorie from "../lib/autoCategorie.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_fields from "../lib/fields.js";
import type * as lib_googleAuth from "../lib/googleAuth.js";
import type * as lib_salaryCalc from "../lib/salaryCalc.js";
import type * as loonstroken from "../loonstroken.js";
import type * as personalEvents from "../personalEvents.js";
import type * as salary from "../salary.js";
import type * as schedule from "../schedule.js";
import type * as telegram_api from "../telegram/api.js";
import type * as telegram_bot from "../telegram/bot.js";
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
  "ai/agents/automations": typeof ai_agents_automations;
  "ai/agents/dashboard": typeof ai_agents_dashboard;
  "ai/agents/email": typeof ai_agents_email;
  "ai/agents/finance": typeof ai_agents_finance;
  "ai/agents/lampen": typeof ai_agents_lampen;
  "ai/agents/rooster": typeof ai_agents_rooster;
  "ai/grok/chat": typeof ai_grok_chat;
  "ai/grok/prompt": typeof ai_grok_prompt;
  "ai/grok/tools/calendar": typeof ai_grok_tools_calendar;
  "ai/grok/tools/definitions": typeof ai_grok_tools_definitions;
  "ai/grok/tools/email": typeof ai_grok_tools_email;
  "ai/grok/tools/executor": typeof ai_grok_tools_executor;
  "ai/grok/tools/finance": typeof ai_grok_tools_finance;
  "ai/grok/tools/schedule": typeof ai_grok_tools_schedule;
  "ai/grok/tools/smarthome": typeof ai_grok_tools_smarthome;
  "ai/grok/types": typeof ai_grok_types;
  "ai/registry": typeof ai_registry;
  "ai/router": typeof ai_router;
  automations: typeof automations;
  chatMessages: typeof chatMessages;
  crons: typeof crons;
  deviceCommands: typeof deviceCommands;
  devices: typeof devices;
  emails: typeof emails;
  http: typeof http;
  "lib/autoCategorie": typeof lib_autoCategorie;
  "lib/config": typeof lib_config;
  "lib/fields": typeof lib_fields;
  "lib/googleAuth": typeof lib_googleAuth;
  "lib/salaryCalc": typeof lib_salaryCalc;
  loonstroken: typeof loonstroken;
  personalEvents: typeof personalEvents;
  salary: typeof salary;
  schedule: typeof schedule;
  "telegram/api": typeof telegram_api;
  "telegram/bot": typeof telegram_bot;
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
