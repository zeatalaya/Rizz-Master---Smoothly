# Rizz Master — Smoothly

Verify your Tinder identity and find out if you're a certified **Rizz Master**.

Login through Tinder's web interface, and your stats are evaluated against the Rizz Master criteria — all running locally in a secure TEE (your token never leaves your machine).

## Rizz Master Criteria

| Criterion | Requirement |
|-----------|------------|
| Matches | 10+ |
| Conversations started with replies | 5+ |
| Likes received | 50+ |

Meet all three and you earn the **Rizz Master** badge.

## Quick Start

```bash
git clone https://github.com/zeatalaya/Rizz-Master---Smoothly.git
cd Rizz-Master---Smoothly
npm install
./start.sh
```

This starts the app at `http://localhost:3069` and opens your browser.

Click **"Verify with Tinder"** to login through Tinder's website. Your token is captured automatically and your stats are evaluated.

## Requirements

- Node.js 18+
- Chrome (for Tinder web login via Puppeteer)

## How It Works

1. Click "Verify with Tinder" — opens a Tinder login window
2. Login normally (Google, Facebook, or phone)
3. Auth token is captured and sealed in an encrypted session (AES-256)
4. Your Tinder stats are fetched and evaluated against the criteria
5. You see your result: Rizz Master or not (yet)

## Security (TEE Pattern)

- Auth token is encrypted at rest using iron-session (AES-256)
- httpOnly cookie — inaccessible to client-side JavaScript
- All API calls run locally from your machine — nothing goes through cloud servers
- Token never leaves your device

## Tech Stack

- Next.js 16 (App Router)
- Tinder v3 Protobuf Auth
- Puppeteer (browser-based login)
- iron-session (encrypted sessions)
- Tailwind CSS v4
