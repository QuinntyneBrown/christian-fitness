window.FILM_CAPTURES = {
  "navigate": {
    "from": "/",
    "to": "/events",
    "reloaded": false
  },
  "signOutBox": {
    "XS": {
      "width": 44,
      "height": 44
    },
    "M": {
      "width": 44,
      "height": 44
    }
  },
  "guard": {
    "asked": "/events",
    "landed": "/sign-in"
  },
  "unit": {
    "command": "npm test",
    "passed": 166
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 74
  },
  "backend": {
    "command": "dotnet test",
    "passed": 158,
    "access": [
      "Given staff signed in to the member app only When an admin endpoint is asked Then it is refused with 401",
      "Given staff whose role was removed When they ask for the staff session Then it is refused with not staff and 403",
      "Given signed in staff When they sign out Then it answers 204 expires the cookie and the cookie opens nothing afterwards",
      "Given a member session When an admin endpoint is asked Then it is refused with 401 and no data",
      "Given no session When signing out of the admin app Then it is refused with 401",
      "Given no session When an admin endpoint is asked Then it is refused with 401 and no data"
    ],
    "signIn": [
      "Given a staff account When it signs in Then the staff cookie is secure http only strict host prefixed and ends with the browser",
      "Given wrong credentials When signing in to the admin app Then it is refused with invalid credentials",
      "Given a member without a staff role When they sign in to the admin app Then it is refused with not staff and 403",
      "Given a staff account When it signs in to the admin app Then the staff session is answered",
      "Given staff who signed in When they ask for the staff session with the cookie Then it answers who they are",
      "Given a member and a staff account When each signs in with a wrong password Then the answers are the same"
    ]
  },
  "build": {
    "command": "npx ng build admin",
    "raw": 257.44,
    "transfer": 67.39
  }
};
