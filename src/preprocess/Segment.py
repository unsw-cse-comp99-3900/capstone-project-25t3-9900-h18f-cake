'''
return format:
{
    "sections": [
    {
        "section": "Introduction",
        "category": "introduction",
        "paras": [{"para_id": 3, "text": "Introduction: ..."}, ...],
        "full_text": "Introduction: ...\n\n..."
    },
    ...
    ],
    "extras": {
    "unknown_headings": [{"title": "Best Practices Review", "count": 1}]
    }
}
'''
import re

from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
import os
from Clean import TextCleaner
from Loader import DataLoader

class Segmenter:
    def __init__(self):
        self.re_trailing_colon = re.compile(r"[:：]\s*$")
        self.unknown_headings: Dict[str, int] = {}
        self.label_idx = {} 
        self.section_keyword = {
        "front_matter": [
            "Title Page", "Cover Page", "Front Matter", "Abstract Page",
            "Acknowledgement of Country", "Declaration", "Statement of Originality",
            "Academic Integrity", "Plagiarism Statement"
        ],
        "toc_lists": [
            "Table of Contents", "Contents", "List of Figures", "List of Tables",
            "List of Abbreviations", "Acronyms", "Nomenclature", "Glossary"
        ],
        "summary": [
            "Abstract", "Summary", "Executive Summary", "Overview",
            "Key Insights", "Key Findings", "Highlights"
        ],

        "introduction": [
            "Introduction", "Background", "Context", "Motivation",
            "Problem Statement", "Research Questions", "Hypothesis",
            "Aim", "Aims and Objectives", "Contribution", "Significance"
        ],
        "related_work": [
            "Literature Review", "Related Work", "Prior Work",
            "State of the Art", "Background and Related Work"
        ],

        "objectives_scope": [
            "Objectives", "Goals", "Scope", "Out of Scope",
            "Mission", "Vision", "Success Criteria", "Acceptance Criteria"
        ],
        "requirements_spec": [
            "Requirements", "Specifications", "System Requirements",
            "Functional Requirements", "Non-Functional Requirements",
            "Use Cases", "User Stories", "Constraints", "Assumptions"
        ],

        "methodology_design": [
            "Method", "Methods", "Methodology", "Approach", "Framework",
            "Design", "System Design", "Architecture", "Algorithm",
            "Implementation", "Workflow", "Pipeline", "Experimental Setup",
            "Materials and Methods", "Data Collection", "Study Design"
        ],
        "data_materials": [
            "Data", "Dataset", "Data Sources", "Data Preparation",
            "Preprocessing", "Feature Engineering", "Materials",
            "Software and Tools", "Hardware", "Bill of Materials", "BOM"
        ],

        "experiments_evaluation": [
            "Experiment", "Experiments", "Experimental Results",
            "Evaluation", "Testing", "Validation", "User Study",
            "Study Protocol", "Metrics", "Evaluation Metrics", "Baselines",
            "Ablation Study", "Error Analysis", "Case Study", "Benchmarking", "Performance"
        ],

        "results_analysis": [
            "Results", "Findings", "Observations", "Analysis",
            "Statistical Analysis", "Qualitative Analysis",
            "Quantitative Analysis", "Interpretation"
        ],
        "discussion_insights": [
            "Discussion", "Discussion and Analysis", "Insights",
            "Implications", "Managerial Implications", "Practical Implications",
            "Lessons Learned"
        ],

    
        "threats_limitations": [
            "Threats to Validity", "Internal Validity", "External Validity",
            "Limitations", "Risks", "Risk Assessment", "Mitigation",
            "Assumptions and Limitations"
        ],

        "business_analysis": [
            "Market Analysis", "Competitor Analysis", "SWOT Analysis",
            "PEST", "PESTLE", "Stakeholder Analysis", "Cost-Benefit Analysis",
            "ROI Analysis", "Feasibility Study"
        ],
        "project_management": [
            "Project Plan", "Project Management", "Timeline", "Roadmap",
            "Milestones", "Work Breakdown Structure", "WBS",
            "Resource Plan", "Budget", "Risk Management", "Change Management",
            "Communication Plan", "Deployment Plan", "Rollout Plan", "Go-To-Market"
        ],

        "conclusion_future": [
            "Conclusion", "Conclusions", "Final Remarks",
            "Summary of Findings", "Recommendations", "Proposed Actions",
            "Next Steps", "Future Work", "Outlook"
        ],

        "ethics_compliance": [
            "Ethics", "Ethical Considerations", "Ethics Approval",
            "Informed Consent", "Data Privacy", "Data Protection",
            "Compliance", "Regulatory Compliance", "Standards Compliance"
        ],
        "meta_ack": [
            "Acknowledgements", "Acknowledgments", "Funding",
            "Funding Statement", "Grant Information", "Author Contributions",
            "Conflict of Interest", "Competing Interests",
            "Data Availability", "Availability of Data and Materials",
            "Reproducibility", "Open Science Statement"
        ],

        "references_appendix": [
            "References", "Bibliography", "Works Cited", "Citations",
            "Notes", "Footnotes", "Endnotes", "Appendix",
            "Appendices", "Annex", "Annexes", "Supplementary Material",
            "Supporting Information", "Attachments"
        ],
    }
        for label, kws in self.section_keyword.items():
            for kw in kws:
                self.label_idx[kw.lower()] = label  
        # print(self.label_idx)
        print('segment init finished')

    def section_categorize(self, text):
        if not text:
            return "", None
        
        title = text.split(':', 1)[0].strip().lower()
        if title in self.label_idx:
            return title, self.label_idx[title]
        else:
            self.unknown_headings[title] = self.unknown_headings.get(title, 0) + 1
            return title, None
    def seg_sum(self, text):
        sections = []
        extras = {}

        for para in text:
            para_id = para["para_id"]
            para_text = para["text"]
            title, label = self.section_categorize(para_text)
            if label:
                target = None
                for s in sections:
                    if s["category"] == label:
                        target = s
                        break
                if not target:
                    target = {
                        "section": title if title else "",
                        "category": label,
                        "para_id": [],
                        "full_text": []
                    }
                    sections.append(target)
                target["para_id"].append(para_id)
                text_append = para_text.split(':', 1)[1].strip() if ':' in para_text else para_text
                target["full_text"].append(''.join([text_append, ""]) if text_append else "")
            else:
                if title not in extras:
                    bucket = extras.setdefault(title, {"paras_id": [], "full_text": []})
                    bucket["paras_id"].append(para_id)
                    bucket["full_text"].append(text)
        return {"sections": sections,"extras": extras}   


if __name__ == "__main__":
    from pprint import pprint

    loader = DataLoader()
    text_c = TextCleaner()
    seg = Segmenter()
    sample_path = "/Users/chenjo/Desktop/UNSW/2025/9900/AI_Moule/data/raw/a1_z1_tutor.pdf"

    if os.path.exists(sample_path):
        record = loader.metadata_extraction(sample_path)
        text_recd = loader.load_file(sample_path)
        # print(text_recd)
        bc = text_c.process(text_recd)
        # print(bc['paragraphs'])
        
        a = seg.seg_sum(bc['paragraphs'])
        print(a["sections"])

            
    else:
        print(f"[WARNing]")