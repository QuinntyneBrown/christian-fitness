using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FeedbackNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    PageRouteTemplate = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    StoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    PageTitle = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    MayEmail = table.Column<bool>(type: "boolean", nullable: false),
                    Device = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Browser = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ScreenshotKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeedbackNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeedbackNotes_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeedbackNotes_MemberId_SentAt",
                table: "FeedbackNotes",
                columns: new[] { "MemberId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_FeedbackNotes_Status_SentAt",
                table: "FeedbackNotes",
                columns: new[] { "Status", "SentAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeedbackNotes");
        }
    }
}
