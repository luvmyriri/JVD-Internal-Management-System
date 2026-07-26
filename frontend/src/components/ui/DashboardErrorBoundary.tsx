import { Component, type ReactNode } from 'react';
import { LuTriangleAlert, LuRefreshCw } from 'react-icons/lu';

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error boundary that wraps individual dashboard sections.
 * Prevents a single failing widget/API from crashing the entire page.
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DashboardErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center rounded-2xl border border-dashed border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10">
          <LuTriangleAlert className="w-8 h-8 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {this.props.title ?? 'This section failed to load'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              {this.state.errorMessage || 'An unexpected error occurred. Try refreshing the page.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <LuRefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
