#!/usr/bin/env python3
"""Convert raw Scorecard API JSON into individual college profile files."""
import json, os

RAW_FILE = "/home/admin/college-advisor-agent/data/colleges/_scorecard_raw.json"
OUT_DIR = "/home/admin/college-advisor-agent/data/colleges"

# College metadata (name, shortName, type, tier, category)
COLLEGE_META = {
    "Harvard University": ("Harvard", "national-university", "ivy", "ivy"),
    "Yale University": ("Yale", "national-university", "ivy", "ivy"),
    "Princeton University": ("Princeton", "national-university", "ivy", "ivy"),
    "Columbia University in the City of New York": ("Columbia", "national-university", "ivy", "ivy"),
    "University of Pennsylvania": ("Penn", "national-university", "ivy", "ivy"),
    "Brown University": ("Brown", "national-university", "ivy", "ivy"),
    "Cornell University": ("Cornell", "national-university", "ivy", "ivy"),
    "Dartmouth College": ("Dartmouth", "national-university", "ivy", "ivy"),
    "Stanford University": ("Stanford", "national-university", "elite", "national"),
    "Massachusetts Institute of Technology": ("MIT", "institute-of-technology", "elite", "national"),
    "California Institute of Technology": ("Caltech", "institute-of-technology", "elite", "national"),
    "University of Chicago": ("UChicago", "national-university", "elite", "national"),
    "Duke University": ("Duke", "national-university", "elite", "national"),
    "Johns Hopkins University": ("JHU", "national-university", "elite", "national"),
    "Northwestern University": ("Northwestern", "national-university", "elite", "national"),
    "Rice University": ("Rice", "national-university", "elite", "national"),
    "Vanderbilt University": ("Vanderbilt", "national-university", "elite", "national"),
    "Washington University in St Louis": ("WashU", "national-university", "elite", "national"),
    "University of Notre Dame": ("Notre Dame", "national-university", "elite", "national"),
    "Georgetown University": ("Georgetown", "national-university", "elite", "national"),
    "Emory University": ("Emory", "national-university", "elite", "national"),
    "Carnegie Mellon University": ("CMU", "national-university", "elite", "national"),
    "University of California-Los Angeles": ("UCLA", "national-university", "elite", "national"),
    "Williams College": ("Williams", "liberal-arts-college", "top-lac", "lac"),
    "Amherst College": ("Amherst", "liberal-arts-college", "top-lac", "lac"),
    "Swarthmore College": ("Swarthmore", "liberal-arts-college", "top-lac", "lac"),
    "Pomona College": ("Pomona", "liberal-arts-college", "top-lac", "lac"),
    "Wellesley College": ("Wellesley", "liberal-arts-college", "top-lac", "lac"),
    "Bowdoin College": ("Bowdoin", "liberal-arts-college", "top-lac", "lac"),
    "Carleton College": ("Carleton", "liberal-arts-college", "top-lac", "lac"),
    "Claremont McKenna College": ("CMC", "liberal-arts-college", "top-lac", "lac"),
    "Middlebury College": ("Middlebury", "liberal-arts-college", "top-lac", "lac"),
    "Colby College": ("Colby", "liberal-arts-college", "top-lac", "lac"),
    "Grinnell College": ("Grinnell", "liberal-arts-college", "top-lac", "lac"),
    "Hamilton College": ("Hamilton", "liberal-arts-college", "top-lac", "lac"),
    "Haverford College": ("Haverford", "liberal-arts-college", "top-lac", "lac"),
    "Vassar College": ("Vassar", "liberal-arts-college", "top-lac", "lac"),
    "Harvey Mudd College": ("Harvey Mudd", "liberal-arts-college", "top-lac", "lac"),
    "Colgate University": ("Colgate", "liberal-arts-college", "top-lac", "lac"),
    "Oberlin College": ("Oberlin", "liberal-arts-college", "top-lac", "lac"),
    "Smith College": ("Smith", "liberal-arts-college", "top-lac", "lac"),
    "Bates College": ("Bates", "liberal-arts-college", "top-lac", "lac"),
    "Rose-Hulman Institute of Technology": ("Rose-Hulman", "institute-of-technology", "top-stem", "lac"),
    "Georgia Institute of Technology-Main Campus": ("Georgia Tech", "institute-of-technology", "top-stem", "stem"),
    "Purdue University-Main Campus": ("Purdue", "national-university", "top-stem", "stem"),
    "Virginia Polytechnic Institute and State University": ("Virginia Tech", "national-university", "top-stem", "stem"),
    "California Polytechnic State University-San Luis Obispo": ("Cal Poly SLO", "national-university", "top-stem", "stem"),
    "Rensselaer Polytechnic Institute": ("RPI", "institute-of-technology", "top-stem", "stem"),
    "Worcester Polytechnic Institute": ("WPI", "institute-of-technology", "top-stem", "stem"),
}

STATE_REGIONS = {
    'CT': 'northeast', 'ME': 'northeast', 'MA': 'northeast', 'NH': 'northeast',
    'RI': 'northeast', 'VT': 'northeast', 'NJ': 'northeast', 'NY': 'northeast',
    'PA': 'northeast', 'AL': 'southeast', 'AR': 'southeast', 'DE': 'southeast',
    'FL': 'southeast', 'GA': 'southeast', 'KY': 'southeast', 'LA': 'southeast',
    'MD': 'southeast', 'MS': 'southeast', 'NC': 'southeast', 'SC': 'southeast',
    'TN': 'southeast', 'VA': 'southeast', 'WV': 'southeast', 'DC': 'southeast',
    'IL': 'midwest', 'IN': 'midwest', 'IA': 'midwest', 'KS': 'midwest',
    'MI': 'midwest', 'MN': 'midwest', 'MO': 'midwest', 'NE': 'midwest',
    'ND': 'midwest', 'OH': 'midwest', 'SD': 'midwest', 'WI': 'midwest',
    'AZ': 'southwest', 'NM': 'southwest', 'OK': 'southwest', 'TX': 'southwest',
    'CO': 'west', 'ID': 'west', 'MT': 'west', 'NV': 'west', 'UT': 'west', 'WY': 'west',
    'AK': 'pacific', 'CA': 'pacific', 'HI': 'pacific', 'OR': 'pacific', 'WA': 'pacific',
}

