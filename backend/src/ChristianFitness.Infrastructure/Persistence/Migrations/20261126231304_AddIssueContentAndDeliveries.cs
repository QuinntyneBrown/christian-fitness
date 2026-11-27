using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIssueContentAndDeliveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Subject",
                table: "NewsletterIssues",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EditorsNote",
                table: "NewsletterIssues",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "LeadStoryId",
                table: "NewsletterIssues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid[]>(
                name: "AlsoStoryIds",
                table: "NewsletterIssues",
                type: "uuid[]",
                nullable: false,
                defaultValue: Array.Empty<Guid>());

            migrationBuilder.AddColumn<Guid[]>(
                name: "EventIds",
                table: "NewsletterIssues",
                type: "uuid[]",
                nullable: false,
                defaultValue: Array.Empty<Guid>());

            migrationBuilder.AddColumn<string>(
                name: "Verse",
                table: "NewsletterIssues",
                type: "character varying(400)",
                maxLength: 400,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VerseReference",
                table: "NewsletterIssues",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ScheduledById",
                table: "NewsletterIssues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MissedSend",
                table: "NewsletterIssues",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SentAt",
                table: "NewsletterIssues",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecipientCount",
                table: "NewsletterIssues",
                type: "integer",
                nullable: false,
                defaultValue: 0);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IssueDeliveries");

            migrationBuilder.DropColumn(
                name: "Subject",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "EditorsNote",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "LeadStoryId",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "AlsoStoryIds",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "EventIds",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "Verse",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "VerseReference",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "ScheduledById",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "MissedSend",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "SentAt",
                table: "NewsletterIssues");

            migrationBuilder.DropColumn(
                name: "RecipientCount",
                table: "NewsletterIssues");
        }
    }
}
