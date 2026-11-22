window.FILM_CAPTURES = {
  "fieldsSent": 0,
  "unit": {
    "command": "npm test",
    "passed": 104,
    "total": 104
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 31,
    "files": 8
  },
  "backend": {
    "command": "dotnet test",
    "passed": 86,
    "refusals": [
      "Given an email already registered When a visitor joins with it Then it is refused with email taken",
      "Given another join saves the same email first When the unique index refuses this one Then it is refused with email taken",
      "Given a save fails for another reason When a visitor joins Then it is an unexpected error"
    ],
    "validation": [
      "Given a missing name a malformed email and a short password When a visitor joins Then each field is named with validation failed",
      "Given a home church longer than 120 characters When a visitor joins Then it is refused with field too long and not repeated",
      "Given a name longer than 100 characters When a visitor joins Then it is refused with field too long",
      "Given an unknown interest When a visitor joins Then it is refused with validation failed",
      "Given a body that is not JSON When a visitor joins Then it is refused without repeating it",
      "Given a field too long and another invalid When a visitor joins Then the code is field too long",
      "Given null fields When a visitor joins Then they are refused not an unexpected error"
    ],
    "ruleRows": 20
  },
  "build": {
    "command": "npx ng build web",
    "raw": 256.21,
    "transfer": 67.05
  }
};
