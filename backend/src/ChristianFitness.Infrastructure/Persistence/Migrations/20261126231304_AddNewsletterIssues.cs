using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsletterIssues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NewsletterIssues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SendAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Subject = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EditorsNote = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    LeadStoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    AlsoStoryIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    EventIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    Verse = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    VerseReference = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    ScheduledById = table.Column<Guid>(type: "uuid", nullable: true),
                    MissedSend = table.Column<bool>(type: "boolean", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RecipientCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsletterIssues", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IssueDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IssueId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IssueDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IssueDeliveries_NewsletterIssues_IssueId",
                        column: x => x.IssueId,
                        principalTable: "NewsletterIssues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IssueDeliveries_NewsletterSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "NewsletterSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IssueDeliveries_IssueId_SubscriptionId",
                table: "IssueDeliveries",
                columns: new[] { "IssueId", "SubscriptionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IssueDeliveries_SentAt",
                table: "IssueDeliveries",
                column: "SentAt");

            migrationBuilder.CreateIndex(
                name: "IX_IssueDeliveries_SubscriptionId",
                table: "IssueDeliveries",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsletterIssues_Number",
                table: "NewsletterIssues",
                column: "Number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IssueDeliveries");

            migrationBuilder.DropTable(
                name: "NewsletterIssues");
        }
    }
}
