window.FILM_CAPTURES = {
  "flag": {
    "path": "/api/admin/members/{id}/flag",
    "body": {
      "note": "Two members asked about messages from this account"
    }
  },
  "suspend": {
    "path": "/api/admin/members/{id}/suspend",
    "body": {
      "note": "Spam messages to the Sunrise 5K group",
      "confirmed": true
    }
  },
  "unit": {
    "command": "npm test",
    "passed": 849
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 236
  },
  "backend": {
    "command": "dotnet test",
    "passed": 582,
    "moderation": 37
  },
  "build": {
    "command": "npx ng build admin",
    "raw": 278.96,
    "dialog": 19.52
  }
};
