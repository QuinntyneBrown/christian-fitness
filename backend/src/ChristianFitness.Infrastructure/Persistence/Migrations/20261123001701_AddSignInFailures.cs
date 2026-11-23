using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSignInFailures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SignInFailures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailKey = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    FailedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignInFailures", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SignInFailures_EmailKey_FailedAt",
                table: "SignInFailures",
                columns: new[] { "EmailKey", "FailedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SignInFailures_FailedAt",
                table: "SignInFailures",
                column: "FailedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SignInFailures");
        }
    }
}
