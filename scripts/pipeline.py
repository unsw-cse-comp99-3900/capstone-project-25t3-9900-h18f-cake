import json
import numpy as np
import os, sys, faiss
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import scripts.config as cfg
from src.preprocess.Clean import TextCleaner
from src.preprocess.Loader import DataLoader
from src.preprocess.Chunker import Chunker
from src.rubric_retriever.keywords_gen import RubricExtraction
from src.rubric_retriever.Embedder import Embedder
from src.rubric_retriever.Indexer import Indexer
from src.rubric_retriever.Retriever import Retriever    

def process_pipeline(file_path):
    print("[INFO] Generating paths...")
    paths = cfg.path_generation(file_path)

    print("[INFO] Loading and cleaning text...")
    loader = DataLoader()
    text_raw = loader.load_file(file_path)
    cleaner = TextCleaner()
    text_cleaned = cleaner.process(text_raw)
    
    embedder = Embedder(cfg.SBERT_MODEL)
    if paths['is_rubric']: 
        print(paths)
        #1.save cleaned text
        os.makedirs(paths['rubric_dir'], exist_ok=True)
        cleaner.save_file(text_cleaned, paths['rubric_cleaned_full'], paths['rubric_cleaned_para'])
        #2.keyword extraction
        print("[INFO] Extracting rubric keywords...")
        rubric_gen = RubricExtraction(cfg.SBERT_MODEL, cfg.LLM_MODEL, cfg.API_KEY_ENV)
        rubric_ext_gen = rubric_gen.process(text_cleaned['paragraphs'], cfg.USE_LLM, cfg.LLM_TOP_N, cfg.LLM_DIVERSITY,cfg.LLM_ENLARGE_NUMB,  paths['rubric_kw'])
        #3. embedding generation
        print("[INFO] Embedding rubric keywords...")
        # rubric_ext_gen = {'1. technical contents': ['practice construction constructive', 'case project precise', 'identified challenges extensive', 'depth investigation case', 'critical analysis relationship', 'review local', 'suggestions future', 'international', 'best', 'relationship identified', 'application building effective', 'implementation development constructive', 'execution construction productive', 'practice creation beneficial', 'construction methodology positive', 'case study project specific', 'project case detailed', 'case analysis accurate', 'project examination precise', 'case evaluation thorough', 'recognized obstacles comprehensive', 'identified issues broad', 'challenges acknowledged extensive', 'difficulties pinpointed wide-ranging', 'barriers identified in-depth', 'thorough investigation case', 'in-depth exploration of case', 'comprehensive study of case', 'thorough analysis of case', 'thorough inquiry into case', 'analytical evaluation connection', 'critical assessment of relationship', 'in-depth analysis of correlation', 'scrutinizing relationship dynamics', 'evaluation of interconnections', 'examine local context', 'analyze regional factors', 'review local conditions', 'investigate local environment', 'study local aspects', 'recommendations for future', 'proposals for upcoming', 'suggestions for next steps', 'advice for future actions', 'future-oriented suggestions', 'global', 'worldwide', 'internationally recognized', 'transnational', 'cross-border', 'optimal', 'superior', 'top-tier', 'leading', 'premier', 'connections identified', 'relationships recognized', 'links established', 'associations noted', 'correlations found'], '2. following the requirements': ['engineering report layout', 'cover sheet title', 'executive summary', 'size spacing', 'report', 'page number page', 'page limit', 'engineering', 'limit font', 'professional', 'engineering document structure', 'title page heading', 'summary overview', 'dimensions and spacing', 'technical report', 'pagination', 'maximum page count', 'engineering discipline', 'font restrictions', 'formal presentation'], '3. writing & referencing': ['references harvard formatting', 'captions text analysis', 'list references', 'website text citations', 'english used', 'figures charts figure', 'formatting specified', 'structure logic', 'specified unsw website', 'report', 'Harvard style citations', 'Harvard referencing format', 'Citations in Harvard style', 'Harvard format references', 'Referencing using Harvard style', 'Harvard citation guidelines', 'References in Harvard format', 'Citing sources in Harvard style', 'Harvard referencing system', 'Harvard citation method', 'Captions for text analysis', 'Text analysis figure captions', 'Captions for analytical texts', 'Text analysis labeling', 'Figure labels for text analysis', 'Text analysis captioning', 'Descriptive captions for analysis', 'Captions for analytical figures', 'Text analysis image captions', 'Labeling for text analysis', 'Reference list', 'List of references', 'Bibliography', 'References section', 'Cited works list', 'List of cited sources', 'Reference compilation', 'Source list', 'References compilation', 'Citations list', 'Citations from websites', 'Website references', 'Online source citations', 'Web-based text citations', 'Citing web sources', 'Website citation format', 'References from online texts', 'Citing internet sources', 'Web citations', 'Online reference citations', 'Use of English language', 'English language proficiency', 'Quality of English used', 'English writing style', 'Clarity of English', 'English grammar and usage', 'English expression', 'Language quality', 'English communication', 'English writing standards', 'Figures and charts', 'Charts and graphs', 'Visual data representations', 'Data figures', 'Graphical representations', 'Charts and figures', 'Visual aids', 'Data visualizations', 'Illustrative figures', 'Graphical data', 'Specified formatting requirements', 'Formatting guidelines', 'Formatting instructions', 'Required format', 'Formatting criteria', 'Formatting standards', 'Designated formatting', 'Formatting specifications', 'Formatting rules', 'Format requirements', 'Logical structure', 'Organizational logic', 'Coherent structure', 'Logical flow', 'Structured reasoning', 'Organizational clarity', 'Logical arrangement', 'Clear structure', 'Structured logic', 'Logical framework', 'Specified UNSW guidelines', 'UNSW formatting requirements', 'UNSW referencing guidelines', 'UNSW style specifications', 'UNSW report standards', 'UNSW citation rules', 'UNSW document guidelines', 'UNSW formatting instructions', 'UNSW academic standards', 'UNSW writing guidelines', 'Research report', 'Academic report', 'Formal report', 'Written report', 'Research document', 'Study report', 'Analysis report', 'Report writing', 'Research findings report', 'Scholarly report']}
        rubric_embedding = embedder.process(paths['is_rubric'], rubric_ext_gen, paths['rubric_embeddings'])
        #. fassi index
        print("[INFO] Generating fassi index...")
        indexer = Indexer(rubric_ext_gen, cfg.SBERT_MODEL, paths['meta_info'])
        faiss_idx = indexer.faiss_index(rubric_embedding,  paths['faiss_index'])
    else:
        print(paths)
        #1.save cleaned text
        cleaner.save_file(text_cleaned, paths['cleaned_text_full'], paths['cleaned_text_para'])
        #2. chunk generation
        print("[INFO] Gnerating chunks of text...")
        chunker = Chunker(cfg.MAX_CHUNK_LEN, cfg.USE_TEXTTILING)
        assign_chunks = chunker.chunk_para(text_cleaned,paths['chunks'])
        id2chunktext = {item["chunk_index"]: item["chunk_text"] for item in assign_chunks}
        #3. embedding generation
        print("[INFO] Embedding assignment chunks...")
        assign_embedding = embedder.process(paths['is_rubric'], assign_chunks, paths['chunk_embeddings'])
        #4.retriever
        print("[INFO] Rechieving mapping between chunks & rubric...")
        if os.path.exists(cfg.FAISS_INDEX_PATH) and os.path.exists(cfg.RUBRIC_EMB_PATH) and os.path.exists(cfg.META_PATH):
            print(f"\t[OK] FAISS index found at: {cfg.FAISS_INDEX_PATH}")
            print(f"\t[OK] Rubric Embedding found at: {cfg.META_PATH}")
            rechiever = Retriever(cfg.FAISS_INDEX_PATH,cfg.RUBRIC_EMB_PATH, cfg.META_PATH, assign_embedding)
            rubrict2chunks = rechiever.retrieve(cfg.TOP_K, cfg.THRESHOLD, cfg.CHUNK_LIMIT, paths['rubric2chunk'])
            rechiever.rubric2text(id2chunktext,paths['rubric2text'])
        else:
            print(f"[WARNING] FAISS index/rubric embedding/idx2rubric not found, will generate a new one.")

if __name__ == "__main__":
    sample_file = "data/raw/z111.docx"
    # sample_file = "data/raw/rubric.pdf"
    if os.path.exists(sample_file):
        paths = process_pipeline(sample_file)
       
    # os.makedirs(os.path.join("results", student_id), exist_ok=True)
    