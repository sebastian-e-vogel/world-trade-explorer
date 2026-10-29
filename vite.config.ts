import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleComtrade } from "./server/comtradeProxy.ts";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-comtrade-api",
      configureServer(server) {
        server.middlewares.use("/api/comtrade", (req, res) => {
          void handleComtrade(req, res);
        });
      },
    },
  ],
  build: { sourcemap: false },
});
