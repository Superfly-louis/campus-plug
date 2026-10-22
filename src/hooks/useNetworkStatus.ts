import { useNetworkState } from 'expo-network';

export function useNetworkStatus() {
  const state = useNetworkState();
  const offline = state.isConnected === false || state.isInternetReachable === false;
  return {
    offline,
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
  };
}
