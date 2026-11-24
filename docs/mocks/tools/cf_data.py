"""The cast and catalog every mock uses (copied from the Magic Patterns prototype's
shared/cf/data.ts, shared/cf/news.ts and shared/cf/admin/data.ts). "Today" is Wednesday, April 15, 2026,
8:45 AM, Toronto: Grace's next event, the Easter Sunrise 5K, is in 3 days."""

TODAY = "Wednesday, April 15, 2026"

ME = {
    "name": "Grace Thompson",
    "first": "Grace",
    "initials": "GT",
    "email": "grace.thompson@gmail.com",
    "church": "Grace Fellowship, Scarborough",
    "city": "Toronto, ON",
    "joined": "Member since January 2026",
    "bio": "Mom of two, recovering couch-to-5K runner. Training for my first half marathon and praying my knees agree.",
    "goals": ["Half marathon in the fall", "Strength twice a week", "Sleep before 11"],
    "interests": ["Running", "Strength", "Basketball", "Nutrition"],
}

# A second member, used where the prototype's "member" view of a profile is shown.
MICHAEL = {
    "name": "Michael Chen",
    "first": "Michael",
    "initials": "MC",
    "church": "Toronto Chinese Baptist",
    "city": "Toronto, ON",
    "joined": "Member since November 2025",
    "bio": "Weekend long-runner and Sunrise 5K pacer. Usually at the back of the pack making sure nobody runs alone.",
    "goals": ["Pace the 2:10 group at the Waterfront Half", "Bring three friends to Saturday runs"],
    "interests": ["Running", "Cycling", "Strength"],
}

EVENTS = [
    {
        "id": "sunrise-5k", "title": "Easter Sunrise 5K", "category": "Run", "day": "18", "month": "Apr", "weekday": "Sat",
        "time": "6:45 AM", "place": "Martin Goodman Trail, Marilyn Bell Park", "area": "Waterfront", "price": "Free",
        "going": 142, "capacity": 200, "image": "run", "registered": True, "host": "cf-team",
        "summary": "An easy-paced run along the lake to watch the sun come up, with a short devotion at the turnaround and coffee at the finish.",
    },
    {
        "id": "park-bootcamp", "title": "Saturday Park Bootcamp", "category": "Workout", "day": "25", "month": "Apr", "weekday": "Sat",
        "time": "8:00 AM", "place": "Trillium Park, Ontario Place", "area": "Waterfront", "price": "$10",
        "going": 38, "capacity": 50, "image": "bootcamp", "registered": False, "host": "okafor",
        "series": "park-bootcamp", "session": 4,
        "summary": "Forty-five minutes of full-body circuits for every level, led by Danielle Okafor. Bring a mat and water.",
    },
    {
        "id": "hoops-night", "title": "Women's Hoops & Devotion Night", "category": "Basketball", "day": "30", "month": "Apr", "weekday": "Thu",
        "time": "7:00 PM", "place": "St. Lawrence Community Rec Centre", "area": "Downtown", "price": "Free",
        "going": 24, "capacity": 30, "image": "hoops", "registered": True, "host": "faith-footwork",
        "series": "womens-hoops", "session": 4,
        "summary": "Pickup games for all skill levels, then a short devotion. Inspired by the Tempo, open to every woman who loves the game.",
    },
    {
        "id": "stretch-pray", "title": "Stretch & Pray: Mobility Morning", "category": "Mobility", "day": "06", "month": "May", "weekday": "Wed",
        "time": "9:30 AM", "place": "Grace Fellowship Hall", "area": "Scarborough", "price": "Free",
        "going": 17, "capacity": 25, "image": "stretch", "registered": False, "host": "grace-move",
        "summary": "Gentle mobility and breathing for stiff backs and busy minds. Chairs available, all ages welcome.",
    },
]
# One date of the Couch to 5K series. It is listed with the member's events (Home, Events, Landing,
# Newsletter); the admin console's event tables do not draw series yet, so EVENTS stays the four above.
C25K_WEEK_3 = {
    "id": "c25k-week-3", "title": "Couch to 5K: Week 3", "category": "Run", "day": "21", "month": "Apr", "weekday": "Tue",
    "time": "6:30 PM", "place": "Humber Bay Park East", "area": "Etobicoke", "price": "Free",
    "going": 31, "capacity": 40, "image": "run", "registered": True, "host": "lakeshore-runners",
    "series": "couch-to-5k", "session": 3,
    "summary": "Run 90 seconds, walk two minutes, six times through. Michael leads the walk-back prayer.",
}
MEMBER_EVENTS = [EVENTS[0], C25K_WEEK_3, *EVENTS[1:]]
EV = {e["id"]: e for e in MEMBER_EVENTS}

