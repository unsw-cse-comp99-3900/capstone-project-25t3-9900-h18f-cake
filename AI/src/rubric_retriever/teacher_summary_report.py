import os, sys
import json
import re
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocess.Loader import DataLoader
from preprocess.Clean import TextCleaner

class TeacherReportGenerator:
    def __init__(self, results_dir, output_path):
        self.results_dir = results_dir
        self.assignments_dir = os.path.join(self.results_dir, "assignments")
        self.marks_dir = os.path.join(self.results_dir, "mark")
        self.output_path = output_path
        self.base_dir = os.path.dirname(os.path.dirname(results_dir))

        self.rubric_path = os.path.join(self.base_dir, "artifacts", "rubric", "rubric_kw.json")
        # print(self.rubric_path)
        if os.path.exists(self.rubric_path):
            print("[INFO] rubric_kw.json found. Loading...")
            with open(self.rubric_path, "r", encoding="utf-8") as f:
                self.rubric_details = json.load(f)
            print("[INFO] Rubric dictionary loaded successfully.")
        else:
            print("[WARN] rubric_kw.json not found! Please generate rubric details first.")
            raise SystemExit("[EXIT] TeacherReportGenerator initialization stopped.")  

    def load_json(self, file_path):
        path = os.path.join(self.results_dir, file_path)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
    def rubiric_load(self, path):
        if not os.path.exists(path):
            raise FileNotFoundError(f"File not found: {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
        

        
    def score_extraction(self,file_path):
        loader = DataLoader()
        text_raw = loader.load_file(file_path,None)
        paragraphs = text_raw["paragraphs"]
        if isinstance(paragraphs, list) and isinstance(paragraphs[0], dict):
            text_joined = "\n".join(p["text"] for p in paragraphs)
        else:
            text_joined = str(paragraphs)
        cleaner = TextCleaner()
        text_cleaned = cleaner.process(text_joined)
        scores = {}

        # print(text_cleaned['paragraphs'])
        matches = re.findall(r":\s*([0-9]+(?:\.[0-9]+)?)\s*/\s*([0-9]+(?:\.[0-9]+)?)", text_cleaned['full_text'])
        for idx, score in enumerate(matches):
            scores[self.rubric_details[str(idx)]] = score[0]
        # print(scores)
        return scores
    

    def assign_extraction(self,file_path):
        loader = DataLoader()
        image_dir = os.path.join(self.results_dir, "images")
        text_raw = loader.load_file(file_path,image_dir)
        paragraphs = text_raw["paragraphs"]
        if isinstance(paragraphs, list) and isinstance(paragraphs[0], dict):
            text_joined = "\n".join(p["text"] for p in paragraphs)
        else:
            text_joined = str(paragraphs)
        cleaner = TextCleaner()
        text_cleaned = cleaner.process(text_joined)
        return {'full_text':text_cleaned['full_text'],'tables':text_raw['tables'],'images':text_raw['images']}
    def find_mark_file(self, student_id):
        for f in os.listdir(self.marks_dir):
            if student_id in f:
                return os.path.join(self.marks_dir, f)
        return None
    def generate_summary(self):
        summary = []
        assign_files = [f for f in os.listdir(self.assignments_dir) if not f.startswith(".")]
        for assign_file in assign_files:
            student_id = os.path.splitext(assign_file)[0]
            assign_path = os.path.join(self.assignments_dir, assign_file)
            mark_path = self.find_mark_file(student_id)
            if not os.path.exists(mark_path):
                print(f"[WARN] No mark file found for {student_id}")
                continue
            print(f"[INFO] Matched {student_id} -> {os.path.basename(mark_path)}")

            assign_text = self.assign_extraction(assign_path)
            score_dict = self.score_extraction(mark_path)
            # print(assign_text,score_dict)
            summary.append({
                "student_id": student_id,
                "assignment_text": assign_text,
                "scores": score_dict
            })

        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        print(f"[INFO]Marking summary saved to {self.output_path}")
        print(f"\t[INFO]Total processed: {len(summary)} students")
        return summary
    
# if __name__ == "__main__":
#     results_dir="/Users/chenjo/Desktop/UNSW/2025/9900/AI_Moule/data/marked"
#     output_path="/Users/chenjo/Desktop/UNSW/2025/9900/AI_Moule/data/marked_summary.json"
#     generator = TeacherReportGenerator(results_dir, output_path)
#     generator.generate_summary()