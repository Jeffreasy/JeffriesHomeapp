// Standalone CSV-import helper for the finance uploader.
//
// The uploader previously mounted its own useTransactions() instance just to
// reach importBatch, which duplicated the full page fetch + stats aggregation
// on every /finance visit. This plain function talks to the import endpoint
// directly; the page refreshes its own list via the onImported callback.

import { postTransactionsImport } from "@/lib/api/generated/transactions/transactions";
import type { PostTransactionsImportBody } from "@/lib/api/model";

export async function importTransactionsBatch(
  userId: string,
  transactions: PostTransactionsImportBody["transactions"]
) {
  if (!userId) return { data: { ok: false, inserted: 0, total: 0, skipped: 0 } };
  return postTransactionsImport({ userId, transactions });
}
