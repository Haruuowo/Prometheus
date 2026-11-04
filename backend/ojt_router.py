import os
import io
import re
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import docx

router = APIRouter(prefix="/api/ojt", tags=["OJT Practicum Hub"])

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "ojt_templates"
JOURNALS_DIR = TEMPLATES_DIR / "2During OJT & Journals"
CHECKLIST_FILE = TEMPLATES_DIR / "1Pre-OJT Forms" / "Requirements Checklist.txt"

PRE_OJT_CHECKLIST_DEFAULT = [
    {
        "id": "req_1",
        "title": "Online Orientation Attendance Form",
        "detail": "Accomplished & submitted via Google Forms (Crucial requirement)",
        "paper_size": "Online Form",
        "required": True,
    },
    {
        "id": "req_2",
        "title": "Endorsement Letter",
        "detail": "Must be signed first by the OJT coordinator",
        "paper_size": "Letter-sized paper only (8.5 x 11 in)",
        "required": True,
    },
    {
        "id": "req_3",
        "title": "Waiver",
        "detail": "Signed by student and acknowledged by university",
        "paper_size": "Letter-sized paper only (8.5 x 11 in)",
        "required": True,
    },
    {
        "id": "req_4",
        "title": "Practicum Training Agreement",
        "detail": "Tripartite agreement between student, company, and university",
        "paper_size": "Letter-sized paper only (8.5 x 11 in)",
        "required": True,
    },
    {
        "id": "req_5",
        "title": "Parental Consent",
        "detail": "Signed by parent or legal guardian with valid ID attached",
        "paper_size": "Letter-sized paper only (8.5 x 11 in)",
        "required": True,
    },
    {
        "id": "req_6",
        "title": "Acceptance Letter",
        "detail": "Official acceptance letter from host training company",
        "paper_size": "Letter-sized paper only (8.5 x 11 in)",
        "required": True,
    },
]


class DayEntry(BaseModel):
    date: str = ""
    time_in: str = "08:00 AM"
    time_out: str = "05:00 PM"
    hours: str = "8.0"
    report: str = ""


class ExportDocxRequest(BaseModel):
    week_number: int = 1
    student_name: str = "Student Name"
    supervisor_name: str = "Supervisor Name"
    company_name: str = "Company Name"
    sign_date: str = ""
    caption: Optional[str] = ""
    days: List[DayEntry] = []
    total_hours: Optional[str] = ""


class GenerateTasksRequest(BaseModel):
    role: str = "Software Engineer Intern"
    tech_stack: Optional[str] = "React, Tailwind, Node.js, REST APIs"
    focus_topic: Optional[str] = "Frontend feature build & API testing"
    days_count: int = 5


@router.get("/requirements")
async def get_ojt_requirements():
    return {
        "checklist": PRE_OJT_CHECKLIST_DEFAULT,
        "instructions": (
            "All printed forms (Items 2-6) shall be in letter-sized paper only. "
            "Not long, not A4. Incomplete documents will not be approved for signing by the Dean."
        ),
        "total_weeks": 16,
        "default_target_hours": 300,
    }


TASK_TEMPLATES = [
    [
        "Attended morning sprint standup to review task board and milestone priorities.",
        "Refactored React components and aligned Tailwind utility classes with UI specifications.",
        "Tested component responsiveness across mobile and desktop viewport widths.",
    ],
    [
        "Investigated and debugged state synchronization issue in client dashboard.",
        "Added error boundaries and user-friendly toast notifications for network failures.",
        "Conducted code review with senior developer and addressed PR feedback.",
    ],
    [
        "Implemented REST API service integration using Fetch API with bearer token auth.",
        "Handled asynchronous loading states, empty fallback UI, and cached responses.",
        "Validated schema inputs using client-side validation logic.",
    ],
    [
        "Collaborated with UI/UX designer to refine typography, spacing, and accessibility contrast.",
        "Optimized asset bundle sizes and lazy-loaded heavy page components.",
        "Documented updated component props and API payloads in the internal knowledge base.",
    ],
    [
        "Created unit test cases for core utility helper functions.",
        "Participated in weekly sprint demo, presented newly built features to team lead.",
        "Logged week accomplishments, pushed commits to Git repository, and prepared handoff notes.",
    ],
]


