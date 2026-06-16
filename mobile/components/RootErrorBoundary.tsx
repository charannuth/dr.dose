import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Surfaces fatal JS errors on screen in TestFlight instead of a blank UI. */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Dr. Dose] fatal error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Dr. Dose hit an error</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.message}>{this.state.error.message}</Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#fff1f2',
    padding: 24,
    paddingTop: 72,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#9f1239',
  },
  scroll: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#881337',
    fontFamily: 'Menlo',
  },
});
