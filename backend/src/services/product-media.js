const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { badRequest } = require("../http");

const mediaDirectory = path.resolve(process.env.MEDIA_DIR || path.join(__dirname, "../../storage/uploads"));
const catalogDirectory = path.join(__dirname, "../../catalog-media");
const uploadPrefix = "/media/uploads/";
const maxBytes = 3 * 1024 * 1024;
const mimeTypes = {
  "image/png": { ext: "png", matches: data => data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) },
  "image/jpeg": { ext: "jpg", matches: data => data.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) },
  "image/webp": { ext: "webp", matches: data => data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" },
};

async function saveImage(content, type, changes, previous) {
  if (content === previous) return previous;
  if (/^https?:\/\//i.test(content)) {
    let url;
    try {
      url = new URL(content);
    } catch {
      throw badRequest("A URL da imagem é inválida.");
    }
    if (content.length > 2048 || !url.hostname || url.username || url.password) {
      throw badRequest("A URL da imagem é inválida.");
    }
    return content;
  }

  const embedded = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/.exec(content);
  if (embedded && type && type !== embedded[1]) throw badRequest("O tipo da imagem é incompatível com os dados.");
  const encoded = embedded?.[2] || content;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > 4 * Math.ceil(maxBytes / 3)) {
    throw badRequest("Envie uma URL HTTP(S) ou uma imagem PNG, JPEG ou WebP em base64 de até 3 MB.");
  }
  const bytes = Buffer.from(encoded, "base64");
  const canonical = bytes.toString("base64").replace(/=+$/, "");
  const mime = type || embedded?.[1] || mimeFromPath(previous);
  const format = mime ? mimeTypes[mime] : Object.values(mimeTypes).find(candidate => candidate.matches(bytes));
  if (bytes.length > maxBytes || canonical !== encoded.replace(/=+$/, "") || !format?.matches(bytes)) {
    throw badRequest("O conteúdo da imagem é inválido.");
  }
  const filename = `${randomUUID()}.${format.ext}`;
  const location = path.join(mediaDirectory, filename);
  await fs.mkdir(mediaDirectory, { recursive: true });
  changes.created.push(`${uploadPrefix}${filename}`);
  await fs.writeFile(location, bytes, { flag: "wx" });
  return `${uploadPrefix}${filename}`;
}

function mimeFromPath(value) {
  const extension = value?.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (extension === "jpeg") return "image/jpeg";
  return Object.keys(mimeTypes).find(mime => mimeTypes[mime].ext === extension);
}

async function cleanImages(paths) {
  for (const location of paths) {
    if (!/^\/media\/uploads\/[a-f0-9-]{36}\.(?:png|jpg|webp)$/.test(location)) continue;
    try {
      await fs.rm(path.join(mediaDirectory, path.basename(location)), { force: true });
    } catch (error) {
      console.error("Falha ao limpar imagem local.", error.message);
    }
  }
}

module.exports = { mediaDirectory, catalogDirectory, saveImage, cleanImages };
