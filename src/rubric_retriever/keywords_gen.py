import sys, os, json, re
from typing import List, Dict
from collections import defaultdict
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
from openai import OpenAI

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocess.Clean import TextCleaner
from preprocess.Loader import DataLoader
from preprocess.Segment import Segmenter
'''
output format:
{'dimension':['a','b','c...']}, 
'''
class RubricExtraction:
    def __init__(self,
        sbert_model: str = "all-MiniLM-L6-v2",
        llm_model: str = "gpt-4o-mini",#
        api_key_env: str = "OPENAI_API_KEY"):

        self.sbert = SentenceTransformer(sbert_model)
        self.kw_model = KeyBERT(model=self.sbert)
        api_key = os.getenv(api_key_env)
        self.client = OpenAI(api_key=api_key) if api_key else None
        self.llm_model = llm_model
        print('init finished')
    def extract_keybert(self, text, top_n, diversity):
        rubric_requirements = {}
        rubric_kw = {}
        for text_paragraph in text:
            if ':' in text_paragraph['text']:
                requirements = text_paragraph['text'].split(':')
                # print(requirements)
                rubric_requirements[requirements[0]] = requirements[-1]
        for req in rubric_requirements:
            if rubric_requirements[req]:
                print('---',rubric_requirements[req])
                keywords = self.kw_model.extract_keywords(rubric_requirements[req],
                                keyphrase_ngram_range=(1, 3),
                                stop_words="english", use_mmr=True,
                                diversity=diversity,
                                top_n=top_n)
                rubric_kw[req] = [i[0] for i in keywords]
        return rubric_kw
    def expand_with_llm(self, dimension, rubric_kw_d, per_term_max) :
        if not self.client:
            print("[WARN] No OpenAI API key found, skipping LLM expansion.")
            return rubric_kw_d

        system_prompt = (
            "You are an expert in academic grading rubrics. "
            "Expand these rubric keywords into synonymous or related phrases students may use. "
            "Return JSON: {\"phrases\": [...]}. Avoid duplicates or vague terms."
        )
        user_prompt = {
            "dimension": dimension,
            "base_terms": rubric_kw_d,
            "instructions": f"For each term, propose up to {per_term_max} short paraphrases."
        }

        resp = self.client.chat.completions.create(
            model=self.llm_model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt)}
            ],
        )
        try:
            data = json.loads(resp.choices[0].message.content)
            expanded = data.get("phrases", [])
            flattened = []
            for item in expanded:
                if isinstance(item, list):
                    flattened.extend(item)
                elif isinstance(item, str):
                    flattened.append(item)
            merged = list(dict.fromkeys(rubric_kw_d + flattened))  # 去重保序
            print('-1-',merged)
            return merged
        except Exception as e:
            print("[WARN] LLM expansion failed:", e)
            return rubric_kw_d
    def save_json(self, data):
        output_path = "data/rubric/rubric_kw_final.json"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[OK] Saved rubric keywords to: {output_path}")
    def process(self, text, use_llm):
        results = {}
        top_n, diversity = 10, 0.7
        keywords = self.extract_keybert(text, top_n, diversity)
        # print(keywords)
        for dimension,rubric_kw_d in keywords.items():
            print(dimension,rubric_kw_d)
            if use_llm:
                kw_expand = self.expand_with_llm(dimension, rubric_kw_d, 10)
            results[dimension] = kw_expand
        self.save_json(results)
        return results
#############used for test#############
# if __name__ == "__main__":
#     # loader = DataLoader()
#     # text_c = TextCleaner()
#     # seg = Segmenter()
#     # sample_path = "/Users/chenjo/Desktop/UNSW/2025/9900/AI_Moule/data/raw/rubric.pdf"

