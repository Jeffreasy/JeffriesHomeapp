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
          <p className="text-xs text-slate-500 mb-4 max-w-xs">
            {this.state.error?.message ?? "Onbekende fout"}
          </p>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-sm hover:bg-white/10 transition-colors"
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
