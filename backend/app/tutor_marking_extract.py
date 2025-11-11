import re
import fitz
from docx import Document
import os
import json
from typing import Dict, Any, Optional

class TutorMarkExtractor:
    def __init__(self):
        # Match each rubric item
        self.pattern = re.compile(
            r"([A-Z][A-Za-z &/]+)[:：]\s*([0-9]+(?:\.[0-9]+)?)\s*/\s*([0-9]+(?:\.[0-9]+)?)(?:\s*marks?)?",
            re.IGNORECASE
        )
        # Match total score
        self.total_pattern = re.compile(
            r"Total\s*Mark[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*/\s*([0-9]+(?:\.[0-9]+)?)",
            re.IGNORECASE
        )

    def load_text(self, file_path: str) -> str:
        """Read docx or pdf files"""
        ext = os.path.splitext(file_path)[1].lower()
        if ext in [".docx", ".doc"]:
            doc = Document(file_path)
            text = "\n".join(p.text for p in doc.paragraphs)
        elif ext == ".pdf":
            doc = fitz.open(file_path)
            text = "\n".join(page.get_text("text") for page in doc)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
        return text

    def extract_marks(self, file_path: str) -> Dict[str, Any]:
        """Extract each rubric component and totals"""
        text = self.load_text(file_path)
        tutor_detail = {}

        # Per-component scores
        for match in self.pattern.findall(text):
            name, got, total = match
            name = name.strip().replace("\n", " ")
            tutor_detail[name] = {
                "score": float(got),
                "total": float(total)
            }

        # Overall total
        tutor_total = None
        total_match = self.total_pattern.search(text)
        if total_match:
            got, total = total_match.groups()
            tutor_total = float(got)
            tutor_detail["Total Mark"] = {
                "score": float(got),
                "total": float(total)
            }

        # Assemble result that matches the MarkingIn schema
        result = {
            "zid": os.path.basename(file_path).split("_")[0],  # Extract zID from the filename
            "tutor_marking_detail": tutor_detail,
            "tutor_total": tutor_total,
            "marked_by": "tutor",
            "needs_review": False
        }

        return result




# if __name__ == "__main__":
#     # Update this path to point to a local file when testing
#     test_file = "./uploads/comp0110-2077-term-2/ass1-5/submissions/Student_assignment_with_Tutor_mark/z5864533/z5864533_mark.docx"

#     if not os.path.exists(test_file):
#         print(f"[ERROR] File not found: {test_file}")
#         exit(1)

#     extractor = TutorMarkExtractor()
#     result = extractor.extract_marks(test_file)

#     print("\n[Extracted Scores]")
#     print(json.dumps(result, indent=2, ensure_ascii=False))
