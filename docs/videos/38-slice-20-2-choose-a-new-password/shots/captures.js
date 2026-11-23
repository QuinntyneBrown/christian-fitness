window.FILM_CAPTURES = {
  "check": {
    "address": "/reset-password",
    "body": {
      "token": "k3Jx9QwP2mV8sT4yLb7NcR1dF6hZ0aE5gU-iO_pWq2X"
    }
  },
  "unit": {
    "command": "npm test",
    "passed": 215,
    "total": 215
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 117,
    "files": 18
  },
  "backend": {
    "command": "dotnet test",
    "passed": 240,
    "complete": [
      "Given a new password was saved When the member signs in Then the new password works and the old one does not",
      "Given a usable link When a new password is saved Then it answers 204 with no body",
      "Given a member signed in on two devices When a new password is saved Then both sessions end and another member stays signed in",
      "Given a usable link When it is checked Then it answers the account email only",
      "Given the member saves from a signed in browser When the password is saved Then that session ends too"
    ],
    "refusal": [
      "Given a link requested 30 minutes ago When it is checked or used Then it is refused and the password stays",
      "Given an unknown token When a password is saved with it Then it is refused with reset link expired",
      "Given a password of exactly 8 characters When it is saved Then it is set",
      "Given a link that set a password When it is checked or used again Then it is refused and the password stays",
      "Given an unknown token When it is checked Then it is refused with reset link expired",
      "Given a password shorter than 8 characters When it is saved Then it is refused with validation failed and the link still works",
      "Given a link one second short of 30 minutes When it is used Then it sets the password",
      "Given another member link When one member sets a password Then the other member link still works",
      "Given two links for one account When one sets a password Then the other stops working"
    ],
    "race": [
      "Given another save spends the link first When this one is written Then it is refused with reset link expired and keeps nothing"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 258.95,
    "transfer": 67.61
  }
};
