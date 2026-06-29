import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.truthswipe.app',
  appName: 'Skillful',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
