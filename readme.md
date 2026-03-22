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

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
DB_USER=<your_db_user>
DB_HOST=<your_db_host>
DB_NAME=<your_db_name>
JWT_SECRET=<your_jwt_secret>
```

## Project Team

- **Project Manager:** Valderrama, Mark Harold T. | HAU - Overall project coordination, timeline management, stakeholder communication, and delivery oversight
- **UI/UX:** Almanzor, Keith Ryan N. | HAU - User interface design, user experience research, wireframing, prototyping, and design system management
- **Front-End:** Yumul, Randel Angelo L. | HAU, Almanzor, Keith Ryan N. | HAU - HTML/CSS/JavaScript development, responsive design implementation, frontend testing, and client-side logic
- **Back-End:** Sagmit, Herince Ien B. | PSU - Node.js/Express server development, API endpoint creation, database management, authentication, and server-side business logic
- **AI/Processing Layer:** Yabul, Jayebriel S. | PSU - AI model integration (Groq SDK), prompt engineering, resume parsing, assessment generation, and NLP-driven recommendations

