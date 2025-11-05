import os
import sys
import argparse
from datetime import datetime
import runpy

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(ROOT_DIR, "scripts"))

def main():
    parser = argparse.ArgumentParser(description="AI_Moule: Automated Grading Pipeline")
    parser.add_argument(
        "--o",
        type=str,
        default="all",
        choices=["0", "1", "2", "all"],
        help="Select which pipeline step to run (0, 1, 2, or all)"
    )
    args = parser.parse_args()

    print("========== [AI_Moule Grading Pipeline] ==========")
    print(f"[INFO] Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        if args.o in ["0", "all"]:
            print("\n[STEP 0] Building rubric from assignment requirements ...")
            runpy.run_module("scripts.rubric_assign_req", run_name="__main__")
            print("[✅] Step 0 completed successfully.")

        if args.o in ["1", "all"]:
            print("\n[STEP 1] Learning teacher scoring preferences ...")
            runpy.run_module("scripts.teacher_rubric_learning", run_name="__main__")
            print("[✅] Step 1 completed successfully.")

        if args.o in ["2", "all"]:
            print("\n[STEP 2] Predicting scores for new assignments ...")
            runpy.run_module("scripts.predict_scores", run_name="__main__")
            print("[✅] Step 2 completed successfully.")

    except Exception as e:
        print(f"[❌ ERROR] Pipeline failed: {e}")

    print("\n========== [Pipeline Finished] ==========")
    print(f"[INFO] Ended at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()