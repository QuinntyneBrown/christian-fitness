window.FILM_CAPTURES = {
  "profile": {
    "rows": [
      {
        "date": "Sat, Apr 18",
        "title": "Easter Sunrise 5K",
        "href": "/events/0190c0de-0000-7000-8000-00000000e001"
      },
      {
        "date": "Thu, Apr 30",
        "title": "Women's Hoops & Devotion Night",
        "href": "/events/0190c0de-0000-7000-8000-00000000e002"
      }
    ]
  },
  "unit": {
    "command": "npm test",
    "passed": 259,
    "total": 259
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 127,
    "files": 19
  },
  "backend": {
    "command": "dotnet test",
    "passed": 313,
    "own": [
      "Given a member with no home church When they open their profile Then the home church is null",
      "Given a member going to events When they open their profile Then it answers them as the registrations give them",
      "Given a member who joined When they open their profile Then it answers every field with none given yet",
      "Given a member with a city bio and goals When they open their profile Then it answers them",
      "Given two members When each opens their profile Then each sees only their own",
      "Given a visitor When they ask for a profile Then it is refused with 401"
    ],
    "telemetry": [
      "Given a member opens their profile When the request is traced and logged Then nothing personal is recorded"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 261.19,
    "transfer": 68.34
  }
};
