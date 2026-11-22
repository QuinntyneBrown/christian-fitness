window.FILM_CAPTURES = {
  "live": {
    "request": "GET /health/live",
    "status": 200,
    "statusText": "OK",
    "contentType": "text/plain",
    "body": "Healthy"
  },
  "ready": {
    "request": "GET /health/ready",
    "status": 503,
    "statusText": "Service Unavailable",
    "contentType": "text/plain",
    "body": "Unhealthy"
  },
  "refused": {
    "request": "GET /api/members/me?email=someone%40example.com",
    "status": 401,
    "statusText": "Unauthorized",
    "contentType": "application/problem+json",
    "body": "{\"type\":\"https://tools.ietf.org/html/rfc9110#section-15.5.2\",\"title\":\"Unauthorized\",\"status\":401,\"traceId\":\"00-c2cf86495ec1173beb60b0d822bc74e9-4a9ecb98a2342767-03\",\"code\":\"unauthenticated\"}"
  },
  "usage": {
    "command": "cf",
    "exit": 1,
    "output": "Usage: cf <command>\n\n  migrate   Apply the pending database migrations.\n  seed      Insert the seed data that is missing; a second run changes nothing.\n\nSettings (environment variables): ConnectionStrings__Default; for seed also\nSeed__StaffEmail, Seed__StaffPassword and Seed__StaffName."
  },
  "seedMissing": {
    "command": "cf seed",
    "exit": 2,
    "output": "Missing setting: Seed__StaffEmail, Seed__StaffPassword, Seed__StaffName"
  }
};
