import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "./i18n/LanguageContext";
import { App } from "./App";
import "./styles.css";
const client = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
