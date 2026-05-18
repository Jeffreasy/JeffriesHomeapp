"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { emailsApi, type EmailRow, type EmailStats } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Email {
  _id:            string;
  gmailId:        string;
  threadId:       string;
  from:           string;
  to:             string;
  cc?:            string;
  bcc?:           string;
  subject:        string;
  snippet:        string;
  datum:          string;
  ontvangen:      number;
  isGelezen:      boolean;
  isSter:         boolean;
  isVerwijderd:   boolean;
  isDraft:        boolean;
  labelIds:       string[];
  categorie:      string;
  heeftBijlagen:  boolean;
  bijlagenCount:  number;
  syncedAt:       string;
}

function fromRow(r: EmailRow): Email {
  return {
    _id:           r.id,
    gmailId:       r.gmail_id,
    threadId:      r.thread_id,
    from:          r.from_addr,
    to:            r.to_addr,
    cc:            r.cc ?? undefined,
    bcc:           r.bcc ?? undefined,
    subject:       r.subject,
    snippet:       r.snippet,
    datum:         r.datum,
    ontvangen:     r.ontvangen,
    isGelezen:     r.is_gelezen,
    isSter:        r.is_ster,
    isVerwijderd:  r.is_verwijderd,
    isDraft:       r.is_draft,
    labelIds:      r.label_ids ?? [],
    categorie:     r.categorie ?? "primary",
    heeftBijlagen: r.heeft_bijlagen,
    bijlagenCount: r.bijlagen_count,
    syncedAt:      r.synced_at,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type EmailCategorie = "primary" | "social" | "promotions" | "updates" | "forums";

interface UseEmailsOptions {
  categorie?: EmailCategorie;
  limit?: number;
  autoRefreshMs?: number;
}

export function useEmails(options: UseEmailsOptions = {}) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const { categorie, limit = 50, autoRefreshMs = 60_000 } = options;

  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    if (!userId) return;
    try {
      const [rows, emailStats] = await Promise.all([
        emailsApi.list(userId, limit, 0, categorie),
        emailsApi.stats(userId),
      ]);
      setEmails(rows.map(fromRow));
      setStats(emailStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Emails laden mislukt");
    } finally {
      setLoading(false);
    }
  }, [userId, limit, categorie]);

  useEffect(() => {
    fetchEmails();
    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchEmails, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [fetchEmails, autoRefreshMs]);

  const search = useCallback(async (query: string): Promise<Email[]> => {
    if (!userId || !query.trim()) return [];
    const rows = await emailsApi.search(userId, query);
    return rows.map(fromRow);
  }, [userId]);

  const markRead = useCallback(async (gmailId: string, read = true) => {
    if (!userId) return;
    await emailsApi.markRead(userId, gmailId, read);
    setEmails(prev => prev.map(e =>
      e.gmailId === gmailId ? { ...e, isGelezen: read } : e
    ));
    setStats(prev => ({
      ...prev,
      unread: read ? Math.max(0, prev.unread - 1) : prev.unread + 1,
    }));
  }, [userId]);

  const deleteEmail = useCallback(async (gmailId: string) => {
    if (!userId) return;
    await emailsApi.delete(userId, gmailId);
    setEmails(prev => prev.filter(e => e.gmailId !== gmailId));
    setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId) return;
    const rows = await emailsApi.list(userId, limit, emails.length, categorie);
    setEmails(prev => [...prev, ...rows.map(fromRow)]);
  }, [userId, limit, categorie, emails.length]);

  return {
    emails,
    stats,
    loading,
    error,
    search,
    markRead,
    deleteEmail,
    loadMore,
    refresh: fetchEmails,
  };
}
