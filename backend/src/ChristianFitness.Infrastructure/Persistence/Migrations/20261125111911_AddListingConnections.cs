using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddListingConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ListingConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConnectedListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    Relation = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListingConnections_DirectoryListings_ConnectedListingId",
                        column: x => x.ConnectedListingId,
                        principalTable: "DirectoryListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ListingConnections_DirectoryListings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "DirectoryListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ListingConnections_ConnectedListingId",
                table: "ListingConnections",
                column: "ConnectedListingId");

            migrationBuilder.CreateIndex(
                name: "IX_ListingConnections_ListingId_ConnectedListingId",
                table: "ListingConnections",
                columns: new[] { "ListingId", "ConnectedListingId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ListingConnections");
        }
    }
}