SCHEDULE = [
    ("6:30 AM", "Meet at the park entrance. Coffee, name tags, warm-up"),
    ("6:45 AM", "Start together, split into pace groups"),
    ("7:10 AM", "Sunrise devotion at the turnaround"),
    ("7:45 AM", "Finish, breakfast and photos"),
]

SERVICES = [
    {
        "id": "okafor", "name": "Danielle Okafor", "first": "Danielle", "role": "Personal trainer", "category": "Training",
        "where": "In person · East York", "price": "From $70 / session", "credentials": "NASM-CPT · 9 years",
        "about": "Strength training for women returning to fitness after kids, injury or a long break. Small-group and one-on-one.",
        "initials": "DO", "image": "trainer",
    },
    {
        "id": "lee", "name": "Marcus Lee, RD", "first": "Marcus", "role": "Registered dietitian", "category": "Nutrition",
        "where": "Virtual · Ontario-wide", "price": "$95 first consult",
        "credentials": "Registered Dietitian, College of Dietitians of Ontario",
        "about": "Practical meal planning for families and athletes. Covered by most extended health plans.", "initials": "ML",
    },
    {
        "id": "abernathy", "name": "Ruth Abernathy", "first": "Ruth", "role": "Physiotherapist", "category": "Physio",
        "where": "In person · Etobicoke", "price": "$110 assessment", "credentials": "Registered Physiotherapist · Sports & running injuries",
        "about": "Running injuries, knees and lower backs. Direct billing to most insurers.", "initials": "RA",
    },
    {
        "id": "grant", "name": "Tasha Grant", "first": "Tasha", "role": "Basketball skills coach", "category": "Coaching",
        "where": "In person · North York", "price": "From $45 / session", "credentials": "Former U SPORTS guard · NCCP certified",
        "about": "Skills and conditioning for girls 10–18 and adult beginners. Faith and footwork, in that order.", "initials": "TG",
    },
    {
        "id": "whitfield", "name": "Rev. James Whitfield", "first": "James", "role": "Faith & wellness counsellor", "category": "Counselling",
        "where": "Virtual or in person · Midtown", "price": "Sliding scale", "credentials": "Registered Psychotherapist (Qualifying) · M.Div",
        "about": "Burnout, grief and motivation, with room to bring faith into the conversation.", "initials": "JW",
    },
]
SV = {s["id"]: s for s in SERVICES}

CONVERSATIONS = [
    {
        "id": "sunrise-crew", "name": "Sunrise 5K Crew", "initials": "5K", "group": True, "members": 18,
        "last": "Michael: Parking at Marilyn Bell fills up by 6:30", "time": "8:42 AM", "unread": 3,
        "messages": [
            ("them", "Danielle Okafor", "Morning team! Saturday forecast is 6° and clear. Bring a layer you can tie around your waist.", "7:58 AM"),
            ("them", "Michael Chen", "Parking at Marilyn Bell fills up by 6:30, so carpool or take the 504 King.", "8:40 AM"),
            ("me", None, "I'll drive from Scarborough, I have room for three.", "8:41 AM"),
            ("them", "Michael Chen", "Amazing, put me down. Is anyone bringing a speaker for worship at the turnaround?", "8:42 AM"),
        ],
    },
    {
        "id": "okafor", "name": "Danielle Okafor", "initials": "DO", "group": False,
        "last": "See you Thursday at 6!", "time": "Yesterday", "unread": 0,
        "messages": [
            ("me", None, "Hi Danielle, could we move Thursday to 6 PM?", "Yesterday"),
            ("them", None, "See you Thursday at 6!", "Yesterday"),
        ],
    },
    {
        "id": "hoops", "name": "Women's Hoops", "initials": "WH", "group": True, "members": 26,
        "last": "Priya: Who has the pinnies?", "time": "Mon", "unread": 1,
        "messages": [("them", "Priya Nair", "Who has the pinnies?", "Mon")],
    },
    {
        "id": "chen", "name": "Michael Chen", "initials": "MC", "group": False,
        "last": "Praying for your knee, Grace.", "time": "Apr 9", "unread": 0,
        "messages": [("them", None, "Praying for your knee, Grace.", "Apr 9")],
    },
]
CV = {c["id"]: c for c in CONVERSATIONS}

