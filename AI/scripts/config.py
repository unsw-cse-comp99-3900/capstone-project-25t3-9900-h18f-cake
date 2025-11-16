import os
import re
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

TOTAL_SCORE = 30
LEVEL_STEP = 2.5

LLM_MODEL = "gpt-4o-mini"
API_KEY_ENV = "OPENAI_API_KEY"
USE_LLM = True
LLM_TEMPERATURE = 0.2
LLM_MAX_RETRIES = 36

CLEANED_DIR = os.path.join(BASE_DIR, "artifacts/cleaned")
CHUNK_DIR = os.path.join(BASE_DIR, "artifacts/chunks")
CHUNK_EMB_DIR = os.path.join(BASE_DIR, "artifacts/chunk_embs")
RUBRIC2CHUNK_DIR = os.path.join(BASE_DIR, "artifacts/rubric2chunk")
RUBRIC2TEXT_DIR = os.path.join(BASE_DIR, "artifacts/rubric2text")
RESULTS_DIR = os.path.join(BASE_DIR, "artifacts/results")

RUBRIC_DIR = os.path.join(BASE_DIR, "artifacts/rubric/")




RUBRIC_CLEANED_FULL_PATH = os.path.join(RUBRIC_DIR,"rubric_cleaned_full.json")
ASSIGNMENT_CLEANED_FULL_PATH = os.path.join(RUBRIC_DIR,"assignment_cleaned_full.json")
RUBRIC_CLEANED_PARA_PATH = os.path.join(RUBRIC_DIR,"rubric_cleaned_para.json")
ASSIGNMENT_CLEANED_PARA_PATH = os.path.join(RUBRIC_DIR,"assignment_cleaned_para.json")
RUBRIC_KW_PATH = os.path.join(RUBRIC_DIR,"rubric_kw.json")
RUBRIC_GENERATION_PATH = os.path.join(RUBRIC_DIR,"rubric_generation.json")
META_PATH = os.path.join(RUBRIC_DIR,"meta.json")

MARKED_DIR = os.path.join(BASE_DIR, "data/marked")
Teacher_SUMMARY_PATH = os.path.join(BASE_DIR, "data","marked_summary.json")
RUBRIC_TEACHER_LLM_SELECTED_PATH = os.path.join(RUBRIC_DIR,"rubric_teacher_study_selected.json")
RUBRIC_TEACHER_PATH = os.path.join(RUBRIC_DIR,"rubric_teacher.json")#LLM Generated teacher style rubric
PROMPT_DIR = os.path.join(BASE_DIR, "src/prompt/")
MARKED_ASSIGN_DIR = os.path.join(MARKED_DIR, "assignments/")


LLM_PREDICTION_DIR = os.path.join(BASE_DIR, "artifacts/prediction/")
TEST_DIR = os.path.join(BASE_DIR, "data/test")
LLM_PREDICTION = os.path.join(LLM_PREDICTION_DIR,"assignements_score.json") #marked by llm
# LLM_PREDICTION_DIR =  os.path.abspath(os.path.join(BASE_DIR, "../backend/marking_result"))
# TEST_DIR =os.path.abspath(os.path.join(BASE_DIR, "../backend/uploads"))
# LLM_PREDICTION = os.path.join(LLM_PREDICTION_DIR, "ai_latest_results.json") #marked by llm
TEST_IMAGES = os.path.join(TEST_DIR, "images/")


def extract_student_id(filename: str) -> str | None:
    m = re.search(r"[zZ]\d{7}", filename or "")
    return m.group(0).lower() if m else None

def is_rubric_file(file_path: str) -> bool:
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"[WARN] {file_path} DO NOT EXIST.")

    folder_path = os.path.dirname(file_path)
    file_name = os.path.basename(file_path).lower()
    folder_name = os.path.basename(folder_path).lower()
    parent_dir = os.path.dirname(folder_path)

    def _find_in_dir(dir_path: str, keyword: str) -> str | None:
        if not os.path.isdir(dir_path):
            return None
        for original in os.listdir(dir_path):
            if keyword in original.lower():
                return os.path.join(dir_path, original)
        return None

    def _as_assignment():
        rubric_path = _find_in_dir(folder_path, "rubric")
        if not rubric_path:
            rubric_path = _find_in_dir(os.path.join(parent_dir, "rubric"), "rubric")
        if rubric_path:
            print(f"[Info] Assignment requirement imported, and Rubric Founded")
            return True, {"assignment": file_path, "rubric": rubric_path}
        print(f"[WARN]Lack of rubric!")
        return False, None

    def _as_rubric():
        assignment_path = _find_in_dir(folder_path, "assignment")
        if not assignment_path:
            spec_dir = os.path.join(parent_dir, "spec")
            assignment_path = _find_in_dir(spec_dir, "assignment") or _find_in_dir(
                spec_dir, "spec"
            )
        if assignment_path:
            print(f"[Info] Rubric imported,Assignment Requirement Founded")
            return True, {"assignment": assignment_path, "rubric": file_path}
        print(f"[WARN]Lack of assignment!")
        return False, None

    if "assignment" in file_name or "spec" in file_name or folder_name == "spec":
        return _as_assignment()

    if "rubric" in file_name or folder_name == "rubric":
        return _as_rubric()

    print(f"[INFO] Student assignment imported.]")
    return False, None



def path_generation(input_path):
    is_rubric,a_r_path = is_rubric_file(input_path)
    if is_rubric:
        return {
        "input_path": input_path,
        "assignment_require_path": a_r_path["assignment"],
        "rubric_path": a_r_path["rubric"],
        "rubric_dir" : RUBRIC_DIR,
        "rubric_cleaned_full":RUBRIC_CLEANED_FULL_PATH,
        "assignment_cleaned_full":ASSIGNMENT_CLEANED_FULL_PATH,
        "rubric_cleaned_para":RUBRIC_CLEANED_PARA_PATH,
        "assignment_cleaned_para":ASSIGNMENT_CLEANED_PARA_PATH,
        "rubric_kw": RUBRIC_KW_PATH,
        "rubric_generation": RUBRIC_GENERATION_PATH,
        "meta_info": META_PATH,
        "is_rubric" : True
    }
    else:
        student_id = extract_student_id(input_path)
        if not student_id:
            raise ValueError(f"Name extraction error {input_path}")
        return {
            "student_id": student_id,
            "input_pdf": input_path,
            "cleaned_text_full": os.path.join(CLEANED_DIR, f"{student_id}_full.txt"),
            "cleaned_text_para": os.path.join(CLEANED_DIR, f"{student_id}_para.txt"),
            "chunks": os.path.join(CHUNK_DIR, f"{student_id}.json"),
            "chunk_embeddings": os.path.join(CHUNK_EMB_DIR, f"{student_id}.npy"),
            "rubric_teacher": RUBRIC_TEACHER_PATH,
            "rubric2chunk":os.path.join(RUBRIC2CHUNK_DIR,f"{student_id}.json"),
            "rubric2text":os.path.join(RUBRIC2TEXT_DIR,f"{student_id}.json"),
           
            "retrieval_result": os.path.join(RESULTS_DIR, student_id, "retrieval_result.json"),
            "llm_scores": os.path.join(RESULTS_DIR, student_id, "llm_scores.csv"),
            "final_scores": os.path.join(RESULTS_DIR, student_id, "final_scores.csv"),
            "is_rubric" : False
        }
    
