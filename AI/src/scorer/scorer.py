import sys, os, json,math, base64, time
import numpy as np
from collections import defaultdict
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
from src.LLM.LLM_Client import LLMClient
from src.preprocess.Loader import DataLoader
from src.preprocess.Clean import TextCleaner
import scripts.config as cfg
from tqdm import tqdm


class TeacherGuidedScorer:
    def __init__(self, rubric_path, teacher_style_path, output_dir, prompt_template):
        self.rubric_path = rubric_path
        self.teacher_style_path = teacher_style_path
        self.output_dir = output_dir
        self.prompt_template = prompt_template
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(cfg.RUBRIC_DIR, exist_ok=True)

        # if file does not exist, create it
        if not os.path.exists(self.rubric_path):
            with open(self.rubric_path, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)
        with open(rubric_path, "r", encoding="utf-8") as f:
            self.rubric_schema = json.load(f)
        # if file does not exist, create it
        if not os.path.exists(self.teacher_style_path):
            with open(self.teacher_style_path, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)
        with open(teacher_style_path, "r", encoding="utf-8") as f:
            self.teacher_style = json.load(f)
        self.llm = LLMClient(model=cfg.LLM_MODEL)

    def predict_score_specific(self, assign_text, output_path):
        # print(assign_text)
        paragraphs = assign_text["paragraphs"]
        if isinstance(paragraphs, list) and isinstance(paragraphs[0], dict):
            text_joined = "\n".join(p["text"] for p in paragraphs)
        else:
            text_joined = str(paragraphs)
        cleaner = TextCleaner()
        text_cleaned = cleaner.process(text_joined)

        student_text = text_cleaned["full_text"]
        for t in assign_text["tables"]:
            student_text += f"\n\nTable {t.get('table_id', '')}:\n{t.get('markdown', '')}"
        for img in assign_text["images"]:
            student_text += f"\n\n{img.get('caption', '')}"

        with open(self.prompt_template, "r", encoding="utf-8") as f:
            base_prompt = f.read()
        prompt = (
            base_prompt
            .replace("{{rubric_schema}}", json.dumps(self.rubric_schema, ensure_ascii=False, indent=2))
            .replace("{{teacher_style_rubric}}", json.dumps(self.teacher_style, ensure_ascii=False, indent=2))
            .replace("{{student_text}}", student_text)
        )
        # print(prompt)
        image_inputs = []
        for img in assign_text["images"]:
            # print(img)
            path = img.get("path", "")
            if os.path.exists(path):
                try:
                    with open(path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("utf-8")
                    image_inputs.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                    })
                except Exception as e:
                    print(f"[WARN] Failed to load {path}: {e}")
        # print(image_inputs)
        result = self.llm.call_llm_with_images(prompt, image_inputs, as_json=True, temperature=0.25, max_retries=36)
 
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"[INFO] Scoring result saved to {output_path}")
        return result
    

    def process_folder(self, input_dir, output_path):
        marked_list, all_results, failed_students = [], [], []
        for file_name in tqdm(os.listdir(input_dir)):
            if not file_name.endswith(".docx"):
                continue
            zid = os.path.splitext(file_name)[0]
            file_path = os.path.join(input_dir, file_name)
            if zid in marked_list:
                print(f"[SKIP] {zid} already scored.")
                continue

            try:
                print(f"[INFO] Processing {file_name}...")
                marked_list.append(zid)
                loader = DataLoader()
                img_path = os.path.join(cfg.TEST_IMAGES,zid)
                txt_raw = loader.load_file(file_path,img_path)
                try:
                    results = self.predict_score_specific(txt_raw, output_path)
                except RuntimeError as e:
                    failed_students.append(zid)
                    print(f"[WARN] Retrying exhausted for {file_name}: {e}")
                    continue
                record = {
                    "student_id": zid,
                    "result": results
                }
                all_results.append(record)
                print(f"[DONE] {file_name} scored successfully.")
                time.sleep(5)  # Avoid hitting API rate limits
            except Exception as e:
                print(f"[ERROR] Failed {file_name}: {e}")
                failed_students.append(zid)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        if all_results:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(all_results, f, ensure_ascii=False, indent=2)
            print(f"[INFO] All scoring results saved to {output_path}")
        else:
            print("[WARN] No results were generated.")
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)
        if failed_students:
            print(f"[WARN] Failed to mark {len(failed_students)} student(s): {', '.join(failed_students)}")
        return {"results": all_results, "failed_students": failed_students}




    
if __name__ == "__main__":
    prompt_path = os.path.join(cfg.PROMPT_DIR, "teacher_guided_scoring.md") 
    scorer = TeacherGuidedScorer(
        rubric_path=cfg.RUBRIC_GENERATION_PATH,
        teacher_style_path=cfg.RUBRIC_TEACHER_PATH,
        output_dir=cfg.LLM_PREDICTION_DIR,
        prompt_template=prompt_path
    )

    scorer.process_folder(cfg.TEST_DIR,cfg.LLM_PREDICTION)
