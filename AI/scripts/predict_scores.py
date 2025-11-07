import os
import sys
import json
import requests
from datetime import datetime
from src.scorer.scorer import TeacherGuidedScorer

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

import AI.scripts.config as cfg
from src.preprocess.Clean import TextCleaner
from src.preprocess.Loader import DataLoader
from src.LLM.LLM_Client import LLMClient

def run_predict_pipeline(course_id: int | None = None, backend_url: str = "http://localhost:8000"):
    """
    Run the AI grading pipeline.
    If course_id is provided, upload results to backend marking_result.
    """
    prompt_path = os.path.join(cfg.PROMPT_DIR, "teacher_guided_scoring.md")
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Prompt template not found: {prompt_path}")
    scorer = TeacherGuidedScorer(
        rubric_path=cfg.RUBRIC_GENERATION_PATH,
        teacher_style_path=cfg.RUBRIC_TEACHER_PATH,
        output_dir=cfg.LLM_PREDICTION_DIR,
        prompt_template=prompt_path
    )
    if not os.path.exists(cfg.TEST_DIR):
        raise FileNotFoundError(f"Input directory not found: {cfg.TEST_DIR}")
    else:
        print(f"[INFO] Found test assignments in: {cfg.TEST_DIR}")
    output_summary = cfg.LLM_PREDICTION
    scorer.process_folder(cfg.TEST_DIR, output_summary)
    print(f"[INFO] All results saved to: {output_summary}")
    with open(output_summary, "r", encoding="utf-8") as f:
        results = json.load(f)

    # Normalize result records for downstream uploads (legacy path)
    if isinstance(results, dict):
        records = results.get("students", [])
    else:
        records = list(results) if results is not None else []
    if course_id:
        print(f"[INFO] Uploading AI results to backend for course_id={course_id}")
        for record in records:
            try:
                result_block = record.get("result") if isinstance(record, dict) else None
                zid = None
                if isinstance(record, dict):
                    zid = record.get("student_id") or record.get("id") or record.get("zid")
                payload = {
                    "zid": zid,
                    "ai_total": None,
                    "ai_feedback": record.get("feedback", ""),
                    "assignment": record.get("assignment", ""),
                    "marked_by": "AI System",
                }
                if result_block and isinstance(result_block, dict):
                    payload["ai_total"] = result_block.get("total")
                    if not payload["ai_feedback"]:
                        comments = []
                        for key, val in result_block.items():
                            if key.lower() == "total":
                                continue
                            comment = val.get("comments") if isinstance(val, dict) else None
                            if comment:
                                comments.append(f"{key}: {comment}")
                        payload["ai_feedback"] = "\n".join(comments)
                else:
                    payload["ai_total"] = record.get("score")

                r = requests.post(
                    f"{backend_url}/v1/marking_result/{course_id}/append",
                    json=payload,
                    timeout=10
                )
                if r.status_code == 200:
                    print(f"[✅] Uploaded result for {payload['zid']}")
                else:
                    print(f"[⚠️] Failed to upload for {payload['zid']}: {r.status_code} {r.text}")
            except Exception as e:
                print(f"[❌] Error uploading result: {e}")

    return results

if __name__ == "__main__":
    start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Pipeline started at {start_time}")
    run_predict_pipeline()
