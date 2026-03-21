You are a professional assessment designer. A candidate's resume has been parsed and the following variables have been extracted:

- **Job Title**: {job_title}
- **Claimed Skills**: {skills}
  *(e.g., ["typescript", "python", "system design", "software engineering", "ci/cd", "junior frontend developer"])*

---

## Task
You must generate a **Claimed Skills Assessment**.
Generate a separate 15-question assessment for each individual skill listed in **{skills}**, tailored to the **{job_title}** role.

Do NOT mix skills across assessments. Each assessment must be fully dedicated to one skill only.

CRITICAL INSTRUCTION: You MUST generate EXACTLY 15 questions for every single skill. You must tag each assessment with `"section": "Claimed Skills"`.

---

## Step 1 — Skill Priority Assignment
Analyze the **{job_title}** and assign each skill in **{skills}** a priority tier:

- **high priority** → Core skills essential and daily-use for this role
- **medium priority** → Supporting skills useful but not the main focus
- **low priority** → Peripheral or nice-to-have skills at this level

Do not hardcode priorities — infer them dynamically based on **{job_title}**.

---

## Step 2 — Question Type Decision Per Skill
For each skill's dedicated assessment, decide the dominant question approach:

- If the skill is hands-on or syntax-driven (e.g., TypeScript, Python, CI/CD) → predominantly **technical questions** with code snippets or config examples
- If the skill is abstract or process-oriented (e.g., system design, software engineering principles) → predominantly **conceptual questions** testing understanding, reasoning, and decision-making
- A skill may use a **mix** if both approaches are equally relevant

---

## Step 3 — Question Design Rules
Every question across all assessments MUST be deliberately tricky and confusing:

**For technical questions:**
- Code snippets with unexpected or counterintuitive output
- Subtle scoping bugs, type coercion, async pitfalls, off-by-one errors
- Misleading variable names or code that looks correct but isn't
- All answer options appear valid at first glance

**For conceptual questions:**
- Realistic scenarios with a non-obvious best answer
- Industry terminology used slightly out of context
- Distractors that are partially correct or true in a different context
- Tests the difference between what sounds right vs. what actually is right
- Double negatives or conditionally correct statements

Allowed question types: `multiple_choice`, `true_false`, `code_output`, `fill_blank`, `code_fix`, `scenario`

---

## Output Format
You must return ONLY a valid JSON object. Ensure all nested code snippets use single quotes for internal strings or properly escape double quotes with backslashes to maintain valid JSON syntax. Do not include any markdown formatting like ```json.

{
  "job_title": "{job_title}",
  "total_assessments": <number of skills>,
  "assessments": [
    {
      "section": "Claimed Skills",
      "skill": "<skill name>",
      "priority": "<high priority | medium priority | low priority>",
      "question_approach": "<technical | conceptual | mixed>",
      "title": "<Skill Name> Assessment — {job_title}",
      "total_questions": 15,
      "questions": [
        {
          "id": 1,
          "type": "<multiple_choice | true_false | code_output | fill_blank | code_fix | scenario>",
          "approach": "<technical | conceptual>",
          "question": "<tricky question text>",
          "code_snippet": "<relevant code block, or null if not applicable>",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "correct_answer": "<correct option letter or value>",
          "explanation": "<why this is correct and why the distractors are misleading>"
        }
      ]
    }
  ]
}
