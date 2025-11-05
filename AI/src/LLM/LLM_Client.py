import os
import json
from datetime import datetime
from typing import Optional, Any
from openai import OpenAI



class LLMClient:
    def __init__(self, model: str = "gpt-4o-mini", api_key_env: str = "OPENAI_API_KEY",
        save_log: bool = True, log_dir: Optional[str] = None):
        api_key = os.getenv(api_key_env)
        if not api_key:
            raise ValueError(f"[WARN] No OpenAI API key found, skipping LLM expansion.")
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.save_log = save_log
        self.log_dir = log_dir or os.path.join(os.path.dirname(__file__), "..", "..", "logs", "llm_calls")
        os.makedirs(self.log_dir, exist_ok=True)


    def load_prompt(self, template_name, data,location) -> str:
        current_dir = os.path.dirname(__file__)
        base_dir = os.path.abspath(os.path.join(current_dir, ".."))
        prompt_dir = os.path.join(base_dir, "prompt")
        prompt_path = os.path.join(prompt_dir, template_name)

        if not os.path.exists(prompt_path):
            raise FileNotFoundError(f"[WARN]Prompt NOT FOUND: {prompt_path}")

        with open(prompt_path, "r", encoding="utf-8") as f:
            promt_txt =  f.read()   
        combined_json_str = json.dumps(data, ensure_ascii=False, indent=2)
        return  promt_txt.replace(location, combined_json_str)
    
    def call_llm(self, prompt,as_json, temperature, max_retries,output_path):
        print("[INFO] Calling LLM...")
        for attempt in range(1, max_retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"} if as_json else None,
                    temperature=temperature
                )

                content = response.choices[0].message.content
                result = json.loads(content) if as_json else content
                # print(result)
                self.save_result(result, output_path)
                return result

            except Exception as e:
                print(f"[Retry {attempt}/{max_retries}] Failed connection {e}")
                if attempt == max_retries:
                    self._save_log(prompt, {"error": str(e)}, success=False)
                    raise RuntimeError("LLM call failed after maximum retries.") from e
    def call_llm_with_images(self, prompt, image_inputs, as_json, temperature, max_retries):

        print("[INFO] Calling GPT with multimodal inputs...")

        for attempt in range(1, max_retries + 1):
            try:
                messages = [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}] + image_inputs
                    }
                ]

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={"type": "json_object"} if as_json else None,
                    temperature=temperature,
                )

                content = response.choices[0].message.content
                result = json.loads(content) if as_json else content
                
                return result

            except Exception as e:
                print(f"[Retry {attempt}/{max_retries}] Failed multimodal call: {e}")
                if attempt == max_retries:
                    self._save_log(prompt, {"error": str(e)}, success=False)
                    raise RuntimeError("LLM multimodal call failed after maximum retries.") from e

    def save_result(self,result, output_path):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)  

        if isinstance(result, (dict, list)):
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"Json saved: {output_path}")

        elif isinstance(result, str):
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result)
            print(f"Text saved: {output_path}")

        else:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(str(result))
            print(f"File saved: {output_path}")

