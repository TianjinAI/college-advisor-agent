#!/usr/bin/env python3
"""Fix mismatched colleges by re-fetching with city/state verification."""
import json, time, urllib.request, urllib.parse, os, re

API_KEY = "kaL0O9N4nZcllaOXgSBfHTMlZYuB4t07LF9itmrL"
BASE = "https://api.data.gov/ed/collegescorecard/v1/schools.json"
RAW_FILE = "/home/admin/college-advisor-agent/data/colleges/_scorecard_raw.json"

# Schools that were mismatched + their expected city/state
FIXES = {
    "Brown University": {"city": "Providence", "state": "RI"},
    "California Institute of Technology": {"city": "Pasadena", "state": "CA"},
    "Colby College": {"city": "Waterville", "state": "ME"},
    "Cornell University": {"city": "Ithaca", "state": "NY"},
}

FIELDS = [
    "id", "school.name", "school.city", "school.state", "school.school_url",
    "school.control", "school.degrees_awarded.predominant",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.average.overall",
    "latest.admissions.act_scores.midpoint.cumulative",
    "latest.cost.avg_cost_of_attendance",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.cost.roomboard.oncampus",
    "latest.cost.net_price.by_income.0-30000",
    "latest.cost.net_price.by_income.30001-48000",
    "latest.cost.net_price.by_income.48001-75000",
    "latest.cost.net_price.by_income.75001-110000",
    "latest.cost.net_price.by_income.110001-plus",
    "latest.student.size",
    "latest.student.demographics.men",
    "latest.student.demographics.women",
    "latest.aid.pell_grant_rate",
    "latest.student.demographics.first_generation",
    "latest.aid.any_financial_aid",
    "latest.aid.median_debt.completers.overall",
    "latest.outcomes.completion_rate_4yr_150pt",
    "latest.outcomes.retention_rate.four_year.overall",
    "latest.earnings.6_yrs_after_entry.median",
    "latest.earnings.10_yrs_after_entry.median",
    "latest.student.faculty_ratio",
]

with open(RAW_FILE) as f:
    raw = json.load(f)

for name, expected in FIXES.items():
    print(f"Fixing: {name} (expect {expected['city']}, {expected['state']})...")
    
    params = {
        "school.name": name,
        "school.state": expected["state"],
        "fields": ",".join(FIELDS),
        "api_key": API_KEY,
    }
    url = BASE + "?" + urllib.parse.urlencode(params)
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CollegeAdvisor/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        
        if data["metadata"]["total"] == 0:
            print(f"  NOT FOUND with state filter, trying city...")
            params2 = {
                "school.name": name,
                "school.city": expected["city"],
                "fields": ",".join(FIELDS),
                "api_key": API_KEY,
            }
            url2 = BASE + "?" + urllib.parse.urlencode(params2)
            req2 = urllib.request.Request(url2, headers={"User-Agent": "CollegeAdvisor/1.0"})
            with urllib.request.urlopen(req2, timeout=15) as resp2:
                data = json.loads(resp2.read())
        
        if data["metadata"]["total"] == 0:
            print(f"  STILL NOT FOUND")
            continue
        
        # Find the best match
        best = None
        for r in data["results"]:
            rcity = r.get("school.city", "")
            rstate = r.get("school.state", "")
            rname = r.get("school.name", "")
            if rcity == expected["city"] and rstate == expected["state"]:
                best = r
                break
            if rcity == expected["city"]:
                best = r
        
        if not best:
            best = data["results"][0]
        
        actual_name = best.get("school.name", "?")
        actual_city = best.get("school.city", "?")
        print(f"  Found: {actual_name} ({actual_city})")
        
        raw[name] = best
        
    except Exception as e:
        print(f"  ERROR: {e}")
    
    time.sleep(1)

# Save updated raw data
with open(RAW_FILE, 'w') as f:
    json.dump(raw, f, indent=2)

print(f"\nUpdated {RAW_FILE}")
print("Run parse_profiles.py to regenerate individual profiles.")