ADMIN = {"name": "Dana Reyes", "first": "Dana", "initials": "DR", "role": "Community director", "email": "dana@christianfitness.ca"}
# A Moderator (L2-019; ADR 0020): Dashboard and Members only.
MODERATOR = {"name": "Joel Mensah", "first": "Joel", "initials": "JM", "role": "Moderator", "email": "joel@christianfitness.ca"}

MEMBERS = [
    {"id": "gt", "name": "Grace Thompson", "initials": "GT", "email": "grace.thompson@gmail.com", "church": "Grace Fellowship, Scarborough", "joined": "Jan 12, 2026", "events": 9, "status": "Active"},
    {"id": "mc", "name": "Michael Chen", "initials": "MC", "email": "mchen.runs@outlook.com", "church": "Toronto Chinese Baptist", "joined": "Nov 3, 2025", "events": 14, "status": "Active"},
    {"id": "pn", "name": "Priya Nair", "initials": "PN", "email": "priya.nair@gmail.com", "church": "Hope Church Mississauga", "joined": "Feb 20, 2026", "events": 5, "status": "Active"},
    {"id": "kb", "name": "Kevin Brooks", "initials": "KB", "email": "kbrooks.fit@gmail.com", "church": "—", "joined": "Apr 2, 2026", "events": 0, "status": "Flagged", "note": "Promoting supplements in 3 group chats"},
    {"id": "ak", "name": "Adaeze Kalu", "initials": "AK", "email": "adaeze.k@yahoo.ca", "church": "RCCG Jesus House", "joined": "Dec 8, 2025", "events": 11, "status": "Active"},
    {"id": "jr", "name": "Jordan Reid", "initials": "JR", "email": "jreid@rogers.com", "church": "The Meeting House", "joined": "Mar 15, 2026", "events": 2, "status": "Active"},
    {"id": "ts", "name": "Tyler Simmons", "initials": "TS", "email": "tsimmons22@gmail.com", "church": "—", "joined": "Mar 30, 2026", "events": 0, "status": "Suspended", "note": "Spam messages, suspended Apr 4"},
]

APPLICATIONS = [
    {"id": "a1", "name": "Hannah Bergstrom", "initials": "HB", "role": "Registered massage therapist", "credentials": "RMT, CMTO #T4471", "submitted": "2 days ago"},
    {"id": "a2", "name": "Samuel Osei", "initials": "SO", "role": "Strength coach", "credentials": "CSCS · 6 years", "submitted": "3 days ago"},
    {"id": "a3", "name": "Lena Park, RD", "initials": "LP", "role": "Sports dietitian", "credentials": "Registered Dietitian, CDO", "submitted": "5 days ago"},
]

DRAFT_EVENT = {
    "id": "retreat-draft", "title": "Whole Life Retreat", "place": "Muskoka Woods, Rosseau", "month": "May", "day": "22",
    "time": "4:00 PM", "going": 0, "capacity": 60, "status": "Draft",
}

# ---------------------------------------------------------------------------
# Event series (prototype shared/cf/data.ts `series`). A session is
# (n, weekday, month, day, topic, status, attended, event id).
# ---------------------------------------------------------------------------
def _sessions(rows):
    return [{"n": i + 1, "weekday": r[0], "month": r[1], "day": r[2], "topic": r[3], "status": r[4],
             "attended": len(r) > 5 and r[5] is True, "event": r[6] if len(r) > 6 else None} for i, r in enumerate(rows)]


