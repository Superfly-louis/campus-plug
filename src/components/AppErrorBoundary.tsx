import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.md,
          backgroundColor: colors.background,
        }}
      >
        <Text style={typography.h1}>Something broke</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>{this.state.error.message}</Text>
        <Button label="Try again" onPress={this.reset} />
      </View>
    );
  }
}

export { AppErrorBoundary as ErrorBoundary };
