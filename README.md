# PayMeJunior

An intelligent expense report generator that processes receipt images and creates SAP Concur-ready Excel expense reports. Available as a CLI tool and a mobile app.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Mobile App        │         │   Backend API       │
│   (React Native)    │◄───────►│   (FastAPI/Python)  │
│                     │         │   Hosted on Railway │
└─────────┬───────────┘         └──────────┬──────────┘
          │                                │
          │         ┌──────────────────────┘
          │         │
          ▼         ▼
┌─────────────────────────────────────────────────────┐
│                    Supabase                          │
│     Storage (receipts)  │  Database (expenses)       │
└─────────────────────────────────────────────────────┘
```

## Features

- Automatically extracts expense data from receipt images using Claude Vision AI
- Supports multiple image formats (JPG, PNG, PDF, etc.)
- Generates SAP Concur-compatible Excel reports
- Categorizes expenses automatically
- Handles multiple currencies
- Provides expense summaries by category and currency
- **Mobile app** for iOS/Android with photo library integration
- **Cloud storage** for receipts and expense data persistence

---

## Mobile App Setup

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Railway account (for backend hosting)

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration to create tables:
   - Go to SQL Editor in Supabase Dashboard
   - Copy and run the contents of `supabase/migrations/001_create_tables.sql`
3. Create a storage bucket:
   - Go to Storage → Create new bucket
   - Name: `receipts`
   - Make it public (for image display in app)
4. Note your **Project URL** and **anon public key** from Settings → API

### 2. Backend Setup (Railway)

1. Push the `backend/` folder to a GitHub repo
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Set environment variables in Railway:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```
5. Deploy and note your Railway URL (e.g., `https://your-app.railway.app`)

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

Edit `.env` with your values:
```
EXPO_PUBLIC_API_URL=https://your-app.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the App

```bash
# Start Expo development server
npx expo start

# Run on iOS Simulator
npx expo start --ios

# Run on Android Emulator
npx expo start --android
```

---

## CLI Tool (Original)

The original command-line tool is still available for batch processing.

### Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY='your-api-key'
```

### Usage

```bash
# Process receipts in current folder
python paymejunior_agent.py

# Process receipts in specific folder
python paymejunior_agent.py /path/to/receipts
```

### Output

The agent will:
1. Scan all receipt images in the folder
2. Extract expense information from each receipt
3. Generate an `expense_report.xlsx` file ready for SAP Concur upload
4. Display a summary of expenses by category and currency

---

## API Endpoints

The backend API provides the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/receipts/process` | Process multiple receipt images |
| POST | `/api/v1/receipts/process-single` | Process a single receipt |
| GET | `/api/v1/reports` | List all expense reports |
| POST | `/api/v1/reports` | Create a new report |
| GET | `/api/v1/reports/{id}/expenses` | Get expenses for a report |
| POST | `/api/v1/reports/{id}/excel` | Generate Excel file |
| GET | `/api/v1/reports/{id}/summary` | Get expense summary |

---

## SAP Concur Excel Format

The generated Excel file includes:
- Expense Date
- Merchant/Vendor
- Description
- Expense Type (Category)
- Amount
- Currency
- Payment Type
- City
- Receipt File Reference

## Supported Expense Categories

- Meals
- Transportation
- Office Supplies
- Entertainment
- Lodging
- Other

---

## Project Structure

```
PayMeJunior/
├── backend/                 # FastAPI backend (deploy to Railway)
│   ├── app/
│   │   ├── main.py         # API entry point
│   │   ├── routers/        # API endpoints
│   │   └── services/       # Business logic
│   └── requirements.txt
├── mobile/                  # React Native app (Expo)
│   ├── app/                # Screens (Expo Router)
│   ├── services/           # API & Supabase clients
│   └── stores/             # State management
├── supabase/               # Database migrations
├── paymejunior_agent.py    # Original CLI tool
└── README.md
```
