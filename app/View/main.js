//Works with router
import { fynixCreate } from "@fynix";
import "./Global.css";
const { mountRouter } = fynixCreate(); // auto-loads /views
mountRouter("#app-root");

//works without router

// import { mount } from "@fynix";
// import { App } from "./page";

// mount(App, "#app-root"); // ✅ Pass the component function directly