#     # if os.path.exists(sample_path):
#     #     record = loader.metadata_extraction(sample_path)
#     #     text_recd = loader.load_file(sample_path)
#     #     # print(,text_recd)
#     #     bc = text_c.process(text_recd)
#     #     print('original text:\n',bc['paragraphs'])
#     text = [{'para_id': 1, 'text': '3'}, {'para_id': 2, 'text': 'marking criteria:'}, {'para_id': 3, 'text': '1. technical contents: 20 marks: a. critical and in-depth investigation on the case project; b. precise understanding and critical analysis for the relationship between identified challenges; c. extensive review on local and international best practice in construction; d. constructive suggestions for future development.'}, {'para_id': 4, 'text': '2. following the requirements: 5 marks: a. cover sheet b. title of the report c. executive summary d. professional engineering report layout e. page number f. page limit g. font size and spacing'}, {'para_id': 5, 'text': '3. writing & referencing: 5 marks: a. proper english used in writing b. structure and logic of the report c. figures and charts, e.g. figure no. and captions, in-text analysis of the figures d. list of references e. harvard formatting as specified in unsw website f. in-text citations'}]
#     results = {'1. technical contents': ['practice construction constructive', 'case project precise', 'identified challenges extensive', 'depth investigation case', 'critical analysis relationship', 'review local', 'suggestions future', 'international', 'best', 'relationship identified', 'application building effective', 'implementation development constructive', 'execution construction productive', 'practice creation constructive', 'design construction beneficial', 'construction practice positive', 'building practice effective', 'development construction advantageous', 'practice formulation constructive', 'construction application beneficial', 'case study project specific', 'project case detailed', 'case analysis accurate', 'project examination precise', 'case evaluation exact', 'case project focused', 'project case thorough', 'case study targeted', 'project case well-defined', 'case project particular', 'recognized obstacles comprehensive', 'identified issues thorough', 'discovered challenges broad', 'highlighted difficulties extensive', 'noted barriers wide-ranging', 'acknowledged problems significant', 'identified hurdles detailed', 'recognized challenges in-depth', 'noted complications extensive', 'identified difficulties comprehensive', 'thorough exploration case', 'in-depth investigation study', 'comprehensive analysis case', 'extensive inquiry project', 'thorough examination case', 'thorough research case', 'detailed investigation project', 'thorough study case', 'in-depth analysis case', 'extensive exploration project', 'analytical evaluation connection', 'critical assessment relationship', 'in-depth analysis link', 'thorough critique relationship', 'detailed examination connection', 'critical review association', 'analytical assessment relationship', 'evaluation of connections', 'relationship analysis critical', 'relationship critique thorough', 'examine local context', 'review regional aspects', 'analyze local factors', 'study community context', 'investigate local environment', 'assess local conditions', 'evaluate regional influences', 'local area review', 'local analysis', 'local study', 'recommendations for future', 'suggestions for upcoming', 'proposals for next steps', 'advice for future improvements', 'future suggestions', 'future recommendations', 'proposals for future', 'ideas for future development', 'future guidance', 'future strategies', 'global', 'worldwide', 'internationally recognized', 'transnational', 'global perspective', 'cross-border', 'international context', 'worldwide standards', 'global considerations', 'international scope', 'optimal', 'top', 'superior', 'leading', 'premier', 'highest quality', 'best practices', 'most effective', 'top-tier', 'exemplary', 'connection identified', 'relationship recognized', 'link established', 'association noted', 'relationship discovered', 'connection acknowledged', 'relationship highlighted', 'link identified', 'association established', 'relationship pointed out'], '2. following the requirements': ['engineering report layout', 'cover sheet title', 'executive summary', 'size spacing', 'report', 'page number page', 'page limit', 'engineering', 'limit font', 'professional', 'engineering document structure', 'title page', 'summary overview', 'spacing dimensions', 'written report', 'pagination', 'maximum page count', 'technical engineering', 'font restrictions', 'professional presentation'], '3. writing & referencing': ['references harvard formatting', 'captions text analysis', 'list references', 'website text citations', 'english used', 'figures charts figure', 'formatting specified', 'structure logic', 'specified unsw website', 'report', 'Harvard style citations', 'Harvard referencing format', 'Harvard citation guidelines', 'Harvard reference style', 'Harvard format for references', 'Citations in Harvard style', 'Referencing in Harvard format', 'Harvard formatted references', 'Harvard citation method', 'Harvard referencing system', 'Captions for text analysis', 'Text analysis captions', 'Labels for text analysis', 'Text analysis figure captions', 'Captions in text analysis', 'Text analysis image captions', 'Descriptive captions for analysis', 'Text analysis title captions', 'Figure captions for analysis', 'Text analysis annotation captions', 'Reference list', 'List of references', 'Bibliography', 'References section', 'Cited works list', 'List of cited sources', 'Reference entries', 'References compilation', 'Source list', 'Citations list', 'Citations from websites', 'Website references', 'Online source citations', 'Web citations', 'Citing web sources', 'Website citation format', 'References from online texts', 'Citing internet sources', 'Web-based text citations', 'Online text references', 'Use of English language', 'English language proficiency', 'Quality of English used', 'English writing style', 'Clarity of English', 'English grammar and usage', 'English expression', 'Language quality', 'English communication', 'English writing mechanics', 'Figures and charts', 'Charts and figures', 'Graphs and figures', 'Visual data representations', 'Data figures', 'Illustrative charts', 'Visual aids', 'Data visualizations', 'Charts and diagrams', 'Figures and illustrations', 'Specified formatting requirements', 'Formatting guidelines', 'Formatting instructions', 'Required formatting style', 'Formatting criteria', 'Formatting specifications', 'Designated format', 'Formatting rules', 'Formatting standards', 'Formatting expectations', 'Logical structure', 'Organizational logic', 'Coherent structure', 'Structured reasoning', 'Logical flow', 'Organizational clarity', 'Logical arrangement', 'Structure and coherence', 'Logical organization', 'Structured presentation', 'Specified UNSW website guidelines', 'UNSW website requirements', 'UNSW formatting guidelines', 'UNSW reference specifications', 'UNSW citation rules', 'UNSW style guide', 'UNSW documentation standards', 'UNSW referencing instructions', 'UNSW guidelines for citations', 'UNSW academic standards', 'Research report', 'Academic report', 'Formal report', 'Research document', 'Study report', 'Analysis report', 'Research paper', 'Investigative report', 'Scholarly report', 'Report on findings']}
#     r_e = RubricExtraction()

#     # paragraphs_text = {'1. technical contents': ['practice construction constructive', 'case project precise', 'identified challenges extensive', 'depth investigation case', 'critical analysis relationship', 'review local', 'suggestions future', 'international', 'best', 'relationship identified'], '2. following the requirements': ['engineering report layout', 'cover sheet title', 'executive summary', 'size spacing', 'report', 'page number page', 'page limit', 'engineering', 'limit font', 'professional'], '3. writing & referencing': ['references harvard formatting', 'captions text analysis', 'list references', 'website text citations', 'english used', 'figures charts figure', 'formatting specified', 'structure logic', 'specified unsw website', 'report']}
#     re_key = r_e.save_json(results)
#     # print(re_key)

# #tests for expand_with_llm
#     # for dimension,rubric_kw_d in rer.items():
#     #     print(dimension,rubric_kw_d)
#     #     a = re.expand_with_llm(dimension, rubric_kw_d, 10)
#     #     print('==',a)
#         # a = seg.seg_sum(bc['paragraphs'])
#         # print(a["sections"])

            
#     # else:
#     #     print(f"[WARNing]")