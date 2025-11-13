# Setting Up MATLAB Code Execution (Online - No Installation Required!)

This guide will help you set up online MATLAB/Octave code execution using the Judge0 API. **No need to install anything on your computer!**

## What is Judge0?

Judge0 is a free online code execution system that supports 60+ programming languages, including Octave (which is MATLAB-compatible). It runs your code in a secure sandbox environment in the cloud.

## Setup Steps (5 minutes)

### Step 1: Sign up for RapidAPI (Free)

1. Go to [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Click **"Sign Up"** in the top right (or "Log In" if you have an account)
3. Create a free account using email or Google/GitHub

### Step 2: Subscribe to Free Tier

1. After logging in, you'll be on the Judge0 API page
2. Click the **"Subscribe to Test"** button
3. Select the **"BASIC" plan** (it's FREE!)
   - 50 requests/day
   - Perfect for learning and testing
4. Click **"Subscribe"**

### Step 3: Get Your API Key

1. After subscribing, click on the **"Endpoints"** tab
2. You'll see your **X-RapidAPI-Key** in the code snippets on the right
3. Copy this key (it looks like: `1234567890abcdef1234567890abcdef12`)

### Step 4: Add API Key to Your Project

1. Open your `backend/.env` file
2. Add this line (replace with your actual key):
   ```
   RAPIDAPI_KEY=your-actual-api-key-here
   ```
3. Save the file

### Step 5: Restart Backend

```bash
cd backend
npm start
```

## ✅ Test It!

1. Go to your MATLAB editor in the app
2. Write some code:
   ```matlab
   for i = 1:5
       disp(i)
   end
   ```
3. Click **"Run"**
4. See the output appear below the editor! 🎉

## Free Tier Limits

The free "BASIC" plan includes:
- ✅ 50 code executions per day
- ✅ All programming languages (including Octave/MATLAB)
- ✅ 100% free forever
- ✅ No credit card required

This is more than enough for learning and practicing MATLAB!

## Supported MATLAB Features

Judge0 runs **GNU Octave**, which is 99% compatible with MATLAB. It supports:

✅ **Fully Supported:**
- All basic operations (+, -, *, /, ^)
- Matrices and arrays
- Loops (for, while)
- Conditionals (if, else, switch)
- Functions
- Mathematical functions (sin, cos, sqrt, etc.)
- Matrix operations (transpose, inverse, det, etc.)
- Plotting (though plots won't display in the online version)
- File I/O basics

❌ **Not Supported:**
- GUI components
- Simulink
- Some advanced toolboxes
- Real-time plot display

## Troubleshooting

**Error: "Code execution is not configured"**
- Make sure you added `RAPIDAPI_KEY` to your `.env` file
- Make sure you restarted the backend server
- Check that your API key is correct (no extra spaces)

**Error: "API request failed"**
- Check your internet connection
- Make sure you subscribed to the free tier on RapidAPI
- Verify your API key is still valid

**Code runs but no output**
- Make sure you're using `disp()` or `fprintf()` to print output
- Check that your code doesn't have infinite loops

## Upgrade Options (Optional)

If you need more than 50 requests/day:

- **PRO Plan**: $5/month for 500 requests/day
- **ULTRA Plan**: $20/month for 5000 requests/day
- **MEGA Plan**: $50/month for unlimited requests

For most learners, the **free tier is plenty!**

## Alternative: Local Installation

If you prefer to run code locally instead of using the API, see `SETUP_LOCAL_OCTAVE.md` for instructions on installing GNU Octave on your computer.

---

**Questions?** The Judge0 API is reliable and widely used by educational platforms. Your code runs securely in a sandbox and is never stored.
