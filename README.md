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
`GOOGLE_SERVICE_INFO_PLIST` points to it). The React Native Firebase app and
messaging config plugins configure Firebase initialization, Swift Package
Manager resolution, and dynamic framework linkage during iOS prebuild.
Remote notifications require a development or production build; Expo Go does not
include the required native Firebase modules.
Configure Android FCM in the Firebase project and APNs credentials for iOS in
EAS before testing remote notifications on physical devices. After adding the
files and credentials, rebuild the native app; changing Expo configuration does
not update an already-installed development build.

Configure the backend with a Firebase Admin service account using either
`GOOGLE_APPLICATION_CREDENTIALS` (a path available to the backend process) or
`FIREBASE_SERVICE_ACCOUNT_JSON` (the JSON credential supplied through a secure
environment variable). Do not commit Firebase service-account credentials.

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
