window.FILM_CAPTURES = {
  "verify": {
    "asked": "/sign-in/verify",
    "landed": "/"
  },
  "unit": {
    "command": "npm test",
    "passed": 242
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 116
  },
  "backend": {
    "command": "dotnet test",
    "passed": 306,
    "twoStep": [
      "Given the password step When a neighbouring step s code is sent with spaces Then the staff session starts",
      "Given the password step When the authenticator s code is sent with the step cookie Then the staff session starts",
      "Given staff with two step set up When they give the right password Then it answers 202 with a step cookie and no session"
    ],
    "refusals": [
      "Given staff without two step set up When they give the right password Then it is refused with two step not set up and no cookie",
      "Given no pending sign in When a code is sent Then it is refused with two step expired",
      "Given the password step When a wrong or malformed code is sent Then it is refused with invalid code and the pending sign in stays",
      "Given 5 wrong codes in 15 minutes When the right code is sent Then it is refused with too many attempts until the window passes",
      "Given a code that opened a session When it is sent again after a new password step Then it is refused with invalid code",
      "Given 5 minutes since the password step When the right code is sent Then it is refused with two step expired and the step cookie ends"
    ],
    "totp": [
      "Given a typed code When it is matched Then only a fresh code of a nearby step is accepted",
      "Given the RFC 6238 secret When the code at a time is computed Then it is the RFC s code",
      "Given a secret When it is written for an authenticator Then it is RFC 4648 base32 without padding"
    ]
  },
  "build": {
    "command": "npx ng build admin",
    "raw": 257.7,
    "transfer": 67.46,
    "codeScreen": 2.35
  }
};
