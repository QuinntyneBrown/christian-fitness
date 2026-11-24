# The backend image (ADR 0047): the API in /app/api and the cf CLI in /app/cli, so the release job
# migrates and seeds with exactly the code the API then runs. Build context: backend/.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first, from the files that decide the package graph, so the layer is reused between commits.
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/ChristianFitness.Domain/ChristianFitness.Domain.csproj src/ChristianFitness.Domain/
COPY src/ChristianFitness.Application/ChristianFitness.Application.csproj src/ChristianFitness.Application/
COPY src/ChristianFitness.Infrastructure/ChristianFitness.Infrastructure.csproj src/ChristianFitness.Infrastructure/
COPY src/ChristianFitness.Api/ChristianFitness.Api.csproj src/ChristianFitness.Api/
COPY src/ChristianFitness.Cli/ChristianFitness.Cli.csproj src/ChristianFitness.Cli/
RUN dotnet restore src/ChristianFitness.Api/ChristianFitness.Api.csproj \
    && dotnet restore src/ChristianFitness.Cli/ChristianFitness.Cli.csproj

COPY src/ src/
RUN dotnet publish src/ChristianFitness.Api/ChristianFitness.Api.csproj -c Release --no-restore -o /out/api \
    && dotnet publish src/ChristianFitness.Cli/ChristianFitness.Cli.csproj -c Release --no-restore -o /out/cli

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app/api
COPY --from=build /out/api /app/api
COPY --from=build /out/cli /app/cli
COPY --chmod=755 release.sh /app/release.sh
# Port 5000: the proxy in the same replica holds 8080 and is the only way in (docs/operations/settings.md).
ENV ASPNETCORE_URLS=http://+:5000 \
    DOTNET_NOLOGO=true
EXPOSE 5000
USER $APP_UID
ENTRYPOINT ["dotnet", "/app/api/ChristianFitness.Api.dll"]
