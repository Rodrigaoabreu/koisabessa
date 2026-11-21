const { Sequelize } = require("sequelize");
const configurations = require("../config/database");
const { schema, timestamped } = require("./schema");

const sequelize = new Sequelize(configurations[process.env.NODE_ENV] || configurations.development);
const tables = schema();

function model(name, tableName) {
  return sequelize.define(name, tables[tableName], {
    tableName,
    timestamps: timestamped.includes(tableName),
    underscored: true,
  });
}

const User = model("user", "users");
const Category = model("category", "categories");
const Product = model("product", "products");
const ProductImage = model("productImage", "product_images");
const ProductOption = model("productOption", "product_options");
const ProductCategory = model("productCategory", "product_categories");

Product.hasMany(ProductImage, { as: "images", foreignKey: "product_id" });
Product.hasMany(ProductOption, { as: "options", foreignKey: "product_id" });
Product.belongsToMany(Category, {
  as: "categories", through: ProductCategory, foreignKey: "product_id", otherKey: "category_id",
});

module.exports = { sequelize, User, Category, Product, ProductImage, ProductOption, ProductCategory };
