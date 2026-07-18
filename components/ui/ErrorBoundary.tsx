"use client";

import { Component, type ReactNode } from "react";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { reportClientError } from "@/lib/observability/client-events";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error, "component");
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <FeedbackState
          tone="error"
          title="Dit onderdeel kon niet worden weergegeven"
          description="Probeer het onderdeel opnieuw. Blijft het probleem bestaan, gebruik dan de foutreferentie uit de centrale logging."
          actionLabel="Opnieuw proberen"
          onAction={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
