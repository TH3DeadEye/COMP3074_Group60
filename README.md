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

## How the data works

Each signed-in driver only ever sees their own data, and the app updates live when anything changes in Firestore.

| Collection | What it holds | What a driver can do |
| --- | --- | --- |
| `drivers/{uid}` | truck, truck type, shift | read |
| `pickups/{id}` | one pickup for one day | read; change `status` only |
| `pickupEvents/{id}` | the audit log: one row per status change (who, what, when) | read; add rows, never edit or delete |

- **First sign-in:** if a driver has no pickups for today, the app files six demo pickups and their starting history under their account. This is a stand-in for dispatch. The `create` rules for `drivers` and `pickups` exist only for this and would be removed once a back end creates pickups.
- **Status changes:** marking a pickup in progress, completed or missed updates the pickup and adds an audit-log row in a single atomic write. The pickup's "Status history" is built from those rows.
- **Offline:** Firestore shows changes on screen straight away, but this version has no persistent offline queue yet, so a change made offline is lost if the app is closed before reconnecting.

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
  data/model.ts      shared types and date helpers
  firebase.ts        Firebase app, auth and Firestore setup
  theme.ts           colors, fonts and text styles
firestore.rules      Firestore security rules
firebase.json        rules deploy and emulator config
```
