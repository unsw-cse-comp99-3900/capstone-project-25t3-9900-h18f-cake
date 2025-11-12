# AI Module – AutoGrade (DNN + LLM)

The AI module powers rubric generation and automated marking by combining:

- **DNN** – learns scoring signals from a labelled subset of tutor/coordinator submissions.
- **LLM (prompted with rubric + requirements)** – generates rubric-aware evaluations and textual feedback.
- **Fusion/Calibration** – merges numeric and textual outputs into consistent final marks.

## Repository Layout

```
AI/
├── main.py                      # Entry point orchestrating the pipeline (run with --o flag)
├── data/
│   ├── raw/                     # Assignment requirements & rubric sources
│   ├── test/                    # Held-out submissions for evaluation
│   └── marked/                  # Tutor-marked artifacts (assignments + mark sheets)
├── artifacts/
│   ├── rubric/                  # Generated rubrics (LLM + teacher summary)
│   └── prediction/              # Consolidated prediction outputs
├── scripts/                     # Runnable steps (config, rubric, teacher learning, scoring)
├── src/                         # Core logic (preprocess, retrievers, prompt templates, LLM client, scorer)
├── requirements.txt
└── README.md (this file)
```

### Key Artifacts

| Path | Description |
|------|-------------|
| `artifacts/rubric/rubric_kw.json` | Rubric dimensions/keywords. |
| `artifacts/rubric/rubric_generation.json` | LLM-generated rubric (assignment + rubric input). |
| `artifacts/rubric/rubric_teacher.json` | Teacher rubric extracted from marked data. |
| `artifacts/rubric/rubric_teacher_study_all.json` | Summary of marked assignments (zid, doc text, tables, scores). |
| `artifacts/prediction/assignments_score.json` | Final prediction export consumed by backend sync. |

## Environment Setup

```bash
cd AI
conda create -n 9900 python=3.9
conda activate 9900
pip install -r requirements.txt

export OPENAI_API_KEY="sk-..."   # required for LLM prompts
```

Ensure GPU/CPU dependencies (PyMuPDF/Paddle/etc.) match `requirements.txt`.

## Running Pipelines

`main.py` accepts an `--o` flag controlling the stage:

```bash
python main.py --o 0     # Step 0: rubric generation (assignment requirements + rubric)
python main.py --o 1     # Step 1: teacher scoring pattern extraction
python main.py --o 2     # Step 2: assignment prediction / scoring
python main.py --o all   # Run the full pipeline sequentially
```

Individual scripts (for debugging or incremental runs):

| Script | Purpose |
|--------|---------|
| `scripts/rubric_assign_req.py` | Generates rubric text from assignment requirements. |
| `scripts/teacher_rubric_learning.py` | Learns rubric weights/phrasing from marked assignments. |
| `scripts/predict_scores.py` | Scores submissions (DNN + LLM fusion). |

## Development Notes

- Update `scripts/config.py` to point to local data/artifact paths.
- Keep sensitive keys (OpenAI, huggingface, etc.) out of git; load via `.env` or shell exports.
- When adding new models/prompts, document them under `src/prompt/` and mention expected inputs/outputs.
- After generating new artifacts, sync them with the backend (e.g., copy `prediction` outputs to `backend/uploads/...` as required).

## Git Workflow

AI work often lives on a dedicated branch:

```bash
git checkout ai_module
git pull origin ai_module
# ...changes...
git add .
git commit -m "Describe AI module update"
git push origin ai_module
```

Clean up temporary artifacts (e.g., `.DS_Store`) before committing: `git rm --cached .DS_Store`.

Keep this README updated whenever data paths, prompt formats, or pipeline stages change.
