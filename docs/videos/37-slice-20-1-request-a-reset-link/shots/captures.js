window.FILM_CAPTURES = {
  "sent": {
    "body": {
      "email": "grace.thompson@gmail.com"
    },
    "status": 202
  },
  "unit": {
    "command": "npm test",
    "passed": 150,
    "total": 150
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 69,
    "files": 13
  },
  "backend": {
    "command": "dotnet test",
    "passed": 181,
    "request": [
      "Given the email in another case or with spaces When a link is requested Then it goes to the account address",
      "Given a registered member When they request a reset link Then it is accepted and one email holds the link",
      "Given two requests When both are sent Then each link holds a different token",
      "Given a reset link was sent When it is stored Then only the hash of its token is kept with a 30 minute expiry"
    ],
    "disclosure": [
      "Given a body with no email When a link is requested Then it is refused with validation failed",
      "Given an email no account has When a link is requested Then the answer is the same and no email is sent",
      "Given a blank or malformed email When a link is requested Then it is refused with validation failed",
      "Given an email longer than 254 characters When a link is requested Then it is refused with validation failed",
      "Given three links sent within the hour When a fourth is requested Then it is answered the same and sent only after the hour"
    ],
    "telemetry": [
      "Given a registered email When a link is requested Then nothing personal is recorded",
      "Given an unknown email When a link is requested Then nothing personal is recorded",
      "Given a malformed email When it is refused Then nothing personal is recorded"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 258.5,
    "transfer": 67.58
  }
};
