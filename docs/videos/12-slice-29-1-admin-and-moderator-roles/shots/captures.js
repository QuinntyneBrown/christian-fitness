window.FILM_CAPTURES = {
  "moderator": {
    "items": [
      "Dashboard",
      "Members"
    ],
    "role": "Moderator"
  },
  "adminsOnly": {
    "location": "/events",
    "title": "Admins only · Christian Fitness Admin"
  },
  "demoted": {
    "location": "/services"
  },
  "unit": {
    "command": "npm test",
    "passed": 352
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 170
  },
  "backend": {
    "command": "dotnet test",
    "passed": 398,
    "rows": [
      {
        "who": "admin.unlisted",
        "role": "Admin",
        "path": "/api/admin/reports/probe",
        "expected": "NoContent"
      },
      {
        "who": "admin.console",
        "role": "Admin",
        "path": "/api/admin/session",
        "expected": "OK"
      },
      {
        "who": "moderator.services",
        "role": "Moderator",
        "path": "/api/admin/services/probe",
        "expected": "Forbidden"
      },
      {
        "who": "admin.members",
        "role": "Admin",
        "path": "/api/admin/members/probe",
        "expected": "NoContent"
      },
      {
        "who": "moderator.dashboard",
        "role": "Moderator",
        "path": "/api/admin/dashboard/probe",
        "expected": "NoContent"
      },
      {
        "who": "moderator.console",
        "role": "Moderator",
        "path": "/api/admin/session",
        "expected": "OK"
      },
      {
        "who": "admin.dashboard",
        "role": "Admin",
        "path": "/api/admin/dashboard/probe",
        "expected": "NoContent"
      },
      {
        "who": "moderator.events",
        "role": "Moderator",
        "path": "/api/admin/events/probe",
        "expected": "Forbidden"
      },
      {
        "who": "admin.events",
        "role": "Admin",
        "path": "/api/admin/events/probe",
        "expected": "NoContent"
      },
      {
        "who": "admin.services",
        "role": "Admin",
        "path": "/api/admin/services/probe",
        "expected": "NoContent"
      },
      {
        "who": "moderator.members",
        "role": "Moderator",
        "path": "/api/admin/members/probe",
        "expected": "NoContent"
      },
      {
        "who": "moderator.unlisted",
        "role": "Moderator",
        "path": "/api/admin/reports/probe",
        "expected": "Forbidden"
      }
    ],
    "access": 12
  },
  "build": {
    "command": "npx ng build admin",
    "raw": 259.93,
    "transfer": 68.06
  }
};
