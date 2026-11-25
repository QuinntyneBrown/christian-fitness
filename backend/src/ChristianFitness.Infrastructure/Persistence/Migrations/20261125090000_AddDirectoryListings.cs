using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectoryListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.AddColumn<Guid>(
                name: "HostListingId",
                table: "Events",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("0193a9c0-0000-7000-8000-00000000cf01"));

            migrationBuilder.CreateTable(
                name: "DirectoryListings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    KindOrder = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Tagline = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Area = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Focus = table.Column<string[]>(type: "text[]", nullable: false),
                    WebsiteUrl = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PhotoKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ListedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    SuggestionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServiceListingId = table.Column<Guid>(type: "uuid", nullable: true),
                    NameKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SearchText = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectoryListings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Events_HostListingId_Status_StartsAt",
                table: "Events",
                columns: new[] { "HostListingId", "Status", "StartsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DirectoryListings_SearchText",
                table: "DirectoryListings",
                column: "SearchText")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_DirectoryListings_Status_KindOrder_NameKey_Id",
                table: "DirectoryListings",
                columns: new[] { "Status", "KindOrder", "NameKey", "Id" });

            // Every existing event is hosted by the Listed Christian Fitness team listing, which must
            // exist before the key does; `cf seed` uses the same stable id and so adds nothing more
            // (ADR 0067, ADR 0082). The keys are what DirectoryListing.Describe would store.
            migrationBuilder.Sql("""
                INSERT INTO "DirectoryListings" ("Id", "Kind", "KindOrder", "Name", "Tagline", "Area", "Description", "Focus",
                    "WebsiteUrl", "PhotoKey", "IsVerified", "Status", "ListedAt", "NameKey", "SearchText")
                VALUES ('0193a9c0-0000-7000-8000-00000000cf01', 'Organization', 0, 'Christian Fitness',
                    'Faith-first fitness community for the GTA', 'Toronto-wide',
                    'We run free community events across Toronto and keep this directory honest: every listing is checked by our team before it goes live.',
                    ARRAY['Community runs', 'Workshops', 'Retreats'], 'https://www.christian.fitness', NULL, TRUE, 'Published', now(),
                    'christian fitness',
                    E'christian fitness\nfaith-first fitness community for the gta\ntoronto-wide\ncommunity runs\nworkshops\nretreats')
                ON CONFLICT ("Id") DO NOTHING;
                """);

            migrationBuilder.AddForeignKey(
                name: "FK_Events_DirectoryListings_HostListingId",
                table: "Events",
                column: "HostListingId",
                principalTable: "DirectoryListings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Events_DirectoryListings_HostListingId",
                table: "Events");

            migrationBuilder.DropTable(
                name: "DirectoryListings");

            migrationBuilder.DropIndex(
                name: "IX_Events_HostListingId_Status_StartsAt",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "HostListingId",
                table: "Events");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }
    }
}
