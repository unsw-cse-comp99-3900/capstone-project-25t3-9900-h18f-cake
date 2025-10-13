# AutoGrade DNN + LLM

This project is an **Automated Assignment Grading System** that combines:
- **DNN ** → learns from ~10% convenor-scored assignments  
- **LLM (rubric-based scoring)** → provides general evaluation  
- **Fusion & Calibration** → integrates both to produce final consistent scores  

---

## Project Structure
```
AI_Module/
├─ data/
│   ├─ raw/              # Raw PDF/Word assignments
│   └─ processed/        # Preprocessed CSV files
├─ models/
│   └─ dnn_model.pt      # Trained models (long-term storage)
├─ artifacts/
│   ├─ faiss.index       # Embedding index
│   └─ meta.json         # Metadata for embeddings
├─ results/
│   ├─ llm_scores.csv    # Raw LLM scoring results
│   └─ final_scores.csv  # Final fused & calibrated scores
├─ scripts/              # Step-wise runnable scripts
├─ src/                  # Core source code (preprocessing, models, etc.)
│   ├─ preprocess        # Data preprocessing
│       ├─ Loader.py     # Load raw data
│       ├─ Clean.py      # Unified format
│       └─ Chunker.py    # Segment text to chunks
│   ├─ rubric_retriever  # Similarities retriever
│       ├─ keywords_gen.py     # Rubric keywords generation 
│       ├─ Embedder.py      # Transfer chunked-text/rubric kw to embeddings
│       └─ Retriever.py    # Embedding index/similarities calculation
├─ main.py               # Main entry point
├─ requirements.txt      # Python dependencies
└─ README.md             # Project documentation
```
---

## 1.Setup

### 1.1 Create environment
(1) Create a new environment:
```
conda create -n 9900 python=3.9
```
(2) Activate the environment:
```
conda activate 9900
```
(3) Install dependencies:
```
pip install -r requirements.txt
```



更新github：
git checkout ai_module
拉取远程更新，同步到本地
git pull origin ai_module
显示修改文件
git status
添加修改文件
git add .
提交本地修改
git commit -m "操作描述"
git push origin ai_module
删除DS_Store
git rm --cached .DS_Store