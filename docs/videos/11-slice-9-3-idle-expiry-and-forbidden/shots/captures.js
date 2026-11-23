window.FILM_CAPTURES = {
  "expired": {
    "asked": "/events",
    "landed": "/sign-in"
  },
  "forbidden": {
    "location": "/members",
    "title": "Staff only · Christian Fitness Admin"
  },
  "unit": {
    "command": "npm test",
    "passed": 283
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 125
  },
  "backend": {
    "command": "dotnet test",
    "passed": 316,
    "idle": [
      "Given a request 10 minutes after sign in When another arrives 25 minutes later Then the session is still open",
      "Given a staff session idle for 30 minutes When the next request arrives Then it is refused with session expired and the session ends",
      "Given a staff session idle for 29 minutes When the next request arrives Then it is answered",
      "Given requests every 20 minutes for two hours When the last arrives Then the session is still open"
    ],
    "lockout": [
      "Given 4 failures then a right password When 4 more fail Then the next staff sign in is accepted",
      "Given 5 failed member sign ins for a staff email When staff sign in Then it is refused with too many attempts",
      "Given 5 failed staff sign ins a minute apart When the first is 15 minutes old Then staff sign in again",
      "Given 5 failed staff sign ins within 15 minutes When a sixth has the right password Then it is refused with too many attempts",
      "Given 5 failed staff sign ins When the member app is signed in to Then it is refused with too many attempts"
    ]
  },
  "build": {
    "command": "npx ng build admin",
    "raw": 258.98,
    "transfer": 67.79,
    "forbidden": 1.59
  }
};
