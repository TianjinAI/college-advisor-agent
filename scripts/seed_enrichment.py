#!/usr/bin/env python3
"""
Seed enrichment script for 50 elite US colleges.
Embeds curated public knowledge into college profile JSON files.
Adds: academics.strengths, signaturePrograms, curriculumStyle, stemStrength,
      campus.setting, culture, distinctiveTraits, whatTheyLookFor, applicationTips
"""

import json, os, glob
from datetime import datetime

os.chdir('/home/admin/college-advisor-agent')

# Curated enrichment data for all 50 colleges
# Sources: Common Data Sets, Niche, College Confidential, admissions blogs, public info
ENRICHMENT = {
    # === IVY LEAGUE (8) ===
    "harvard-university": {
        "academics": {
            "strengths": ["Economics", "Government", "Computer Science", "History", "Biology", "Psychology", "English"],
            "signaturePrograms": ["Harvard-Yale Regatta", "Freshman Seminars", "House System", "Harvard Innovation Labs"],
            "curriculumStyle": "Core Curriculum + Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "12-15"
        },
        "campus": {
            "setting": "Urban campus in Cambridge, MA, across the Charles River from Boston",
            "culture": "Intense, ambitious, and globally minded. Students are driven but collaborative. The House system creates tight-knit communities within the larger university. Expect intellectual debate everywhere—from dining halls to the Harvard Square coffee shops.",
            "distinctiveTraits": "Unmatched global brand, massive endowment enabling generous financial aid, and the House system (think Hogwarts) that gives every student a home base for four years.",
            "whatTheyLookFor": "Harvard seeks students who will change the world—not just succeed in it. They value intellectual curiosity, leadership with impact, and diverse perspectives. The admissions committee asks: 'Will this student contribute to the Harvard community in a unique way?'",
            "applicationTips": "Use your supplemental essays to show specific intellectual passions beyond your intended major. Demonstrate how you've already made an impact in your community. The 'Harvard essay' should feel like a conversation with a brilliant peer, not a resume recitation."
        }
    },
    "yale-university": {
        "academics": {
            "strengths": ["English", "History", "Political Science", "Economics", "Music", "Drama", "Biology"],
            "signaturePrograms": ["Yale Dramatic Association", "Residential Colleges", "Yale Political Union", "Grand Strategy Program"],
            "curriculumStyle": "Distribution Requirements (no core)",
            "stemStrength": "strong",
            "averageClassSize": "15-18"
        },
        "campus": {
            "setting": "Urban campus in New Haven, CT, with a distinct college-town feel",
            "culture": "Intellectual, artistic, and socially engaged. Yale students love ideas and aren't afraid to debate them. The residential college system creates instant community. There's a strong tradition of a cappella, theater, and political activism.",
            "distinctiveTraits": "The residential college system (14 colleges, each with its own dining hall, library, and culture). Yale also has the oldest collegiate a cappella tradition and one of the finest art museums in any university.",
            "whatTheyLookFor": "Yale looks for students who will take full advantage of the residential college system—engaged community members, not just brilliant isolates. They value intellectual vitality, artistic talent, and demonstrated leadership in any form.",
            "applicationTips": "The 'Why Yale?' essay should reference specific professors, residential college traditions, or programs. Show that you understand Yale's culture of 'and' (scholar AND musician, scientist AND poet). The optional video can help if you're naturally expressive."
        }
    },
    "princeton-university": {
        "academics": {
            "strengths": ["Mathematics", "Physics", "Economics", "Public Policy", "History", "Engineering"],
            "signaturePrograms": ["Junior Independent Work", "Senior Thesis (required)", "Woodrow Wilson School", "Princeton Engineering"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "12-15"
        },
        "campus": {
            "setting": "Suburban campus in Princeton, NJ, surrounded by affluent town",
            "culture": "Academically intense with a focus on undergraduate teaching. The eating clubs create a unique social scene. Students are preppy, ambitious, and deeply engaged in their independent work. There's a strong honor code culture.",
            "distinctiveTraits": "The only Ivy requiring a senior thesis from all students. Also known for the highest per-student endowment, exceptional undergraduate focus (no law/medical school to distract resources), and iconic Gothic architecture.",
            "whatTheyLookFor": "Princeton prioritizes academic excellence and intellectual curiosity above all. They want students who will thrive in the rigorous independent work culture (Junior Papers + Senior Thesis). Leadership and character matter, but academic depth is paramount.",
            "applicationTips": "Emphasize your capacity for independent research and deep intellectual engagement. The graded written paper requirement shows they care about your analytical writing—make sure it's polished. Demonstrate how you'll contribute to the eating club or residential college community."
        }
    },
    "columbia-university-in-the-city-of-new-york": {
        "academics": {
            "strengths": ["Core Curriculum", "Urban Studies", "Journalism", "Economics", "Engineering", "International Relations"],
            "signaturePrograms": ["Core Curriculum (required)", "Barnard College partnership", "Columbia Journalism School", "SEAS Engineering"],
            "curriculumStyle": "Core Curriculum (required)",
            "stemStrength": "strong",
            "averageClassSize": "15-20"
        },
        "campus": {
            "setting": "Urban campus in Upper Manhattan, New York City",
            "culture": "Intellectually rigorous, diverse, and urban. The Core Curriculum creates a shared intellectual foundation. Students are politically aware, culturally diverse, and ambitious. NYC is your campus—museums, internships, and Broadway are subway rides away.",
            "distinctiveTraits": "The Core Curriculum (Literature Humanities, Contemporary Civilization, Art Humanities, Music Humanities) is the defining feature—every student reads the same canonical texts. Also unique for being in Manhattan with a subway stop on campus.",
            "whatTheyLookFor": "Columbia seeks students who will thrive in the Core's intellectual intensity and engage with NYC's diversity. They value global perspectives, intellectual fearlessness, and students who can handle both Plato and the subway at 2 AM.",
            "applicationTips": "The 'Why Columbia?' essay must reference the Core specifically—show you understand what it entails and why it excites you. The 'List' questions (books, concerts, etc.) are filters for genuine intellectual curiosity. Be specific about NYC opportunities you plan to pursue."
        }
    },
    "university-of-pennsylvania": {
        "academics": {
            "strengths": ["Business (Wharton)", "Finance", "Nursing", "Engineering", "Political Science", "Biology"],
            "signaturePrograms": ["Wharton School of Business", "Integrated Product Design", "Penn Medicine pipeline", "Huntsman Program"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "18-22"
        },
        "campus": {
            "setting": "Urban campus in University City, Philadelphia",
            "culture": "Pre-professional, ambitious, and entrepreneurial. Penn students are focused on outcomes—internships, startups, and grad school placement. The social scene is active (Greek life + city life). There's a 'work hard, play hard' ethos.",
            "distinctiveTraits": "Wharton is the premier undergraduate business school in the world. Penn also pioneered interdisciplinary education with programs like Vagelos LSM (Life Science + Business). The 'One University' policy lets students take classes across all four undergraduate schools.",
            "whatTheyLookFor": "Penn values initiative and impact. They want students who have already started something—a business, a nonprofit, a research project. The 'fit' question matters: can you articulate specific Penn resources that match your goals?",
            "applicationTips": "The 'Thank You Note' essay is Penn's personality test—be warm, specific, and show you've done your research. If applying to Wharton, demonstrate quantitative aptitude and business intuition. For dual-degree programs, explain the intersection clearly."
        }
    },
    "brown-university": {
        "academics": {
            "strengths": ["Open Curriculum", "Computer Science", "Biology", "English", "History", "Visual Arts"],
            "signaturePrograms": ["Open Curriculum (no requirements)", "PLME (Medical program)", "RISD Dual Degree", "Watson Institute"],
            "curriculumStyle": "Open Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "15-18"
        },
        "campus": {
            "setting": "Urban campus on College Hill, Providence, RI",
            "culture": "Intellectually free, creative, and collaborative. The Open Curriculum attracts students who love learning for its own sake. There's a strong arts scene, progressive politics, and a laid-back vibe. Students design their own concentrations.",
            "distinctiveTraits": "The Open Curriculum is truly unique—no required core, no distribution requirements, just 30+ courses in your chosen concentration. Also home to the PLME (8-year med program) and the RISD dual-degree option for arts+academics.",
            "whatTheyLookFor": "Brown seeks self-directed learners who will thrive without external structure. They value creativity, intellectual risk-taking, and students who can articulate WHY they want the Open Curriculum. Quirkiness and authenticity are assets.",
            "applicationTips": "The Open Curriculum essay is make-or-break: explain specifically how you'd use the freedom (e.g., 'I want to combine medieval history with machine learning'). Show you've thought beyond 'no requirements = easy.' The PLME essay requires demonstrated medical commitment."
        }
    },
    "dartmouth-college": {
        "academics": {
            "strengths": ["Economics", "Government", "Engineering (BE)", "Biology", "Computer Science", "Native American Studies"],
            "signaturePrograms": ["D-Plan (quarter system)", "Dartmouth Outing Club", "Tuck Business Bridge", "Native American Program"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "15-20"
        },
        "campus": {
            "setting": "Rural campus in Hanover, NH, surrounded by forests and the Connecticut River",
            "culture": "Tight-knit, outdoorsy, and traditions-heavy. The Greek system dominates social life. Students are loyal, school-spirited, and love the outdoors (hiking, skiing, canoe trips). The D-Plan enables off-campus terms for internships/research.",
            "distinctiveTraits": "The D-Plan (quarter system with 12 terms, only 3 on campus per year) lets students customize their calendar. Also known for the strongest undergraduate teaching culture in the Ivy League (professors teach, TAs assist). The Outing Club is the oldest and largest in the nation.",
            "whatTheyLookFor": "Dartmouth values community contribution and resilience. Hanover winters are real—they want students who will thrive in a remote, cold setting. They prioritize demonstrated interest heavily (visit, interview, apply early if possible).",
            "applicationTips": "The 'Why Dartmouth?' essay should mention specific outdoor activities, the D-Plan, or the tight community. If you can't visit, do the virtual tour and mention it. The peer recommendation is unique—choose someone who knows you well, not just a prestigious name."
        }
    },
    "cornell-university": {
        "academics": {
            "strengths": ["Engineering", "Hotel Administration", "Architecture", "Agriculture", "Computer Science", "Biology"],
            "signaturePrograms": ["Cornell Engineering", "Hotel School (SHA)", "Architecture (AAP)", "Dyson Business", "ILR"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "18-25"
        },
        "campus": {
            "setting": "Rural campus in Ithaca, NY, with gorges and waterfalls",
            "culture": "Work-hard, play-hard in a stunning natural setting. Cornell is the most diverse Ivy in terms of academic interests (engineers, hotelies, architects, farmers). The gorges are iconic. Winters are harsh but students embrace the cold with hockey and hot chocolate.",
            "distinctiveTraits": "The only Ivy with land-grant roots, offering unique programs like Hotel Administration, Animal Science, and Viticulture. Also the largest undergraduate population in the Ivy League (~15,000). The gorges and waterfalls create one of the most beautiful campuses in America.",
            "whatTheyLookFor": "Cornell values academic fit with your chosen college (Engineering, Arts & Sciences, Dyson, etc.). They want students who have explored their field beyond the classroom. Each college has its own admissions committee—tailor your application to the specific school.",
            "applicationTips": "The college-specific essays are critical. For Engineering, show project experience. For SHA, demonstrate hospitality/service experience. For AAP, the portfolio is everything. Cornell admits by college, not just by university—know your college's culture and requirements."
        }
    },
    # === ELITE NATIONAL UNIVERSITIES (15) ===
    "stanford-university": {
        "academics": {
            "strengths": ["Computer Science", "Engineering", "Entrepreneurship", "Biology", "Economics", "Psychology"],
            "signaturePrograms": ["Stanford d.school", "StartX accelerator", "Bing Overseas Studies", "CS + X"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "15-18"
        },
        "campus": {
            "setting": "Suburban campus in Stanford, CA, on the San Francisco Peninsula",
            "culture": "Entrepreneurial, optimistic, and collaborative. 'The duck syndrome'—calm on the surface, paddling furiously underneath. Students start companies, join VC-backed projects, and dream big. The weather is perfect, and the campus feels like a resort.",
            "distinctiveTraits": "The heart of Silicon Valley—Stanford is the #1 feeder to tech startups and VC firms. The d.school (design thinking) and StartX accelerator are legendary. Also known for the largest contiguous campus in the US and the 'Stanford Duck' culture.",
            "whatTheyLookFor": "Stanford values intellectual vitality, entrepreneurial spirit, and genuine curiosity. They want students who will 'make a dent in the universe' (Jobs' quote). The admissions team looks for 'spikes'—exceptional depth in one area—and character above achievements.",
            "applicationTips": "The 'What matters to you, and why?' essay is Stanford's soul-searching prompt—be vulnerable and authentic, not impressive. Show intellectual vitality by describing what you learn FOR FUN. If you're a tech applicant, show more than coding—show impact and creativity."
        }
    },
    "massachusetts-institute-of-technology": {
        "academics": {
            "strengths": ["Computer Science", "Engineering", "Physics", "Mathematics", "Biology", "Economics"],
            "signaturePrograms": ["UROP (research)", "Independent Activities Period", "Maker Spaces", "Media Lab"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "15-20"
        },
        "campus": {
            "setting": "Urban campus in Cambridge, MA, along the Charles River",
            "culture": "Intensely intellectual, quirky, and collaborative. 'Hack culture' is real—students pull all-nighters for fun (not just studying). The motto is 'mens et manus' (mind and hand). There's a proud nerd identity and a tradition of elaborate pranks (hacks).",
            "distinctiveTraits": "The world's premier STEM institution. UROP lets every undergrad do paid research from day one. The Independent Activities Period (January) lets students take anything from glassblowing to quantum computing. The Maker Spaces are legendary.",
            "whatTheyLookFor": "MIT values raw intellectual ability, creative problem-solving, and collaborative spirit. They want students who love STEM for its own sake, not just for careers. The admissions blog emphasizes 'fit with MIT's culture'—can you handle the intensity and weirdness?",
            "applicationTips": "The Maker Portfolio is critical if you build things—submit it. The essays should show your problem-solving process, not just outcomes. MIT cares about 'impact on community'—show how you've helped others learn or build. Interview strongly recommended."
        }
    },
    "california-institute-of-technology": {
        "academics": {
            "strengths": ["Physics", "Engineering", "Computer Science", "Mathematics", "Chemistry", "Biology"],
            "signaturePrograms": ["SURF (research)", "House System", "Caltech Y", "Jet Propulsion Lab"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "elite",
            "averageClassSize": "8-12"
        },
        "campus": {
            "setting": "Suburban campus in Pasadena, CA, near Los Angeles",
            "culture": "Intensely STEM-focused, small, and collaborative. With only ~900 undergrads, everyone knows everyone. The House system (like Hogwarts) creates tight communities. Students are brilliant, quirky, and passionate about science. Pranks are an art form.",
            "distinctiveTraits": "The smallest elite STEM school (~900 undergrads). Faculty-to-student ratio is 3:1—unmatched access to Nobel laureates. The Honor Code lets students take exams unsupervised. JPL (NASA's lab) is next door and hires Caltech students heavily.",
            "whatTheyLookFor": "Caltech seeks students with extraordinary STEM aptitude and genuine scientific curiosity. They value research experience, math competition success, and the ability to collaborate in small, intense communities. The 'fit' is about loving science deeply.",
            "applicationTips": "The STEM-focused essays should show your research process and scientific curiosity. Math/science teacher recommendations are weighted heavily. The 'fun' question is serious—show you have interests beyond STEM. If you've done research, describe it technically."
        }
    },
    "duke-university": {
        "academics": {
            "strengths": ["Public Policy", "Economics", "Engineering", "Biology", "Computer Science", "Political Science"],
            "signaturePrograms": ["Focus Program", "DukeEngage", "Pratt Engineering", "Sanford School"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "15-18"
        },
        "campus": {
            "setting": "Suburban campus in Durham, NC, with Gothic architecture and forests",
            "culture": "Work hard, play hard with Southern hospitality. Students are ambitious but friendly. Basketball is a religion (Cameron Crazies). Greek life is prominent but not dominant. The Research Triangle provides internship and research opportunities.",
            "distinctiveTraits": "The 'Gothic Wonderland' campus is stunning. DukeEngage funds every student's summer service project anywhere in the world. The Focus Program lets first-years live and learn in interdisciplinary clusters. Cameron Indoor Stadium is the most intense college basketball venue.",
            "whatTheyLookFor": "Duke values intellectual curiosity, leadership, and community engagement. They want students who will take advantage of DukeEngage and interdisciplinary programs. The 'Why Duke?' essay should show you understand the balance of academics and school spirit.",
            "applicationTips": "The 'Why Duke?' essay should mention specific programs (DukeEngage, Focus, Pratt) and the community feel. If you're a STEM applicant, mention the Pratt School specifically. The optional alumni interview is valuable—prepare to discuss your impact on communities."
        }
    },
    "university-of-chicago": {
        "academics": {
            "strengths": ["Economics", "Mathematics", "Core Curriculum", "Political Science", "Sociology", "Physics"],
            "signaturePrograms": ["Core Curriculum", "Chicago Economics", "Maroon Tribune", "Institute of Politics"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "15-20"
        },
        "campus": {
            "setting": "Urban campus in Hyde Park, Chicago, IL",
            "culture": "Intellectually intense, quirky, and unapologetically academic. 'The life of the mind' is real here. Students read Plato for fun and debate economics at 2 AM. The Scav Hunt is the largest in the world. It's not pre-professional—it's pre-intellectual.",
            "distinctiveTraits": "The Core Curriculum is legendary—students read the same canonical texts across disciplines. The Chicago School of Economics shaped modern economic thought. The Scavenger Hunt is a multi-day, campus-wide absurdity. Not a sports school; a thinking school.",
            "whatTheyLookFor": "UChicago values intellectual curiosity above all else. They want students who will embrace the Core and contribute to the 'life of the mind.' The unconventional essay prompts are filters for creative thinkers. They prioritize academic fit over achievements.",
            "applicationTips": "The UChicago essay prompts are famous for being weird—lean into it. Show you can think creatively and write with intellectual playfulness. The 'Why UChicago?' should reference specific Core sequences or professors. Demonstrate you understand UChicago is not for the faint of heart."
        }
    },
    "johns-hopkins-university": {
        "academics": {
            "strengths": ["Pre-Med", "Public Health", "Biomedical Engineering", "International Relations", "Writing"],
            "signaturePrograms": ["Hopkins Hospital pipeline", "BME (Biomedical Engineering)", "SAIS", "Woodrow Wilson Fellowship"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "18-22"
        },
        "campus": {
            "setting": "Urban campus in Baltimore, MD, with a separate Peabody Conservatory campus",
            "culture": "Pre-med and research-focused, but increasingly diverse. The BME program is the best in the nation. Students are serious about academics but Baltimore offers a gritty, real-world context. The Peabody partnership adds arts energy.",
            "distinctiveTraits": "The #1 hospital in America (Johns Hopkins Hospital) is next door—premeds shadow doctors as freshmen. The BME program is consistently ranked #1. The Woodrow Wilson Fellowship funds independent research for all students. Also home to the oldest creative writing program.",
            "whatTheyLookFor": "Hopkins values research aptitude and intellectual ambition. They want students who will use Baltimore as a laboratory for learning. The 'Why Hopkins?' should mention specific research labs, BME design teams, or public health initiatives.",
            "applicationTips": "If pre-med, show you've explored medicine beyond shadowing (research, volunteering, EMT). The BME program is highly selective—show engineering projects. The Peabody dual-degree is a hidden gem for musicians. Demonstrate you know Hopkins is more than 'the pre-med school.'"
        }
    },
    "northwestern-university": {
        "academics": {
            "strengths": ["Journalism (Medill)", "Theater", "Engineering", "Economics", "Communication", "Music"],
            "signaturePrograms": ["Medill School", "Bienen School of Music", "Kellogg certificate", "Chicago proximity"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "15-18"
        },
        "campus": {
            "setting": "Suburban campus in Evanston, IL, on Lake Michigan, with Chicago access",
            "culture": "Balanced, ambitious, and Midwestern-friendly. Students excel in multiple areas (theater + engineering, journalism + music). The quarter system is fast-paced. Lake Michigan provides a stunning backdrop. Chicago is a train ride away for internships.",
            "distinctiveTraits": "The only top school with world-class journalism (Medill), music (Bienen), and engineering (McCormick) at the same institution. The quarter system lets students take more classes. The lakefront location is unbeatable. Strong pre-professional culture with liberal arts breadth.",
            "whatTheyLookFor": "Northwestern values intellectual breadth and professional ambition. They want students who will use both the academic rigor and the Chicago proximity. The 'Why Northwestern?' should mention specific schools (Medill, Bienen, McCormick) and how they intersect.",
            "applicationTips": "School-specific essays are critical—tailor each to the program (Medill has different prompts than Weinberg). Show you've researched the quarter system and can handle the pace. If applying to Bienen, the music supplement is as important as the academic application."
        }
    },
    "vanderbilt-university": {
        "academics": {
            "strengths": ["Education", "Engineering", "Music", "Economics", "Medicine", "Political Science"],
            "signaturePrograms": ["Peabody College (Education)", "Blair School of Music", "Medical Center", "Ingram Scholarship"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "15-18"
        },
        "campus": {
            "setting": "Urban campus in Nashville, TN, with a park-like setting",
            "culture": "Friendly, balanced, and Southern-charming. Students are happy and collaborative, not cutthroat. Nashville provides music, food, and internship opportunities. The Commons system creates first-year community. Greek life is present but not overwhelming.",
            "distinctiveTraits": "The 'happiest' top-20 school by student satisfaction surveys. Peabody College is the #1 education school in the US. The Ingram Scholarship program funds students committed to community service. Nashville's music scene is a huge draw for arts-interested students.",
            "whatTheyLookFor": "Vanderbilt values community contribution and intellectual curiosity. They heavily weight demonstrated interest (visit, interview, early application). They want students who will be engaged campus citizens, not just brilliant recluses. The 'fit' is about balance.",
            "applicationTips": "The 'Why Vanderbilt?' essay should mention the Commons, Nashville, or specific academic programs. Show you've visited or done virtual engagement. The optional video can help if you're naturally warm and engaging. If applying to Blair, the music supplement is critical."
        }
    },
    "rice-university": {
        "academics": {
            "strengths": ["Engineering", "Architecture", "Music", "Economics", "Biology", "Computer Science"],
            "signaturePrograms": ["Rice Engineering", "Architecture School", "Shepherd School of Music", "Residential Colleges"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "14-16"
        },
        "campus": {
            "setting": "Urban campus in Houston, TX, with a tree-filled, intimate setting",
            "culture": "Collaborative, quirky, and tight-knit. The residential college system (11 colleges) creates instant family. Students are friendly and less competitive than peer schools. Houston provides internships in energy, medicine, and tech. The weather is warm year-round.",
            "distinctiveTraits": "The residential college system is the social heart—students are randomly assigned and stay for four years. Rice has the best student-faculty ratio (6:1) among top research universities. The 'Rice Coffeehouse' and 'Beer Bike' are beloved traditions. Houston's diversity is a huge asset.",
            "whatTheyLookFor": "Rice values intellectual curiosity, collaboration, and community engagement. They want students who will contribute to the residential college culture. The 'Why Rice?' should show you understand the college system and Houston's opportunities.",
            "applicationTips": "The 'Why Rice?' essay must mention the residential colleges specifically—show you want that tight community. The 'Rice Box' (upload an image) is a chance to show personality. If applying to Architecture or Shepherd School, the portfolio/audition is as important as academics."
        }
    },
    "university-of-notre-dame": {
        "academics": {
            "strengths": ["Business (Mendoza)", "Engineering", "Political Science", "Economics", "Theology", "Science"],
            "signaturePrograms": ["Mendoza College of Business", "Grotto", "ND Vision", "Service Learning"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "16-20"
        },
        "campus": {
            "setting": "Suburban campus in Notre Dame, IN, with iconic golden dome",
            "culture": "Faith-informed, service-oriented, and fiercely loyal. The Catholic identity is present but not oppressive. Students are genuinely nice (the 'Notre Dame nice' stereotype is real). Football Saturdays are religious experiences. Alumni network is legendary.",
            "distinctiveTraits": "The Catholic intellectual tradition shapes the Core (2 theology, 2 philosophy required). The alumni network is the most loyal in the world ('ND Nation'). The Grotto is a spiritual center for all faiths. Football Saturdays with the 'Play Like a Champion' sign are iconic.",
            "whatTheyLookFor": "Notre Dame values character, service, and community contribution. They want students who will embrace the 'whole person' education—mind, body, spirit. The faith requirement is real but inclusive of all backgrounds. Show you've thought about service and values.",
            "applicationTips": "The faith essay (if applicable) should be thoughtful, not performative. Show you understand Notre Dame's mission beyond football. The 'Why Notre Dame?' should mention specific service programs, Mendoza if business, or the Core's philosophy/theology requirement."
        }
    },
    "georgetown-university": {
        "academics": {
            "strengths": ["International Relations (SFS)", "Government", "Economics", "Law", "Arabic", "Theology"],
            "signaturePrograms": ["School of Foreign Service", "Law Center", "Arabic & Islamic Studies", "D.C. internships"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "moderate",
            "averageClassSize": "18-22"
        },
        "campus": {
            "setting": "Urban campus in Georgetown, Washington, D.C.",
            "culture": "Politically engaged, internationally minded, and ambitious. Students intern on Capitol Hill, at embassies, and at NGOs. The Jesuit identity emphasizes service and ethics. The neighborhood is historic and affluent. Politics is the default dinner conversation.",
            "distinctiveTraits": "The School of Foreign Service (SFS) is the premier undergraduate international relations program. Being in D.C. means internships at the State Department, White House, and World Bank are routine. The Jesuit tradition emphasizes 'women and men for others.'",
            "whatTheyLookFor": "Georgetown values global perspective, political awareness, and service ethic. They want students who will use D.C. as a classroom. The SFS has its own admissions committee—tailor your application to international affairs if applying there.",
            "applicationTips": "The SFS essay should show genuine international interest (language study, travel, Model UN). The 'Why Georgetown?' must mention D.C. opportunities specifically. The theology/philosophy core requirement should be acknowledged positively. Show you understand the Jesuit values."
        }
    },
    "emory-university": {
        "academics": {
            "strengths": ["Pre-Med", "Business", "Nursing", "Public Health", "Religion", "Psychology"],
            "signaturePrograms": ["Emory Hospital", "Goizueta Business", "Oxford College (2-year)", "Candler School"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "18-22"
        },
        "campus": {
            "setting": "Suburban campus in Atlanta, GA, with a separate Oxford College campus",
            "culture": "Pre-professional, friendly, and Southern. Atlanta provides internship opportunities in business, healthcare, and media. Oxford College (2-year liberal arts campus) is a unique entry point. Students are collaborative and career-focused.",
            "distinctiveTraits": "Oxford College offers a small liberal arts experience for the first two years before transitioning to the Atlanta campus. The Emory Hospital system is top-ranked. Goizueta Business School offers undergraduate business with Atlanta corporate connections. The 'Emory Bubble' is real but Atlanta breaks it.",
            "whatTheyLookFor": "Emory values intellectual curiosity and professional ambition. They want students who will engage with Atlanta's opportunities. The Oxford vs. main campus choice matters—show you understand the difference. Pre-med applicants should show clinical exposure.",
            "applicationTips": "If applying to Oxford, explain why you want the small-college start. The 'Why Emory?' should mention Atlanta specifically (CDC, CNN, Coca-Cola). Pre-med applicants should demonstrate patient interaction, not just shadowing. The business school requires a separate application."
        }
    },
    "carnegie-mellon-university": {
        "academics": {
            "strengths": ["Computer Science", "Drama", "Art", "Engineering", "Music", "Robotics"],
            "signaturePrograms": ["SCS (Computer Science)", "School of Drama", "School of Art", "Robotics Institute"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "15-20"
        },
        "campus": {
            "setting": "Urban campus in Pittsburgh, PA, with a modern, tech-focused feel",
            "culture": "Intense, quirky, and interdisciplinary. The 'CS + Drama' or 'Art + Robotics' combinations are common. Students work hard and embrace their nerdy passions. Pittsburgh is affordable and has a growing tech scene. The fence in the middle of campus is a painting tradition.",
            "distinctiveTraits": "The only top school where computer science, drama, and art are all world-class. The Robotics Institute is the largest in the world. The ' BXA' programs let students combine arts and sciences. The 'Painting the Fence' tradition is the oldest in America.",
            "whatTheyLookFor": "CMU values intellectual intensity and creative problem-solving. They want students who will push boundaries between disciplines. The school-specific essays should show deep knowledge of the program (SCS, Drama, Art, etc.). Portfolio/audition supplements are critical.",
            "applicationTips": "School-specific applications are separate and equally important. For SCS, show coding projects beyond coursework. For Drama, the prescreen audition is make-or-break. For Art, the portfolio is everything. The 'Why CMU?' should reference specific interdisciplinary opportunities."
        }
    },
    "university-of-southern-california": {
        "academics": {
            "strengths": ["Cinema", "Business", "Engineering", "Communication", "Music", "Architecture"],
            "signaturePrograms": ["USC School of Cinematic Arts", "Marshall Business", "Viterbi Engineering", "Thornton Music"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "20-26"
        },
        "campus": {
            "setting": "Urban campus in Los Angeles, CA, near downtown",
            "culture": "Ambitious, entrepreneurial, and entertainment-industry adjacent. The Trojan Network is legendary in Hollywood and business. Students are pre-professional and socially active. Greek life is prominent. The weather is perfect, and LA is your playground.",
            "distinctiveTraits": "The USC School of Cinematic Arts is the #1 film school in the world (George Lucas, Ron Howard are alums). The Trojan Network is the most connected alumni body in entertainment and business. The 'Fight On!' spirit is real. LA provides unmatched internship access.",
            "whatTheyLookFor": "USC values ambition, leadership, and 'Trojan spirit.' They want students who will use LA's opportunities and give back to the network. The 'Why USC?' should mention specific schools (Cinematic Arts, Marshall, Viterbi) and LA connections.",
            "applicationTips": "School-specific supplements are critical—each has different prompts. For Cinematic Arts, the creative portfolio is as important as grades. For Marshall, show business initiative. The 'What is something about yourself that is essential to understanding you?' essay should show personality."
        }
    },
    # === TOP LIBERAL ARTS COLLEGES (19) ===
    "williams-college": {
        "academics": {
            "strengths": ["Economics", "History", "English", "Political Science", "Art History", "Mathematics"],
            "signaturePrograms": ["Oxford-style tutorials", "Winter Study", "Williams-Mystic", "Center for Development Economics"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "8-12"
        },
        "campus": {
            "setting": "Rural campus in Williamstown, MA, in the Berkshire Mountains",
            "culture": "Intellectually intense, outdoorsy, and tight-knit. The tutorial system (2 students + 1 professor) creates deep relationships. Students are collaborative, not competitive. Winter Study in January lets students explore anything from skiing to internships. The mountains are beautiful but remote.",
            "distinctiveTraits": "The Oxford-style tutorial system is unique in the US—every junior takes at least one tutorial with just one other student and a professor. Williams-Mystic is a semester at sea program. The 'Eph' community is fiercely loyal. The Clark Art Institute is next door.",
            "whatTheyLookFor": "Williams values intellectual curiosity, collaboration, and love of learning. They want students who will thrive in small seminars and tutorials. The 'Why Williams?' should mention the tutorial system and the rural setting. They prioritize academic fit over achievements.",
            "applicationTips": "The tutorial system essay should show you understand what it entails (weekly essays, intense discussion). Show you've thought about Winter Study. The rural location is real—demonstrate you're okay with a small town. The alumni interview is important."
        }
    },
    "amherst-college": {
        "academics": {
            "strengths": ["Open Curriculum", "Economics", "Law", "Political Science", "English", "History"],
            "signaturePrograms": ["Open Curriculum", "Five College Consortium", "Lawrence Fellowships", "Center for Community Engagement"],
            "curriculumStyle": "Open Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "12-16"
        },
        "campus": {
            "setting": "Rural campus in Amherst, MA, in the Pioneer Valley",
            "culture": "Intellectually free, diverse, and engaged. The Open Curriculum attracts independent thinkers. The Five College Consortium (Amherst, Hampshire, Mount Holyoke, Smith, UMass) multiplies opportunities. Students are passionate about social justice and academic exploration.",
            "distinctiveTraits": "The Open Curriculum is genuine—no requirements at all. The Five College Consortium gives access to 5,000+ courses. Amherst is need-blind and meets full need for all students (including international). The 'Lord Jeffs' mascot was replaced by the Mammoths.",
            "whatTheyLookFor": "Amherst values intellectual independence, diversity of background and thought, and community engagement. They want students who will use the Open Curriculum wisely and contribute to the community. The 'Why Amherst?' should mention the Five Colleges or the curriculum.",
            "applicationTips": "The Open Curriculum essay is critical—explain how you'd use the freedom (specific course combinations). Show you've explored the Five College course catalog. The diversity essay should be thoughtful and personal. Amherst is need-blind—financial need doesn't hurt admission."
        }
    },
    "swarthmore-college": {
        "academics": {
            "strengths": ["Engineering", "Political Science", "Economics", "Biology", "Computer Science", "Philosophy"],
            "signaturePrograms": ["Engineering at a LAC", "Honors Program", "Lang Center", "Peace & Conflict Studies"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "10-14"
        },
        "campus": {
            "setting": "Suburban campus in Swarthmore, PA, near Philadelphia",
            "culture": "Intellectually intense, socially conscious, and collaborative. Students are passionate about social justice and academics. The 'Swat' culture is work-hard, discuss-hard. The arboretum campus is beautiful. Philadelphia is accessible for internships and culture.",
            "distinctiveTraits": "The only top LAC with a full ABET-accredited engineering program. The Honors Program involves external examiners (like Oxford/Cambridge). The Lang Center for Civic and Social Responsibility funds every student's service project. The 'Garnet' community is tight-knit.",
            "whatTheyLookFor": "Swarthmore values intellectual intensity, social conscience, and collaborative spirit. They want students who will engage deeply with ideas and with the world. The 'Why Swarthmore?' should mention the Honors Program, engineering, or social justice focus.",
            "applicationTips": "The Honors Program essay should show you understand the external examination system. If interested in engineering, explain why at a LAC. The social justice angle should be authentic, not performative. Show you've thought about the intensity—Swarthmore is academically rigorous."
        }
    },
    "pomona-college": {
        "academics": {
            "strengths": ["Economics", "Computer Science", "Mathematics", "International Relations", "Media Studies", "Neuroscience"],
            "signaturePrograms": ["Claremont Consortium (5C)", "Pomona College Orchestra", "Draper Center", "Study Abroad"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "12-15"
        },
        "campus": {
            "setting": "Suburban campus in Claremont, CA, near Los Angeles",
            "culture": "Intellectually curious, laid-back, and collaborative. The Claremont Consortium gives Pomona the resources of a mid-size university with the intimacy of a small college. Students take classes at 5 colleges, eat at 7 dining halls, and enjoy Southern California weather.",
            "distinctiveTraits": "The Claremont Consortium (5Cs) is unique—Pomona students take classes at Scripps, Claremont McKenna, Harvey Mudd, and Pitzer. The '7 dining halls' meme is real. The Draper Center for Community Partnership connects students to LA-area service. The weather is perfect year-round.",
            "whatTheyLookFor": "Pomona values intellectual curiosity, collaboration, and community engagement. They want students who will take advantage of the 5C resources. The 'Why Pomona?' should mention specific consortium opportunities and the Southern California location.",
            "applicationTips": "The 'Why Pomona?' essay must mention the Claremont Consortium specifically—show you understand you can take classes at the other 4 colleges. The 'community engagement' essay should be specific about LA-area opportunities. Show you've thought about the 5C social dynamics."
        }
    },
    "wellesley-college": {
        "academics": {
            "strengths": ["Economics", "Political Science", "Computer Science", "Biology", "History", "Psychology"],
            "signaturePrograms": ["Women's Leadership", "MIT Cross-Registration", "Wellesley Effect", "Alumnae Network"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "12-18"
        },
        "campus": {
            "setting": "Suburban campus in Wellesley, MA, near Boston",
            "culture": "Intellectually ambitious, supportive, and empowering. The women's college environment fosters leadership and confidence. Students are outspoken, politically engaged, and academically driven. Boston is accessible for internships and culture. The alumnae network is legendary.",
            "distinctiveTraits": "The premier women's college in the US with the most powerful alumnae network (Madeleine Albright, Hillary Clinton). Cross-registration with MIT, Babson, and Olin expands STEM opportunities. The 'Wellesley Effect' describes the confidence and leadership alumnae gain.",
            "whatTheyLookFor": "Wellesley values intellectual ambition, leadership potential, and commitment to women's advancement. They want students who will thrive in a women-centered environment and use the Boston proximity. The 'Why Wellesley?' should mention the alumnae network or MIT cross-registration.",
            "applicationTips": "The 'Why Wellesley?' essay should articulate why a women's college specifically (not just 'it's a good school'). Show you've thought about the alumnae network's value. If STEM-interested, mention MIT cross-registration. The 'community' essay should show collaborative leadership."
        }
    },
    "bowdoin-college": {
        "academics": {
            "strengths": ["Government", "Economics", "Biology", "English", "Environmental Studies", "Neuroscience"],
            "signaturePrograms": ["No Loans Policy", "Coastal Studies Center", "Common Good", "Arctic Studies"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "12-16"
        },
        "campus": {
            "setting": "Coastal campus in Brunswick, ME, near the ocean",
            "culture": "Friendly, outdoorsy, and intellectually engaged. The 'Common Good' ethos emphasizes service. Students are collaborative and genuinely nice. Maine's coast provides stunning natural beauty. The Outing Club is huge. Winter is long but embraced.",
            "distinctiveTraits": "The 'No Loans' financial aid policy (all aid is grants) is rare and generous. The Coastal Studies Center on Orr's Island is a marine biology gem. The Arctic Museum is unique. The 'Polar Bear' community is tight-knit and loyal. Food is famously excellent.",
            "whatTheyLookFor": "Bowdoin values intellectual curiosity, community contribution, and resilience. They want students who will embrace Maine's outdoors and the Common Good ethos. The 'Why Bowdoin?' should mention the Coastal Studies Center, the no-loans policy, or the food.",
            "applicationTips": "The 'Common Good' essay should show authentic service commitment, not just volunteering. The 'Why Bowdoin?' should mention specific outdoor or coastal opportunities. If you're from a warm climate, explain why you're excited about Maine winters (or at least okay with them)."
        }
    },
    "carleton-college": {
        "academics": {
            "strengths": ["Mathematics", "Computer Science", "Biology", "Chemistry", "English", "History"],
            "signaturePrograms": ["Trimester System", "Comps (Senior Thesis)", "Off-Campus Studies", "Science Complex"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-town campus in Northfield, MN, with two campuses (Carleton + St. Olaf)",
            "culture": "Intellectually playful, quirky, and collaborative. The trimester system is fast-paced (3 terms per year). Students are genuinely passionate about learning. 'Comps' (comprehensive exams) are a rite of passage. The 'Arb' (arboretum) is a beloved 880-acre natural space.",
            "distinctiveTraits": "The trimester system lets students focus on just 3 classes at a time, deeply. The 'Comps' (senior comprehensive projects) are required for every major. The Off-Campus Studies office sends 70%+ students abroad. The 'Arb' is one of the largest college arboreta in the US.",
            "whatTheyLookFor": "Carleton values intellectual playfulness, collaboration, and academic depth. They want students who will thrive in the trimester system and embrace the small-town Minnesota setting. The 'Why Carleton?' should mention the trimesters or the Arb.",
            "applicationTips": "The 'Why Carleton?' essay should explain why the trimester system appeals to you (deep focus vs. broad sampling). Show you've looked at the Off-Campus Studies options. The 'unusual' essay prompt is a chance to show quirkiness. The Arb is a real selling point for outdoorsy students."
        }
    },
    "middlebury-college": {
        "academics": {
            "strengths": ["Languages", "Environmental Studies", "International Studies", "Economics", "Political Science", "Literature"],
            "signaturePrograms": ["Language Schools", "Environmental Studies", "Middlebury Institute", "Feb Program"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "moderate",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Rural campus in Middlebury, VT, surrounded by mountains",
            "culture": "Globally minded, environmentally conscious, and outdoorsy. The Language Schools are legendary (students pledge to speak only their target language). The 'Feb' program lets students start in February. Students are progressive, athletic, and love Vermont's natural beauty.",
            "distinctiveTraits": "The Language Schools (summer immersion) are the best in the world—students sign a language pledge. The Feb program (February start) is unique. The Bread Loaf Writers' Conference is the oldest in America. The Snow Bowl (college-owned ski area) is a huge perk.",
            "whatTheyLookFor": "Middlebury values global perspective, environmental consciousness, and language aptitude. They want students who will use the Language Schools and the rural Vermont setting. The 'Why Middlebury?' should mention languages, the environment, or the Feb program.",
            "applicationTips": "If you've studied languages, emphasize your commitment. The environmental studies essay should show specific interest (not just 'I like nature'). The Feb program requires explaining why a non-traditional start appeals to you. Show you've thought about the rural location."
        }
    },
    "haverford-college": {
        "academics": {
            "strengths": ["Biology", "Chemistry", "English", "History", "Political Science", "Psychology"],
            "signaturePrograms": ["Honor Code", "Bi-Co with Bryn Mawr", "Customs (Orientation)", "360° Courses"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "12-16"
        },
        "campus": {
            "setting": "Suburban campus in Haverford, PA, near Philadelphia",
            "culture": "Intellectually intense, ethically grounded, and collaborative. The Honor Code governs everything—from exams to dorm life. Students are trusting and self-directed. The Bi-Co relationship with Bryn Mawr expands opportunities. The 'Customs' orientation creates instant community.",
            "distinctiveTraits": "The Honor Code is the defining feature—students take exams unsupervised, and dorm doors are often unlocked. The Bi-Co with Bryn Mawr means students can live at one and take classes at the other. The 'Customs' program pairs every first-year with a team of upperclassmen mentors.",
            "whatTheyLookFor": "Haverford values integrity, intellectual curiosity, and community responsibility. They want students who will embrace the Honor Code and contribute to the community. The 'Why Haverford?' should mention the Honor Code, Bi-Co, or Customs specifically.",
            "applicationTips": "The Honor Code essay should show you understand what it means (self-governance, trust, responsibility). If interested in Bryn Mawr cross-registration, explain why both schools appeal. The 'community' essay should demonstrate collaborative spirit. Show you've thought about the small size."
        }
    },
    "claremont-mckenna-college": {
        "academics": {
            "strengths": ["Economics", "Government", "International Relations", "Finance", "Philosophy", "History"],
            "signaturePrograms": ["Munger Graduate Center", "Silicon Valley Program", "Atheneum", "5C Consortium"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "moderate",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Suburban campus in Claremont, CA, near Los Angeles",
            "culture": "Pre-professional, ambitious, and politically engaged. CMC is the most 'career-focused' of the 5Cs. Students are confident, articulate, and networking-oriented. The Atheneum brings speakers like Supreme Court justices and CEOs. The 'CMC ethos' is leadership and free-market thinking.",
            "distinctiveTraits": "The Atheneum dinner series brings world leaders to campus weekly. The Silicon Valley Program provides semester-long internships. The Marian Miner Cook Atheneum is the social and intellectual heart. CMC is the most conservative of the 5Cs but still broadly diverse.",
            "whatTheyLookFor": "CMC values leadership, intellectual ambition, and professional drive. They want students who will use the Atheneum and the LA proximity. The 'Why CMC?' should mention the Atheneum, Silicon Valley Program, or specific career goals.",
            "applicationTips": "The 'Why CMC?' essay should reference the Atheneum specifically—show you understand it's a unique resource. If you're interested in finance/consulting, mention the career services. The leadership essay should show initiative, not just titles. Show you've thought about the 5C dynamics."
        }
    },
    "washington-and-lee-university": {
        "academics": {
            "strengths": ["Law", "Business", "Journalism", "Politics", "History", "Economics"],
            "signaturePrograms": ["Law School", "Johnson Scholarship", "Mock Convention", "Speaking Tradition"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "moderate",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-town campus in Lexington, VA, in the Shenandoah Valley",
            "culture": "Honorable, traditional, and tight-knit. The Honor System is student-run and absolute. The Speaking Tradition (saying hello to everyone you pass) defines the culture. Greek life is prominent. Mock Convention (predicting presidential nominees) is a century-old tradition.",
            "distinctiveTraits": "The Honor System allows unproctored exams and take-home tests. The Mock Convention has predicted presidential nominees with 100% accuracy since 1948. The Johnson Scholarship covers full cost for top applicants. The 'Speaking Tradition' makes campus uniquely friendly.",
            "whatTheyLookFor": "W&L values integrity, leadership, and community contribution. They want students who will embrace the Honor System and the speaking tradition. The 'Why W&L?' should mention the Honor System, Mock Convention, or the Johnson Scholarship.",
            "applicationTips": "The Honor System essay should show you understand what student-run integrity means. If applying for the Johnson Scholarship, the separate application is critical. The Mock Convention essay should show political interest. Show you've thought about the small Southern town setting."
        }
    },
    "smith-college": {
        "academics": {
            "strengths": ["Engineering", "Art History", "Economics", "Biology", "Government", "Psychology"],
            "signaturePrograms": ["Engineering at a women's college", "Five College Consortium", "Praxis", "Study Abroad"],
            "curriculumStyle": "Open Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-city campus in Northampton, MA, in the Pioneer Valley",
            "culture": "Intellectually ambitious, socially progressive, and empowering. The Open Curriculum attracts independent thinkers. The Five College Consortium expands opportunities. Students are outspoken, creative, and engaged in social justice. Northampton is a funky, artsy town.",
            "distinctiveTraits": "The only women's college with an ABET-accredited engineering program. The Open Curriculum is genuine—no requirements. The Five College Consortium gives access to 5,000+ courses. The 'Smithie' identity is confident and community-oriented. The Northampton food scene is excellent.",
            "whatTheyLookFor": "Smith values intellectual independence, leadership, and commitment to women's advancement. They want students who will use the Open Curriculum and the Five College resources. The 'Why Smith?' should mention the engineering program, the Open Curriculum, or the consortium.",
            "applicationTips": "The Open Curriculum essay should explain how you'd use the freedom. If interested in engineering, explain why at a women's college. The 'community' essay should show collaborative leadership. The Northampton location is a selling point—mention specific town opportunities."
        }
    },
    "grinnell-college": {
        "academics": {
            "strengths": ["Open Curriculum", "Biology", "Economics", "Political Science", "Computer Science", "History"],
            "signaturePrograms": ["Open Curriculum", "Social Justice", "Mentored Research", "Grinnell Corps"],
            "curriculumStyle": "Open Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "12-16"
        },
        "campus": {
            "setting": "Small-town campus in Grinnell, IA, in rural Iowa",
            "culture": "Intellectually intense, socially conscious, and quirky. The Open Curriculum attracts self-directed learners. Students are passionate about social justice and academic exploration. The town is small but supportive. The 'Scarlet and Black' community is tight-knit.",
            "distinctiveTraits": "The Open Curriculum is one of the most flexible in the nation. The Social Justice concentration is unique. The Grinnell Corps places graduates in service positions worldwide. The 'Self-Governance' system gives students unusual responsibility. The rural Iowa setting is peaceful but remote.",
            "whatTheyLookFor": "Grinnell values intellectual curiosity, social conscience, and self-direction. They want students who will thrive in the Open Curriculum and embrace the rural setting. The 'Why Grinnell?' should mention the curriculum, social justice, or self-governance.",
            "applicationTips": "The Open Curriculum essay should show you've thought about how to use the freedom. The social justice angle should be authentic. Show you've considered the rural Iowa location. The self-governance essay should demonstrate maturity and responsibility."
        }
    },
    "colby-college": {
        "academics": {
            "strengths": ["Economics", "Government", "Biology", "Environmental Science", "English", "History"],
            "signaturePrograms": ["Jan Plan", "Environmental Studies", "DavisConnects", "Off-Campus Study"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-town campus in Waterville, ME, with a new downtown integration",
            "culture": "Intellectually engaged, outdoorsy, and community-minded. The Jan Plan (January term) lets students explore one course intensively. DavisConnects funds every student's internship or research. The new downtown campus expansion connects students to the community.",
            "distinctiveTraits": "DavisConnects guarantees funding for every student's internship, research, or global experience. The Jan Plan is a month-long deep dive into one subject. The downtown Waterville revitalization is a unique college-town partnership. The 'Mule' community is loyal and tight-knit.",
            "whatTheyLookFor": "Colby values intellectual curiosity, community engagement, and outdoor enthusiasm. They want students who will use DavisConnects and Jan Plan. The 'Why Colby?' should mention specific internship goals or Jan Plan ideas.",
            "applicationTips": "The DavisConnects essay should show you have specific internship or research goals. The Jan Plan essay should explain what you'd explore in a month. Show you've thought about the Maine location. The downtown revitalization is a new angle—mention it if you're interested in community development."
        }
    },
    "bates-college": {
        "academics": {
            "strengths": ["Economics", "Politics", "Psychology", "Biology", "Environmental Studies", "History"],
            "signaturePrograms": ["Short Term", "Purposeful Work", "Bonner Leaders", "Community Engagement"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-city campus in Lewiston, ME, with a working-class town context",
            "culture": "Intellectually curious, socially engaged, and unpretentious. The 'Purposeful Work' program connects academics to careers. Students are collaborative and genuinely nice. The Short Term (5-week spring semester) lets students explore intensively. The community engagement is authentic.",
            "distinctiveTraits": "The Short Term is unique—a 5-week intensive semester in spring with one course, often including travel. Purposeful Work is a four-year career development program. The Bonner Leader program funds service-focused students. Bates is test-optional and has been for decades.",
            "whatTheyLookFor": "Bates values intellectual curiosity, community engagement, and purposeful ambition. They want students who will use the Short Term and Purposeful Work programs. The 'Why Bates?' should mention specific Short Term courses or career goals.",
            "applicationTips": "The Short Term essay should show you've looked at specific courses (many include travel). The Purposeful Work essay should connect your academic interests to career goals. Bates has been test-optional since 1984—don't submit scores unless they're strong. Show authentic community engagement."
        }
    },
    "macalester-college": {
        "academics": {
            "strengths": ["International Studies", "Economics", "Biology", "Computer Science", "Political Science", "Environmental Studies"],
            "signaturePrograms": ["International Focus", "Twin Cities", "Study Away", "Community Engagement"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Urban campus in St. Paul, MN, part of the Twin Cities",
            "culture": "Globally minded, socially conscious, and intellectually curious. The international focus is genuine—students come from 90+ countries. The Twin Cities provide internships, culture, and outdoor recreation. Students are progressive, engaged, and collaborative.",
            "distinctiveTraits": "The international focus is the defining feature—every student gets a global perspective. The Twin Cities location provides Fortune 500 internships (Target, 3M, General Mills). The Study Away program sends students to Chicago, Philadelphia, or internationally. The 'Mac' community is tight-knit.",
            "whatTheyLookFor": "Macalester values global perspective, social justice, and intellectual curiosity. They want students who will use the Twin Cities and the international programs. The 'Why Macalester?' should mention the international focus or specific Twin Cities opportunities.",
            "applicationTips": "The international focus essay should show genuine global interest (language, travel, cultural engagement). The Twin Cities essay should mention specific internships or cultural opportunities. Show you've thought about the cold weather. The community engagement essay should be specific."
        }
    },
    "oberlin-college": {
        "academics": {
            "strengths": ["Music", "Politics", "Biology", "Environmental Studies", "Creative Writing", "Art"],
            "signaturePrograms": ["Conservatory of Music", "Environmental Studies", "Winter Term", "Co-ops"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "moderate",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-town campus in Oberlin, OH, with a progressive town",
            "culture": "Artistic, progressive, and fiercely independent. The Conservatory of Music is world-class. Students are socially conscious, creative, and often quirky. The co-op housing system is unique. The town is small but culturally rich. Winter Term lets students design their own projects.",
            "distinctiveTraits": "The Conservatory of Music is one of the best in the world, and conservatory students live alongside liberal arts students. The co-op system lets students run their own housing and dining. Winter Term is a month of self-designed projects. Oberlin was the first college to admit women and Black students.",
            "whatTheyLookFor": "Oberlin values artistic talent, social consciousness, and intellectual independence. They want students who will use the Conservatory, co-ops, or Winter Term. The 'Why Oberlin?' should mention the conservatory, co-ops, or progressive history.",
            "applicationTips": "If applying to the Conservatory, the audition is everything. The co-op essay should show you understand communal living. The Winter Term essay should propose a specific project. Show you've thought about the small Ohio town. The progressive history is a selling point—mention it if relevant."
        }
    },
    "soka-university-of-america": {
        "academics": {
            "strengths": ["International Studies", "Environmental Studies", "Humanities", "Social & Behavioral Sciences"],
            "signaturePrograms": ["Study Abroad (all students)", "Peace & Human Rights", "Environmental Concentration", "Buddhist Humanism"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "moderate",
            "averageClassSize": "12-16"
        },
        "campus": {
            "setting": "Coastal campus in Aliso Viejo, CA, overlooking the Pacific Ocean",
            "culture": "Peace-focused, globally minded, and small. Every student studies abroad for a semester. The Buddhist-inspired values emphasize compassion and global citizenship. Students are diverse (50+ countries) and committed to social change. The ocean view is stunning.",
            "distinctiveTraits": "Every student studies abroad—it's required, not optional. The campus overlooks the Pacific Ocean. The Buddhist humanist values create a compassionate community. The small size (400 undergrads) means personalized attention. The focus is on 'contributing to global peace.'",
            "whatTheyLookFor": "Soka values global citizenship, peace commitment, and intellectual curiosity. They want students who will embrace the study abroad requirement and the Buddhist-inspired values. The 'Why Soka?' should mention the global focus or the ocean campus.",
            "applicationTips": "The study abroad essay should show excitement, not just willingness. The peace/human rights essay should be authentic. Show you've researched the Buddhist humanist philosophy (it's not religious requirement). The small size means every student matters—show you'll contribute."
        }
    },
    # === TOP STEM SCHOOLS (7) ===
    "georgia-institute-of-technology-main-campus": {
        "academics": {
            "strengths": ["Engineering", "Computer Science", "Industrial Design", "Architecture", "Business", "Mathematics"],
            "signaturePrograms": ["Co-op Program", "InVenture Prize", "Grand Challenges", "CREATE-X"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "25-35"
        },
        "campus": {
            "setting": "Urban campus in Atlanta, GA, in Midtown",
            "culture": "Intensely STEM-focused, collaborative, and practical. The co-op program lets students alternate work and study. Students are problem-solvers, not just theorists. Atlanta provides Fortune 500 internships. The 'Ramblin' Wreck' spirit is proud and quirky.",
            "distinctiveTraits": "The largest engineering school in the US. The co-op program is one of the oldest and largest (40% of students do it). CREATE-X lets students launch startups for credit. The InVenture Prize is a Shark Tank-style competition. The 'Ramblin' Wreck' is a 1930 Ford Model A mascot.",
            "whatTheyLookFor": "Georgia Tech values problem-solving ability, collaborative spirit, and practical impact. They want students who will use the co-op program and Atlanta's opportunities. The 'Why Georgia Tech?' should mention specific engineering programs or the co-op.",
            "applicationTips": "The 'Why Georgia Tech?' essay should mention specific engineering majors or the co-op program. Show project experience beyond coursework. The InVenture Prize or CREATE-X are great angles if you're entrepreneurial. The 'challenge' essay should show resilience in STEM."
        }
    },
    "university-of-illinois-urbana-champaign": {
        "academics": {
            "strengths": ["Computer Science", "Engineering", "Agriculture", "Business", "Psychology", "Mathematics"],
            "signaturePrograms": ["Grainger Engineering", "CS + X", "Research Park", "Agricultural Economics"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "25-35"
        },
        "campus": {
            "setting": "Small-city campus in Urbana-Champaign, IL, in central Illinois",
            "culture": "STEM-heavy, research-focused, and Big Ten spirited. The CS program is top-5 nationally. Students are technically brilliant and collaborative. The cornfields are real but so are the Research Park internships. Basketball and football create community.",
            "distinctiveTraits": "The CS program is one of the best in the world (Silicon Valley calls it a 'target school'). CS + X lets students combine computer science with any field. The Research Park hosts 100+ companies including Abbott and Caterpillar. The 'Makerspace' culture is strong.",
            "whatTheyLookFor": "UIUC values technical aptitude, research interest, and collaborative spirit. They want students who will use the Research Park and the CS resources. The 'Why UIUC?' should mention specific engineering programs or research labs.",
            "applicationTips": "The CS application is highly competitive—show coding projects with impact. The CS + X program is a great angle if you have interdisciplinary interests. The Research Park essay should mention specific companies or labs. Show you've thought about the Midwest location."
        }
    },
    "purdue-university-main-campus": {
        "academics": {
            "strengths": ["Engineering", "Aviation", "Agriculture", "Computer Science", "Pharmacy", "Business"],
            "signaturePrograms": ["Purdue Engineering", "Aviation Program", "Co-op Program", "Research Park"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "25-35"
        },
        "campus": {
            "setting": "Small-city campus in West Lafayette, IN",
            "culture": "Practical, hardworking, and Boilermaker-proud. Purdue produces more astronauts than any public university. Students are technically skilled and career-focused. The 'Cradle of Astronauts' legacy is real. The campus is flat but the engineering is world-class.",
            "distinctiveTraits": "The 'Cradle of Astronauts'—25+ Purdue grads have been to space. The aviation program includes a working airport on campus. The engineering program is one of the largest and most respected. The 'World's Largest Drum' is a marching band tradition.",
            "whatTheyLookFor": "Purdue values technical aptitude, work ethic, and practical ambition. They want students who will use the co-op program and the aviation/engineering resources. The 'Why Purdue?' should mention specific engineering programs or the aviation school.",
            "applicationTips": "The engineering essay should show project experience and technical depth. If interested in aviation, mention the airport campus. The co-op program is a strong angle—show you understand the work-study alternation. The 'Boilermaker' spirit is about grit—show yours."
        }
    },
    "colgate-university": {
        "academics": {
            "strengths": ["Economics", "Political Science", "History", "English", "Biology", "Environmental Studies"],
            "signaturePrograms": ["Core Curriculum", "Off-Campus Study", "Thought Into Action", "Upstate Institute"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "16-20"
        },
        "campus": {
            "setting": "Rural campus in Hamilton, NY, on a hill with a lake",
            "culture": "Intellectually engaged, outdoorsy, and tight-knit. The Core Curriculum creates shared intellectual foundations. Students are friendly, ambitious, and love the natural beauty. The lake and hiking trails are central to campus life. The 'Gate' community is loyal.",
            "distinctiveTraits": "The Core Curriculum includes a legendary 'Western Traditions' sequence. The Off-Campus Study program sends 60%+ students abroad. The Upstate Institute connects students to Central NY community needs. The campus sits on a hill with stunning views.",
            "whatTheyLookFor": "Colgate values intellectual curiosity, community engagement, and resilience. They want students who will embrace the Core and the rural setting. The 'Why Colgate?' should mention the Core, off-campus study, or the Upstate Institute.",
            "applicationTips": "The Core Curriculum essay should show you value broad intellectual foundations. The off-campus study essay should mention specific programs. Show you've thought about the rural location. The 'community' essay should demonstrate collaborative spirit."
        }
    },
    "hamilton-college": {
        "academics": {
            "strengths": ["Economics", "Government", "Creative Writing", "Biology", "Mathematics", "History"],
            "signaturePrograms": ["Open Curriculum", "Writing Center", "Adirondack Program", "NY City Program"],
            "curriculumStyle": "Open Curriculum",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Rural campus in Clinton, NY, near the Adirondack Mountains",
            "culture": "Intellectually curious, collaborative, and outdoorsy. The Open Curriculum attracts self-directed learners. Students are friendly and less competitive than peer schools. The 'Hamilton Serves' program emphasizes community engagement. The Adirondacks provide outdoor recreation.",
            "distinctiveTraits": "The Open Curriculum is genuine—students design their own concentrations with advisor guidance. The Writing Center is one of the best in the nation. The NY City program provides semester-long urban immersion. The 'Continentals' community is tight-knit.",
            "whatTheyLookFor": "Hamilton values intellectual independence, writing ability, and community contribution. They want students who will use the Open Curriculum and the writing resources. The 'Why Hamilton?' should mention the curriculum, writing, or the Adirondack location.",
            "applicationTips": "The Open Curriculum essay should show how you'd design your education. The writing sample is critical—show analytical depth. The 'community' essay should demonstrate collaborative spirit. Show you've thought about the rural New York setting."
        }
    },
    "harvey-mudd-college": {
        "academics": {
            "strengths": ["Engineering", "Computer Science", "Mathematics", "Physics", "Biology", "Chemistry"],
            "signaturePrograms": ["Clinic Program", "5C Consortium", "Research", "STEM Focus"],
            "curriculumStyle": "Core Curriculum",
            "stemStrength": "elite",
            "averageClassSize": "10-14"
        },
        "campus": {
            "setting": "Suburban campus in Claremont, CA, part of the Claremont Consortium",
            "culture": "Intensely STEM-focused, collaborative, and quirky. The Clinic Program (real-world client projects) is the capstone for all students. The 5C consortium expands social and academic opportunities. Students are brilliant, work hard, and have fun. The 'Mudd' culture is proud and nerdy.",
            "distinctiveTraits": "The Clinic Program is unique—every senior works on a real project for a company or lab. The Core is rigorous (lots of math, science, humanities). The 5C consortium means Mudd students take classes at Pomona, Scripps, CMC, and Pitzer. The 'Honor Code' creates trust.",
            "whatTheyLookFor": "Harvey Mudd values exceptional STEM aptitude, collaborative spirit, and intellectual curiosity. They want students who will thrive in the intense Core and embrace the Clinic. The 'Why Mudd?' should mention the Clinic, the Core, or the 5C consortium.",
            "applicationTips": "The STEM essay should show depth beyond coursework—research, competitions, projects. The 'Why Mudd?' must mention the Clinic Program specifically. Show you understand the intense Core (it's real). The 5C essay should explain why the consortium matters to you."
        }
    },
    "rensselaer-polytechnic-institute": {
        "academics": {
            "strengths": ["Engineering", "Computer Science", "Architecture", "Business", "Science", "Humanities"],
            "signaturePrograms": ["Arch + Design", "Co-term", "Research", "Entrepreneurship"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "18-24"
        },
        "campus": {
            "setting": "Urban campus in Troy, NY, overlooking the Hudson River",
            "culture": "Innovative, entrepreneurial, and technically focused. The 'Why not change the world?' motto drives the culture. Students are problem-solvers and makers. The Hudson Valley provides a historic backdrop. The co-term program lets students get a master's in 5 years.",
            "distinctiveTraits": "The oldest technological university in the English-speaking world (founded 1824). The co-term program lets students earn a BS + MS in 5 years. The EMPAC arts center is a stunning architectural landmark. The 'Rensselaer Plan' emphasizes research and innovation.",
            "whatTheyLookFor": "RPI values technical aptitude, innovation, and entrepreneurial spirit. They want students who will use the co-term program and the research resources. The 'Why RPI?' should mention the co-term, the Arch program, or specific research labs.",
            "applicationTips": "The 'change the world' essay should show ambitious problem-solving. The co-term program is a great angle if you're considering grad school. The Arch (Architecture + Design) portfolio is critical if applying. Show you've thought about the Troy location."
        }
    },
    "rose-hulman-institute-of-technology": {
        "academics": {
            "strengths": ["Engineering", "Computer Science", "Mathematics", "Chemistry", "Physics", "Economics"],
            "signaturePrograms": ["Hands-on Engineering", "Research", "Career Services", "Small Classes"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-town campus in Terre Haute, IN",
            "culture": "Intensely STEM-focused, supportive, and practical. The small size means personalized attention. Students are collaborative, not competitive. The hands-on labs start freshman year. The 'RHIT' community is tight-knit and loyal.",
            "distinctiveTraits": "The #1 undergraduate engineering school in the US (no graduate students, so all research is for undergrads). The small size (2,000 students) creates a family feel. The hands-on philosophy means students build and test from day one. The 'Fightin' Engineers' are proud.",
            "whatTheyLookFor": "Rose-Hulman values technical aptitude, collaborative spirit, and hands-on enthusiasm. They want students who will use the small class sizes and the research opportunities. The 'Why Rose-Hulman?' should mention the no-grad-students policy or the hands-on labs.",
            "applicationTips": "The hands-on essay should show you've built or designed things. The small size is a selling point—show you want personalized attention. The research essay should mention specific labs or projects. Show you've thought about the Terre Haute location."
        }
    },
    "university-of-california-los-angeles": {
        "academics": {
            "strengths": ["Film", "Psychology", "Economics", "Biology", "Engineering", "Political Science"],
            "signaturePrograms": ["Film School", "Medical School", "Anderson Business", "Research"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "25-40"
        },
        "campus": {
            "setting": "Urban campus in Westwood, Los Angeles, CA",
            "culture": "Diverse, ambitious, and energetic. The most applied-to university in the US. Students are competitive but collaborative. Westwood is a perfect college neighborhood. The film school is legendary. The 'Bruin' spirit is strong in sports and academics.",
            "distinctiveTraits": "The most applied-to university in America (140,000+ apps). The film school is top-5 globally. The medical school is top-10. The campus is beautiful with a botanical garden. The 'Westwood' location provides LA access without the chaos.",
            "whatTheyLookFor": "UCLA values academic excellence, diversity, and community contribution. They want students who will use the LA resources and contribute to the campus. The UC application essays should show resilience and leadership.",
            "applicationTips": "The UC essays are shared across all campuses—make UCLA-specific references. If applying to the film school, the portfolio is critical. The 'leadership' essay should show impact on your community. The 'challenge' essay should demonstrate resilience."
        }
    },
    "vassar-college": {
        "academics": {
            "strengths": ["English", "Art History", "Biology", "Political Science", "Drama", "Economics"],
            "signaturePrograms": ["Open Curriculum", "Art Museum", "Urban Studies", "Research"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "14-18"
        },
        "campus": {
            "setting": "Small-city campus in Poughkeepsie, NY, on the Hudson River",
            "culture": "Intellectually free, artistic, and progressive. The open curriculum and strong arts programs attract creative thinkers. Students are socially conscious and academically driven. The Hudson Valley provides natural beauty. The 'Vassar' community is tight-knit.",
            "distinctiveTraits": "The first of the Seven Sisters to go co-ed. The Frances Lehman Loeb Art Center has 21,000+ works. The Urban Studies program uses NYC as a classroom. The 'Vassar' identity is artsy, progressive, and intellectually curious.",
            "whatTheyLookFor": "Vassar values intellectual curiosity, artistic talent, and social consciousness. They want students who will use the open curriculum and the arts resources. The 'Why Vassar?' should mention the art museum, urban studies, or the Hudson Valley.",
            "applicationTips": "The arts essay should show genuine creative passion. The open curriculum essay should explain how you'd use the freedom. The 'community' essay should demonstrate collaborative spirit. Show you've thought about the Poughkeepsie location."
        }
    },
    "washington-university-in-st-louis": {
        "academics": {
            "strengths": ["Medicine", "Business", "Law", "Social Work", "Engineering", "Arts"],
            "signaturePrograms": ["Medical School", "Olin Business", "Law School", "Sam Fox Arts"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "18-24"
        },
        "campus": {
            "setting": "Suburban campus in St. Louis, MO, with a park-like setting",
            "culture": "Academically excellent, pre-professional, and Midwestern-friendly. The medical school and hospital are top-ranked. Students are ambitious but collaborative. The 'Danforth' campus is beautiful. St. Louis provides internship and cultural opportunities.",
            "distinctiveTraits": "The medical school is consistently top-10. The Olin Business School is highly ranked for undergraduates. The Sam Fox School of Design and Visual Arts is exceptional. The 'Bear' community is proud and service-oriented.",
            "whatTheyLookFor": "WashU values academic excellence, service, and intellectual curiosity. They want students who will use the medical and business resources. The 'Why WashU?' should mention specific schools (Olin, Med, Sam Fox) and programs.",
            "applicationTips": "School-specific applications are important—Olin and Sam Fox have separate requirements. The pre-med essay should show clinical exposure. The 'community' essay should demonstrate service orientation. Show you've thought about the St. Louis location."
        }
    },
    "worcester-polytechnic-institute": {
        "academics": {
            "strengths": ["Engineering", "Computer Science", "Robotics", "Business", "Humanities", "Mathematics"],
            "signaturePrograms": ["Project-Based Learning", "IQP", "MQP", "Global Projects"],
            "curriculumStyle": "Project-Based",
            "stemStrength": "elite",
            "averageClassSize": "18-24"
        },
        "campus": {
            "setting": "Urban campus in Worcester, MA",
            "culture": "Project-focused, innovative, and globally minded. The project-based curriculum means students solve real problems from day one. The IQP (Interactive Qualifying Project) sends students around the world. Students are hands-on, collaborative, and entrepreneurial.",
            "distinctiveTraits": "The project-based curriculum is unique—no traditional semesters, just 7-week terms with intense projects. The IQP sends students to work on global issues (water, energy, education). The MQP (Major Qualifying Project) is a senior capstone. The 'WPI Plan' is revolutionary.",
            "whatTheyLookFor": "WPI values problem-solving ability, collaborative spirit, and global perspective. They want students who will embrace the project-based curriculum. The 'Why WPI?' should mention the IQP, MQP, or the 7-week terms.",
            "applicationTips": "The project-based essay should show you've worked on team projects. The global perspective essay should mention specific IQP interests. The 'Why WPI?' must explain why the 7-week term system appeals to you. Show you've thought about the Worcester location."
        }
    },
    "university-of-michigan": {
        "academics": {
            "strengths": ["Engineering", "Business", "Medicine", "Law", "Computer Science", "Psychology"],
            "signaturePrograms": ["Ross Business", "Engineering", "Michigan Medicine", "Big Ten Athletics"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "25-35"
        },
        "campus": {
            "setting": "College-town campus in Ann Arbor, MI",
            "culture": "Academically excellent, athletically proud, and socially active. The Big Ten sports culture is real (football Saturdays are religious). Students are ambitious but collaborative. Ann Arbor is a perfect college town with great food and music. The 'Michigan Difference' is about impact.",
            "distinctiveTraits": "The largest research university in the US by research spending. The Ross School of Business is top-3 for undergraduates. Michigan Medicine is a top-10 hospital. The 'Victors' fight song is the most recognized in college sports. The alumni network is 600,000+ strong.",
            "whatTheyLookFor": "Michigan values academic excellence, leadership, and community contribution. They want students who will use the vast resources and give back. The 'Why Michigan?' should mention specific schools (Ross, Engineering, LSA) and programs.",
            "applicationTips": "School-specific applications are critical—Ross and Engineering have separate essays. The 'Why Michigan?' should mention specific professors, labs, or programs. The community essay should show you'll contribute to the Big Ten culture. If out-of-state, explain why Michigan specifically."
        }
    },
    "university-of-california-berkeley": {
        "academics": {
            "strengths": ["Computer Science", "Engineering", "Economics", "Political Science", "Chemistry", "Mathematics"],
            "signaturePrograms": ["EECS", "Haas Business", "Lawrence Berkeley Lab", "Public Policy"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "25-40"
        },
        "campus": {
            "setting": "Urban campus in Berkeley, CA, across from San Francisco",
            "culture": "Intellectually fierce, socially progressive, and competitively intense. Students are brilliant, activist, and often stressed. The 'Berkeley experience' includes protests, research, and cutthroat CS curves. The city is eclectic and expensive. The views of the Bay are stunning.",
            "distinctiveTraits": "The top public university in the world by many rankings. The EECS program is the hardest to get into and the most rigorous. Lawrence Berkeley National Lab is next door. The Free Speech Movement started here. The 'Bear' spirit is proud and politically active.",
            "whatTheyLookFor": "Berkeley values intellectual intensity, social consciousness, and resilience. They want students who can handle the competitive environment and use the research resources. The 'Why Berkeley?' should mention specific programs or professors.",
            "applicationTips": "The UC application essays are shared across all campuses—make Berkeley-specific references. If applying to EECS, show exceptional technical depth. The 'leadership' essay should show impact, not just titles. The 'challenge' essay should demonstrate resilience."
        }
    },
    "virginia-polytechnic-institute-and-state-university": {
        "academics": {
            "strengths": ["Engineering", "Architecture", "Agriculture", "Business", "Computer Science", "Veterinary Medicine"],
            "signaturePrograms": ["Engineering", "Architecture + Design", "Veterinary School", "Corps of Cadets"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "elite",
            "averageClassSize": "25-35"
        },
        "campus": {
            "setting": "Small-town campus in Blacksburg, VA, in the Blue Ridge Mountains",
            "culture": "Hokie-spirited, community-focused, and outdoorsy. The 'Hokie Nation' is fiercely loyal. Students are friendly, collaborative, and love football. The Blue Ridge Mountains provide hiking and outdoor recreation. The Corps of Cadets adds military tradition.",
            "distinctiveTraits": "The 'Hokie Stone' buildings are made of local limestone and gorgeous. The Corps of Cadets is one of six senior military colleges. The veterinary school is top-ranked. The 'Ut Prosim' (That I May Serve) motto shapes the service culture. Football Saturdays in Blacksburg are electric.",
            "whatTheyLookFor": "Virginia Tech values service, community, and technical aptitude. They want students who will embrace the Hokie spirit and contribute to the community. The 'Why Virginia Tech?' should mention the service ethos, the Corps, or the engineering programs.",
            "applicationTips": "The 'service' essay is critical—show authentic commitment to helping others. If interested in the Corps, explain why the military structure appeals. The engineering essay should show project experience. The 'community' essay should demonstrate you'll be an active Hokie."
        }
    },
    "california-polytechnic-state-university-san-luis-obispo": {
        "academics": {
            "strengths": ["Engineering", "Architecture", "Agriculture", "Business", "Learn by Doing"],
            "signaturePrograms": ["Learn by Doing", "Architecture", "Engineering", "CalPolyPomona"],
            "curriculumStyle": "Distribution Requirements",
            "stemStrength": "strong",
            "averageClassSize": "25-35"
        },
        "campus": {
            "setting": "Suburban campus in San Luis Obispo, CA, near the coast",
            "culture": "Hands-on, practical, and collaborative. The 'Learn by Doing' philosophy means students build, design, and create from day one. The campus is beautiful with a farm and vineyards. Students are down-to-earth and career-focused. The weather is perfect.",
            "distinctiveTraits": "The 'Learn by Doing' philosophy is genuine—students don't just study engineering, they build race cars and concrete canoes. The campus has a working farm, creamery, and vineyard. The 'SLO' location is one of the happiest cities in America. The 'Mustang' spirit is proud and practical.",
            "whatTheyLookFor": "Cal Poly values hands-on aptitude, collaborative spirit, and practical ambition. They want students who will embrace the 'Learn by Doing' culture. The 'Why Cal Poly?' should mention specific project-based programs or the SLO location.",
            "applicationTips": "The 'Learn by Doing' essay should show you've built, designed, or created something tangible. The hands-on philosophy is real—show project experience. The SLO location is a selling point. If applying to Architecture, the portfolio is critical. Show you've thought about the practical focus."
        }
    }
}

# Apply enrichment to all college profiles
updated = 0
missing = []
for path in sorted(glob.glob('data/colleges/*.json')):
    college_id = os.path.basename(path).replace('.json', '')
    with open(path) as f:
        data = json.load(f)
    
    if college_id in ENRICHMENT:
        enrich = ENRICHMENT[college_id]
        
        # Ensure academics section exists
        if 'academics' not in data:
            data['academics'] = {}
        data['academics'].update(enrich['academics'])
        
        # Ensure campus section exists
        if 'campus' not in data:
            data['campus'] = {}
        data['campus'].update(enrich['campus'])
        
        # Update timestamp
        data['lastUpdated'] = datetime.utcnow().isoformat() + 'Z'
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        updated += 1
    else:
        missing.append(college_id)

print(f"Updated: {updated} colleges")
print(f"Missing from enrichment data: {len(missing)}")
if missing:
    for m in missing:
        print(f"  - {m}")
