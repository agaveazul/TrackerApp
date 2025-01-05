# TrackerApp

A mobile app for tracking daily activities and sharing progress with friends. Built with React Native, Expo, Firebase, and NativeWind.

## Features

- 📊 Track daily activities with increment/decrement counters
- 📱 Beautiful, native UI with Tailwind styling
- 🔥 Real-time updates with Firebase
- 🤝 Share trackers with friends
- 📈 View historical data
- 🔒 Secure authentication

## Tech Stack

- React Native
- Expo Router
- Firebase (Auth, Firestore)
- NativeWind (TailwindCSS)
- TypeScript

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- Firebase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/TrackerApp.git
cd TrackerApp
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a Firebase project and add your config:

   - Create a new project in Firebase Console
   - Enable Authentication and Firestore
   - Copy your Firebase config
   - Update `lib/firebase.ts` with your config values

4. Start the development server:

```bash
npm start
# or
yarn start
```

5. Run on your device or simulator:
   - Press 'i' for iOS simulator
   - Press 'a' for Android emulator
   - Scan QR code with Expo Go app for physical device

## Project Structure

```
TrackerApp/
├── app/                    # App screens and navigation
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── tracker/           # Tracker detail screens
├── components/            # Reusable components
├── context/              # React Context providers
├── lib/                  # Utilities and configurations
└── types/               # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