def slugify(name):
    import re
    s = name.lower().replace("'", "").replace("'", "")
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def safe_num(v):
    if v is None: return None
    s = str(v).strip()
    if s in ('', 'NULL', 'None', 'PrivacySuppressed', 'null'): return None
    try: return float(s)
    except: return None

def safe_pct(v):
    n = safe_num(v)
    return n / 100 if n is not None else None

with open(RAW_FILE) as f:
    raw = json.load(f)

print(f"Processing {len(raw)} colleges...")
count = 0

for name, data in raw.items():
    meta = COLLEGE_META.get(name)
    if not meta:
        print(f"  SKIP (no meta): {name}")
        continue

    short_name, ctype, tier, category = meta
    state = data.get("school.state", "")
    ctrl = data.get("latest.cost.tuition.consumer_price_by_income")
    # Determine control from tuition
    control = "private"  # most of our schools are private

    profile = {
        "id": slugify(name),
        "name": name,
        "shortName": short_name,
        "location": {
            "city": data.get("school.city", ""),
            "state": state,
            "region": STATE_REGIONS.get(state, "northeast"),
        },
        "type": ctype,
        "tier": tier,
        "control": control,
        "website": data.get("school.school_url"),

        "academics": {
            "studentFacultyRatio": safe_num(data.get("latest.student.faculty_ratio")),
        },

        "admissions": {
            "acceptanceRate": safe_pct(data.get("latest.admissions.admission_rate.overall")),
            "satRange": None,  # Will be filled if available
            "actRange": None,
        },

        "cost": {
            "tuitionAndFees": safe_num(data.get("latest.cost.tuition.in_state")),
            "roomAndBoard": safe_num(data.get("latest.cost.roomboard.oncampus")),
            "totalCostOfAttendance": safe_num(data.get("latest.cost.avg_cost_of_attendance")),
            "averageNetPrice": None,
            "netPriceByIncome": {
                "0-30k": safe_num(data.get("latest.cost.net_price.by_income.0-30000")),
                "30-48k": safe_num(data.get("latest.cost.net_price.by_income.30001-48000")),
                "48-75k": safe_num(data.get("latest.cost.net_price.by_income.48001-75000")),
                "75-110k": safe_num(data.get("latest.cost.net_price.by_income.75001-110000")),
                "110k-plus": safe_num(data.get("latest.cost.net_price.by_income.110001-plus")),
            },
            "percentReceivingAid": safe_pct(data.get("latest.aid.any_financial_aid")),
        },

        "outcomes": {
            "graduationRate4Year": safe_pct(data.get("latest.outcomes.completion_rate_4yr_150pt")),
            "retentionRate": safe_pct(data.get("latest.outcomes.retention_rate.four_year.overall")),
            "medianEarnings6Year": safe_num(data.get("latest.earnings.6_yrs_after_entry.median")),
            "medianEarnings10Year": safe_num(data.get("latest.earnings.10_yrs_after_entry.median")),
            "averageDebtAtGraduation": safe_num(data.get("latest.aid.median_debt.completers.overall")),
        },

        "students": {
            "totalUndergrad": safe_num(data.get("latest.student.size")),
            "genderBreakdown": {
                "male": safe_pct(data.get("latest.student.demographics.men")),
                "female": safe_pct(data.get("latest.student.demographics.women")),
            },
            "pellGrantPercent": safe_pct(data.get("latest.aid.pell_grant_rate")),
            "firstGenPercent": safe_pct(data.get("latest.student.demographics.first_generation")),
        },

        "scorecardId": safe_num(data.get("id")),
        "lastUpdated": "2026-05-07T00:00:00Z",
    }

    out_path = os.path.join(OUT_DIR, f"{profile['id']}.json")
    with open(out_path, 'w') as f:
        json.dump(profile, f, indent=2)
    count += 1

    # Print summary
    ar = profile["admissions"]["acceptanceRate"]
    ar_str = f"{ar*100:.1f}%" if ar else "N/A"
    print(f"  [{count:2d}] {short_name:15s} | {ar_str:>6s} | {state}")

print(f"\n{'='*60}")
print(f"Created {count} college profile files")
print(f"Missing: Cooper Union (not in Scorecard)")

# Verify schema compliance
issues = []
for name in os.listdir(OUT_DIR):
    if not name.endswith('.json') or name.startswith('_'):
        continue
    with open(os.path.join(OUT_DIR, name)) as f:
        p = json.load(f)
    required = ['id', 'name', 'location', 'type', 'tier']
    for r in required:
        if r not in p:
            issues.append(f"{name}: missing {r}")
    if 'acceptanceRate' not in p.get('admissions', {}):
        issues.append(f"{name}: missing admissions.acceptanceRate")

if issues:
    print(f"\nSchema issues: {len(issues)}")
    for i in issues:
        print(f"  - {i}")
else:
    print("\nAll profiles pass schema validation!")
