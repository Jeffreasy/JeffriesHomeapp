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
import type * as actions_processPendingCalendar from "../actions/processPendingCalendar.js";
import type * as actions_syncPersonalEvents from "../actions/syncPersonalEvents.js";
import type * as actions_syncSchedule from "../actions/syncSchedule.js";
import type * as actions_syncTodoist from "../actions/syncTodoist.js";
import type * as actions_updatePersonalEvent from "../actions/updatePersonalEvent.js";
import type * as automations from "../automations.js";
import type * as crons from "../crons.js";
import type * as devices from "../devices.js";
import type * as http from "../http.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_googleAuth from "../lib/googleAuth.js";
import type * as lib_salaryCalc from "../lib/salaryCalc.js";
import type * as personalEvents from "../personalEvents.js";
import type * as salary from "../salary.js";
import type * as schedule from "../schedule.js";
import type * as transactions from "../transactions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/deletePersonalEvent": typeof actions_deletePersonalEvent;
  "actions/processPendingCalendar": typeof actions_processPendingCalendar;
  "actions/syncPersonalEvents": typeof actions_syncPersonalEvents;
  "actions/syncSchedule": typeof actions_syncSchedule;
  "actions/syncTodoist": typeof actions_syncTodoist;
  "actions/updatePersonalEvent": typeof actions_updatePersonalEvent;
  automations: typeof automations;
  crons: typeof crons;
  devices: typeof devices;
  http: typeof http;
  "lib/config": typeof lib_config;
  "lib/googleAuth": typeof lib_googleAuth;
  "lib/salaryCalc": typeof lib_salaryCalc;
  personalEvents: typeof personalEvents;
  salary: typeof salary;
  schedule: typeof schedule;
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
