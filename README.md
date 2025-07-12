# Āera Mobile - Journal App

A beautiful mobile journaling app built with Expo and React Native, featuring AI-powered insights and voice recording capabilities.

## Features

- 🎙️ Voice recording with transcription
- 📱 Beautiful, responsive mobile UI
- 🤖 AI-powered dimension analysis
- 💡 Recurring theme insights
- 🔐 Secure authentication with Supabase
- 📊 Journal entry management
- 🎨 Dark theme with gradient accents

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator or Android Emulator (or Expo Go app on your device)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aera-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Start the development server:
```bash
npx expo start
```

5. Open the app:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan the QR code with Expo Go app on your device

## Project Structure

```
aera-mobile/
├── app/                    # App screens (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── record.tsx     # Voice recording screen
│   │   ├── journals.tsx   # Journal entries list
│   │   └── insights.tsx   # AI insights screen
│   ├── auth.tsx           # Authentication screen
│   ├── index.tsx          # App entry point
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
│   ├── Button.tsx         # Custom button component
│   ├── Card.tsx           # Card container component
│   └── RecordSlider.tsx   # Voice recording slider
├── lib/                   # Core logic and utilities
│   ├── auth.tsx           # Authentication context
│   ├── supabase.ts        # Supabase client and helpers
│   └── gemini.ts          # AI analysis functions
└── assets/               # Images and static assets
```

## Key Features

### Voice Recording
- Slide-to-record interface
- Real-time duration tracking
- Pause/resume functionality
- Word count estimation

### AI Analysis
- Dimension-based content analysis
- Recurring theme detection
- Prominence scoring
- Quote extraction

### Journal Management
- Entry listing and viewing
- Date-based organization
- Search and filtering
- Export capabilities

## Technologies Used

- **Expo SDK 53** - React Native framework
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **Supabase** - Backend and authentication
- **React Native Reanimated** - Smooth animations
- **Expo Linear Gradient** - Beautiful gradients
- **Expo AV** - Audio recording
- **Vector Icons** - Consistent iconography

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

### Environment Variables

Required environment variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.