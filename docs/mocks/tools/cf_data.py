"""The cast and catalog every mock uses (copied from the Magic Patterns prototype's
shared/cf/data.ts and shared/cf/admin/data.ts). "Today" is Wednesday, April 15, 2026,
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
        "going": 142, "capacity": 200, "image": "run", "registered": True,
        "summary": "An easy-paced run along the lake to watch the sun come up, with a short devotion at the turnaround and coffee at the finish.",
    },
    {
        "id": "park-bootcamp", "title": "Saturday Park Bootcamp", "category": "Workout", "day": "25", "month": "Apr", "weekday": "Sat",
        "time": "8:00 AM", "place": "Trillium Park, Ontario Place", "area": "Waterfront", "price": "$10",
        "going": 38, "capacity": 50, "image": "bootcamp", "registered": False,
        "summary": "Forty-five minutes of full-body circuits for every level, led by Danielle Okafor. Bring a mat and water.",
    },
    {
        "id": "hoops-night", "title": "Women's Hoops & Devotion Night", "category": "Basketball", "day": "30", "month": "Apr", "weekday": "Thu",
        "time": "7:00 PM", "place": "St. Lawrence Community Rec Centre", "area": "Downtown", "price": "Free",
        "going": 24, "capacity": 30, "image": "hoops", "registered": True,
        "summary": "Pickup games for all skill levels, then a short devotion. Inspired by the Tempo, open to every woman who loves the game.",
    },
    {
        "id": "stretch-pray", "title": "Stretch & Pray: Mobility Morning", "category": "Mobility", "day": "06", "month": "May", "weekday": "Wed",
        "time": "9:30 AM", "place": "Grace Fellowship Hall", "area": "Scarborough", "price": "Free",
        "going": 17, "capacity": 25, "image": "stretch", "registered": False,
        "summary": "Gentle mobility and breathing for stiff backs and busy minds. Chairs available, all ages welcome.",
    },
]
EV = {e["id"]: e for e in EVENTS}

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

INTERESTS = ["Running", "Strength", "Basketball", "Walking groups", "Mobility", "Nutrition", "Cycling", "Retreats"]
EVENT_CATEGORIES = ["All", "Run", "Workout", "Basketball", "Mobility", "Workshop"]
SERVICE_CATEGORIES = ["All", "Training", "Nutrition", "Physio", "Coaching", "Counselling"]
IMAGE_SIZES = {"run": (1376, 768), "bootcamp": (1200, 896), "hoops": (1200, 896), "stretch": (1200, 896), "trainer": (1024, 1024)}
