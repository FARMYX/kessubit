import React from 'react';
import { FatalErrorScreen } from './FatalErrorScreen';

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: string | null };

/** Catches render/lifecycle errors anywhere under the root providers. */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[KESUUBIT] render error', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private retry = () => this.setState({ error: null, componentStack: null });

  render() {
    if (this.state.error) {
      return (
        <FatalErrorScreen
          error={this.state.error}
          componentStack={this.state.componentStack}
          retry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}
