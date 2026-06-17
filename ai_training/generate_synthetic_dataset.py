#!/usr/bin/env python3
"""Generate synthetic resumes, job descriptions, and labeled resume-JD pairs.

Usage:
  python backend/tools/generate_synthetic_dataset.py --resumes 1000 --jds 500 --out data/synthetic --formats txt,md,docx

The script always writes TXT and MD. DOCX/PDF are optional if dependencies are installed.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import random
from datetime import date
from pathlib import Path
import textwrap
import zipfile

SKILLS = [
    "Python",
    "Java",
    "C++",
    "JavaScript",
    "React",
    "Node.js",
    "Django",
    "Flask",
    "FastAPI",
    "Docker",
    "Kubernetes",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "AWS",
    "GCP",
    "Azure",
    "TensorFlow",
    "PyTorch",
    "Pandas",
    "NumPy",
    "Spark",
    "Tableau",
    "PowerBI",
    "Linux",
]

COMPANIES = [
    "Acme Systems","NexGen Labs","Pioneer Tech","BlueWave Solutions","Vertex AI","Horizon Cloud","Summit Dynamics",
    "Apexware","Orchid Analytics","LatticeWorks","VectorSoft","Clearwater Consulting","Atlas Networks",
]

UNIS = [
    "University of California, Berkeley","Massachusetts Institute of Technology","Stanford University",
    "University of Oxford","University of Cambridge","National University","IIT Bombay","University of Toronto",
]

CERTS = ["AWS Certified Solutions Architect","Google Cloud Professional Data Engineer","Certified Kubernetes Administrator","PMP","Certified Scrum Master","Cisco CCNA"]

FIRST = ["Alex","Jordan","Taylor","Morgan","Casey","Riley","Jamie","Chris","Sam","Robin","Lee","Drew","Avery"]
LAST = ["Smith","Johnson","Lee","Brown","Garcia","Martinez","Davis","Lopez","Wilson","Anderson","Thomas","Taylor"]


def random_name():
    return f"{random.choice(FIRST)} {random.choice(LAST)}"


def _seniority_from_years(years: int) -> str:
    if years <= 1:
        return "Intern / Entry"
    if years <= 3:
        return "Junior"
    if years <= 6:
        return "Mid"
    if years <= 10:
        return "Senior"
    return "Lead / Principal"


def _year_range_from_years(total_years: int, entries: int) -> list[str]:
    # produce plausible date ranges for the experience entries
    today = date.today()
    end_year = today.year
    ranges = []
    remaining = total_years
    for i in range(entries, 0, -1):
        # allocate years for this role (at least 1)
        if i == 1:
            yrs = remaining
        else:
            max_for_this = max(1, remaining - (i - 1))
            yrs = random.randint(1, max_for_this)
        start = end_year - yrs + 1
        ranges.append(f"{start} - {end_year}")
        end_year = start - 1
        remaining -= yrs
    return list(reversed(ranges))


def make_resume_text(candidate_id: str, skills: list[str], years: int, title: str) -> str:
    seniority = _seniority_from_years(years)
    contact = f"Email: {candidate_id}@example.com | Phone: +1-555-{random.randint(1000,9999)} | Location: {random.choice(['Remote','San Francisco, CA','New York, NY','London, UK','Berlin, DE'])}"
    summary = f"{seniority} {title} with {years} years of experience building reliable, scalable systems. Strong background in {', '.join(skills[:4])}."

    # experience entries
    entries = min(4, max(1, years // 2 + 1))
    ranges = _year_range_from_years(years if years>0 else 1, entries)
    exp_sections = []
    for idx in range(entries):
        comp = random.choice(COMPANIES)
        role = title if idx == 0 else random.choice([f"{title}", f"Senior {title}", f"{title} II", f"Principal {title}", f"Lead {title}"])
        period = ranges[idx]
        bullets = []
        # produce 2-5 achievement bullets
        for _ in range(random.randint(2,5)):
            skill = random.choice(skills)
            metric = random.choice(["reduced latency by 30%","increased throughput by 2x","cut costs by 25%","improved test coverage to 85%","launched feature used by 100k+ users","reduced failure rate by 40%"])
            bullets.append(f"- {metric} using {skill} and cross-functional collaboration.")
        exp_sections.append(textwrap.dedent(f"""
        {role} — {comp}
        {period}

        """ ) + "\n".join(bullets))

    education = f"{random.choice(UNIS)} — {random.choice(['B.Sc.','M.Sc.','B.Eng.','Ph.D.'])} in {random.choice(['Computer Science','Electrical Engineering','Data Science','Software Engineering'])}"
    certs = random.sample(CERTS, k=random.randint(0,2))

    body = [f"{title}", contact, "", "Summary:", summary, "", "Skills:", ", ".join(skills), "", "Experience:"]
    body += exp_sections
    body += ["", "Education:", education]
    if certs:
        body += ["", "Certifications:", ", ".join(certs)]
    # project snippet
    if random.random() < 0.6:
        proj = f"Personal Project: Built a {random.choice(['recommendation engine','data pipeline','microservice','automation tool'])} using {random.choice(skills)} that {random.choice(['streamlines workflows','processes 100k events/hour','recommends relevant items','reduces manual effort'])}."
        body += ["", proj]

    return "\n\n".join(body)


def make_jd_text(jd_id: str, title: str, required_skills: list[str], seniority: str | None = None) -> str:
    seniority = seniority or random.choice(["Junior","Mid","Senior","Lead","Principal"]) 
    location = random.choice(["Remote","San Francisco, CA","New York, NY","London, UK","Berlin, DE","Austin, TX"]) 
    employment = random.choice(["Full-time","Part-time","Contract","Temporary"])
    salary_base = {
        "Junior": (60000,90000),
        "Mid": (90000,130000),
        "Senior": (120000,180000),
        "Lead": (150000,220000),
        "Principal": (180000,260000),
    }
    smin, smax = salary_base.get(seniority, (80000,140000))
    salary = f"${random.randint(smin//1000, smax//1000)*1000:,} - ${random.randint(smin//1000, smax//1000)*1000:,}"
    responsibilities = [
        f"Design, build and operate {random.choice(['scalable services','data pipelines','machine learning models','cloud-native applications'])} using {', '.join(required_skills[:3])}.",
        "Collaborate with product and engineering teams to define and deliver features.",
        "Write automated tests and maintain high code quality and observability.",
        "Mentor junior engineers and participate in code reviews." if seniority in ("Senior","Lead","Principal") else "",
    ]
    responsibilities = [r for r in responsibilities if r]
    benefits = ["Health insurance","Flexible hours","401(k) matching","Remote-friendly","Learning stipend"]
    body = [f"{title} — {seniority}", f"Location: {location} | Employment: {employment}", f"Salary range: {salary}", "", "About the role:", f"We are seeking a {seniority} {title} to join our engineering team. The ideal candidate has hands-on experience with {', '.join(required_skills[:4])}.", "", "Responsibilities:"]
    body += [f"- {r}" for r in responsibilities]
    body += ["", "Qualifications:", f"Required: {', '.join(required_skills[:6])}", f"Preferred: {', '.join(random.sample(SKILLS, k=min(6, len(SKILLS))))}"]
    body += ["", "Benefits:", ", ".join(random.sample(benefits, k=3))]
    body += ["", "How to apply:", "Please submit a resume and short cover letter describing your experience."]
    return "\n\n".join(body)


def write_text(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_md(path: Path, text: str):
    write_text(path, text)


def try_write_docx(path: Path, text: str):
    try:
        from docx import Document
    except Exception:
        return False
    doc = Document()
    for line in text.splitlines():
        doc.add_paragraph(line)
    doc.save(path)
    return True


def generate(resumes: int, jds: int, out: Path, formats: list[str], positive_per_jd: int = 20):
    random.seed(42)
    out = Path(out)
    resumes_dir = out / "resumes"
    jds_dir = out / "job_descriptions"
    resumes_dir.mkdir(parents=True, exist_ok=True)
    jds_dir.mkdir(parents=True, exist_ok=True)

    resume_meta = []
    for i in range(1, resumes + 1):
        rid = f"r{i:06d}"
        name = random_name()
        # sample years with a realistic distribution (more juniors than very senior)
        years = int(min(25, abs(int(random.gauss(5, 4)))))
        skills = random.sample(SKILLS, k=random.randint(5, 12))
        title = random.choice(["Software Engineer","Data Scientist","DevOps Engineer","Backend Engineer","Frontend Engineer","Full Stack Engineer","ML Engineer","Product Manager","Data Engineer"]) 
        text = make_resume_text(rid, skills, years, title)
        # write formats
        write_text(resumes_dir / "txt" / f"{rid}.txt", text)
        write_md(resumes_dir / "md" / f"{rid}.md", f"# {name}\n\n" + text)
        if "docx" in formats:
            try_write_docx(resumes_dir / "docx" / f"{rid}.docx", text)
        resume_meta.append({"resume_id": rid, "name": name, "title": title, "skills": skills})

    jd_meta = []
    for j in range(1, jds + 1):
        jid = f"jd{j:05d}"
        title = random.choice(["Software Engineer","Data Scientist","DevOps Engineer","Backend Engineer","Frontend Engineer","ML Engineer","Product Manager","Data Engineer"]) 
        req_skills = random.sample(SKILLS, k=random.randint(4, 10))
        seniority = random.choice([None, "Junior", "Mid", "Senior", "Lead"]) if random.random() < 0.8 else None
        text = make_jd_text(jid, title, req_skills, seniority=seniority)
        write_text(jds_dir / "txt" / f"{jid}.txt", text)
        write_md(jds_dir / "md" / f"{jid}.md", f"# {title}\n\n" + text)
        if "docx" in formats:
            try_write_docx(jds_dir / "docx" / f"{jid}.docx", text)
        jd_meta.append({"jd_id": jid, "title": title, "req_skills": req_skills})

    # build positive/negative pairs
    pairs_path = out / "labels" / "matches.csv"
    pairs_path.parent.mkdir(parents=True, exist_ok=True)
    with pairs_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["resume_id", "jd_id", "label"])
        # for each JD, sample positive_per_jd positive resumes (may repeat across JDs)
        for jd in jd_meta:
            pos = random.sample(resume_meta, k=min(positive_per_jd, len(resume_meta)))
            pos_ids = {r["resume_id"] for r in pos}
            for r in pos:
                writer.writerow([r["resume_id"], jd["jd_id"], 1])
            # sample negatives: equal number
            neg_candidates = [r for r in resume_meta if r["resume_id"] not in pos_ids]
            neg = random.sample(neg_candidates, k=min(len(pos), len(neg_candidates))) if neg_candidates else []
            for r in neg:
                writer.writerow([r["resume_id"], jd["jd_id"], 0])

    # write metadata JSON
    (out / "resumes" / "meta.json").write_text(json.dumps(resume_meta, indent=2))
    (out / "job_descriptions" / "meta.json").write_text(json.dumps(jd_meta, indent=2))
    print(f"Generated {resumes} resumes, {jds} job descriptions, labels at {pairs_path}")


def make_zip(out: Path, zip_path: Path):
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in __import__("os").walk(out):
            for f in files:
                full = Path(root) / f
                arc = full.relative_to(out)
                zf.write(full, arc)
    print(f"Wrote zip archive {zip_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--resumes", type=int, default=1000)
    parser.add_argument("--jds", type=int, default=500)
    parser.add_argument("--out", type=str, default="data/synthetic")
    parser.add_argument("--formats", type=str, default="txt,md")
    parser.add_argument("--positive-per-jd", type=int, default=20)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--zip", action="store_true", help="Create a zip archive of the output")
    parser.add_argument("--zip-path", type=str, default=None, help="Path for the zip archive (overrides default)")
    args = parser.parse_args()
    formats = [f.strip() for f in args.formats.split(",") if f.strip()]
    random.seed(args.seed)
    generate(args.resumes, args.jds, Path(args.out), formats, positive_per_jd=args.positive_per_jd)
    if args.zip:
        zp = Path(args.zip_path) if args.zip_path else Path(args.out).with_suffix(".zip")
        make_zip(Path(args.out), zp)


if __name__ == "__main__":
    main()
