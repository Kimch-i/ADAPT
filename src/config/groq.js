import { Groq } from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateTargetSkills(jobTitle, claimedSkills) {
    const prompt = `Identify exactly 4 critical, timely, must-have skills for a ${jobTitle} that are NOT listed in the following claimed skills: ${JSON.stringify(claimedSkills)}.
Return ONLY a valid JSON object with a single key "skills" containing an array of exactly 4 strings. Do not include any other text or markdown. Example: {"skills": ["skill1", "skill2", "skill3", "skill4"]}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [ { "role": "user", "content": prompt } ],
            "model": "openai/gpt-oss-safeguard-20b",
            "temperature": 0.2,
            "response_format": { "type": "json_object" }
        });
        
        const content = chatCompletion.choices[0]?.message?.content;
        return JSON.parse(content || '{"skills": []}').skills;
    } catch (err) {
        console.error("Groq generation failed for openai model:", err);
        throw err;
    }
}

export async function generateAssessment(jobTitle, skills, type = 'claimed', resumeText = null) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    let promptFile = 'groq_prompt_claimed.md';
    let assessmentSkills = skills;

    if (type === 'target') {
        promptFile = 'groq_prompt_target.md';
        // Intercept skills using the custom model before generating questions
        assessmentSkills = await generateTargetSkills(jobTitle, skills);
    }
    
    const promptPath = path.join(__dirname, promptFile);

    const promptTemplate = await fs.readFile(promptPath, 'utf-8');

    let prompt = promptTemplate.replace(/{job_title}/g, jobTitle);
    prompt = prompt.replace(/{skills}/g, JSON.stringify(assessmentSkills));

    // If resume text is provided, inject it directly into the prompt
    if (resumeText) {
        prompt = prompt.replace(/{resume_text}/g, resumeText);
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "system",
                    "content": prompt
                },
                {
                    "role": "user",
                    "content": resumeText 
                        ? "Here is the candidate's resume. Please extract their skills and generate the assessment."
                        : "Please generate the assessment."
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.2,
            "max_completion_tokens": 15491,
            "top_p": 1,
            "stream": false,
            "response_format": { "type": "json_object" }
        });

        const content = chatCompletion.choices[0]?.message?.content;
        return JSON.parse(content || '{}');
    } catch (err) {
        console.error("Groq generation failed for llama model:", err);
        throw err;
    }
}

export async function generateLearningPath(jobTitle, assessmentResults) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const promptPath = path.join(__dirname, 'groq_prompt_learning_path.md');

    const promptTemplate = await fs.readFile(promptPath, 'utf-8');

    let prompt = promptTemplate.replace(/{target_job_title}/g, jobTitle);
    prompt = prompt.replace(/{assessment_results}/g, JSON.stringify(assessmentResults));

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.2,
            "max_completion_tokens": 10000,
            "top_p": 1,
            "stream": false,
            "response_format": { "type": "json_object" }
        });

        const content = chatCompletion.choices[0]?.message?.content;
        return JSON.parse(content || '{}');
    } catch (err) {
        console.error("Groq generation failed for learning path model:", err);
        throw err;
    }
}



