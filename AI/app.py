# AI_service/app.py
from fastapi import FastAPI, UploadFile, File
from src.preprocess import Loader as DataLoader
from src.rubric_retriever.teacher_summary_report import TeacherReportGenerator 
import tempfile, shutil, os
from fastapi.responses import JSONResponse

app = FastAPI(title="AI Service")

@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    loader = DataLoader()

    extractor = TeacherReportGenerator(loader)

    try:
        # Temporarily save uploaded files
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        scores = extractor.score_extraction(tmp_path)
        return {"filename": file.filename, "scores": scores}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "filename": file.filename}
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
