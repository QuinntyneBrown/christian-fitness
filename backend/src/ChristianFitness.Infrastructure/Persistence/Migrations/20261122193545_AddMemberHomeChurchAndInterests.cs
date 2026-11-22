using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberHomeChurchAndInterests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HomeChurch",
                table: "Members",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "Interests",
                table: "Members",
                type: "text[]",
                nullable: false,
                defaultValue: Array.Empty<string>());
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HomeChurch",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "Interests",
                table: "Members");
        }
    }
}