SERIES = [
    {
        "id": "couch-to-5k", "title": "Couch to 5K Run Club", "category": "Run", "host": "lakeshore-runners",
        "cadence": "Every Tuesday", "time": "6:30 PM", "range": "Apr 7 – May 26", "place": "Humber Bay Park East",
        "area": "Etobicoke", "image": "run", "series_price": "Free", "drop_in": "Free", "enrolled": 31, "capacity": 40,
        "joined": True,
        "summary": "Eight weeks from walking to running a full 5K, together. Each week builds on the last, so the group stays together from week one to race day.",
        "sessions": _sessions([
            ("Tue", "Apr", "07", "Walk, run 60 seconds, repeat. Meet your pace group", "past", True),
            ("Tue", "Apr", "14", "Run 90 seconds, walk 2 minutes", "past", True),
            ("Tue", "Apr", "21", "Same intervals, six times through", "next", False, "c25k-week-3"),
            ("Tue", "Apr", "28", "First 5-minute run", "upcoming"),
            ("Tue", "May", "05", "Two 8-minute runs", "upcoming"),
            ("Tue", "May", "12", "No class: Victoria Day week", "cancelled"),
            ("Tue", "May", "19", "Twenty minutes without stopping", "upcoming"),
            ("Tue", "May", "26", "Graduation 5K and potluck", "upcoming"),
        ]),
    },
    {
        "id": "park-bootcamp", "title": "Saturday Park Bootcamp", "category": "Workout", "host": "okafor",
        "cadence": "Every Saturday", "time": "8:00 AM", "range": "Apr 4 – May 23", "place": "Trillium Park, Ontario Place",
        "area": "Waterfront", "image": "bootcamp", "series_price": "$64 for all 8", "drop_in": "$10", "enrolled": 38,
        "capacity": 50, "joined": False,
        "summary": "Forty-five minutes of full-body circuits for every level. Come every week for the full block, or drop in when your Saturday allows.",
        "sessions": _sessions([
            ("Sat", "Apr", "04", "Baseline: push-ups, squats, 1K walk-run", "past"),
            ("Sat", "Apr", "11", "Lower body and core", "past"),
            ("Sat", "Apr", "18", "Upper body and carries", "past"),
            ("Sat", "Apr", "25", "Partner circuits", "next", False, "park-bootcamp"),
            ("Sat", "May", "02", "Hills and sprints", "upcoming"),
            ("Sat", "May", "09", "Mother’s Day mobility", "upcoming"),
            ("Sat", "May", "16", "Full-body ladder", "upcoming"),
            ("Sat", "May", "23", "Retest the baseline", "upcoming"),
        ]),
    },
    {
        "id": "womens-hoops", "title": "Women’s Hoops & Devotion", "category": "Basketball", "host": "faith-footwork",
        "cadence": "Last Thursday of the month", "time": "7:00 PM", "range": "Jan – Jun",
        "place": "St. Lawrence Community Rec Centre", "area": "Downtown", "image": "hoops", "series_price": "Free",
        "drop_in": "Free", "enrolled": 24, "capacity": 30, "joined": False,
        "summary": "Pickup games for all skill levels, then a short devotion. One night a month, January to June.",
        "sessions": _sessions([
            ("Thu", "Jan", "29", "Season opener", "past", True),
            ("Thu", "Feb", "26", "Pickup and devotion", "past"),
            ("Thu", "Mar", "26", "Pickup and devotion", "past", True),
            ("Thu", "Apr", "30", "Pickup and devotion", "next", False, "hoops-night"),
            ("Thu", "May", "28", "3-on-3 tournament night", "upcoming"),
            ("Thu", "Jun", "25", "Season finale and BBQ", "upcoming"),
        ]),
    },
]
SR = {x["id"]: x for x in SERIES}

