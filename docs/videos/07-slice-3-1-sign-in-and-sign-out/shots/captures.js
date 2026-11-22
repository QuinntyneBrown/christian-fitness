window.FILM_CAPTURES = {
  "signOutBox": {
    "XS": {
      "width": 86.15625,
      "height": 44
    },
    "XL": {
      "width": 86.15625,
      "height": 44
    }
  },
  "guard": {
    "asked": "/home",
    "landed": "/sign-in"
  },
  "unit": {
    "command": "npm test",
    "passed": 129,
    "total": 129
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 51,
    "files": 11
  },
  "backend": {
    "command": "dotnet test",
    "passed": 133,
    "signOut": [
      "Given a signed in member When they sign out Then it answers 204 and expires the session cookie",
      "Given a member signed in twice When one session signs out Then the other stays signed in",
      "Given no session When signing out Then it is refused with 401",
      "Given a member who signed out When the cookie they held is sent again Then it is refused with 401"
    ],
    "antiforgery": [
      "Given a member who signed in When they sign out with the token sign in gave Then it succeeds and the visitor token is refused",
      "Given a visitor When they ask for a token Then it is set in a readable strict host prefixed cookie",
      "Given no token When signing in Then it is refused with antiforgery failed",
      "Given a signed in member When a request without the token signs them out Then it is refused and the session stays",
      "Given a plain http request When a visitor asks for a token Then both cookies are still secure",
      "Given no token When a visitor joins Then it is refused with antiforgery failed and nothing is created"
    ],
    "headers": [
      "Given production When a response is served over https Then it carries HSTS",
      "Given any response When it is served Then it carries the security headers",
      "Given development When a response is served Then it carries no HSTS"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 258.23,
    "transfer": 67.54
  }
};
