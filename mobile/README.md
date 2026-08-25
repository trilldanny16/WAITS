# WAITS Mobile

Native Expo/React Native client for WAITS. The existing Next.js app remains the web prototype and backend-facing preview.

## Current checkpoint

- Expo SDK 57 with Expo Router and a five-tab native shell
- EAS development, preview, and production cloud-build profiles
- Persistent Supabase Auth session client
- Adapty React Native initialization with advertising identifiers disabled
- iOS 16.4 minimum (required by Expo SDK 57) and Sign in with Apple capability declared

## Before the first device build

1. Copy `.env.example` to `.env` and add only the Supabase publishable key and Adapty public SDK key. Never add service-role or Adapty secret keys.
2. Confirm `com.waitsapp.waits` is the permanent bundle identifier before the first TestFlight upload.
3. Run `eas init` and replace `REPLACE_AFTER_EAS_INIT` in `app.json` with the generated EAS project ID.
4. Run `eas build --platform ios --profile development` after Apple Developer enrollment is active and the test iPhone is registered.

Expo Go can display mock subscription behavior, but real Adapty purchases require the EAS development client.

