# ADAPT: Automated Data Assessment for Professional Trajectories

## About the System

ADAPT (Automated Data Assessment for Professional Trajectories) is a web-based platform designed to bridge the gap between a job seeker's claimed qualifications and their actual capabilities. By replacing passive resume screening with active, automated skill verification, the system acts as an objective intermediary. It evaluates the truthfulness of a user's resume claims by testing their actual knowledge and skills.

Beyond evaluation, ADAPT serves as an intelligent career navigator. It provides upskilling recommendations and suggests alternative job opportunities mapped to the user's verified skills and geographic location.

## The Problem & Solution

**The Problem:** The labor ecosystem suffers from a "skills mismatch"—a disconnect between what applicants claim on paper and what they can actually execute. Traditional recruitment relies on unverified resumes, leading to inefficiencies and missed opportunities.

**The Solution:** ADAPT generates an objective "Claimed vs. Verified" report. It highlights specific skill gaps and provides targeted learning paths to make candidates more competitive.

## System Flow & Features

- **User Input:** Users upload their resume (PDF/DOCX) and select a preferred job or position.
- **Data Processing:** The system extracts key data like skills and experience. It automatically strips away sensitive personal information (name, email, phone number) to ensure data privacy.
- **Assessment Engine:** ADAPT generates targeted, AI-driven assessments to test the user's practical knowledge of their listed skills.
- **Evaluation Output:** The platform generates a comprehensive report comparing claimed skills against verified capabilities.
- **Job Fit Score:** Users receive a tailored percentage score indicating their fit for their preferred role.
- **Upskilling & Recommendations:** If a user fails a skill check, the platform provides direct links to courses and practice platforms.
- **Alternative Job Suggestions:** The system suggests alternative, accessible job roles based on the user's verified skills and location.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL
- **AI / Processing Layer:** Llama-3.3-70b-versatile and OpenAI GPT (Integrated via groq-sdk)

## Key Backend Dependencies

- **express:** Core server framework routing `/api/v1` endpoints
- **multer:** Used to get the file buffer through the HTTP request without strictly relying on fs.readFile
- **pdf2json:** Responsible for parsing uploaded PDF resumes
- **pg & pg-hstore:** PostgreSQL client for database connection and queries
- **jsonwebtoken & bcryptjs:** Used for secure user authentication and password hashing

## Database Schema Overview

The PostgreSQL database consists of several relational tables designed to manage user journeys:

- **users:** Stores core account details, location, and preferred job titles
- **files:** Tracks uploaded resumes linked to specific users
- **assessments:** Records the skill, priority, and job title being tested
- **questions & question_options:** Stores the AI-generated test material (Multiple Choice, True/False, Coding, Open Ended)
- **user_results:** Tracks individual answers, correctness, and scores
- **learning_paths & resources:** Houses the recommended courses, platforms, and step-by-step guides for upskilling

## Project Structure

```text
├── db/
│   └── db.js                   # Database connection and configuration
├── frontend-test/
│   ├── assets/
│   │   └── meoew.png           # Static images/assets
│   ├── assessment.html         # Assessment interface
│   ├── dashboard.html          # User dashboard
│   ├── index.html              # Main entry point (Frontend)
│   ├── jobs.html               # Job listings page
│   ├── landing.html            # Landing/Welcome page
│   ├── login.html              # Login interface
│   ├── profile.html            # User profile page
│   ├── results.html            # Assessment results view
│   ├── signin.html             # Registration/Sign-in page
│   ├── uiassessment.html       # UI-specific assessment
│   ├── uiresults.html          # UI-specific results
│   ├── verificationsystem.html # Verification logic/UI
│   └── view-assessment.html    # Review completed assessments
├── middleware/
│   └── auth.middleware.js      # Authentication & Authorization logic
├── routes/
│   ├── account.routes.js       # Express routes for user accounts
│   ├── assessment.routes.js    # Express routes for assessments
│   └── file.routes.js          # Express routes for file handling
├── src/
│   ├── config/
│   │   ├── groq.js             # Groq SDK configuration
│   │   ├── groq_prompt_... .md # Markdown templates for AI prompting
│   │   └── resources.js        # Static resource definitions
│   └── services/
│       ├── assessment.service.js # Business logic for assessments
│       ├── file.service.js       # Business logic for file processing
│       └── job-listings.js       # Logic for fetching/managing jobs
├── .gitignore                  # Files to exclude from Git
├── index.js                    # Main server entry point (Backend)
├── package.json                # Project dependencies and scripts
├── pgtableschema.sql           # PostgreSQL database schema
└── readme.md                   # Project documentation

## Getting Started (Quick Setup)

### Step 1: Get API Keys
Contact the project owner to request the following private API keys:
- **GROQ_API_KEY** — Required for AI assessment generation
- **DB_PASSWORD** — PostgreSQL database password

### Step 2: Create Environment File
Create a `.env` file in the root directory and add:

```env
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=adapt_db
DB_PASSWORD=<REQUEST_FROM_OWNER>
JWT_SECRET=<REQUEST_FROM_OWNER>
GROQ_API_KEY=<REQUEST_FROM_OWNER>
```

### Step 3: Install & Run
```bash
npm install
npm start
```

### Step 4: Test the System
1. Open your browser
2. Go to: `http://localhost:3000/frontend-test/login.html`
3. Create a new account or use test credentials
4. Follow the system prompts to test the assessment workflow

That's it! You're ready to explore ADAPT.

## Environment Variables Reference

For detailed information about environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `adapt_db` |
| `DB_PASSWORD` | Database password | `*request from owner*` |
| `JWT_SECRET` | Secret key for tokens | `*request from owner*` |
| `GROQ_API_KEY` | Groq AI API key | `*request from owner*` |

## Project Team

- **Project Manager:** Valderrama, Mark Harold T. | HAU - Overall project coordination, timeline management, stakeholder communication, and delivery oversight
- **UI/UX:** Almanzor, Keith Ryan N. | HAU - User interface design, user experience research, wireframing, prototyping, and design system management
- **Front-End:** Yumul, Randel Angelo L. | HAU, Almanzor, Keith Ryan N. | HAU - HTML/CSS/JavaScript development, responsive design implementation, frontend testing, and client-side logic
- **Back-End:** Sagmit, Herince Ien B. | PSU - Node.js/Express server development, API endpoint creation, database management, authentication, and server-side business logic
- **AI/Processing Layer:** Yabut, Jayebriel S. | PSU - AI model integration (Groq SDK), prompt engineering, resume parsing, assessment generation, and NLP-driven recommendations