# # ------------------------------------------------------------
# # ✅ 示例运行（独立调试）
# # ------------------------------------------------------------
# if __name__ == "__main__":
#     llm = LLMClient(model="gpt-4o-mini")
#     data = {
#   "rubric": "3\n\nMarking Criteria:\n\n1. Technical contents: 20 marks: a. Critical and in-depth investigation on the case project; b. Precise understanding and critical analysis for the relationship between identified challenges; c. Extensive review on local and international best practice in construction; d. Constructive suggestions for future development.\n\n2. Following the requirements: 5 marks: a. Cover sheet b. Title of the report c. Executive summary d. Professional engineering report layout e. Page number f. Page limit g. Font size and spacing\n\n3. Writing & referencing: 5 marks: a. Proper English used in writing b. Structure and logic of the report c. Figures and charts, e.g. Figure no. and captions, in-text analysis of the figures d. List of references e. Harvard formatting as specified in UNSW website f. In-text citations",
#   "assignment_requirement": "1 CVEN9723 Design of Construction Operations Term 3, 2024\n\nGroup Assignment: Grand Challenges in Australian Construction:\n\nIndustry: Due time and date: 18:00, Wednesday, 20 November 2024, Week 11 Method of submission: Softcopy only, submit your group report through Turnitin under the Moodle’s “Assessments” section.  Only ONE copy of each report needs to be submitted from each group.  After submitting in Moodle, always check what you have submitted. Weight of the assignment: 30 Marks Late submission penalty: Submit as early as possible since a deduction of 6 marks will occur for every calendar day after the due time and date has expired. Scope of Assignment You are to work in a group up to 4 students and identify grand challenges faced by the Australian construction industry nowadays. Your group should investigate in ONE of the following projects and present a case study based on identified challenges. • Snowy 2.0 Pumped Hydro Project; •\n\nSydney Metro West Project;: • Parramatta Light Rail Project. You group is required to review the selected case and write a technical report while covering\n\nthe following aspects: 1. Introduction to the case project, and identification of main challenges faced in the project; 2. Investigation on the reasons causing those problems in this case, and critical analysis of intrinsic connection between identified challenges;\n\n3. Review of the best practice of similar projects locally and globally;:\n\n4. Discussion on future development and opportunities in addressing those grand: challenges in the construction industry.\n\nRequirements: It is expected that your group report submission will be at industry professional standard with regards its: written content, set-out, spacing, headings, paragraphing, sentence structure and spelling, the inclusion of any charts, diagrams, maps or pictures, in-text referencing (to Harvard Standard) and referral to any appendix material. a. Prepare your report in Adobe PDF. b. Title your submission file: CVEN9723_Group#_Report.pdf. For example,\n\nCVEN9723_Group12_Report.pdf.: 2 c. Include a scan copy of the cover sheet on the first page of your report.  The blank cover sheet was provided in Moodle.  Make sure each of the group members has printed her/his student ID, full name and signed the cover sheet.  The one-page cover sheet will not be counted in the length of the report. d. No additional cover page. e. Use 11 points Arial, single line spacing. f. Length – Maximum 10 pages (including appendices, figures and tables, and references). g. Add page number “#” in the footers.  Nothing else in headers or footers. h. Proofread for spelling and grammar. i. Use third person (not first or second person). j. Prepare in-text citations and a list of references following the Harvard Referencing\n\nsystem. A detailed guide can be found from UNSW website: https://student.unsw.edu.au/harvard-referencing. k. Material (text, figures, tables) copied from elsewhere, and not acknowledged, is referred to as plagiarism and represents academic misconduct for which students can fail a course and can have their enrolment cancelled. l. Any text from another source needs inverted commas around it, together with a citation of Author (year) and the page number of the quote.  Any figure or table from another source needs a citation in the figure/table caption. Then give full referencing under 'References' at the end. 3\n\nMarking Criteria:\n\n1. Technical contents: 20 marks: a. Critical and in-depth investigation on the case project; b. Precise understanding and critical analysis for the relationship between identified challenges; c. Extensive review on local and international best practice in construction; d. Constructive suggestions for future development.\n\n2. Following the requirements: 5 marks: a. Cover sheet b. Title of the report c. Executive summary d. Professional engineering report layout e. Page number f. Page limit g. Font size and spacing\n\n3. Writing & referencing: 5 marks: a. Proper English used in writing b. Structure and logic of the report c. Figures and charts, e.g. Figure no. and captions, in-text analysis of the figures d. List of references e. Harvard formatting as specified in UNSW website f. In-text citations"
# }
#     prompt_template = llm.load_prompt("rubric_generation.md",data,"{{combined_json}}")
#     print(prompt_template)
#     output_path = "/Users/chenjo/Desktop/UNSW/2025/9900/AI_Moule/artifacts/rubric/generated_rubric.json"
#     result = llm.call_llm(prompt_template, True,0.2,  3,output_path)
#     # print(json.dumps(result, indent=2, ensure_ascii=False))