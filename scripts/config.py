import os
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
#chunker
MAX_CHUNK_LEN = 200#每个 chunk 最大字符数
USE_TEXTTILING = True
#keyword extraction
SBERT_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = "gpt-4o-mini"
API_KEY_ENV = "OPENAI_API_KEY"
USE_LLM = True
LLM_TOP_N = 10
LLM_DIVERSITY = 0.7
LLM_ENLARGE_NUMB = 10
#rubric_index
TOP_K = 3
THRESHOLD = 0.35
CHUNK_LIMIT = 15

DATA_DIR = os.path.join(BASE_DIR, "data/raw")
CLEANED_DIR = os.path.join(BASE_DIR, "artifacts/cleaned_text/")
CHUNK_DIR = os.path.join(BASE_DIR, "artifacts/chunks/")
CHUNK_EMB_DIR = os.path.join(BASE_DIR, "artifacts/chunk_embeddings/")
RUBRIC2CHUNK_DIR = os.path.join(BASE_DIR, "artifacts/rubric2chunks/")
RUBRIC2TEXT_DIR = os.path.join(BASE_DIR, "artifacts/rubric2text/")
RUBRIC_DIR = os.path.join(BASE_DIR, "artifacts/rubric/")

RUBRIC_CLEANED_FULL_PATH = os.path.join(RUBRIC_DIR,"rubric_cleaned_full.json")
RUBRIC_CLEANED_PARA_PATH = os.path.join(RUBRIC_DIR,"rubric_cleaned_para.json")
RUBRIC_KW_PATH = os.path.join(RUBRIC_DIR,"rubric_kw_final.json")
RUBRIC_EMB_PATH = os.path.join(RUBRIC_DIR,"rubric_embeddings.npy")
FAISS_INDEX_PATH = os.path.join(RUBRIC_DIR,"faiss.index")
META_PATH = os.path.join(RUBRIC_DIR,"meta.json")

RESULTS_DIR = os.path.join(BASE_DIR, "results/")
RETRIEVAL_RESULT_DIR = lambda student_id: os.path.join(RESULTS_DIR, student_id, "retrieval_result.json")
LLM_SCORE_CSV = lambda student_id: os.path.join(RESULTS_DIR, student_id, "llm_scores.csv")
FINAL_SCORE_CSV = lambda student_id: os.path.join(RESULTS_DIR, student_id, "final_scores.csv")

def is_rubric_file(filename):
    return "rubric" in filename.lower()

def extract_student_id(filename):
    match = re.search(r"(z\d+)", filename)
    return match.group(1) if match else None


def path_generation(input_path):
    is_rubric = is_rubric_file(input_path)
    if is_rubric:
        return {
        "input_path": input_path,
        "rubric_dir" : RUBRIC_DIR,
        "rubric_cleaned_full":RUBRIC_CLEANED_FULL_PATH,
        "rubric_cleaned_para":RUBRIC_CLEANED_PARA_PATH,
        "rubric_kw": RUBRIC_KW_PATH,
        "rubric_embeddings": RUBRIC_EMB_PATH,
        "faiss_index": FAISS_INDEX_PATH,
        "meta_info": META_PATH,
        "is_rubric" : True
    }
    else:
        student_id = extract_student_id(input_path)
        if not student_id:
            raise ValueError(f"Name extraction error {input_path}")
        return {
            "input_path": student_id,
            "input_pdf": input_path,
            "cleaned_text_full": os.path.join(CLEANED_DIR, f"{student_id}_full.txt"),
            "cleaned_text_para": os.path.join(CLEANED_DIR, f"{student_id}_para.txt"),
            "chunks": os.path.join(CHUNK_DIR, f"{student_id}.json"),
            "chunk_embeddings": os.path.join(CHUNK_EMB_DIR, f"{student_id}.npy"),
            "rubric2chunk":os.path.join(RUBRIC2CHUNK_DIR,f"{student_id}.json"),
            "rubric2text":os.path.join(RUBRIC2TEXT_DIR,f"{student_id}.json"),
           
            "retrieval_result": os.path.join(RESULTS_DIR, student_id, "retrieval_result.json"),
            "llm_scores": os.path.join(RESULTS_DIR, student_id, "llm_scores.csv"),
            "final_scores": os.path.join(RESULTS_DIR, student_id, "final_scores.csv"),
            "is_rubric" : False
        }
