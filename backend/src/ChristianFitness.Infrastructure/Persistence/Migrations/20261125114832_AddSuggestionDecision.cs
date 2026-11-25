using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSuggestionDecision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecidedAt",
                table: "ListingSuggestions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DecidedById",
                table: "ListingSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeclineReason",
                table: "ListingSuggestions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ListingId",
                table: "ListingSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListingSuggestions_DecidedAt",
                table: "ListingSuggestions",
                column: "DecidedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ListingSuggestions_DecidedAt",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "DecidedAt",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "DecidedById",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "DeclineReason",
                table: "ListingSuggestions");

            migrationBuilder.DropColumn(
                name: "ListingId",
                table: "ListingSuggestions");
        }
    }
}
