window.FILM_CAPTURES = {
  "sent": {
    "fullName": "Grace Thompson",
    "email": "grace.thompson@gmail.com",
    "password": "abundantlife",
    "homeChurch": null,
    "interests": [
      "running",
      "strength"
    ]
  },
  "unit": {
    "command": "npm test",
    "passed": 59,
    "total": 59
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 22,
    "files": 7
  },
  "backend": {
    "command": "dotnet test",
    "passed": 41,
    "join": [
      "Given valid details When a visitor joins Then the account is created and the session is answered",
      "Given no home church When a visitor joins Then the account is created with none",
      "Given valid details When a visitor joins Then the session cookie is secure http only lax and host prefixed",
      "Given valid details When a visitor joins Then the password is stored only as a PBKDF2 hash",
      "Given no session When a visitor asks for their session Then it is refused with 401",
      "Given no interests When a visitor joins Then the account is created with none",
      "Given a member who just joined When they ask for their session Then it answers who they are"
    ]
  },
  "build": {
    "command": "npx ng build web",
    "raw": 255.1,
    "transfer": 66.67
  }
};
