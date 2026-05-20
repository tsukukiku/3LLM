function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "about:blank";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function loadPane(pane) {
  const input = pane.querySelector(".browser-url");
  const frame = pane.querySelector("iframe");
  const url = normalizeUrl(input.value);
  input.value = url === "about:blank" ? "" : url;
  frame.src = url;
}

document.querySelectorAll(".browser-pane").forEach((pane) => {
  const form = pane.querySelector(".browser-toolbar");
  const externalBtn = pane.querySelector(".open-external");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadPane(pane);
  });

  externalBtn.addEventListener("click", () => {
    const url = normalizeUrl(pane.querySelector(".browser-url").value);
    if (url !== "about:blank") {
      window.open(url, "_blank", "noreferrer");
    }
  });

  loadPane(pane);
});
