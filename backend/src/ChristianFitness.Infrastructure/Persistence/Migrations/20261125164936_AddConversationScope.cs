using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Chat moves from an event id to a conversation scope (ADR 0080, ADR 0099): every stored message
    /// keeps its chat, a session's messages move to its series' one chat, and a member's read markers
    /// for a series' sessions merge into one, at the latest instant read. Nothing is deleted that is
    /// not written again. The series gains its enrolment concurrency token.
    /// </summary>
    public partial class AddConversationScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EventId",
                table: "ChatReadMarkers",
                newName: "ScopeId");

            migrationBuilder.RenameColumn(
                name: "EventId",
                table: "ChatMessages",
                newName: "ScopeId");

            migrationBuilder.RenameIndex(
                name: "IX_ChatMessages_EventId_SentAt_Id",
                table: "ChatMessages",
                newName: "IX_ChatMessages_ScopeId_SentAt_Id");

            migrationBuilder.AddColumn<int>(
                name: "EnrolmentVersion",
                table: "EventSeries",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Every existing message is in its event's own chat...
            migrationBuilder.AddColumn<string>(
                name: "ScopeKind",
                table: "ChatMessages",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Event");

            // ...except a session's, which moves to its series' one chat.
            migrationBuilder.Sql("""
                UPDATE "ChatMessages" AS m
                SET "ScopeKind" = 'Series', "ScopeId" = e."SeriesId"
                FROM "Events" AS e
                WHERE e."Id" = m."ScopeId" AND e."SeriesId" IS NOT NULL;
                """);

            // A member's markers for a series' sessions become one marker for the series, read up to
            // the latest of them; a direct conversation's marker (keyed by a member) is untouched.
            migrationBuilder.Sql("""
                WITH moved AS (
                    DELETE FROM "ChatReadMarkers" AS k
                    USING "Events" AS e
                    WHERE e."Id" = k."ScopeId" AND e."SeriesId" IS NOT NULL
                    RETURNING k."MemberId", e."SeriesId", k."ReadAt")
                INSERT INTO "ChatReadMarkers" ("MemberId", "ScopeId", "ReadAt")
                SELECT "MemberId", "SeriesId", MAX("ReadAt") FROM moved GROUP BY "MemberId", "SeriesId"
                ON CONFLICT ("MemberId", "ScopeId") DO UPDATE
                SET "ReadAt" = GREATEST("ChatReadMarkers"."ReadAt", EXCLUDED."ReadAt");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // A series' messages and markers go back to its first session, the nearest event chat.
            migrationBuilder.Sql("""
                UPDATE "ChatMessages" AS m
                SET "ScopeId" = (SELECT e."Id" FROM "Events" AS e WHERE e."SeriesId" = m."ScopeId" ORDER BY e."StartsAt", e."Id" LIMIT 1)
                WHERE m."ScopeKind" = 'Series'
                  AND EXISTS (SELECT 1 FROM "Events" AS e WHERE e."SeriesId" = m."ScopeId");
                """);
            migrationBuilder.Sql("""
                UPDATE "ChatReadMarkers" AS k
                SET "ScopeId" = (SELECT e."Id" FROM "Events" AS e WHERE e."SeriesId" = k."ScopeId" ORDER BY e."StartsAt", e."Id" LIMIT 1)
                WHERE EXISTS (SELECT 1 FROM "Events" AS e WHERE e."SeriesId" = k."ScopeId");
                """);

            migrationBuilder.DropColumn(
                name: "EnrolmentVersion",
                table: "EventSeries");

            migrationBuilder.DropColumn(
                name: "ScopeKind",
                table: "ChatMessages");

            migrationBuilder.RenameColumn(
                name: "ScopeId",
                table: "ChatReadMarkers",
                newName: "EventId");

            migrationBuilder.RenameColumn(
                name: "ScopeId",
                table: "ChatMessages",
                newName: "EventId");

            migrationBuilder.RenameIndex(
                name: "IX_ChatMessages_ScopeId_SentAt_Id",
                table: "ChatMessages",
                newName: "IX_ChatMessages_EventId_SentAt_Id");
        }
    }
}
