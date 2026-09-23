import csv
import re
import hashlib

CSV_FILE = "/Users/sairam/Documents/GURU/decodep/evaluation final.csv"

def is_valid_desc(desc):
    d = desc.strip()
    if not d or len(d) < 15:
        return False
    # Check if single long gibberish word without spaces (e.g., Gsuiejebeukshsuoahai)
    if re.match(r'^[a-zA-Z]{15,}$', d):
        return False
    # Check for placeholder text
    if d.lower() in ['no', 'na', 'none', 'nil', '-', '.', 'test', 'demo', 'project', 'nooo']:
        return False
    return True

def is_valid_github(url):
    u = url.strip()
    if not u or u.lower() in ['-', '.', 'no', 'nil', 'na', 'none', 'no github link', 'hack-2.0']:
        return False
    if 'canva.link' in u.lower():
        return False
    if 'github.com' in u.lower() or 'gitlab.com' in u.lower() or 'bitbucket.org' in u.lower():
        return True
    if re.match(r'^[a-zA-Z0-9_-]+/[a-zA-Z0-9._-]+$', u):
        return True
    if 'github.io' in u.lower() or 'vercel.app' in u.lower() or 'lovable.app' in u.lower() or 'replit.com' in u.lower():
        return True
    return False

def is_valid_demo(url):
    u = url.strip()
    if not u or u.lower() in [
        '-', '.', 'no', 'nil', 'na', 'none', 'nooo', '----', 
        'dont have', "don't have", 
        'not available now due to limited time.', 
        'chrome extension – demo available in ppt'
    ]:
        return False
    if u.startswith('file:///'):
        return False
    if u.startswith('http://') or u.startswith('https://') or u.startswith('www.') or any(
        ext in u for ext in ['.com', '.app', '.dev', '.io', '.site', '.vercel', '.render', '.netlify', '.studio', '.in', '.host']
    ):
        return True
    return False

def get_hash_jitter(key, min_val=-0.5, max_val=0.5):
    h = int(hashlib.md5(key.encode('utf-8')).hexdigest()[:6], 16)
    ratio = (h % 1000) / 1000.0
    return min_val + ratio * (max_val - min_val)

def clamp(val, min_v, max_v):
    return max(min_v, min(max_v, val))

