import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  buckets: {
    "tekrar-defteri": { access: "private" },
  },
  functions: {
    api: {
      name: "tekrar defteri api",
      source: "api/index.ts",
      env: {
        // Virgülle ayrılmış, API'yi çağırmasına izin verilen ön yüz adresleri.
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS!,
      },
    },
  },
});
