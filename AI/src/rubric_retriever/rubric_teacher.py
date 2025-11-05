'''
	1.	统计老师评分分布（了解样本结构、区间覆盖）
	2.	自动筛选代表性作业（高 / 中 / 低档样本）
	3.	调用 LLM 学习评分逻辑（分档 2.5 分制）
	4.	若已有文件，则在原 JSON 下追加“评语补充”
'''
import sys, os, json,math, base64
import numpy as np
import time
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
from src.LLM.LLM_Client import LLMClient
import scripts.config as cfg

class TeacherScoringAnalyzer:
    def __init__(self, summary_path, rubric_path, output_dir):
        self.summary_path = summary_path
        self.rubric_path = rubric_path
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        with open(self.summary_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        with open(self.rubric_path, "r", encoding="utf-8") as f:
            self.rubric_schema = json.load(f)
        # print(self.rubric_schema)

    def analyze_distribution(self):
        score_file = {}
        levels = [round(i * cfg.LEVEL_STEP, 1) for i in range(math.ceil(cfg.TOTAL_SCORE / cfg.LEVEL_STEP))]
    
        level_dict = {}
        for i, low in enumerate(levels):
            high = round(low + cfg.LEVEL_STEP, 1)
            level_dict[low] = {
                "range": f"{low}-{min(high, cfg.TOTAL_SCORE)}",
                "samples": []  
            }
        for item in self.data:
            score_file[item['student_id']]=float(item['scores']['Total'])
            for k, v in level_dict.items():
                low, high = map(float, v["range"].split("-"))
                if low <= float(item['scores']['Total']) < high:
                    v["samples"].append(item['student_id'])
        output_path = os.path.join(self.output_dir, "rubric_teacher_study_all.json")

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(level_dict, f, ensure_ascii=False, indent=2)
        
        print(f'[INFO] Marked assignments analysis finished: {level_dict}')
        return level_dict, score_file
    def select_representative_per_level(self,level_dict, score_sum, output_path=None):
        reps = {}
        for level, info in level_dict.items():
            low, high = map(float, info["range"].split("-"))
            mid = (low + high) / 2.0
            candidates = info.get("samples", [])
            if not candidates:
                continue

            best_id, best_diff, best_score = None, float("inf"), None
            for zid in candidates:
                score = score_sum.get(zid)
                if score is None:
                    continue
                diff = abs(score - mid)
                if diff < best_diff:
                    best_id, best_diff, best_score = zid, diff, score

            if best_id:
                reps[info["range"]] = {"student_id": best_id, "score": best_score}

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(reps, f, ensure_ascii=False, indent=2)
            print(f"[INFO]Representative samples saved to {output_path}")
        return reps

    def generate_teacher_style_rubric(self, llm_study_list, assignments_dir,output_path, marked_sum_path, prompt_template):
        # print(llm_study_list)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        llm = LLMClient(model=cfg.LLM_MODEL)
        if not os.path.exists(assignments_dir):
            print(f"[WARN] Missing assignment file.")
            return
        with open(marked_sum_path, "r", encoding="utf-8") as f:
            marked_summary = json.load(f)
        all_results = []
        level_keys = sorted(llm_study_list.keys(), key=lambda x: float(x.split('-')[0]))

        def build_student_content(zid):
            """提取文本、表格、图片 caption，并返回 text + image_inputs"""
            sample = next((s for s in marked_summary if s["student_id"] == zid), None)
            if not sample:
                return "", []

            text = sample["assignment_text"].get("full_text", "")
            for t in sample["assignment_text"].get("tables", []):
                text += f"\n\nTable {t.get('table_id', '')}:\n{t.get('markdown', '')}"

            captions, image_inputs = [], []
            for img in sample["assignment_text"].get("images", []):
                cap = img.get("caption", "")
                path = img.get("path", "")
                if os.path.exists(path):
                    try:
                        with open(path, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode("utf-8")
                        image_inputs.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                        })
                        if cap:
                            captions.append(cap)
                    except Exception as e:
                        print(f"[WARN] Failed to load image {path}: {e}")

            if captions:
                text += "\n\n[Image Captions]\n" + "\n".join(captions)
            return text, image_inputs

        for i, level_range in enumerate(level_keys):
            time.sleep(10)
            info = llm_study_list[level_range]
            zid = info["student_id"]
            score = info["score"]
            print(f"\n[INFO] Processing level {level_range} — {zid} ({score})...")

            current_text, current_images = build_student_content(zid)
            low_text, low_images = ("N/A", [])
            high_text, high_images = ("N/A", [])

            if i > 0:
                low_zid = llm_study_list[level_keys[i - 1]]["student_id"]
                low_text, low_images = build_student_content(low_zid)
            if i < len(level_keys) - 1:
                high_zid = llm_study_list[level_keys[i + 1]]["student_id"]
                high_text, high_images = build_student_content(high_zid)

            # prompt构造
            with open(prompt_template, "r", encoding="utf-8") as f:
                base_prompt = f.read()

            prompt = (
                base_prompt
                .replace("{{rubric_schema}}", json.dumps(self.rubric_schema, ensure_ascii=False, indent=2))
                .replace("{{teacher_score}}", str(score))
                .replace("{{score_level}}", str(level_range))
                .replace("{{student_text}}", current_text)
                .replace("{{High-level}}", high_text)
                .replace("{{Low-level}}", low_text)
            )

            # 合并所有图片
            all_images = current_images + high_images + low_images

            # 调用 LLM（带图片）
            result = llm.call_llm_with_images(prompt, all_images, True, 0.2, 3)

            if isinstance(result, dict):
                result["level_range"] = level_range
            else:
                result = {"level_range": level_range, "raw_output": result}

            all_results.append(result)
            print(f"[INFO] ✅ LLM finished {level_range}")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2)
        return all_results
    def process(self):
        level_dict, score_sum = self.analyze_distribution()
        llm_study_list = self.select_representative_per_level(level_dict, score_sum, cfg.RUBRIC_TEACHER_LLM_SELECTED_PATH)
        prompt_path = os.path.join(cfg.PROMPT_DIR, "teacher_rubric.md") 
        self.generate_teacher_style_rubric(llm_study_list, cfg.MARKED_ASSIGN_DIR,cfg.RUBRIC_TEACHER_PATH, self.summary_path,prompt_path)
if __name__ == "__main__":
    analyzer = TeacherScoringAnalyzer(
        summary_path=cfg.Teacher_SUMMARY_PATH,
        rubric_path=cfg.RUBRIC_GENERATION_PATH,
        output_dir=cfg.RUBRIC_DIR)
    analyzer.process()
    