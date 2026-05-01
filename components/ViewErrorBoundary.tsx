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

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border p-6" style={{ background: 'rgba(234,17,0,0.08)', borderColor: 'rgba(234,17,0,0.3)' }}>
          <p className="text-sm font-bold" style={{ color: '#ea1100' }}>Failed to render {this.props.viewName}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--s-text-dim)' }}>
            Try refreshing the page. If this persists, restart frontend and backend services.
          </p>
          <p className="text-[10px] mt-2" style={{ color: '#fca5a5' }}>
            Error detail: {this.state.errorMessage}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
