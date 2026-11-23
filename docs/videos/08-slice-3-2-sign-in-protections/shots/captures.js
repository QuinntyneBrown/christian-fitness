window.FILM_CAPTURES = {
  "returned": {
    "asked": "/home?welcome=back",
    "sentTo": "/sign-in?returnUrl=%2Fhome%3Fwelcome%3Dback",
    "landed": "/home?welcome=back"
  },
  "crafted": {
    "returnUrl": "https://evil.example/home",
    "landed": "/home"
  },
  "unit": {
    "command": "npm test",
    "passed": 176,
    "total": 176
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 82,
    "files": 14
  },
  "backend": {
    "command": "dotnet test",
    "passed": 227,
    "lockout": [
      "Given 4 failed sign ins When the fifth attempt has the right password Then the member signs in",
      "Given 5 failed sign ins for an unknown email When a sixth is attempted Then it is refused with too many attempts",
      "Given a paused email When attempts go on during the pause Then they do not lengthen it",
      "Given 5 failed sign ins a minute apart When the first is 15 minutes old Then the member signs in again",
      "Given 5 failures for one email When another member signs in Then they are not paused",
      "Given 4 failures then a sign in When 4 more fail Then the next attempt still signs in",
      "Given 5 failed sign ins within 15 minutes When a sixth is attempted with the right password Then it is refused with too many attempts",
      "Given failures with the email in other cases When a sixth is attempted Then they all counted"
    ],
    "suspended": [
      "Given a suspended member When they sign in with a wrong password Then it is refused with invalid credentials",
      "Given a suspended member When they sign in with correct credentials Then it is refused with account suspended"
    ],
    "joinLimit": [
      "Given 5 accounts from addresses in one ipv6 64 When another address in it joins Then it is refused",
      "Given 5 accounts created from one address within an hour When a sixth join is attempted Then it is refused with 429",
      "Given refused joins from one address When it creates accounts Then only the created ones count",
      "Given 5 accounts created from one address When another address joins Then its account is created",
      "Given 5 accounts created from one address When the first is an hour old Then a join creates an account again"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 258.59,
    "transfer": 67.61
  }
};
