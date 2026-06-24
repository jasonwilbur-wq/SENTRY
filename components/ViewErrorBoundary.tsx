import React from 'react';

interface Props {
  children: React.ReactNode;
  viewName: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ViewErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? 'Unknown render error' };
  }

  componentDidCatch(error: Error): void {
    console.error(`[${this.props.viewName}] render failed`, error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border p-6"
          style={{ background: 'rgba(234,17,0,0.08)', borderColor: 'rgba(234,17,0,0.3)' }}
          role="alert"
        >
          <p className="text-sm font-bold" style={{ color: '#ea1100' }}>Failed to render {this.props.viewName}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--s-text-dim)' }}>
            This view hit a rendering problem. Try again; if it persists, restart the local frontend and backend services.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{ background: 'rgba(0,83,226,0.18)', border: '1px solid rgba(0,83,226,0.45)', color: '#93c5fd' }}
          >
            Retry view
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
