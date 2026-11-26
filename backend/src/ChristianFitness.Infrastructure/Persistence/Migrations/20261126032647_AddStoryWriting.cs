using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianFitness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStoryWriting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Headline",
                table: "Stories",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<Guid>(
                name: "BylineId",
                table: "Stories",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ActivityAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EditedAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FirstPublishedAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "FormerSlugs",
                table: "Stories",
                type: "text[]",
                nullable: false,
                defaultValue: Array.Empty<string>());

            migrationBuilder.AddColumn<int>(
                name: "ImageCrop_Height",
                table: "Stories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ImageCrop_Width",
                table: "Stories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ImageCrop_X",
                table: "Stories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ImageCrop_Y",
                table: "Stories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageKey",
                table: "Stories",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeInWeekly",
                table: "Stories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "NextStepLink",
                table: "Stories",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextStepText",
                table: "Stories",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Placement",
                table: "Stories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Latest");

            migrationBuilder.AddColumn<string>(
                name: "PointsTo",
                table: "Stories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "None");

            migrationBuilder.AddColumn<Guid>(
                name: "PointsToId",
                table: "Stories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PublishAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PublishedAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Stories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Stories",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Stories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SubmittedAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Stories",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Text",
                table: "Stories",
                type: "character varying(50000)",
                maxLength: 50000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "Stories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Stories kept before this journey (none were written: only bylines' counts read them) are
            // Drafts last touched when they were made.
            migrationBuilder.Sql("UPDATE \"Stories\" SET \"ActivityAt\" = \"CreatedAt\", \"EditedAt\" = \"CreatedAt\";");

            migrationBuilder.CreateIndex(
                name: "IX_Stories_Slug",
                table: "Stories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stories_Status_ActivityAt",
                table: "Stories",
                columns: new[] { "Status", "ActivityAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stories_Slug",
                table: "Stories");

            migrationBuilder.DropIndex(
                name: "IX_Stories_Status_ActivityAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ActivityAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "EditedAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "FirstPublishedAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "FormerSlugs",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ImageCrop_Height",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ImageCrop_Width",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ImageCrop_X",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ImageCrop_Y",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ImageKey",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "IncludeInWeekly",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "NextStepLink",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "NextStepText",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Placement",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "PointsTo",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "PointsToId",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "PublishAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Text",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Stories");

            migrationBuilder.AlterColumn<string>(
                name: "Headline",
                table: "Stories",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(160)",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<Guid>(
                name: "BylineId",
                table: "Stories",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
