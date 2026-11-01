# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Push notifications

Notifications for new events and followed poets' posts are stored for signed-in
users and delivered through Firebase Cloud Messaging when Firebase is configured.
Add `google-services.json` to the project root (or set `GOOGLE_SERVICES_JSON` to
its path). Its Android package name must match `expo.android.package` in
`app.json`. Expo prebuild configures the Google Services Gradle plugin and
Firebase Android BoM for Android; generated native files should not be edited
directly. iOS Firebase uses the bundle ID `Mawaddat.App.Ios` and is enabled
when `GoogleService-Info.plist` is present in the project root (or
`GOOGLE_SERVICE_INFO_PLIST` points to it). The React Native Firebase app, auth,
and messaging config plugins configure Firebase initialization, Swift Package
Manager resolution, and dynamic framework linkage during iOS prebuild.
Remote notifications require a development or production build; Expo Go does not
include the required native Firebase modules.
Configure Android FCM in the Firebase project and APNs credentials for iOS in
EAS before testing remote notifications on physical devices. After adding the
files and credentials, rebuild the native app; changing Expo configuration does
not update an already-installed development build.

Email/password and Google authentication use Firebase Authentication. New
email/password accounts receive a Firebase verification link; after verification,
the app exchanges a Firebase ID token with the backend, which creates or links
the MongoDB user and issues the app session token. Password reset links are sent
by Firebase rather than the backend SMTP service.

Google sign-in uses Android Credential Manager through
`react-native-nitro-google-signin`. Both Google Credential Manager and Firebase
Auth are native modules and require a development or production build; neither
is included in Expo Go or older installed builds. The Web OAuth client ID from
the Google sign-in configuration is used by default; override it with
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` for app builds and `GOOGLE_WEB_CLIENT_ID`
for the backend if needed. Register the Android app (`Mawaddat.App`) with both
the development/debug and release signing certificate SHA-1 fingerprints in
Google Cloud or Firebase, then use the resulting updated `google-services.json`.
Build and install the Android development app with
`npx eas-cli@latest build --profile development --platform android`, then start
Metro with `npx expo start --dev-client`.

Configure the backend with a Firebase Admin service account using either
`GOOGLE_APPLICATION_CREDENTIALS` (a path available to the backend process) or
`FIREBASE_SERVICE_ACCOUNT_JSON` (the JSON credential supplied through a secure
environment variable), and set `FIREBASE_PROJECT_ID` to the Firebase project
ID. The backend verifies Firebase ID tokens at `/api/auth/firebase` before
creating MongoDB user records. Do not commit Firebase service-account credentials.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
