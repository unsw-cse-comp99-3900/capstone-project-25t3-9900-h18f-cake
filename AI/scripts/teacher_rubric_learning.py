import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from src.rubric_retriever.teacher_summary_report import TeacherReportGenerator
from src.rubric_retriever.rubric_teacher import TeacherScoringAnalyzer
import scripts.config as cfg

def generate_teacher_summary(results_dir, output_path):
    generator = TeacherReportGenerator(results_dir, output_path)
    summary = generator.generate_summary()
    print(f"[INFO] Teacher marked summary generated with {len(summary)} samples.")
    return summary

def learn_teacher_rubric():
    analyzer = TeacherScoringAnalyzer(
        summary_path=cfg.Teacher_SUMMARY_PATH,
        rubric_path=cfg.RUBRIC_GENERATION_PATH,
        output_dir=cfg.RUBRIC_DIR
    )
    analyzer.process()
    print("[INFO][PIPELINE_1] Teacher-style rubric successfully generated.")


if __name__ == "__main__":
    if not os.path.exists(cfg.Teacher_SUMMARY_PATH):
        generate_teacher_summary(results_dir= cfg.MARKED_DIR, output_path= cfg.Teacher_SUMMARY_PATH)
    else:
        print("[INFO] Existing teacher summary found, skipping regeneration.")

    learn_teacher_rubric()