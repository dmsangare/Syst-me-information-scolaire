import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Charge le .env à la racine du monorepo
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const apiTarget = env.VITE_API_TARGET || "http://192.168.0.150";

  return {
    plugins: [
      react(),
      // Plugin : ajoute charset=utf-8 sur les Content-Type dev qui n'en ont pas
      {
        name: "force-charset-utf8",
        configureServer(server) {
          server.middlewares.use((_req, res, next) => {
            const origSetHeader = res.setHeader.bind(res);
            res.setHeader = function (name: any, value: any) {
              if (
                typeof name === "string" &&
                name.toLowerCase() === "content-type" &&
                typeof value === "string" &&
                !/charset=/i.test(value)
              ) {
                value = value + "; charset=utf-8";
              }
              return origSetHeader(name, value);
            };
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@sis-mali/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});