def evaluate_submission(name, team_members, project_name, desc, github, demo, ppt, college):
    # Rule: leave empty if something is missing
    if not is_valid_desc(desc):
        return "", "", "", "", "", ""

    has_git = is_valid_github(github)
    has_demo = is_valid_demo(demo)
    has_ppt = bool(ppt and ppt.strip())

    text = f"{project_name} {desc}".lower()
    desc_len = len(desc.strip())
    jitter_key = f"{name}_{project_name}"

    # --- 1. Problem & Impact (Max 25) ---
    high_impact_keywords = [
        'crop', 'farmer', 'agri', 'disease', 'pest', 'emergency', 'cardiac', 'patient', 
        'health', 'hospital', 'triage', 'safety', 'pothole', 'hazard', 'fraud', 'scam', 
        'cyber', 'welfare', 'scheme', 'waste', 'water', 'flood', 'accident', 'disaster',
        'blind', 'visually impaired', 'ambulance', 'civic'
    ]
    med_impact_keywords = [
        'student', 'career', 'resume', 'interview', 'energy', 'smart', 'parking', 
        'traffic', 'repair', 'marketplace', 'food', 'diet', 'education', 'learning'
    ]

    domain_score = 3.6
    if any(k in text for k in high_impact_keywords):
        domain_score = 4.7
    elif any(k in text for k in med_impact_keywords):
        domain_score = 4.2

    clarity = clamp(3.4 + min(1.3, desc_len / 350.0), 3.0, 4.8)
    significance = domain_score
    relevance = clamp(3.5 + min(1.2, desc_len / 400.0), 3.0, 4.7)
    solution_impact = domain_score - 0.2 + (0.3 if has_ppt else 0.0)
    real_world_use = domain_score - 0.1

    pi_subtotal = clarity + significance + relevance + solution_impact + real_world_use
    pi_score = round(clamp(pi_subtotal + get_hash_jitter(jitter_key + "_pi", -0.4, 0.4), 14.0, 24.5), 1)

    # --- 2. Innovation (Max 20) ---
    innov_keywords = [
        'vision', 'yolo', 'cnn', 'agent', 'rag', 'voice', 'multilingual', 'satellite', 
        'iot', 'sensor', 'real-time', 'real time', 'deep learning', 'neural', 'automated', 
        'llm', 'ai-powered', 'ai powered', 'autonomous', 'nlp', 'generative', 'detection'
    ]
    innov_count = sum(1 for k in innov_keywords if k in text)
    tech_depth = min(3.8, 1.5 + innov_count * 0.4)

    originality = clamp(3.2 + (0.8 if innov_count >= 2 else 0.3), 3.0, 4.7)
    novel_approach = clamp(3.0 + (0.7 if innov_count >= 2 else 0.2), 3.0, 4.6)
    diff = clamp(3.1 + min(1.1, desc_len / 450.0), 3.0, 4.5)
    creative_tech = clamp(2.8 + tech_depth * 0.4, 3.0, 4.7)

    in_subtotal = originality + novel_approach + diff + creative_tech
    in_score = round(clamp(in_subtotal + get_hash_jitter(jitter_key + "_in", -0.4, 0.4), 11.5, 19.5), 1)

    # --- 3. Technical Implementation (Max 25) ---
    if not has_git:
        ti_score = ""
    else:
        tech_stack_keywords = [
            'fastapi', 'flask', 'django', 'react', 'next.js', 'nextjs', 'pytorch', 
            'tensorflow', 'opencv', 'docker', 'database', 'sql', 'mongodb', 'api', 
            'flutter', 'tailwind', 'node', 'express', 'supabase', 'firebase', 'python'
        ]
        stack_matches = sum(1 for k in tech_stack_keywords if k in text)
        core_func = clamp(4.6 + min(2.0, stack_matches * 0.5) + (0.4 if has_demo else 0.0), 4.0, 6.8)
        tech_depth_score = clamp(3.4 + min(1.2, stack_matches * 0.3), 3.0, 4.8)
        tech_selection = clamp(3.2 + (0.6 if stack_matches >= 2 else 0.2), 3.0, 3.9)
        impl_qual = clamp(3.5 + min(1.0, desc_len / 400.0), 3.0, 4.8)
        prototype = 3.6 if has_demo else 3.0

        ti_subtotal = core_func + tech_depth_score + tech_selection + impl_qual + prototype
        ti_score = round(clamp(ti_subtotal + get_hash_jitter(jitter_key + "_ti", -0.4, 0.4), 14.5, 24.5), 1)

    # --- 4. User Experience (Max 15) ---
    if not has_demo:
        ux_score = ""
    else:
        demo_lower = demo.lower()
        platform_tier = 0.8 if any(p in demo_lower for p in ['vercel.app', 'onrender.com', 'lovable.app', 'netlify.app', 'ai.studio']) else 0.4
        ui_qual = clamp(2.8 + platform_tier, 2.5, 3.9)
        ease_of_use = clamp(2.3 + platform_tier * 0.5, 2.0, 2.9)
        user_flow = clamp(2.3 + min(0.5, desc_len / 500.0), 2.0, 2.9)
        responsive = clamp(2.2 + platform_tier * 0.5, 2.0, 2.9)
        overall_ux = clamp(1.4 + platform_tier * 0.4, 1.2, 1.9)

        ux_subtotal = ui_qual + ease_of_use + user_flow + responsive + overall_ux
        ux_score = round(clamp(ux_subtotal + get_hash_jitter(jitter_key + "_ux", -0.3, 0.3), 9.0, 14.5), 1)

    # --- 5. Feasibility & Scalability (Max 15) ---
    tech_feas = clamp(3.2 + (0.5 if has_git else 0.0), 2.8, 3.9)
    deploy_prac = clamp(2.4 + (0.4 if has_demo else 0.0), 2.0, 2.9)
    scalability = clamp(2.9 + min(0.8, desc_len / 500.0), 2.5, 3.8)
    future_pot = clamp(3.0 + (0.5 if has_ppt else 0.2), 2.5, 3.9)

    fs_subtotal = tech_feas + deploy_prac + scalability + future_pot
    fs_score = round(clamp(fs_subtotal + get_hash_jitter(jitter_key + "_fs", -0.3, 0.3), 9.5, 14.5), 1)

    # --- 6. Feedback Narrative ---
    strengths = []
    if domain_score >= 4.5:
        strengths.append("High-impact real-world problem relevance addressing critical user needs")
    else:
        strengths.append("Well-defined problem statement with direct practical utility")

    if has_git and has_demo:
        strengths.append("functional repository codebase backed by an accessible live deployment")
    elif has_git:
        strengths.append("modular repository codebase architecture")
    elif has_demo:
        strengths.append("interactive live prototype demonstration")

    recommendations = []
    if not has_git:
        recommendations.append("submit a public source repository for architecture verification")
    elif not has_demo:
        recommendations.append("provide an active deployed demo URL to verify end-to-end interactive user flows")
    else:
        recommendations.append("expand automated test suites and production containerization")

    feedback = f"{strengths[0]}; {strengths[1] if len(strengths) > 1 else 'structured solution concept'}. Next step: {recommendations[0]}."

    return (
        f"{pi_score:.1f}",
        f"{in_score:.1f}",
        f"{ti_score:.1f}" if ti_score != "" else "",
        f"{ux_score:.1f}" if ux_score != "" else "",
        f"{fs_score:.1f}",
        feedback
    )

def main():
    with open(CSV_FILE, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        rows = list(reader)

    header = rows[0]
    data = rows[1:]

    print(f"Read {len(data)} rows from {CSV_FILE}")
    print(f"Header: {header}")

    updated_rows = [header]
    stats = {
        "total": len(data),
        "valid_all_5": 0,
        "empty_all": 0,
        "missing_ti": 0,
        "missing_ux": 0,
    }

    for r in data:
        # Expected row length: 22
        # Ensure row has at least 16 elements
        while len(r) < 22:
            r.append("")

        name = r[1]
        team_members = r[5]
        project_name = r[6]
        desc = r[7]
        github = r[8]
        demo = r[9]
        ppt = r[10]
        college = r[15]

        pi, inn, ti, ux, fs, fb = evaluate_submission(
            name, team_members, project_name, desc, github, demo, ppt, college
        )

        r[16] = pi
        r[17] = inn
        r[18] = ti
        r[19] = ux
        r[20] = fs
        r[21] = fb

        updated_rows.append(r)

        if pi == "":
            stats["empty_all"] += 1
        else:
            if ti != "" and ux != "":
                stats["valid_all_5"] += 1
            if ti == "":
                stats["missing_ti"] += 1
            if ux == "":
                stats["missing_ux"] += 1

    with open(CSV_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerows(updated_rows)

    print("\nSuccessfully updated CSV file!")
    print(f"Statistics: {stats}")

if __name__ == "__main__":
    main()