# ---------------------------------------------------------------------------
# Directory (prototype shared/cf/data.ts `listings`)
# ---------------------------------------------------------------------------
LISTING_KINDS = ["Organization", "Person", "Instructor", "Ambassador", "Company", "Church Ministry"]
KIND_PLURAL = {"All": "All", "Organization": "Organizations", "Person": "People", "Instructor": "Instructors",
               "Ambassador": "Ambassadors", "Company": "Companies", "Church Ministry": "Church Ministries"}
KIND_BLURB = {
    "Organization": "Clubs and groups that run events", "Person": "Speakers, pastors and community voices",
    "Instructor": "Certified coaches who lead sessions", "Ambassador": "Members who welcome newcomers",
    "Company": "Sponsors and local businesses", "Church Ministry": "Fitness and health ministries of local churches",
}
PERSON_KINDS = ("Person", "Instructor", "Ambassador")


def _listing(id_, name, kind, tagline, about, area, initials, followers, since, focus, links, *, verified=True,
             website="", image="", following=False):
    return {"id": id_, "name": name, "kind": kind, "tagline": tagline, "about": about, "area": area, "initials": initials,
            "followers": followers, "since": since, "focus": focus, "links": links, "verified": verified,
            "website": website, "image": image, "following": following}


LISTINGS = [
    _listing("cf-team", "Christian Fitness", "Organization", "Faith-first fitness community for the GTA",
             "We run free community events across Toronto and keep this directory honest: every listing is checked by our team before it goes live.",
             "Toronto-wide", "CF", 2140, "Since 2024", ["Community runs", "Workshops", "Retreats"],
             [("chen", "Ambassador"), ("nair", "Ambassador"), ("kingdom-fuel", "Sponsor")], website="christianfitness.ca"),
    _listing("lakeshore-runners", "Lakeshore Runners Fellowship", "Organization",
             "Beginner-friendly running club with a prayer at every finish",
             "A west-end run club started by three neighbours in 2019. Our Couch to 5K program has graduated over 400 runners, most of whom swore they could never run.",
             "Etobicoke", "LR", 612, "Since 2025", ["Running", "Beginners", "Race training"],
             [("chen", "Run leader"), ("northline", "Shoe partner")], website="lakeshorerunners.ca", following=True),
    _listing("grace-move", "Grace Fellowship Move Ministry", "Church Ministry", "Health and movement ministry of Grace Fellowship",
             "Gentle movement, walking groups and seasonal health talks for our congregation and neighbours. Seniors and newcomers especially welcome.",
             "Scarborough", "GF", 288, "Since 2025", ["Mobility", "Seniors", "Walking groups"], [("whitfield", "Pastor")],
             following=True),
    _listing("st-pauls-sports", "St. Paul’s Sports Ministry", "Church Ministry", "Youth basketball and volleyball leagues",
             "Friday night leagues for kids 8–16 in the church gym, with mentors from the congregation on every bench.",
             "Midtown", "SP", 174, "Since 2026", ["Youth", "Basketball", "Volleyball"], [("grant", "Head coach")]),
    _listing("okafor", "Danielle Okafor", "Instructor", "Strength for women returning to fitness",
             "Nine years coaching women back into strength after kids, injury or a long break. Small-group bootcamps outdoors from April to October.",
             "East York", "DO", 935, "Since 2024", ["Strength", "Bootcamp", "Postpartum"],
             [("cf-team", "Event partner"), ("northline", "Sponsored by")], image="trainer", following=True),
    _listing("grant", "Tasha Grant", "Instructor", "Basketball skills coach, NCCP certified",
             "Former U SPORTS guard. Skills and conditioning for girls 10–18 and adult beginners. Faith and footwork, in that order.",
             "North York", "TG", 402, "Since 2025", ["Basketball", "Youth", "Conditioning"],
             [("faith-footwork", "Founder"), ("st-pauls-sports", "Head coach")]),
    _listing("faith-footwork", "Faith & Footwork", "Organization", "Women’s basketball nights and youth clinics",
             "Monthly pickup nights for women and summer clinics for girls, founded by Tasha Grant. Every night ends with a short devotion on the court.",
             "Downtown", "FF", 518, "Since 2025", ["Basketball", "Women", "Youth clinics"],
             [("grant", "Founder"), ("nair", "Ambassador")]),
    _listing("chen", "Michael Chen", "Ambassador", "Run leader and Christian Fitness ambassador",
             "Eleven marathons, one very slow first 5K. I lead the walk-back prayer at Couch to 5K and help new runners find their pace group.",
             "Etobicoke", "MC", 341, "Since 2025", ["Running", "Mentoring"],
             [("cf-team", "Ambassador for"), ("lakeshore-runners", "Run leader")]),
    _listing("nair", "Priya Nair", "Ambassador", "Hoops regular, youth mentor",
             "I play every month at Faith & Footwork and mentor girls in the summer clinics. Ask me anything about getting back into the game after 30.",
             "Downtown", "PN", 208, "Since 2026", ["Basketball", "Mentoring"],
             [("cf-team", "Ambassador for"), ("faith-footwork", "Ambassador for")]),
    _listing("whitfield", "Rev. James Whitfield", "Person", "Pastor, speaker on rest and burnout",
             "Associate pastor at Grace Fellowship. I speak at men’s breakfasts and retreats about Sabbath rest, burnout and caring for the body God gave you.",
             "Midtown", "JW", 167, "Since 2025", ["Speaking", "Rest", "Men’s health"], [("grace-move", "Pastor at")]),
    _listing("kingdom-fuel", "Kingdom Fuel Nutrition", "Company", "Canadian-made protein and electrolytes",
             "Family-owned in Mississauga. We supply water and electrolytes at every Christian Fitness run, and give 10% of profit to church food banks.",
             "Mississauga", "KF", 790, "Since 2024", ["Nutrition", "Sponsor"], [("cf-team", "Sponsor of")], website="kingdomfuel.ca"),
    _listing("northline", "Northline Athletic", "Company", "Running shoes and gait analysis, Roncesvalles",
             "Independent running store. Free gait analysis for Couch to 5K members and 15% off for anyone in the directory.",
             "Roncesvalles", "NA", 256, "Since 2026", ["Running gear", "Gait analysis"],
             [("lakeshore-runners", "Shoe partner"), ("okafor", "Sponsor")], verified=False, website="northlineathletic.ca"),
]
LS = {x["id"]: x for x in LISTINGS}


