import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loandash.app',
  appName: 'LoanDash',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0B0F1A',
    allowMixedContent: true,
    overrideUserAgent: undefined,
    appendUserAgent: undefined,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0E1324',
    },
  },
};

export default config;
