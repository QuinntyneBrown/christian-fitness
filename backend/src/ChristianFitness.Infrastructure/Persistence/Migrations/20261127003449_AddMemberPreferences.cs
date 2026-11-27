using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Devotion",
                table: "NewsletterSubscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EventAlerts",
                table: "NewsletterSubscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "TrainingPlan",
                table: "NewsletterSubscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Weekly",
                table: "NewsletterSubscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Every address subscribed before the Weekly had a switch of its own gets the Weekly (L2-064 AC2).
            migrationBuilder.Sql("UPDATE \"NewsletterSubscriptions\" SET \"Weekly\" = TRUE WHERE \"Status\" = 'Subscribed';");

            migrationBuilder.CreateTable(
                name: "MemberPreferences",
                columns: table => new
                {
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventReminders = table.Column<bool>(type: "boolean", nullable: false),
                    Messages = table.Column<bool>(type: "boolean", nullable: false),
                    FollowedListingDates = table.Column<bool>(type: "boolean", nullable: false),
                    EventChanges = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberPreferences", x => x.MemberId);
                    table.ForeignKey(
                        name: "FK_MemberPreferences_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MemberPreferences");

            migrationBuilder.DropColumn(
                name: "Devotion",
                table: "NewsletterSubscriptions");

            migrationBuilder.DropColumn(
                name: "EventAlerts",
                table: "NewsletterSubscriptions");

            migrationBuilder.DropColumn(
                name: "TrainingPlan",
                table: "NewsletterSubscriptions");

            migrationBuilder.DropColumn(
                name: "Weekly",
                table: "NewsletterSubscriptions");
        }
    }
}
