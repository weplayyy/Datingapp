import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.charm.dating',
  appName: 'Charm',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
