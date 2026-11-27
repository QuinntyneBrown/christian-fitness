using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDataExportRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DataExportRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReadyAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ArchiveKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataExportRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DataExportRequests_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DataExportRequests_ExpiresAt",
                table: "DataExportRequests",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DataExportRequests_MemberId_RequestedAt",
                table: "DataExportRequests",
                columns: new[] { "MemberId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DataExportRequests_ReadyAt",
                table: "DataExportRequests",
                column: "ReadyAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DataExportRequests");
        }
    }
}
