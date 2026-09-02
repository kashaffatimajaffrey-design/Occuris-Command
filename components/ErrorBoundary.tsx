import React from 'react';

/**
 * Catches a render error in one part of the app and shows it.
 *
 * Without a boundary, React unmounts the entire tree when any component throws
 * and the user is left looking at a blank page with no indication that
 * anything failed — which is exactly what a stale `riskReport.components_at_risk`
 * did after the risk endpoint stopped returning that field.
 *
 * A blank screen is the worst possible failure mode for this project: it looks
 * like nothing happened. The error is shown instead, with the message and the
 * component stack, so a failure is visible and diagnosable rather than silent.
 */

interface Props {
  children: React.ReactNode;
  /** Shown in the heading, e.g. the area that failed. */
  label?: string;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, componentStack: info.componentStack ?? null });
    // Still log it: the console stack is more useful than the rendered one.
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="p-6">
        <div className="max-w-3xl rounded-2xl border border-rose-300 bg-rose-50 p-6">
          <h2 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-2">
            {this.props.label ? `${this.props.label} failed to render` : 'Something failed to render'}
          </h2>
          <p className="text-sm font-mono text-rose-700 break-words mb-3">
            {error.message || String(error)}
          </p>

          {componentStack && (
            <details className="text-[11px]">
              <summary className="cursor-pointer font-bold text-rose-700">Component stack</summary>
              <pre className="mt-2 whitespace-pre-wrap text-rose-600 overflow-x-auto">
                {componentStack.trim()}
              </pre>
            </details>
          )}

          <button
            onClick={() => this.setState({ error: null, componentStack: null })}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
