using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletionRequestedAt",
                table: "Members",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccountDeletionAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountDeletionAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccountDeletionAttempts_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Members_DeletionRequestedAt",
                table: "Members",
                column: "DeletionRequestedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AccountDeletionAttempts_MemberId_AttemptedAt",
                table: "AccountDeletionAttempts",
                columns: new[] { "MemberId", "AttemptedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountDeletionAttempts");

            migrationBuilder.DropIndex(
                name: "IX_Members_DeletionRequestedAt",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "DeletionRequestedAt",
                table: "Members");
        }
    }
}
