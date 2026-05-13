import type { ExpoConfig } from 'expo/config';

// ============================================================
// COACH DM — Expo App Config (Production)
// Path: apps/mobile/app.config.production.ts
// ============================================================

const config: ExpoConfig = {
  name: 'Coach DM',
  slug: 'coachdm-app',
  scheme: 'coachdm',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  primaryColor: '#D4AF37',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A',
  },
  assetBundlePatterns: ['**/*'],
  newArchEnabled: true,
  jsEngine: 'hermes',
  locales: {
    fr: './locales/fr.json',
    en: './locales/en.json',
    nl: './locales/nl.json',
  },
  ios: {
    bundleIdentifier: 'be.coachdm.app',
    buildNumber: '1',
    supportsTablet: true,
    requireFullScreen: false,
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: 'fr',
      CFBundleLocalizations: ['fr', 'en', 'nl'],
      NSCameraUsageDescription:
        'Coach DM utilise la caméra pour scanner les codes-barres alimentaires et prendre tes photos de check-in.',
      NSPhotoLibraryUsageDescription:
        'Coach DM accède à tes photos pour les photos de progression check-in.',
      NSPhotoLibraryAddUsageDescription:
        'Coach DM sauvegarde tes photos de progression dans ta galerie.',
      NSHealthShareUsageDescription:
        'Coach DM lit tes données Apple Health (sommeil, HRV, fréquence cardiaque) pour calculer ton score de récupération quotidien.',
      NSHealthUpdateUsageDescription:
        'Coach DM enregistre tes séances dans Apple Health.',
      NSMotionUsageDescription:
        'Coach DM lit tes données de mouvement pour les statistiques d\'activité.',
      NSUserNotificationsUsageDescription:
        'Coach DM t\'envoie des rappels pour tes séances, ta mobilité et tes check-ins.',
      NSLocalNetworkUsageDescription:
        'Coach DM accède au réseau local pour la synchronisation des wearables.',
      UIBackgroundModes: ['fetch', 'remote-notification'],
      LSApplicationQueriesSchemes: ['mailto', 'https', 'tel'],
    },
    associatedDomains: [
      'applinks:app.coachdm.be',
      'applinks:coachdm.be',
    ],
    entitlements: {
      'com.apple.developer.healthkit': true,
      'com.apple.developer.healthkit.access': [],
      'aps-environment': 'production',
    },
  },
  android: {
    package: 'be.coachdm.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0A0A',
    },
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'POST_NOTIFICATIONS',
      'WAKE_LOCK',
      'VIBRATE',
      'ACTIVITY_RECOGNITION',
      'BODY_SENSORS',
      'com.google.android.gms.permission.AD_ID',
    ],
    blockedPermissions: [
      'READ_PHONE_STATE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
    ],
    googleServicesFile: './google-services.json',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'app.coachdm.be' },
          { scheme: 'coachdm' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-localization',
    'expo-secure-store',
    'expo-notifications',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
          useFrameworks: 'static',
        },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: 'coachdm',
        project: 'coachdm-mobile',
        url: 'https://sentry.io/',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Coach DM utilise la caméra pour scanner les codes-barres alimentaires.',
      },
    ],
    [
      'expo-health-connect',
      {
        package: 'be.coachdm.app',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Coach DM accède à tes photos pour les check-ins de progression.',
        cameraPermission:
          'Coach DM utilise la caméra pour tes check-ins.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '__REPLACE_WITH_EAS_PROJECT_ID__',
    },
  },
  owner: 'coachdm',
  updates: {
    url: 'https://u.expo.dev/__REPLACE_WITH_EAS_PROJECT_ID__',
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
};

export default config;
