# DUMPLO Driver

Mobile app for DUMPLO truck drivers, built for COMP 3074 (Group 60). A driver signs in, sees the day's pickups, opens one to get the details and directions, and marks it in progress, completed or missed.

This is a prototype. Sign-in uses Firebase Authentication (email and password) and pickups live in Cloud Firestore. There is no dispatch back end yet, so each driver's demo pickups are created for them the first time they sign in.

## Tech

- Expo + React Native
- TypeScript
- Expo Router (file-based routing)
- react-native-svg for icons and the route map
- Firebase Authentication and Cloud Firestore (JS SDK)

## Getting started

You need Node 20+ and npm.

1. Put `google-services.json` (Firebase console > Project settings > Your apps > Android app) in the project root. The app reads its Firebase config from this file.
2. In the Firebase console, enable **Authentication > Sign-in method > Email/Password**.
3. In the console, create the database: **Build > Firestore Database > Create database** (the `(default)` database; pick a region such as Toronto, `northamerica-northeast2`).
4. Publish the security rules in `firestore.rules`. Either paste the file into **Firestore Database > Rules** and press **Publish**, or from the project folder run `npx firebase-tools login` and then `npx firebase-tools deploy --only firestore:rules`. Without this the app shows a "permission denied" banner on the Today screen.
5. Create an account with **Create an account** on the login screen (or under **Authentication > Users > Add user** in the console).

```bash
npm install
npx expo start
```

From there press `a` for an Android emulator, `i` for the iOS simulator, `w` for web, or scan the QR code with Expo Go.

To build and run the native Android app:

```bash
npm run android
```

## Liquid glass

The login card, tab bar and a few accents use a glass look that depends on the device:

| Where | What you get |
| --- | --- |
| iOS 26 or later | Apple's real liquid glass (`expo-glass-effect`) |
| Android 13+ in a development build (`npm run android`) | A shader-based glass (`@uginy/react-native-liquid-glass`) with refraction and edge glow |
| Expo Go, older iOS/Android, or Reduce Transparency on | A plain translucent panel in the same shape |

The Android library is native code, so after pulling this change run `npm run android` once to rebuild. It is excluded from iOS builds on purpose.

## How the data works

Each signed-in driver only ever sees their own data, and the app updates live when anything changes in Firestore.

| Collection | What it holds | What a driver can do |
| --- | --- | --- |
| `drivers/{uid}` | truck, truck type, shift | read |
| `pickups/{id}` | one pickup for one day | read; change `status` only |
| `pickupEvents/{id}` | the audit log: one row per status change (who, what, when) | read; add rows, never edit or delete |

- **First sign-in:** if a driver has no pickups for today, the app files six demo pickups and their starting history under their account. This is a stand-in for dispatch. The `create` rules for `drivers` and `pickups` exist only for this and would be removed once a back end creates pickups.
- **Status changes:** marking a pickup in progress, completed or missed updates the pickup and adds an audit-log row in a single atomic write. The pickup's "Status history" is built from those rows.
- **Offline:** a status change is saved on the phone first and shown straight away, marked "Waiting to sync". It is sent as soon as there is a connection, oldest first, even if the app was closed in between. Each change keeps the time the driver made it, and sending the same change twice can't create a duplicate audit row. The Today chip shows "N waiting" or "Offline", and the Profile card explains the state. Signing out with changes still waiting keeps them for that account's next sign-in.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Build and run on Android |
| `npm run web` | Run in the browser |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run lint` | Lint with ESLint |

## Screens

1. **Login** – work email and password
   - **Sign up** – name, work email and password (linked from the login screen)
2. **Today** – the day's pickups, what's up next, and sync status
3. **Pickup details** – address, time window, job type, notes and history
4. **Route map** – all of today's stops on a map
5. **Update status** – bottom sheet to mark a pickup in progress, completed or missed
6. **Profile** – driver info, assigned truck, shift and sign out

## Project structure

```
src/
  app/               screens (Expo Router)
    index.tsx        login
    (tabs)/          today, map, profile
    pickup/[id]/     pickup details and status sheet
  components/        Icon, TabBar and shared UI pieces
  data/auth.tsx      auth context (sign in, sign out, session)
  data/pickups.tsx   pickups store: live Firestore subscriptions behind usePickups()
  data/pickupsRepo.ts  Firestore reads and writes (seed, status update + audit log)
  data/seed.ts       the demo pickups
  data/syncQueue.ts  offline queue logic (order, retries, what to show while waiting)
  data/queueStorage.ts  saves the queue on the phone
  data/useOnline.ts  online/offline hook
  data/model.ts      shared types and date helpers
  firebase.ts        Firebase app, auth and Firestore setup
  theme.ts           colors, fonts and text styles
firestore.rules      Firestore security rules
firebase.json        rules deploy and emulator config
```
