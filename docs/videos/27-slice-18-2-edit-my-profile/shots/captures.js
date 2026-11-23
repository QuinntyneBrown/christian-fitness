window.FILM_CAPTURES = {
  "limits": {
    "items": [
      "Enter your name so people know who you are",
      "Keep your bio to 300 characters",
      "Choose up to 5 goals"
    ]
  },
  "unit": {
    "command": "npm test",
    "passed": 396,
    "total": 396
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 183,
    "files": 26
  },
  "backend": {
    "command": "dotnet test",
    "passed": 461,
    "edit": [
      "Given a member When they save a profile that is not theirs Then it is refused with 403 and nothing changes",
      "Given a visitor When they save a profile Then it is refused with 401",
      "Given a member When they save valid changes Then the answer and their profile carry the saved values",
      "Given a member When they save a blank city home church and bio Then each is stored as none",
      "Given a member who just joined When they open their profile Then their home church is hidden"
    ],
    "refusals": [
      "Given a blank name When the profile is saved Then it is refused as validation failed",
      "Given a profile over a limit When it is saved Then it is refused with the code and nothing changes"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 277.05,
    "transfer": 72.57,
    "dialog": 75.73
  }
};
