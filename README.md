# DUMPLO Driver

Mobile app for DUMPLO truck drivers, built for COMP 3074 (Group 60). A driver signs in, sees the day's pickups, opens one to get the details and directions, and marks it in progress, completed or missed.

This is a UI prototype. Sign-in uses Firebase Authentication (email and password). Pickup data is still mocked in the app.

## Tech

- Expo + React Native
- TypeScript
- Expo Router (file-based routing)
- react-native-svg for icons and the route map
- Firebase Authentication (JS SDK) for driver sign-in

## Getting started

You need Node 20+ and npm.

1. Put `google-services.json` (Firebase console > Project settings > Your apps > Android app) in the project root. The app reads its Firebase config from this file.
2. In the Firebase console, enable **Authentication > Sign-in method > Email/Password**.
3. Create an account with **Create an account** on the login screen (or under **Authentication > Users > Add user** in the console).

```bash
npm install
npx expo start
```

From there press `a` for an Android emulator, `i` for the iOS simulator, `w` for web, or scan the QR code with Expo Go.

To build and run the native Android app:

```bash
npm run android
```

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
  data/pickups.tsx   mock pickups and the pickups store
  theme.ts           colors, fonts and text styles
```
