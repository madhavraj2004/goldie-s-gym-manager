import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSWUpdate } from "./lib/swUpdateManager";

createRoot(document.getElementById("root")!).render(<App />);

initSWUpdate();
