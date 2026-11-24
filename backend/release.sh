#!/bin/sh
# The release job's command (ADR 0047): migrate, then seed, before the API of this image is served.
set -e
dotnet /app/cli/cf.dll migrate
dotnet /app/cli/cf.dll seed
