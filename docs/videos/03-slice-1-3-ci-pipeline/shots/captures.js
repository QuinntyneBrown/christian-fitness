window.FILM_CAPTURES = {
  "cold": {
    "id": 45040854893,
    "url": "https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45040854893",
    "event": "pull_request",
    "sha": "9348b03",
    "conclusion": "success",
    "jobs": [
      {
        "name": "Frontend",
        "conclusion": "success",
        "seconds": 91,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Run actions/setup-node@v5",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Install",
            "conclusion": "success",
            "seconds": 57
          },
          {
            "name": "Lint",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Format check",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Build",
            "conclusion": "success",
            "seconds": 6
          },
          {
            "name": "Read the Playwright version",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Restore the Playwright browser",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Install the Playwright browser",
            "conclusion": "success",
            "seconds": 4
          },
          {
            "name": "Behaviour specs",
            "conclusion": "success",
            "seconds": 9
          },
          {
            "name": "Keep the Playwright report",
            "conclusion": "skipped",
            "seconds": 0
          }
        ]
      }
    ]
  },
  "lint": {
    "id": 45041046230,
    "url": "https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041046230",
    "event": "pull_request",
    "sha": "fe605cc",
    "conclusion": "failure",
    "jobs": [
      {
        "name": "Frontend",
        "conclusion": "failure",
        "seconds": 20,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Run actions/setup-node@v5",
            "conclusion": "success",
            "seconds": 4
          },
          {
            "name": "Install",
            "conclusion": "success",
            "seconds": 8
          },
          {
            "name": "Lint",
            "conclusion": "failure",
            "seconds": 2
          },
          {
            "name": "Format check",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Build",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Read the Playwright version",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Restore the Playwright browser",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Install the Playwright browser",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Behaviour specs",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Keep the Playwright report",
            "conclusion": "success",
            "seconds": 0
          }
        ]
      }
    ],
    "said": [
      {
        "job": "Frontend",
        "step": "Lint",
        "text": "7:7  error  'unusedOnPurpose' is assigned a value but never used  @typescript-eslint/no-unused-vars"
      },
      {
        "job": "Frontend",
        "step": "Lint",
        "text": "✖ 1 problem (1 error, 0 warnings)"
      }
    ]
  },
  "warning": {
    "id": 45041314433,
    "url": "https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041314433",
    "event": "pull_request",
    "sha": "bec5712",
    "conclusion": "failure",
    "jobs": [
      {
        "name": "Backend",
        "conclusion": "failure",
        "seconds": 23,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Run actions/setup-dotnet@v5",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Restore the NuGet cache",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Restore",
            "conclusion": "success",
            "seconds": 8
          },
          {
            "name": "Build (warnings as errors)",
            "conclusion": "failure",
            "seconds": 6
          },
          {
            "name": "Test",
            "conclusion": "skipped",
            "seconds": 0
          }
        ]
      },
      {
        "name": "Frontend",
        "conclusion": "success",
        "seconds": 32,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 3
          },
          {
            "name": "Run actions/setup-node@v5",
            "conclusion": "success",
            "seconds": 4
          },
          {
            "name": "Install",
            "conclusion": "success",
            "seconds": 9
          },
          {
            "name": "Lint",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Format check",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Build",
            "conclusion": "success",
            "seconds": 4
          },
          {
            "name": "Read the Playwright version",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Restore the Playwright browser",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Install the Playwright browser",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Behaviour specs",
            "conclusion": "success",
            "seconds": 7
          },
          {
            "name": "Keep the Playwright traces",
            "conclusion": "skipped",
            "seconds": 0
          }
        ]
      }
    ],
    "said": [
      {
        "job": "Backend",
        "step": "Build (warnings as errors)",
        "text": "backend/src/ChristianFitness.Domain/Throwaway.cs(7,13): error CS0219: The variable 'unused' is assigned but its value is never used"
      }
    ]
  },
  "specAndTest": {
    "id": 45041472511,
    "url": "https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041472511",
    "event": "pull_request",
    "sha": "6488b5f",
    "conclusion": "failure",
    "jobs": [
      {
        "name": "Backend",
        "conclusion": "failure",
        "seconds": 36,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Run actions/setup-dotnet@v5",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Restore the NuGet cache",
            "conclusion": "success",
            "seconds": 4
          },
          {
            "name": "Restore",
            "conclusion": "success",
            "seconds": 8
          },
          {
            "name": "Build (warnings as errors)",
            "conclusion": "success",
            "seconds": 11
          },
          {
            "name": "Test",
            "conclusion": "failure",
            "seconds": 6
          }
        ]
      },
      {
        "name": "Frontend",
        "conclusion": "failure",
        "seconds": 36,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Run actions/setup-node@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Install",
            "conclusion": "success",
            "seconds": 7
          },
          {
            "name": "Lint",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Format check",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Build",
            "conclusion": "success",
            "seconds": 5
          },
          {
            "name": "Read the Playwright version",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Restore the Playwright browser",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Install the Playwright browser",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Behaviour specs",
            "conclusion": "failure",
            "seconds": 14
          },
          {
            "name": "Keep the Playwright traces",
            "conclusion": "success",
            "seconds": 1
          }
        ]
      }
    ],
    "said": [
      {
        "job": "Backend",
        "step": "Test",
        "text": "Expected: OK"
      },
      {
        "job": "Backend",
        "step": "Test",
        "text": "Actual:   Unauthorized"
      },
      {
        "job": "Backend",
        "step": "Test",
        "text": "Failed!  - Failed:     3, Passed:    10, Skipped:     0, Total:    13, Duration: 1 s - ChristianFitness.Api.Tests.dll (net10.0)"
      },
      {
        "job": "Frontend",
        "step": "Behaviour specs",
        "text": "Expected: \"Christian Fitness\""
      },
      {
        "job": "Frontend",
        "step": "Behaviour specs",
        "text": "Received: \"Christian Fitness (broken on purpose)\""
      }
    ]
  },
  "green": {
    "id": 45041635582,
    "url": "https://github.com/QuinntyneBrown/christian-fitness/actions/runs/45041635582",
    "event": "pull_request",
    "sha": "9da4b15",
    "conclusion": "success",
    "jobs": [
      {
        "name": "Backend",
        "conclusion": "success",
        "seconds": 34,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Run actions/setup-dotnet@v5",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Restore the NuGet cache",
            "conclusion": "success",
            "seconds": 3
          },
          {
            "name": "Restore",
            "conclusion": "success",
            "seconds": 8
          },
          {
            "name": "Build (warnings as errors)",
            "conclusion": "success",
            "seconds": 12
          },
          {
            "name": "Acceptance tests",
            "conclusion": "success",
            "seconds": 4
          }
        ]
      },
      {
        "name": "Frontend",
        "conclusion": "success",
        "seconds": 36,
        "steps": [
          {
            "name": "Run actions/checkout@v5",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Run actions/setup-node@v5",
            "conclusion": "success",
            "seconds": 3
          },
          {
            "name": "Install",
            "conclusion": "success",
            "seconds": 7
          },
          {
            "name": "Lint",
            "conclusion": "success",
            "seconds": 2
          },
          {
            "name": "Format check",
            "conclusion": "success",
            "seconds": 1
          },
          {
            "name": "Build",
            "conclusion": "success",
            "seconds": 5
          },
          {
            "name": "Read the Playwright version",
            "conclusion": "success",
            "seconds": 0
          },
          {
            "name": "Restore the Playwright browser",
            "conclusion": "success",
            "seconds": 3
          },
          {
            "name": "Install the Playwright browser",
            "conclusion": "skipped",
            "seconds": 0
          },
          {
            "name": "Behaviour specs",
            "conclusion": "success",
            "seconds": 8
          },
          {
            "name": "Keep the Playwright traces",
            "conclusion": "skipped",
            "seconds": 0
          }
        ]
      }
    ],
    "passed": [
      "2 passed (7.9s)",
      "Passed!  - Failed:     0, Passed:    13, Skipped:     0, Total:    13, Duration: 1 s - ChristianFitness.Api.Tests.dll (net10.0)"
    ]
  }
};
