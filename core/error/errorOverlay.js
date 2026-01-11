// errorOverlay.js
export function showErrorOverlay(error) {
  removeErrorOverlay();

  const overlay = document.createElement("div");
  overlay.id = "dev-error-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    color: "#fff",
    fontFamily: "Consolas, monospace",
    padding: "30px",
    zIndex: 99999,
    overflowY: "auto",
    transition: "opacity 0.25s ease",
    opacity: "0",
  });

  const container = document.createElement("div");
  container.style.position = "relative"; // important for absolute button
  container.style.maxWidth = "900px";
  container.style.margin = "50px auto";
  container.style.background = "rgba(255, 255, 255, 0.05)";
  container.style.borderRadius = "8px";
  container.style.padding = "20px 30px";
  container.style.boxShadow = "0 0 10px rgba(255, 0, 0, 0.3)";

  // Close Button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "× Close";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "#ff5555",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    fontSize: "16px",
    borderRadius: "4px",
    cursor: "pointer",
    zIndex: 10,
  });
  closeBtn.addEventListener("click", () => removeErrorOverlay());
  container.appendChild(closeBtn);

  // Title
  const title = document.createElement("h1");
  title.textContent = "Runtime Error";
  Object.assign(title.style, {
    color: "#ff5555",
    fontSize: "24px",
    marginBottom: "10px",
  });

  // Message
  const message = document.createElement("pre");
  message.textContent = error?.message || "Unknown error";
  Object.assign(message.style, {
    whiteSpace: "pre-wrap",
    background: "rgba(255, 255, 255, 0.1)",
    padding: "10px",
    borderRadius: "6px",
    marginTop: "10px",
    color: "#ffaaaa",
  });

  // Stack trace
  const stack = document.createElement("pre");
  stack.textContent = error?.stack || "";
  Object.assign(stack.style, {
    whiteSpace: "pre-wrap",
    marginTop: "15px",
    color: "#ccc",
  });

  container.appendChild(title);
  container.appendChild(message);
  container.appendChild(stack);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Smooth fade-in
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });

  // Console log
  console.error("FynixJS Runtime Error]", error);
}

export function removeErrorOverlay() {
  const existing = document.getElementById("dev-error-overlay");
  if (existing) {
    existing.style.opacity = "0";
    setTimeout(() => existing.remove(), 200);
  }
}
