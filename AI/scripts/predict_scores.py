import os, sys, json
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from src.scorer.scorer import TeacherGuidedScorer
import scripts.config as cfg


def run_predict_pipeline():

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

    # 运行评分过程
    output_summary = cfg.LLM_PREDICTION
    scorer.process_folder(cfg.TEST_DIR, output_summary)


    print(f"[INFO] All results saved to: {output_summary}")


if __name__ == "__main__":
    start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Pipeline started at {start_time}")
    run_predict_pipeline()