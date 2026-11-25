using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSuggestionReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                table: "Members",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecidedAt",
                table: "ListingSuggestions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DecidedById",
                table: "ListingSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeclineReason",
                table: "ListingSuggestions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ListingId",
                table: "ListingSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ListingClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListingClaims_DirectoryListings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "DirectoryListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SuggestionChecks",
                columns: table => new
                {
                    SuggestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Check = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Passed = table.Column<bool>(type: "boolean", nullable: false),
                    ChangedById = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestionChecks", x => new { x.SuggestionId, x.Check });
                    table.ForeignKey(
                        name: "FK_SuggestionChecks_ListingSuggestions_SuggestionId",
                        column: x => x.SuggestionId,
                        principalTable: "ListingSuggestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ListingSuggestions_DecidedAt",
                table: "ListingSuggestions",
                column: "DecidedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ListingClaims_ListingId",
                table: "ListingClaims",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_ListingClaims_TokenHash",
                table: "ListingClaims",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ListingClaims");

            migrationBuilder.DropTable(
                name: "SuggestionChecks");

            migrationBuilder.DropIndex(
                name: "IX_ListingSuggestions_DecidedAt",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "IsSystem",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "DecidedAt",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "DecidedById",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "DeclineReason",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "ListingId",
                table: "ListingSuggestions");
        }
    }
}
