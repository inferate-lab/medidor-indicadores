import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, ".output");
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "server"), { recursive: true });

await cp(resolve(output, "server"), resolve(dist, "server"), { recursive: true });
await cp(resolve(output, "public"), resolve(dist, "public"), { recursive: true });
// Sites reconoce `client` como directorio de activos. Nitro conserva `public`
// para su manifiesto interno, por lo que se incluyen ambos sin alterar bytes.
await cp(resolve(output, "public"), resolve(dist, "client"), { recursive: true });

await writeFile(
  resolve(dist, "server", "index.js"),
  'export { default } from "./index.mjs";\n',
  "utf8",
);
