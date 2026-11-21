const bcrypt = require("bcryptjs");
const { sequelize, User, Category, Product, ProductImage, ProductOption } = require("../src/models");

const categories = [
  ["Sala de estar", "sala"],
  ["Mesa e cozinha", "mesa"],
  ["Quarto", "quarto"],
  ["Decoração", "decoracao"],
  ["Organização", "organizacao"],
];

const products = [
  { slug: "poltrona-brisa", name: "Poltrona Brisa", price: 1499.90, offer: 1199.90, group: "sala", stock: 8, description: "Assento largo e curvo em bouclé, com base baixa de madeira. Mede 76 × 81 × 79 cm e funciona bem ao lado de uma luminária de leitura.", colors: ["#68704a", "#ddd0b8", "#9e6047"], option: ["Acabamento", "Madeira natural", "Nogueira"], photos: ["janela", "perfil", "boucle"] },
  { slug: "sofa-abrigo", name: "Sofá Abrigo 3 lugares", price: 3899.90, group: "sala", stock: 5, description: "Sofá de 208 cm com braços baixos e revestimento claro de linho misto. Almofadas soltas para ajustar a profundidade do assento.", colors: ["#e3dbcb", "#a3a296"] },
  { slug: "mesa-de-centro-lago", name: "Mesa de centro Lago", price: 729.90, offer: 649.90, group: "sala", stock: 7, description: "Tampo oval de carvalho com bordas arredondadas e base de madeira. Mede 96 × 52 × 34 cm.", option: ["Acabamento", "Carvalho", "Mel"] },
  { slug: "cadeira-talo", name: "Cadeira Talo", price: 479.90, group: "mesa", stock: 12, description: "Cadeira de madeira maciça com encosto curvado e assento anatômico. Acabamento selado de toque fosco.", option: ["Acabamento", "Natural", "Escuro"] },
  { slug: "abajur-luar", name: "Abajur Luar", price: 329.90, group: "decoracao", extra: "quarto", stock: 11, description: "Base em cerâmica areia e cúpula de tecido cru. A luz difusa atende mesas laterais e criados-mudos." },
  { slug: "vasos-barro", name: "Conjunto de vasos Barro", price: 189.90, offer: 149.90, group: "decoracao", stock: 20, description: "Duas peças em terracota fosca, com alturas de 16 e 24 cm. Indicadas para arranjos secos ou para decorar uma estante." },
  { slug: "tapete-duna", name: "Tapete Duna", price: 639.90, group: "decoracao", extra: "sala", stock: 8, description: "Tapete de pelo baixo em tom areia, com trama marcada e bordas arrematadas.", option: ["Medida", "140 × 200 cm", "200 × 250 cm"] },
  { slug: "almofada-trama", name: "Almofada Trama", price: 119.90, group: "decoracao", extra: "quarto", stock: 18, description: "Almofada de 45 × 45 cm com capa de linho misto, zíper oculto e enchimento incluso.", colors: ["#bea987", "#8a6950"] },
  { slug: "mesa-encontro", name: "Mesa de jantar Encontro", price: 2399.90, group: "mesa", stock: 4, description: "Mesa de madeira para seis lugares com tampo retangular de 160 × 85 cm." },
  { slug: "pratos-calma", name: "Conjunto de pratos Calma", price: 169.90, group: "mesa", stock: 15, description: "Quatro pratos rasos de 27 cm em cerâmica esmaltada fosca. Podem ir à lava-louças." },
  { slug: "espelho-arco", name: "Espelho Arco", price: 359.90, group: "decoracao", extra: "quarto", stock: 4, description: "Espelho vertical de 48 × 72 cm com moldura de madeira e suporte para fixação." },
  { slug: "buffet-raiz", name: "Buffet Raiz", price: 2199.90, offer: 1899.90, group: "mesa", extra: "organizacao", stock: 6, description: "Buffet de 160 cm com três portas, prateleiras internas e acabamento amadeirado." },
  { slug: "roupa-de-cama-neblina", name: "Roupa de cama Neblina", price: 399.90, group: "quarto", stock: 10, description: "Conjunto de cama em linho misto tom aveia, com lençol e duas fronhas.", option: ["Tamanho", "Casal", "Queen"] },
  { slug: "mesa-de-cabeceira-ninho", name: "Mesa de cabeceira Ninho", price: 549.90, group: "quarto", stock: 8, description: "Mesa lateral em tom nogueira com uma gaveta e nicho aberto." },
  { slug: "cesto-volta", name: "Cesto Volta", price: 139.90, group: "organizacao", stock: 12, description: "Cesto redondo de fibras trançadas, com 35 cm de diâmetro e duas alças." },
  { slug: "armario-bosque", name: "Armário baixo Bosque", price: 1899.90, group: "organizacao", extra: "sala", stock: 0, description: "Armário de 120 cm com duas portas, prateleira regulável e acabamento verde-oliva." },
];

async function seed() {
  const { ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword } = process.env;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) throw new Error("Configure ADMIN_EMAIL e ADMIN_PASSWORD juntos.");
  if (adminPassword && (adminPassword.length < 12 || Buffer.byteLength(adminPassword) > 72)) {
    throw new Error("A senha administrativa deve ter entre 12 caracteres e 72 bytes.");
  }

  await sequelize.transaction(async transaction => {
    const groups = new Map();
    for (const [name, slug] of categories) {
      const [category] = await Category.findOrCreate({ where: { slug }, defaults: { name, use_in_menu: true }, transaction });
      groups.set(slug, category.id);
    }
    for (const item of products) {
      const [product, created] = await Product.findOrCreate({
        where: { slug: item.slug },
        defaults: {
          name: item.name, description: item.description, price: item.price, price_with_discount: item.offer ?? 0,
          stock: item.stock, enabled: true, use_in_menu: true,
        },
        transaction,
      });
      if (!created) continue;
      await product.setCategories([groups.get(item.group), ...(item.extra ? [groups.get(item.extra)] : [])], { transaction });
      const images = [item.slug, ...(item.photos || []).map(suffix => `${item.slug}-${suffix}`)];
      await ProductImage.bulkCreate(images.map(slug => ({
        product_id: product.id, enabled: true, path: `/media/catalog/${slug}.jpg`,
      })), { transaction });
      if (item.colors) {
        await ProductOption.create({ product_id: product.id, title: "Cor", shape: "circle", type: "color", values: item.colors.join(",") }, { transaction });
      }
      if (item.option) {
        const [title, ...values] = item.option;
        await ProductOption.create({ product_id: product.id, title, radius: 4, values: values.join(",") }, { transaction });
      }
    }
    if (adminEmail) {
      const email = adminEmail.trim().toLowerCase();
      const existing = await User.findOne({ where: { email }, transaction });
      if (existing && existing.role !== "admin") throw new Error("O e-mail administrativo já pertence a uma conta cliente.");
      if (!existing) await User.create({
        firstname: "Administrador", surname: "Koisabessa", email, role: "admin", password: await bcrypt.hash(adminPassword, 12),
      }, { transaction });
    }
  });
}

if (require.main === module) {
  seed().then(() => console.log("Catálogo de demonstração preparado.")).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  }).finally(() => sequelize.close());
}

module.exports = { seed };
