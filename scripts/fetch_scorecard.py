#!/usr/bin/env python3
"""Fetch College Scorecard data for 50 target colleges via API."""
import json, time, urllib.request, urllib.parse, os, sys

API_KEY = os.environ.get("SCORECARD_API_KEY", "DEMO_KEY")
BASE = "https://api.data.gov/ed/collegescorecard/v1/schools.json"

COLLEGES = [
    # Ivy League
    "Harvard University", "Yale University", "Princeton University",
    "Columbia University in the City of New York", "University of Pennsylvania",
    "Brown University", "Cornell University", "Dartmouth College",
    # Elite National
    "Stanford University", "Massachusetts Institute of Technology",
    "California Institute of Technology", "University of Chicago",
    "Duke University", "Johns Hopkins University", "Northwestern University",
    "Rice University", "Vanderbilt University", "Washington University in St Louis",
    "University of Notre Dame", "Georgetown University", "Emory University",
    "Carnegie Mellon University", "University of California-Los Angeles",
    # LACs
    "Williams College", "Amherst College", "Swarthmore College",
    "Pomona College", "Wellesley College", "Bowdoin College",
    "Carleton College", "Claremont McKenna College", "Middlebury College",
    "Colby College", "Grinnell College", "Hamilton College",
    "Haverford College", "Vassar College", "Harvey Mudd College",
    "Colgate University", "Oberlin College", "Smith College",
    "Bates College", "Rose-Hulman Institute of Technology",
    "Cooper Union for the Advancement of Science and Art",
    # STEM
    "Georgia Institute of Technology-Main Campus",
    "Purdue University-Main Campus",
    "Virginia Polytechnic Institute and State University",
    "California Polytechnic State University-San Luis Obispo",
    "Rensselaer Polytechnic Institute",
    "Worcester Polytechnic Institute",
]

FIELDS = [
    "id", "school.name", "school.city", "school.state", "school.school_url",
    "school.control", "school.degrees_awarded.predominant",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.average.overall",
    "latest.admissions.act_scores.midpoint.cumulative",
    "latest.cost.tuition.consumer_price_by_income",
    "latest.cost.avg_cost_of_attendance",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.cost.roomboard.oncampus",
    "latest.cost.net_price.consumer_price_by_income",
    "latest.cost.net_price.by_income.0-30000",
    "latest.cost.net_price.by_income.30001-48000",
    "latest.cost.net_price.by_income.48001-75000",
    "latest.cost.net_price.by_income.75001-110000",
    "latest.cost.net_price.by_income.110001-plus",
    "latest.student.size",
    "latest.student.demographics.race_ethnicity",
    "latest.student.demographics.women",
    "latest.student.demographics.men",
    "latest.student.demographics.pctPELL",
    "latest.student.demographics.first_generation",
    "latest.student.demographics.race_ethnicity.white",
    "latest.student.demographics.race_ethnicity.black",
    "latest.student.demographics.race_ethnicity.hispanic",
    "latest.student.demographics.race_ethnicity.asian",
    "latest.student.demographics.race_ethnicity.aian",
    "latest.student.demographics.race_ethnicity.nhpi",
    "latest.student.demographics.race_ethnicity.two_or_more",
    "latest.student.demographics.race_ethnicity.non_resident_alien",
    "latest.aid.pell_grant_rate",
    "latest.aid.federal_loan_rate",
    "latest.aid.median_debt.completers.overall",
    "latest.aid.any_financial_aid",
    "latest.outcomes.completion_rate_4yr_150pt",
    "latest.outcomes.retention_rate.four_year.overall",
    "latest.earnings.10_yrs_after_entry.median",
    "latest.earnings.6_yrs_after_entry.median",
    "latest.student.faculty_ratio",
]

OUT_DIR = "/home/admin/college-advisor-agent/data/colleges"
os.makedirs(OUT_DIR, exist_ok=True)

results = {}
errors = []

for i, name in enumerate(COLLEGES):
    print(f"[{i+1}/{len(COLLEGES)}] Fetching: {name}...", end=" ", flush=True)
    
    params = {
        "school.name": name,
        "fields": ",".join(FIELDS),
        "api_key": API_KEY,
    }
    url = BASE + "?" + urllib.parse.urlencode(params)
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CollegeAdvisor/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        
        if data["metadata"]["total"] == 0:
            print("NOT FOUND")
            errors.append(name)
            continue
        
        row = data["results"][0]
        results[name] = row
        print(f"OK (id={row.get('id')})")
        
    except Exception as e:
        print(f"ERROR: {e}")
        errors.append(f"{name}: {e}")
    
    # Rate limit: DEMO_KEY allows ~30/hr, be conservative
    if API_KEY == "DEMO_KEY":
        time.sleep(2.5)
    else:
        time.sleep(0.5)

# Save all results
out_file = os.path.join(OUT_DIR, "_scorecard_raw.json")
with open(out_file, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n{'='*60}")
print(f"Results: {len(results)}/{len(COLLEGES)} colleges fetched")
print(f"Errors: {len(errors)}")
if errors:
    for e in errors:
        print(f"  - {e}")
print(f"Output: {out_file}")
print(f"Size: {os.path.getsize(out_file)/1024:.1f} KB")