def hosted_by(listing_id: str) -> tuple[list, list]:
    """Everything a listing hosts: its series, and its one-off dates."""
    return ([x for x in SERIES if x["host"] == listing_id],
            [e for e in MEMBER_EVENTS if e["host"] == listing_id and not e.get("series")])


# ---------------------------------------------------------------------------
# News, newsletter and feeds (prototype shared/cf/news.ts)
# ---------------------------------------------------------------------------
SECTIONS = ["Latest", "Events", "Training", "Nutrition", "Faith & Body", "Community", "Pros"]
STORIES = [
    {"id": "basement-gym", "section": "Community", "author": "Naomi Clarke", "ago": "2 hours ago", "image": "church-gym",
     "title": "A West End church turned its basement into a free gym. Two hundred neighbours now train there every week",
     "dek": "Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish."},
    {"id": "easter-5k-record", "section": "Events", "author": "CF Team", "ago": "4 hours ago", "image": "run",
     "title": "Easter Sunrise 5K hits a record 142 sign-ups with ten days to go"},
    {"id": "okafor-interview", "section": "Pros", "author": "Marcus Bell", "ago": "6 hours ago", "image": "coach",
     "title": "Danielle Okafor on coaching strength without the shame"},
    {"id": "meal-prep-ministry", "section": "Nutrition", "author": "Priya Raman", "ago": "9 hours ago", "image": "meal-prep",
     "title": "Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers"},
    {"id": "sabbath-rest", "section": "Faith & Body", "author": "Pastor Ruth Adeyemi", "ago": "11 hours ago", "image": "stretch",
     "title": "Why your rest day might be the most spiritual part of your training plan"},
    {"id": "half-marathon-churches", "section": "Events", "author": "Naomi Clarke", "ago": "Yesterday", "image": "marathon",
     "title": "Twelve GTA churches will run the Toronto Half as one team this fall",
     "dek": "Registration for the combined team opens May 1, with free training plans for first-time runners."},
    {"id": "walking-seniors", "section": "Community", "author": "Priya Raman", "ago": "Yesterday", "image": "seniors-walk",
     "title": "The Tuesday walking group that got 40 seniors off the couch and into the park",
     "dek": "It started with three women from Grace Fellowship and a pair of borrowed poles."},
    {"id": "hoops-league", "section": "Events", "author": "CF Team", "ago": "Yesterday", "image": "hoops",
     "title": "Women’s Hoops & Devotion Night is adding a second court after a waitlist of 60"},
    {"id": "park-bootcamp-guide", "section": "Training", "author": "Marcus Bell", "ago": "2 days ago", "image": "bootcamp",
     "title": "A beginner’s guide to your first outdoor bootcamp, from what to bring to how sore you’ll be",
     "dek": "Coach Danielle answers the eight questions she hears most at Trillium Park."},
    {"id": "trainer-vetting", "section": "Pros", "author": "CF Team", "ago": "3 days ago", "image": "trainer",
     "title": "How we vet every professional in the Christian Fitness directory",
     "dek": "Credentials, references and a conversation about faith: the four checks every listing passes."},
]
MOST_READ = [
    "Why your rest day might be the most spiritual part of your training plan",
    "A beginner’s guide to your first outdoor bootcamp",
    "Twelve GTA churches will run the Toronto Half as one team this fall",
    "Fasting and training: what a dietitian wants you to know before Lent",
    "The Tuesday walking group that got 40 seniors into the park",
]
NEWSLETTER = {"name": "The Abundant Weekly", "cadence": "Every Saturday, 7 AM", "readers": "6,800", "issue": 48,
              "date": "Saturday, April 11, 2026"}
