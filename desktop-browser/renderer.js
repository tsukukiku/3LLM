function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "about:blank";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function wirePane(pane) {
  const form = pane.querySelector(".toolbar");
  const input = pane.querySelector(".url-input");
  const webview = pane.querySelector("webview");
  const back = pane.querySelector(".back");
  const forward = pane.querySelector(".forward");
  const reload = pane.querySelector(".reload");
  const external = pane.querySelector(".external");

  function loadFromInput() {
    const url = normalizeUrl(input.value);
    input.value = url === "about:blank" ? "" : url;
    webview.loadURL(url);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadFromInput();
  });

  back.addEventListener("click", () => {
    if (webview.canGoBack()) webview.goBack();
  });

  forward.addEventListener("click", () => {
    if (webview.canGoForward()) webview.goForward();
  });

  reload.addEventListener("click", () => {
    webview.reload();
  });

  external.addEventListener("click", () => {
    const url = normalizeUrl(input.value);
    if (url !== "about:blank") window.open(url, "_blank");
  });

  webview.addEventListener("did-navigate", (event) => {
    input.value = event.url;
  });

  webview.addEventListener("did-navigate-in-page", (event) => {
    input.value = event.url;
  });

  webview.addEventListener("page-title-updated", () => {
    back.disabled = !webview.canGoBack();
    forward.disabled = !webview.canGoForward();
  });
}

document.querySelectorAll(".pane").forEach(wirePane);

document.getElementById("resetLayout").addEventListener("click", () => {
  document.querySelectorAll(".pane").forEach((pane) => {
    pane.querySelector("webview").reload();
  });
});
