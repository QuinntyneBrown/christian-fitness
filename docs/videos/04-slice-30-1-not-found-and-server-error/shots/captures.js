window.FILM_CAPTURES = {
  "unit": {
    "command": "npm test",
    "passed": 43,
    "total": 43
  },
  "specs": {
    "command": "npx playwright test --list",
    "tests": 14,
    "files": 6,
    "names": [
      "a URL no route matches shows \"Page not found\" and keeps the URL",
      "offers \"Go to home\" and \"Browse events\", and the keyboard follows \"Go to home\"",
      "shows \"Something went wrong\" with the reference the response carried",
      "leaves the reference out when there is none or it is not well formed",
      "\"Try again\" loads the URL that failed and \"Go to home\" loads home",
      "\"Try again\" never leaves the app",
      "the keyboard follows \"Try again\" back to the screen that failed",
      "a URL no route matches shows \"Page not found\" and keeps the URL",
      "offers \"Go to dashboard\" and \"Manage events\", and the keyboard follows \"Go to dashboard\"",
      "shows \"Something went wrong\" with the reference the response carried",
      "leaves the reference out and stays in the app when the parameters are not its own",
      "the keyboard follows \"Try again\" back to the screen that failed"
    ]
  },
  "api": {
    "command": "dotnet test --filter ProblemDetailsTests",
    "total": 4,
    "passed": 4,
    "names": [
      "Given a session When no endpoint matches Then the 404 carries no reference",
      "Given an unexpected error When a request fails Then it answers 500 ProblemDetails without detail",
      "Given an unexpected error When a request fails Then the 500 carries a reference from its trace id",
      "Given a session When no endpoint matches Then it answers 404 ProblemDetails"
    ]
  }
};
