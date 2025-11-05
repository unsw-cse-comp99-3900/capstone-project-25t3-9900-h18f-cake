import json, re 
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import scripts.config as cfg
from src.preprocess.Clean import TextCleaner
from src.preprocess.Loader import DataLoader
from src.LLM.LLM_Client import LLMClient 

def process_pipeline(file_path):
    print("[INFO] Generating paths...")
    paths = cfg.path_generation(file_path)
    print("[INFO] Loading and cleaning text...")

    if paths['is_rubric']: 
        # print(paths)
        loader = DataLoader()
        rubric_raw = loader.load_file(paths['rubric_path'],paths['rubric_cleaned_full'])
        assign_required_raw = loader.load_file(paths['assignment_require_path'],paths["assignment_cleaned_full"])

        cleaner = TextCleaner()
        rubric_cleaned = cleaner.process(rubric_raw)
        assign_required_cleaned = cleaner.process(assign_required_raw)
        # print(rubric_cleaned)
        pattern = re.compile(r"(\d+\.\s*[A-Za-z&\s]+?)(?=\s*[:：]|$)")
        matches = pattern.findall(rubric_cleaned['full_text'])

        rubric_dict = {i: match.strip() for i, match in enumerate(matches)}
        rubric_dict[len(rubric_dict)] = "Total"
        os.makedirs(os.path.dirname(paths['rubric_kw']), exist_ok=True)
        with open(paths['rubric_kw'], "w", encoding="utf-8") as f:
            json.dump(rubric_dict, f, ensure_ascii=False, indent=2)
        print(f"[INFO]Rubric dictionary (with total) saved to {paths['rubric_kw']}")
        # print(rubric_cleaned,assign_required_cleaned)
        # 1.save cleaned text
        os.makedirs(paths['rubric_dir'], exist_ok=True)
        cleaner.save_file(rubric_cleaned, paths['rubric_cleaned_full'], paths['rubric_cleaned_para'])
        cleaner.save_file(assign_required_cleaned, paths['assignment_cleaned_full'], paths['assignment_cleaned_para'])
        #2.CONCAT rubric & assignment requirement
        print("[INFO] Concatenating rubric & assignment requirement...")
        combined_paras = {
            "rubric": rubric_cleaned.get("full_text", []),
             "assignment_requirement": assign_required_cleaned.get("full_text", [])}
        combined_json_str = json.dumps(combined_paras, ensure_ascii=False, indent=2)
        # print(combined_json_str)
        #2.LLM Generation of detailed rubric
        llm = LLMClient(model="gpt-4o-mini")
        prompt_template = llm.load_prompt("rubric_generation.md",combined_json_str,"{{combined_json}}")
        # print(prompt_template)
        result = llm.call_llm(prompt_template, cfg.USE_LLM,cfg.LLM_TEMPERATURE, cfg.LLM_MAX_RETRIES,paths['rubric_generation'])
        # print(result)

if __name__ == "__main__":
    sample_file = "data/raw/assignment.pdf"
    # sample_file = "data/raw/rubric.pdf"
    if os.path.exists(sample_file):
        paths = process_pipeline(sample_file)
    