# Post-Meeting Social Media Content Generator

A comprehensive application that helps financial advisors automatically generate social media content from their meeting transcripts using AI.

## Features

- **Google Calendar Integration**: Connect multiple Google accounts and sync upcoming meetings
- **AI Notetaker**: Automatically send Recall.ai bots to record and transcribe meetings
- **Content Generation**: AI-powered generation of follow-up emails and social media posts
- **Social Media Integration**: Connect LinkedIn and Facebook accounts for automated posting
- **Custom Automations**: Configure how AI generates content for different platforms
- **Meeting Management**: View past meetings, transcripts, and generated content

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development)
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenAI GPT-4 for content generation
- **Meeting Recording**: Recall.ai integration
- **Social Media**: LinkedIn and Facebook APIs

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `env.example` to `.env.local` and fill in your API keys:

```bash
cp env.example .env.local
```

Required environment variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# LinkedIn OAuth
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

# Facebook OAuth
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Recall.ai
RECALL_API_KEY="your-recall-api-key"
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add `webshookeng@gmail.com` as a test user
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`

### LinkedIn OAuth

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback/linkedin`
4. Request required permissions: `r_liteprofile`, `r_emailaddress`, `w_member_social`

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Add redirect URI: `http://localhost:3000/api/auth/callback/facebook`
5. Request required permissions: `pages_manage_posts`, `pages_read_engagement`

## Recall.ai Setup

1. Create a free account at [Recall.ai](https://www.recall.ai/)
2. Get your API key from the dashboard
3. The app uses shared bot IDs to avoid conflicts
4. Update the `SHARED_BOT_IDS` array in `lib/recall.ts` with actual bot IDs

## Usage

### 1. Sign In

- Use Google OAuth to sign in
- The app will automatically sync your calendar events

### 2. Configure Settings

- Go to Settings tab
- Add your OpenAI and Recall.ai API keys
- Connect your LinkedIn and Facebook accounts
- Set how many minutes before meetings the bot should join

### 3. Manage Meetings

- View upcoming meetings in the "Upcoming Meetings" tab
- Toggle notetaker on/off for each meeting
- The bot will automatically join enabled meetings

### 4. Generate Content

- Go to "Past Meetings" tab after meetings are completed
- Click on a meeting to view details
- Generate follow-up emails and social media posts
- Copy or post content directly to social media

### 5. Create Automations

- Go to "Automations" tab
- Create custom automation rules for different platforms
- Define how AI should generate content for each platform

## API Endpoints

### Meetings

- `GET /api/meetings` - Get all meetings
- `POST /api/meetings` - Update meeting settings
- `POST /api/meetings/sync` - Sync calendar events
- `GET /api/meetings/[id]` - Get meeting details
- `POST /api/meetings/[id]` - Process transcript or generate content

### Automations

- `GET /api/automations` - Get all automations
- `POST /api/automations` - Create automation
- `PUT /api/automations/[id]` - Update automation
- `DELETE /api/automations/[id]` - Delete automation

### Settings

- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

## Database Schema

The app uses Prisma with SQLite and includes the following main models:

- **User**: User accounts and authentication
- **Meeting**: Calendar events and meeting data
- **SocialPost**: Generated social media content
- **Automation**: Custom content generation rules
- **SocialAccount**: Connected social media accounts
- **UserSettings**: User preferences and API keys

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
