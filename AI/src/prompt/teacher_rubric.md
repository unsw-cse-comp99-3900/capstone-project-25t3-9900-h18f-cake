You are an expert in **rubric-based grading analysis** and **teacher evaluation modeling**.

---

### 🎯 Objective
Analyze how the teacher graded this specific student using the provided rubric schema and total score.  
Infer the **teacher’s grading preferences**, **biases**, and **dimension-level emphasis intensity** (strong / medium / weak).
Analyzing how a teacher graded assignments **across score levels**, not just one case.  
Your goal is to identify how their grading logic changes between levels.
---

### 🧩 You are provided with:
1. **Rubric Schema** – the official assessment framework.
2. **Teacher’s Given Score** – the numeric total assigned to this student.
3. **Score Level** – the performance band (e.g., Excellent, Satisfactory, Low).
4. **Student Assignment Content** – extracted text, tables, and figures.
5. A **neighboring level example** for comparison (slightly higher or lower score).

---

### 🧠 Your tasks:
1. Compare the student’s work with the rubric schema.  
   Identify which aspects of the work most influenced the teacher’s score (depth, structure, clarity, accuracy, referencing, etc.).
2. Infer how the teacher weighs different rubric dimensions.  
   For each dimension, assign a **strength label**: `"strong"`, `"medium"`, or `"weak"`.
3. Identify consistent **grading biases** (e.g., prefers clarity over novelty, structure over creativity) and quantify their **strength**.
4. Use the comparison to infer:
- Which rubric dimensions the teacher increases or decreases emphasis on between levels.
- What differentiates high-level vs low-level scoring patterns.

4. Generate a list of **adjustable keywords** representing the teacher’s grading focus, each with a `relevance` score between 0 and 1.

---

**Rubric Schema:**
{{rubric_schema}}

**Current Teacher’s Given Score:**
{{teacher_score}}
**Current Score Level**
{{score_level}}
**Current Student Assignment (text, tables, figures):**
{{student_text}}

**High-level Assignment**
{{High-level}}
**Low-level Assignment**
{{Low-level}}
---

### ⚙️ Output Format (JSON)

```json
{
  "level_range": "27.5–30.0",
  "summary": "The teacher prioritizes analytical rigor and structured reasoning.",
  "dimension_notes": {
    "technical_contents": {
      "comments": "Teacher rewards evidence-based analysis and integration of challenges.",
      "strength": "strong"
    },
    "following_requirements": {
      "comments": "Teacher values well-structured sections and consistent formatting.",
      "strength": "medium"
    },
    "writing_referencing": {
      "comments": "Teacher appreciates clarity and correct citations.",
      "strength": "medium"
    }
  },
  "bias_observations": [
    {"bias": "Emphasizes analytical depth", "strength": "strong"},
    {"bias": "Rewards structure over creativity", "strength": "medium"},
    {"bias": "Low sensitivity to minor stylistic issues", "strength": "weak"}
  ],
  "keywords": [
    {"term": "analytical depth", "relevance": 0.95},
    {"term": "structure", "relevance": 0.88},
    {"term": "clarity", "relevance": 0.82},
    {"term": "rubric alignment", "relevance": 0.76}
  ]
}