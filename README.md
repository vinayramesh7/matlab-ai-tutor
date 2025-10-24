# MATLAB AI Tutor Platform

A full-stack AI-powered tutoring platform for MATLAB courses. Professors can create courses, upload PDFs, and set teaching preferences. Students interact with an AI tutor (powered by Claude 3 Haiku) that uses the Socratic method to guide learning rather than giving direct answers.

## Features

- **For Professors:**
  - Create and manage courses
  - Upload course materials (PDFs)
  - Set teaching style, pace, and learning goals
  - Customize how the AI tutor interacts with students

- **For Students:**
  - Browse all available courses
  - Chat with AI tutor for each course
  - Get guided learning with references to course materials
  - Access MATLAB documentation links

- **AI Tutor:**
  - Uses Claude 3 Haiku for fast, cost-effective responses
  - Socratic method - guides students rather than giving direct answers
  - References uploaded PDFs and MATLAB documentation
  - Respects professor's teaching preferences

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **AI:** Anthropic Claude 3 Haiku
- **Authentication:** Supabase Auth

## Project Structure

```
matlab-ai-tutor/
├── backend/
│   ├── ai/
│   │   └── tutorAgent.js          # Claude AI tutor implementation
│   ├── config/
│   │   └── supabase.js            # Supabase client setup
│   ├── routes/
│   │   ├── courseRoutes.js        # Course CRUD endpoints
│   │   ├── chatRoutes.js          # Chat/tutoring endpoints
│   │   └── pdfRoutes.js           # PDF upload/management
│   ├── utils/
│   │   └── pdfEmbeddings.js       # PDF processing & search
│   ├── package.json
│   ├── server.js                  # Express server
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ProfessorDashboard.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── CourseCreation.jsx
│   │   │   └── ChatInterface.jsx
│   │   ├── services/
│   │   │   ├── supabase.js        # Supabase client & auth
│   │   │   └── api.js             # Backend API calls
│   │   ├── utils/
│   │   │   └── AuthContext.jsx    # React auth context
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── .env.example
└── supabase-schema.sql            # Database schema
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)
- Anthropic API key (free tier available)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd matlab-ai-tutor
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
4. Go to **Storage** and verify the `course-pdfs` bucket was created
5. Go to **Settings > API** and copy:
   - Project URL
   - `anon` `public` key

### 3. Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Go to **API Keys** and create a new key
4. Copy the API key (starts with `sk-ant-...`)

### 4. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Install dependencies:

```bash
npm install
```

### 5. Configure Frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:5000/api
```

Install dependencies:

```bash
npm install
```

### 6. Run Locally

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Deployment

### Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `matlab-tutor-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-key
   ANTHROPIC_API_KEY=your-key
   ```
6. Click **Create Web Service**
7. Copy your Render URL (e.g., `https://matlab-tutor-backend.onrender.com`)

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   VITE_API_URL=https://matlab-tutor-backend.onrender.com/api
   ```
6. Click **Deploy**
7. After deployment, go back to Render and update `FRONTEND_URL` to your Vercel URL

## Usage Guide

### For Professors

1. **Sign Up** as a professor
2. **Create a Course:**
   - Set course name and description
   - Choose teaching style (Socratic, Direct, Exploratory, Practical)
   - Set teaching pace (Slow, Moderate, Fast)
   - Define learning goals
3. **Upload PDFs:**
   - After creating course, click Edit
   - Upload course materials (PDFs)
   - These will be referenced by the AI tutor
4. **Manage Courses:**
   - Edit course settings anytime
   - Delete courses you no longer need

### For Students

1. **Sign Up** as a student
2. **Browse Courses:**
   - View all available courses on dashboard
   - See course descriptions and instructors
3. **Chat with AI Tutor:**
   - Click "Open Tutor Chat" on any course
   - Ask questions about MATLAB
   - The AI will guide you step-by-step
   - Get references to course materials
4. **Clear History:**
   - Start fresh conversations anytime

## AI Tutor Behavior

The AI tutor is designed to:

- **Guide, not solve:** Uses Socratic method to help students think critically
- **Ask questions back:** Encourages reasoning and understanding
- **Reference materials:** Cites uploaded PDFs and MATLAB docs
- **Respect teaching style:** Adapts to professor's preferences
- **Explain before showing code:** Teaches concepts first

Example interaction:

**Student:** "How do I create a matrix?"

**Tutor:** "Great question! Before we create a matrix, let's think about what a matrix represents in MATLAB. Have you worked with arrays or grids of numbers before in math class?"

## Free Tier Limits

- **Supabase:** 500MB database, 1GB storage
- **Anthropic:** $5 free credits (Claude 3 Haiku is very cost-effective)
- **Render:** Free tier with 750 hours/month (sleeps after inactivity)
- **Vercel:** 100GB bandwidth/month

## Troubleshooting

### Backend won't start
- Check `.env` file has all required variables
- Verify Supabase credentials are correct
- Run `npm install` in backend folder

### Frontend won't connect to backend
- Ensure backend is running on port 5000
- Check `VITE_API_URL` in frontend `.env`
- Check browser console for CORS errors

### Chat not working
- Verify Anthropic API key is valid
- Check backend logs for errors
- Ensure you have credits in Anthropic account

### PDF upload fails
- Verify Supabase Storage bucket `course-pdfs` exists
- Check file is a valid PDF and under 10MB
- Check Supabase Storage policies are set correctly

## Development

### Adding New Features

The codebase is modular and easy to extend:

- **New API endpoints:** Add to `backend/routes/`
- **New pages:** Add to `frontend/src/pages/`
- **New AI behavior:** Modify `backend/ai/tutorAgent.js`
- **Database changes:** Update `supabase-schema.sql`

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## License

MIT License - feel free to use for educational purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase logs
3. Check browser console for errors
4. Verify all environment variables are set

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with Claude Code