using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPrivacyPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rows saved before these columns existed take a new member's defaults: seen by Members,
            // on attendee lists, messages from their groups only (L2-065 AC1, AC4, AC5).
            migrationBuilder.AddColumn<string>(
                name: "Area",
                table: "MemberPreferences",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LetAnyoneMessage",
                table: "MemberPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowOnAttendeeLists",
                table: "MemberPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Visibility",
                table: "MemberPreferences",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Members");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Area",
                table: "MemberPreferences");

            migrationBuilder.DropColumn(
                name: "LetAnyoneMessage",
                table: "MemberPreferences");

            migrationBuilder.DropColumn(
                name: "ShowOnAttendeeLists",
                table: "MemberPreferences");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "MemberPreferences");
        }
    }
}