@router.post("/generate-tasks")
async def generate_tasks(req: GenerateTasksRequest):
    count = min(max(req.days_count, 1), 6)
    role = req.role.strip() or "Software Engineer Intern"
    stack = req.tech_stack.strip() or "React, TypeScript, APIs"
    topic = req.focus_topic.strip() or "Feature development"

    results = []
    for i in range(count):
        tmpl = TASK_TEMPLATES[i % len(TASK_TEMPLATES)]
        custom_report = f"[{role} - {topic}]\n" + "\n".join(f"- {line}" for line in tmpl)
        results.append({
            "day_index": i + 1,
            "time_in": "08:00 AM",
            "time_out": "05:00 PM",
            "hours": "8.0",
            "report": custom_report,
        })

    return {"ok": True, "generated_days": results}


@router.post("/export-docx")
async def export_weekly_journal_docx(req: ExportDocxRequest):
    # Locate template docx
    week_num = max(1, min(16, req.week_number))
    wk_str = f"Wk{week_num:02d}"
    
    # Try finding exact week template or fallback to Wk01
    template_file = JOURNALS_DIR / f"LastNameFirstName_{wk_str} SOC-OJT Weekly Journal.docx"
    if not template_file.exists():
        template_file = JOURNALS_DIR / "LastNameFirstName_Wk01 SOC-OJT Weekly Journal.docx"
    
    if not template_file.exists():
        # Fallback to search any docx in journals
        found = list(JOURNALS_DIR.glob("*.docx"))
        if not found:
            raise HTTPException(status_code=404, detail="OJT Weekly Journal template not found on server.")
        template_file = found[0]

    doc = docx.Document(str(template_file))

    # Table 0: Attendance and tasks
    if len(doc.tables) > 0:
        t0 = doc.tables[0]
        # Rows 1 to 6 are the daily entries
        for idx in range(6):
            row_idx = idx + 1
            if row_idx < len(t0.rows) - 1:
                row = t0.rows[row_idx]
                if idx < len(req.days):
                    day = req.days[idx]
                    if len(row.cells) > 0:
                        row.cells[0].text = day.date or ""
                    if len(row.cells) > 1:
                        row.cells[1].text = day.time_in or ""
                    if len(row.cells) > 2:
                        row.cells[2].text = day.time_out or ""
                    if len(row.cells) > 3:
                        row.cells[3].text = str(day.hours) if day.hours else ""
                    if len(row.cells) > 4:
                        row.cells[4].text = day.report or ""
                else:
                    if len(row.cells) > 0: row.cells[0].text = ""
                    if len(row.cells) > 1: row.cells[1].text = ""
                    if len(row.cells) > 2: row.cells[2].text = ""
                    if len(row.cells) > 3: row.cells[3].text = ""
                    if len(row.cells) > 4: row.cells[4].text = ""

        # Summary row: typically row 7
        summary_row = t0.rows[-1]
        if len(summary_row.cells) >= 4:
            summary_row.cells[1].text = str(week_num)
            # Calculate or set total hours
            if req.total_hours:
                tot = req.total_hours
            else:
                try:
                    tot_num = sum(float(d.hours) for d in req.days if d.hours)
                    tot = f"{tot_num:.1f}" if tot_num % 1 != 0 else str(int(tot_num))
                except Exception:
                    tot = "0"
            summary_row.cells[3].text = tot

    # Table 1: Student signature
    if len(doc.tables) > 1:
        t1 = doc.tables[1]
        if len(t1.rows) > 1:
            t1.rows[1].cells[0].text = req.student_name or ""
            if len(t1.rows[1].cells) > 2:
                t1.rows[1].cells[2].text = req.sign_date or ""

    # Table 2: Supervisor signature
    if len(doc.tables) > 2:
        t2 = doc.tables[2]
        if len(t2.rows) > 1:
            t2.rows[1].cells[0].text = req.supervisor_name or ""
            if len(t2.rows[1].cells) > 2:
                t2.rows[1].cells[2].text = req.sign_date or ""

    # Update caption paragraph & company name
    for p in doc.paragraphs:
        if "Pic here with captions" in p.text and req.caption:
            p.text = f"Documentation: {req.caption}"
        if "Company Name:" in p.text and req.company_name:
            p.text = f"Company Name: {req.company_name}"

    out_stream = io.BytesIO()
    doc.save(out_stream)
    out_stream.seek(0)

    # Clean student filename
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', req.student_name) or "Student"
    filename = f"{clean_name}_Wk{week_num:02d} SOC-OJT Weekly Journal.docx"

    return Response(
        content=out_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

