"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300 mb-1">
            Er is iets misgegaan
          </h3>
          <p className="text-xs text-slate-400 mb-2 max-w-xs">
            Dit onderdeel kon niet worden weergegeven. Probeer het opnieuw.
          </p>
          {/* Raw error text only as a small secondary detail line — never as the
              headline (mirrors app/error.tsx): it is usually English jargon. */}
          {this.state.error?.message ? (
            <p className="text-[11px] leading-4 text-slate-500 mb-4 max-w-xs break-words">
              {this.state.error.message}
            </p>
          ) : (
            <span className="mb-2" />
          )}
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-surface)] text-slate-300 border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <RefreshCw size={13} />
            Opnieuw proberen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
