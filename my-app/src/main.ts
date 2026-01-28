// src/main.js
import { createFynix } from "@fynixorg/ui";
import "./Global.css";

const router = createFynix();
// Debug: Log all loaded routes
console.log("Loaded routes:", router.routes);
console.log("Dynamic routes:", router.dynamicRoutes);
router.mountRouter("#app-root");
