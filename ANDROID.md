# Android Build Notes

This project is configured with Capacitor:

- App ID: `com.loandash.app`
- App name: `LoanDash`
- Web output: `dist`
- Native project: `android`

## Build Steps

1. Install JDK 17 or newer.
2. Set `JAVA_HOME` to the JDK folder and add `%JAVA_HOME%\bin` to `PATH`.
3. Install Android Studio and at least one Android SDK platform.
4. Run:

```bash
npm run build
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

The generated APK path is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Current Machine Status

The Android project was generated successfully, but APK compilation cannot run on this machine yet because Java is not installed or not configured on `PATH`.
