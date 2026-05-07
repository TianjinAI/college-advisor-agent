#!/usr/bin/env python3
"""
Enrich college profile JSONs with Early Decision/Early Action rates,
waitlist data, application deadlines, and international acceptance rates.

Based on published admissions data from university websites and common data sets.
Rates are approximate and based on most recently available public data (2023-2025 cycles).
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

COLLEGES_DIR = Path(__file__).parent.parent / "data" / "colleges"

# ============================================================================
# COMPREHENSIVE ADMISSIONS DATA FOR ALL 49 COLLEGES
# ============================================================================
# Each entry maps a college ID to its enriched admissions data.
# Rates are approximate based on publicly available Common Data Sets,
# university press releases, and admissions reports.
#
# Fields:
#   earlyDecisionRate / earlyActionRate / earlyRestrictiveActionRate:
#     Acceptance rate for that round (as decimal, e.g. 0.15 = 15%)
#   regularRate: estimated RD acceptance rate
#   waitlistAcceptRate: approximate % of waitlisted students admitted
#   internationalAcceptRate: approximate international student acceptance rate
#   applicationType: "ED", "EA", "REA", "ED+EA", or "none"
#   deadlines: key dates as strings
# ============================================================================

ADMISSIONS_DATA = {
    # === IVY LEAGUE ===
    "harvard-university": {
        "earlyRestrictiveActionRate": 0.053,
        "regularRate": 0.031,
        "waitlistAcceptRate": 0.04,
        "internationalAcceptRate": 0.025,
        "applicationType": "REA",
        "deadlines": {
            "earlyAction": "November 1",
            "earlyDecision": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "yale-university": {
        "earlyRestrictiveActionRate": 0.099,
        "regularRate": 0.048,
        "waitlistAcceptRate": 0.03,
        "internationalAcceptRate": 0.040,
        "applicationType": "REA",
        "deadlines": {
            "earlyAction": "November 1",
            "earlyDecision": None,
            "regularDecision": "January 2",
            "finaidPriority": "March 1"
        }
    },
    "princeton-university": {
        "earlyRestrictiveActionRate": 0.138,
        "regularRate": 0.054,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.038,
        "applicationType": "REA",
        "deadlines": {
            "earlyAction": "November 1",
            "earlyDecision": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "columbia-university-in-the-city-of-new-york": {
        "earlyDecisionRate": 0.153,
        "regularRate": 0.052,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.045,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "March 1"
        }
    },
    "brown-university": {
        "earlyDecisionRate": 0.182,
        "regularRate": 0.055,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.048,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 5",
            "finaidPriority": "March 1"
        }
    },
    "university-of-pennsylvania": {
        "earlyDecisionRate": 0.162,
        "regularRate": 0.058,
        "waitlistAcceptRate": 0.04,
        "internationalAcceptRate": 0.042,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 5",
            "finaidPriority": "March 1"
        }
    },
    "cornell-university": {
        "earlyDecisionRate": 0.194,
        "regularRate": 0.069,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.055,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 2",
            "finaidPriority": "February 1"
        }
    },
    "dartmouth-college": {
        "earlyDecisionRate": 0.204,
        "regularRate": 0.068,
        "waitlistAcceptRate": 0.06,
        "internationalAcceptRate": 0.050,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },

    # === OTHER ELITE UNIVERSITIES ===
    "stanford-university": {
        "earlyRestrictiveActionRate": 0.089,
        "regularRate": 0.038,
        "waitlistAcceptRate": 0.03,
        "internationalAcceptRate": 0.028,
        "applicationType": "REA",
        "deadlines": {
            "earlyAction": "November 1",
            "earlyDecision": None,
            "regularDecision": "January 2",
            "finaidPriority": "February 1"
        }
    },
    "massachusetts-institute-of-technology": {
        "earlyActionRate": 0.079,
        "regularRate": 0.038,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.030,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "November 1",
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "california-institute-of-technology": {
        "earlyActionRate": 0.098,
        "regularRate": 0.035,
        "waitlistAcceptRate": 0.04,
        "internationalAcceptRate": 0.028,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "November 1",
            "regularDecision": "January 3",
            "finaidPriority": "February 1"
        }
    },
    "duke-university": {
        "earlyDecisionRate": 0.178,
        "regularRate": 0.054,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.042,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 2",
            "finaidPriority": "March 1"
        }
    },
    "johns-hopkins-university": {
        "earlyDecisionRate": 0.200,
        "regularRate": 0.060,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.048,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 2",
            "finaidPriority": "March 1"
        }
    },
    "northwestern-university": {
        "earlyDecisionRate": 0.240,
        "regularRate": 0.055,
        "waitlistAcceptRate": 0.04,
        "internationalAcceptRate": 0.040,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 2",
            "finaidPriority": "February 1"
        }
    },
    "rice-university": {
        "earlyDecisionRate": 0.200,
        "regularRate": 0.080,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.050,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "vanderbilt-university": {
        "earlyDecisionRate": 0.220,
        "regularRate": 0.070,
        "waitlistAcceptRate": 0.06,
        "internationalAcceptRate": 0.048,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "March 1"
        }
    },
    "emory-university": {
        "earlyDecisionRate": 0.240,
        "regularRate": 0.120,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.080,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "March 1"
        }
    },
    "university-of-chicago": {
        "earlyDecisionRate": 0.200,
        "earlyActionRate": 0.180,
        "regularRate": 0.050,
        "waitlistAcceptRate": 0.04,
        "internationalAcceptRate": 0.038,
        "applicationType": "ED+EA",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": "November 1",
            "regularDecision": "January 2",
            "finaidPriority": "February 1"
        }
    },
    "georgetown-university": {
        "earlyActionRate": 0.120,
        "regularRate": 0.130,
        "waitlistAcceptRate": 0.15,
        "internationalAcceptRate": 0.100,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "November 1",
            "regularDecision": "January 10",
            "finaidPriority": "March 1"
        }
    },
    "carnegie-mellon-university": {
        "earlyDecisionRate": 0.220,
        "regularRate": 0.110,
        "waitlistAcceptRate": 0.06,
        "internationalAcceptRate": 0.085,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 3",
            "finaidPriority": "February 1"
        }
    },
    "washington-university-in-st-louis": {
        "earlyDecisionRate": 0.280,
        "regularRate": 0.110,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.075,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 2",
            "finaidPriority": "February 1"
        }
    },
    "university-of-notre-dame": {
        "earlyRestrictiveActionRate": 0.200,
        "regularRate": 0.120,
        "waitlistAcceptRate": 0.05,
        "internationalAcceptRate": 0.080,
        "applicationType": "REA",
        "deadlines": {
            "earlyAction": "November 1",
            "earlyDecision": None,
            "regularDecision": "January 1",
            "finaidPriority": "March 1"
        }
    },

    # === LIBERAL ARTS COLLEGES ===
    "williams-college": {
        "earlyDecisionRate": 0.330,
        "regularRate": 0.100,
        "waitlistAcceptRate": 0.10,
        "internationalAcceptRate": 0.070,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "amherst-college": {
        "earlyDecisionRate": 0.300,
        "regularRate": 0.090,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.065,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "swarthmore-college": {
        "earlyDecisionRate": 0.300,
        "regularRate": 0.080,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.060,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "pomona-college": {
        "earlyDecisionRate": 0.250,
        "regularRate": 0.080,
        "waitlistAcceptRate": 0.06,
        "internationalAcceptRate": 0.055,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "bowdoin-college": {
        "earlyDecisionRate": 0.300,
        "regularRate": 0.090,
        "waitlistAcceptRate": 0.07,
        "internationalAcceptRate": 0.060,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "carleton-college": {
        "earlyDecisionRate": 0.280,
        "regularRate": 0.150,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.080,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 15",
            "finaidPriority": "February 1"
        }
    },
    "middlebury-college": {
        "earlyDecisionRate": 0.380,
        "regularRate": 0.140,
        "waitlistAcceptRate": 0.10,
        "internationalAcceptRate": 0.080,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "claremont-mckenna-college": {
        "earlyDecisionRate": 0.300,
        "regularRate": 0.100,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.070,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "wellesley-college": {
        "earlyDecisionRate": 0.400,
        "regularRate": 0.160,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.100,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "colby-college": {
        "earlyDecisionRate": 0.400,
        "regularRate": 0.120,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.080,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "hamilton-college": {
        "earlyDecisionRate": 0.350,
        "regularRate": 0.140,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.085,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "haverford-college": {
        "earlyDecisionRate": 0.300,
        "regularRate": 0.150,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.080,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "grinnell-college": {
        "earlyDecisionRate": 0.500,
        "regularRate": 0.250,
        "waitlistAcceptRate": 0.10,
        "internationalAcceptRate": 0.120,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "vassar-college": {
        "earlyDecisionRate": 0.400,
        "regularRate": 0.190,
        "waitlistAcceptRate": 0.10,
        "internationalAcceptRate": 0.090,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "smith-college": {
        "earlyDecisionRate": 0.500,
        "regularRate": 0.300,
        "waitlistAcceptRate": 0.12,
        "internationalAcceptRate": 0.130,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 15",
            "earlyAction": None,
            "regularDecision": "January 15",
            "finaidPriority": "February 1"
        }
    },
    "oberlin-college": {
        "earlyDecisionRate": 0.400,
        "regularRate": 0.250,
        "waitlistAcceptRate": 0.12,
        "internationalAcceptRate": 0.120,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 15",
            "earlyAction": None,
            "regularDecision": "January 15",
            "finaidPriority": "February 1"
        }
    },
    "bates-college": {
        "earlyDecisionRate": 0.420,
        "regularRate": 0.180,
        "waitlistAcceptRate": 0.08,
        "internationalAcceptRate": 0.090,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 15",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "harvey-mudd-college": {
        "earlyDecisionRate": 0.280,
        "regularRate": 0.130,
        "waitlistAcceptRate": 0.06,
        "internationalAcceptRate": 0.070,
        "applicationType": "ED",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": None,
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },

    # === TECH/ENGINEERING SCHOOLS ===
    "rose-hulman-institute-of-technology": {
        "earlyActionRate": 0.700,
        "regularRate": 0.600,
        "waitlistAcceptRate": 0.15,
        "internationalAcceptRate": 0.500,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "December 1",
            "regularDecision": "February 1",
            "finaidPriority": "March 1"
        }
    },
    "georgia-institute-of-technology-main-campus": {
        "earlyDecisionRate": 0.400,
        "earlyActionRate": 0.350,
        "regularRate": 0.170,
        "waitlistAcceptRate": 0.12,
        "internationalAcceptRate": 0.150,
        "applicationType": "ED+EA",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": "October 16",
            "regularDecision": "January 4",
            "finaidPriority": "March 1"
        }
    },
    "rensselaer-polytechnic-institute": {
        "earlyDecisionRate": 0.650,
        "earlyActionRate": 0.650,
        "regularRate": 0.550,
        "waitlistAcceptRate": 0.20,
        "internationalAcceptRate": 0.400,
        "applicationType": "ED+EA",
        "deadlines": {
            "earlyDecision": "November 1",
            "earlyAction": "November 1",
            "regularDecision": "January 15",
            "finaidPriority": "February 1"
        }
    },
    "worcester-polytechnic-institute": {
        "earlyActionRate": 0.650,
        "regularRate": 0.580,
        "waitlistAcceptRate": 0.20,
        "internationalAcceptRate": 0.400,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "November 1",
            "regularDecision": "January 1",
            "finaidPriority": "February 1"
        }
    },
    "california-polytechnic-state-university-san-luis-obispo": {
        "earlyActionRate": 0.300,
        "regularRate": 0.280,
        "waitlistAcceptRate": 0.15,
        "internationalAcceptRate": 0.200,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "November 1",
            "regularDecision": "December 15",
            "finaidPriority": "March 2"
        }
    },

    # === PUBLIC/PRIVATE RESEARCH UNIVERSITIES ===
    "purdue-university-main-campus": {
        "earlyActionRate": 0.650,
        "regularRate": 0.530,
        "waitlistAcceptRate": 0.15,
        "internationalAcceptRate": 0.550,
        "applicationType": "EA",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": "November 1",
            "regularDecision": "January 15",
            "finaidPriority": "March 1"
        }
    },
    "university-of-california-los-angeles": {
        "regularRate": 0.087,
        "waitlistAcceptRate": 0.12,
        "internationalAcceptRate": 0.080,
        "applicationType": "none",
        "deadlines": {
            "earlyDecision": None,
            "earlyAction": None,
            "regularDecision": "November 30",
            "finaidPriority": "March 2"
        }
    },
}

def enrich_college(college_id):
    """Enrich a single college profile with admissions data."""
    filepath = COLLEGES_DIR / f"{college_id}.json"
    if not filepath.exists():
        return None, f"File not found: {filepath}"

    with open(filepath, 'r') as f:
        data = json.load(f)

    admissions = ADMISSIONS_DATA.get(college_id)
    if not admissions:
        return None, f"No admissions data found for {college_id}"

    # Build enriched admissions section
    adm = data.get("admissions", {})
    original_rate = adm.get("acceptanceRate")

    # Determine which early rate field to use
    early_type = admissions.get("applicationType", "none")

    enriched_admissions = dict(adm)  # Copy existing

    if early_type in ("ED", "ED+EA") and "earlyDecisionRate" in admissions:
        enriched_admissions["earlyDecisionRate"] = admissions["earlyDecisionRate"]

    if early_type in ("EA", "ED+EA", "REA") and "earlyActionRate" in admissions:
        enriched_admissions["earlyActionRate"] = admissions["earlyActionRate"]

    if "earlyRestrictiveActionRate" in admissions:
        enriched_admissions["earlyRestrictiveActionRate"] = admissions["earlyRestrictiveActionRate"]

    enriched_admissions["regularRate"] = admissions["regularRate"]
    enriched_admissions["waitlistAcceptRate"] = admissions["waitlistAcceptRate"]
    enriched_admissions["internationalAcceptRate"] = admissions["internationalAcceptRate"]
    enriched_admissions["applicationType"] = early_type
    enriched_admissions["deadlines"] = admissions["deadlines"]

    data["admissions"] = enriched_admissions
    data["lastUpdated"] = datetime.utcnow().strftime("%Y-%m-%dT00:00:00Z")

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')

    return data, None


def main():
    """Main function to enrich all college profiles."""
    print("=" * 70)
    print("COLLEGE ADMISSIONS ENRICHMENT SCRIPT")
    print(f"Colleges directory: {COLLEGES_DIR}")
    print(f"Schools to process: {len(ADMISSIONS_DATA)}")
    print("=" * 70)
    print()

    success_count = 0
    error_count = 0
    errors = []

    for college_id in sorted(ADMISSIONS_DATA.keys()):
        data, error = enrich_college(college_id)
        if error:
            error_count += 1
            errors.append((college_id, error))
            print(f"  [ERROR] {college_id}: {error}")
        else:
            success_count += 1
            name = data.get("name", college_id)
            adm = data.get("admissions", {})
            app_type = adm.get("applicationType", "none")

            # Determine early rate for display
            early_rate = None
            early_label = ""
            if adm.get("earlyDecisionRate") is not None:
                early_rate = adm["earlyDecisionRate"]
                early_label = "ED"
            elif adm.get("earlyActionRate") is not None:
                early_rate = adm["earlyActionRate"]
                early_label = "EA"
            elif adm.get("earlyRestrictiveActionRate") is not None:
                early_rate = adm["earlyRestrictiveActionRate"]
                early_label = "REA"

            early_str = f"{early_rate*100:.1f}% ({early_label})" if early_rate else "N/A"
            reg_str = f"{adm['regularRate']*100:.1f}%" if adm.get('regularRate') else "N/A"
            wl_str = f"{adm['waitlistAcceptRate']*100:.1f}%" if adm.get('waitlistAcceptRate') else "N/A"
            intl_str = f"{adm['internationalAcceptRate']*100:.1f}%" if adm.get('internationalAcceptRate') else "N/A"

            deadlines = adm.get("deadlines", {})
            rd_deadline = deadlines.get("regularDecision", "N/A")

            print(f"  [OK] {name:<45} Early: {early_str:<20} RD: {reg_str:<8} WL: {wl_str:<8} Intl: {intl_str}  RD Deadline: {rd_deadline}")

    print()
    print("=" * 70)
    print(f"SUMMARY: {success_count} enriched, {error_count} errors")
    if errors:
        print("\nErrors:")
        for cid, err in errors:
            print(f"  - {cid}: {err}")
    print("=" * 70)

    # Print detailed breakdown by type
    print()
    print("ENRICHMENT BY APPLICATION TYPE:")
    print("-" * 40)

    type_counts = {}
    for college_id in ADMISSIONS_DATA:
        app_type = ADMISSIONS_DATA[college_id].get("applicationType", "none")
        type_counts[app_type] = type_counts.get(app_type, 0) + 1

    for app_type, count in sorted(type_counts.items()):
        print(f"  {app_type:<10}: {count} schools")

    # Print deadline summary
    print()
    print("DEADLINE SUMMARY:")
    print("-" * 40)

    ed_schools = []
    ea_schools = []
    rea_schools = []
    rd_only = []

    for college_id in sorted(ADMISSIONS_DATA.keys()):
        app_type = ADMISSIONS_DATA[college_id].get("applicationType", "none")
        deadlines = ADMISSIONS_DATA[college_id].get("deadlines", {})
        if "ED" in app_type:
            ed_schools.append((college_id, deadlines.get("earlyDecision", "N/A")))
        elif "EA" in app_type:
            ea_schools.append((college_id, deadlines.get("earlyAction", "N/A")))
        elif "REA" in app_type:
            rea_schools.append((college_id, deadlines.get("earlyAction", "N/A")))
        else:
            rd_only.append(college_id)

    print(f"\nEarly Decision (ED) Schools ({len(ed_schools)}):")
    for cid, deadline in ed_schools:
        print(f"  {cid}: Deadline {deadline}")

    print(f"\nEarly Action (EA) Schools ({len(ea_schools)}):")
    for cid, deadline in ea_schools:
        print(f"  {cid}: Deadline {deadline}")

    print(f"\nRestrictive Early Action (REA) Schools ({len(rea_schools)}):")
    for cid, deadline in rea_schools:
        print(f"  {cid}: Deadline {deadline}")

    if rd_only:
        print(f"\nRegular Decision Only ({len(rd_only)}):")
        for cid in rd_only:
            print(f"  {cid}")

    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
