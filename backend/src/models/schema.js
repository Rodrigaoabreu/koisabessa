const { DataTypes: t } = require("sequelize");

function schema() {
  const id = () => ({ type: t.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false });
  const text = (length, unique = false) => ({ type: t.STRING(length), allowNull: false, unique });
  const flag = () => ({ type: t.BOOLEAN, allowNull: false, defaultValue: false });
  const whole = () => ({ type: t.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 });
  const price = () => ({ type: t.DECIMAL(10, 2), allowNull: false });
  const foreignKey = model => ({
    type: t.INTEGER,
    allowNull: false,
    references: { model, key: "id" },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  return {
    users: {
      id: id(),
      firstname: text(80),
      surname: text(120),
      email: text(254, true),
      password: text(60),
      role: { type: t.ENUM("customer", "admin"), allowNull: false, defaultValue: "customer" },
    },
    categories: {
      id: id(),
      name: text(120),
      slug: text(120, true),
      use_in_menu: flag(),
    },
    products: {
      id: id(),
      enabled: flag(),
      name: text(160),
      slug: text(160, true),
      use_in_menu: flag(),
      stock: whole(),
      description: { type: t.TEXT },
      price: price(),
      price_with_discount: price(),
    },
    product_images: {
      id: id(),
      product_id: foreignKey("products"),
      enabled: flag(),
      path: text(2048),
    },
    product_options: {
      id: id(),
      product_id: foreignKey("products"),
      title: text(120),
      shape: { type: t.ENUM("square", "circle"), allowNull: false, defaultValue: "square" },
      radius: whole(),
      type: { type: t.ENUM("text", "color"), allowNull: false, defaultValue: "text" },
      values: { type: t.TEXT, allowNull: false },
    },
    product_categories: {
      product_id: { ...foreignKey("products"), primaryKey: true },
      category_id: { ...foreignKey("categories"), primaryKey: true },
    },
  };
}

const timestamped = ["users", "categories", "products"];

module.exports = { schema, timestamped };
