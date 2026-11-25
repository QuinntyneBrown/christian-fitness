using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddListingEdits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "DirectoryListings",
                type: "character varying(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PendingKind",
                table: "DirectoryListings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PendingName",
                table: "DirectoryListings",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PendingSince",
                table: "DirectoryListings",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "DirectoryListings");

            migrationBuilder.DropColumn(
                name: "PendingKind",
                table: "DirectoryListings");

            migrationBuilder.DropColumn(
                name: "PendingName",
                table: "DirectoryListings");

            migrationBuilder.DropColumn(
                name: "PendingSince",
                table: "DirectoryListings");
        }
    }
}
