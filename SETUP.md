# Quick Setup Guide

## Prerequisites

Before running this application, you need to install:

1. **Node.js** (version 18 or higher)

   - Download from: https://nodejs.org/
   - Or install via package manager:
     - macOS: `brew install node`
     - Ubuntu/Debian: `sudo apt install nodejs npm`
     - Windows: Use the installer from nodejs.org

2. **Git** (if not already installed)
   - macOS: `brew install git`
   - Ubuntu/Debian: `sudo apt install git`
   - Windows: Download from https://git-scm.com/

## Installation Steps

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Set up Environment Variables**

   ```bash
   cp env.example .env.local
   ```

   Then edit `.env.local` with your API keys (see API Keys section below).

3. **Initialize Database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Open Application**
   Visit `http://localhost:3000` in your browser.

## API Keys Required

### 1. Google OAuth (Required)

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project
- Enable Google Calendar API
- Create OAuth 2.0 credentials
- Add `webshookeng@gmail.com` as a test user
- Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### 2. OpenAI API Key (Required for AI features)

- Sign up at [OpenAI](https://platform.openai.com/)
- Generate an API key
- Add to `.env.local` as `OPENAI_API_KEY`

### 3. Recall.ai API Key (Required for meeting recording)

- Sign up at [Recall.ai](https://www.recall.ai/)
- Get your API key from the dashboard
- Add to `.env.local` as `RECALL_API_KEY`

### 4. LinkedIn OAuth (Optional, for LinkedIn posting)

- Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
- Create a new app
- Add redirect URI: `http://localhost:3000/api/auth/callback/linkedin`

### 5. Facebook OAuth (Optional, for Facebook posting)

- Go to [Facebook Developers](https://developers.facebook.com/)
- Create a new app
- Add Facebook Login product
- Add redirect URI: `http://localhost:3000/api/auth/callback/facebook`

## Quick Start (Minimal Setup)

If you just want to see the UI without full functionality:

1. Install dependencies: `npm install`
2. Set up database: `npx prisma generate && npx prisma db push`
3. Create `.env.local` with at least:
   ```
   NEXTAUTH_SECRET="your-secret-key-here"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```
4. Run: `npm run dev`
5. Visit: `http://localhost:3000`

## Troubleshooting

### Node.js not found

- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### Database errors

- Make sure SQLite is available (usually comes with Node.js)
- Try deleting `prisma/dev.db` and running `npx prisma db push` again

### OAuth errors

- Make sure redirect URIs match exactly
- Check that OAuth apps are properly configured
- Verify API keys are correct

### Port already in use

- Change the port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

## Features Overview

Once set up, the application provides:

1. **Calendar Integration**: Sync Google Calendar events
2. **AI Notetaker**: Automatic meeting recording and transcription
3. **Content Generation**: AI-powered social media posts and emails
4. **Social Media**: Post directly to LinkedIn and Facebook
5. **Automations**: Custom rules for content generation
6. **Settings**: Configure bot timing and API keys

## Support

For issues or questions:

1. Check the main README.md for detailed documentation
2. Verify all API keys are correctly set
3. Ensure all OAuth redirect URIs are properly configured
4. Check the browser console for error messages
