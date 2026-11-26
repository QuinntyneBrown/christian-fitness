using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsletterSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NewsletterSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RequestedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConsentedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConsentSource = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UnsubscribedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsletterSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NewsletterUnsubscribeTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsletterUnsubscribeTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NewsletterUnsubscribeTokens_NewsletterSubscriptions_Subscri~",
                        column: x => x.SubscriptionId,
                        principalTable: "NewsletterSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionConfirmations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionConfirmations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubscriptionConfirmations_NewsletterSubscriptions_Subscript~",
                        column: x => x.SubscriptionId,
                        principalTable: "NewsletterSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NewsletterSubscriptions_Email",
                table: "NewsletterSubscriptions",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NewsletterSubscriptions_Status_RequestedAt",
                table: "NewsletterSubscriptions",
                columns: new[] { "Status", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NewsletterSubscriptions_Status_UnsubscribedAt",
                table: "NewsletterSubscriptions",
                columns: new[] { "Status", "UnsubscribedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NewsletterUnsubscribeTokens_SubscriptionId",
                table: "NewsletterUnsubscribeTokens",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsletterUnsubscribeTokens_TokenHash",
                table: "NewsletterUnsubscribeTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionConfirmations_SubscriptionId",
                table: "SubscriptionConfirmations",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionConfirmations_TokenHash",
                table: "SubscriptionConfirmations",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NewsletterUnsubscribeTokens");

            migrationBuilder.DropTable(
                name: "SubscriptionConfirmations");

            migrationBuilder.DropTable(
                name: "NewsletterSubscriptions");
        }
    }
}
