const { DataTypes } = require("sequelize");
const { schema, timestamped } = require("../src/models/schema");

module.exports = {
  async up(queryInterface) {
    for (const [table, fields] of Object.entries(schema())) {
      if (timestamped.includes(table)) {
        fields.created_at = { type: DataTypes.DATE, allowNull: false };
        fields.updated_at = { type: DataTypes.DATE, allowNull: false };
      }
      await queryInterface.createTable(table, fields, {
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
      });
    }
    await queryInterface.addIndex("products", ["enabled", "id"]);
    await queryInterface.addIndex("categories", ["use_in_menu", "id"]);
    await queryInterface.addIndex("product_categories", ["category_id", "product_id"]);
  },
  async down(queryInterface) {
    for (const table of Object.keys(schema()).reverse()) {
      await queryInterface.dropTable(table);
    }
  },
};