ADD_ONS = [
    ("events", "Event alerts", "New runs, workouts and retreats the day they post"),
    ("plan", "Training plan of the week", "One short session to do on your own, Mondays"),
    ("devotion", "Morning devotion", "Two minutes of scripture for body and spirit, weekdays"),
]
FEEDS = [
    ("all", "All stories", "https://christianfitness.ca/feed", "~20 a week"),
    ("events", "Events", "https://christianfitness.ca/events/feed", "~6 a week"),
    ("training", "Training", "https://christianfitness.ca/training/feed", "~4 a week"),
    ("nutrition", "Nutrition", "https://christianfitness.ca/nutrition/feed", "~3 a week"),
    ("faith", "Faith & Body", "https://christianfitness.ca/faith-body/feed", "~3 a week"),
    ("community", "Community", "https://christianfitness.ca/community/feed", "~4 a week"),
]

# Google accounts the account chooser offers (prototype: the chooser frame's args and the admin prototype).
GOOGLE_MEMBER = [("Grace Thompson", "grace.thompson@gmail.com"), ("Grace Thompson", "grace@gracefellowship.ca")]
GOOGLE_STAFF = [("Dana Reyes", "dana@christianfitness.ca"), ("Dana Reyes", "dana.reyes@gmail.com"),
                ("CF Events Inbox", "events@christianfitness.ca")]
STAFF_DOMAIN = "christianfitness.ca"

INTERESTS = ["Running", "Strength", "Basketball", "Walking groups", "Mobility", "Nutrition", "Cycling", "Retreats"]
EVENT_CATEGORIES = ["All", "Run", "Workout", "Basketball", "Mobility", "Workshop", "Retreat"]
SERVICE_CATEGORIES = ["All", "Training", "Nutrition", "Physio", "Coaching", "Counselling"]
IMAGE_SIZES = {"run": (1376, 768), "bootcamp": (1200, 896), "hoops": (1200, 896), "stretch": (1200, 896), "trainer": (1024, 1024),
               "church-gym": (1376, 768), "meal-prep": (1200, 896), "marathon": (1200, 896), "seniors-walk": (1200, 896),
               "coach": (1200, 896)}
