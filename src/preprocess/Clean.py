# from Loader import DataLoader
import re, html, unicodedata, string
import json
import os
'''
used for cleaning
return {'full_text': str, 'paragraphs': [{'para_id': i, 'text': str}]}
which include the full file & segmented paragraphs

'''

class TextCleaner:
    def __init__(self):
        self.ctrl = re.compile(r"[\x00-\x1F\x7F]")
        self.url = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)
        self.email = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", re.IGNORECASE)
        self.htmltags = re.compile(r"<[^>]+>")
        self.md = re.compile(r"[#*_>`]+")
        self.thousands = re.compile(r"(?<=\d),(?=\d{3}\b)")
        self.hyphen_break = re.compile(r"(\w)-\n(\w)")

        self.num_head  = re.compile(r"^\s*(\d+[\.\)]|\(\d+\)|[IVXLCM]+\.)\s+")
        self.trail_col = re.compile(r"[:：]\s*$")
        self.punct     = re.compile(r"[^\w\s]")  
        # print('initial finished')
#(1) hyphenation & diplicate
    def fix_hyphenation(self, text):
        return self.hyphen_break.sub(r"\1\2", text)
    def rm_duplicate(self, text):
        lines = text.split('\n')
        out, prev = [], None
        for ln in lines:
            ln_stripped = ln.strip()
            if ln_stripped == "" and (prev is None or prev == ""):
                continue
            if ln_stripped != prev:
                out.append(ln_stripped)
            prev = ln_stripped
        return "\n".join(out)
    def body_detect(self,next_line, line):
        if not next_line.strip():
            return False
        nl = next_line.strip()
        return len(nl) > len(line) or nl[:1].islower()
    def head_detect(self, text, i):
        line = text[i].strip()
        if not line or len(line) > 80:
            return False
        
        starts_number   = bool(self.num_head.match(line))
        ends_with_colon = bool(self.trail_col.search(line))

        words = line.split()
        cap_words = sum(1 for w in words if w[:1].isupper())
        title_like = (cap_words / max(len(words), 1)) > 0.8
        few_punct = len(self.punct.findall(line)) <= 2

        next_is_body = self.body_detect(line[i+1],line[i]) if i+1 < len(line) else True
        score = 0
        score += 2 if starts_number else 0
        score += 1 if ends_with_colon else 0
        score += 1 if title_like else 0
        score += 1 if few_punct else 0
        score += 1 if next_is_body else 0

        return score >= 3  # 阈值可调
    def segment(self, text):
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        paragraphs, bucket = [], []

        for i, ln in enumerate(lines):
            if self.head_detect(lines, i):
                if bucket:  # 结束前一个段
                    paragraphs.append(" ".join(bucket).strip())
                    bucket = []
                current_title = ln.rstrip(":") + ":"
                bucket.append(current_title)
            else:
                bucket.append(ln)

        if bucket:
            paragraphs.append(" ".join(bucket).strip())

        result = {"full_text": "\n\n".join(paragraphs),
                  "paragraphs": [{"para_id": i+1, "text": p} for i, p in enumerate(paragraphs)]}
        return result

#(2) remove space/ctrl/url/html/md/email
    def basic_clean(self, text):
        text = text.replace("\r", " ").replace("\t", " ").replace("\n", " ")
        text = self.ctrl.sub(" ", text)
        text = self.url.sub(" ", text)
        text = self.htmltags.sub(" ", text)
        text = self.md.sub(" ", text)
        text = self.email.sub(" ", text)
        text = re.sub(r"\s+", " ", text)
        
        return text.strip()
#(3) Unicode
    def unicode_normalize(self, text):
        text = unicodedata.normalize("NFKC", text)
        text = text.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
        text = text.replace("–", "-").replace("—", "-")
        return text
#(4) case&number
    def case_number_normalize(self, text):
        text = self.thousands.sub("", text)
        text = text.lower()
        return text

#(5) all process
    def process(self, text):
        if not text: 
            return {"full_text": "", "paragraphs": []}
        text = self.fix_hyphenation(text)
        text = self.rm_duplicate(text)
        text = self.segment(text) #{'full_text': str, 'paragraphs': [{'para_id': i, 'text': str}]}
        cleaned_paras = []
        for i, item in enumerate(text["paragraphs"], start=1):
            para = item.get("text", "").strip()
            if not para:   # 跳过空段
                continue
            para = self.basic_clean(para)
            para = self.unicode_normalize(para)
            para = self.case_number_normalize(para)
            cleaned_paras.append({"para_id": i, "text": para})

        return {"full_text": text['full_text'], "paragraphs": cleaned_paras}
    
    def save_file(self, text_cleaned, path_full, path_para):
        os.makedirs(os.path.dirname(path_full), exist_ok=True)
        os.makedirs(os.path.dirname(path_para), exist_ok=True)

        with open(path_full, "w", encoding="utf-8") as f:
            json.dump({"Rubric_full_text": text_cleaned.get("full_text", "")}, f, ensure_ascii=False, indent=2)

        with open(path_para, "w", encoding="utf-8") as f:
            json.dump(text_cleaned.get("paragraphs", []), f, ensure_ascii=False, indent=2)

        print(f"\t[OK] Saved cleaned full file to:  {path_full}.")
        print(f"\t[OK] Saved paragraphs file to:  {path_para}.")

#用于测试
if __name__ == "__main__":
    from pprint import pprint

    loader = DataLoader()
    text_c = TextCleaner()

    sample_path = "/Users/chenjo/Desktop/UNSW/2025/9900/AI_Moule/data/raw/11.pdf"

    if os.path.exists(sample_path):
        record = loader.metadata_extraction(sample_path)
        text_recd = loader.load_file(sample_path)
        # print(text_recd)
        bc = text_c.process(text_recd)

        print(bc['paragraphs'])   # 打印出 assignment_id, student_id, prompt_id, response_path, response_text
    else:
        print(f"[WARNing]")