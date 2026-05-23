const askBtn = document.getElementById("askBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");
const questionEl = document.getElementById("question");
const passcodeEl = document.getElementById("passcode");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const imageInput = document.getElementById("imageInput");
const imageStatus = document.getElementById("imageStatus");
const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const removeImageBtn = document.getElementById("removeImageBtn");
const providerModelSelect = document.getElementById("providerModelSelect");

const panels = {
  gpt: document.getElementById("gpt"),
  gemini: document.getElementById("gemini"),
  grok: document.getElementById("grok")
};

const cards = {
  gpt: document.getElementById("gptCard"),
  gemini: document.getElementById("geminiCard"),
  grok: document.getElementById("grokCard")
};

const states = {
  gpt: document.getElementById("gptState"),
  gemini: document.getElementById("geminiState"),
  grok: document.getElementById("grokState")
};

const API_BASE_URL = ["star-style-studio.net", "www.star-style-studio.net"].includes(location.hostname)
  ? "https://api.star-style-studio.net"
  : "";
const MAX_QUESTION_CHARS = 500;
const MAX_ORIGINAL_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SEND_IMAGE_BYTES = 2 * 1024 * 1024;
const placeholderText = {
  gpt: "这里会显示 ChatGPT 的图文回答",
  gemini: "这里会显示 Gemini 的图文回答",
  grok: "这里会显示 Grok 的图文回答"
};
const modelCatalog = {
  normal: [
    { provider: "gpt", label: "GPT 5.4 mini", value: "gpt-5.4-mini" },
    { provider: "grok", label: "Grok 4.3", value: "grok-4.3" },
    { provider: "gemini", label: "Gemini 2.5 flash", value: "gemini-2.5-flash" }
  ],
  high: [
    { provider: "gpt", label: "GPT 5.4", value: "gpt-5.4" },
    { provider: "grok", label: "Grok 4.3", value: "grok-4.3" },
    { provider: "gemini", label: "Gemini 3.1 Pro Preview", value: "gemini-3.1-pro-preview" }
  ],
  math: [
    { provider: "gpt", label: "GPT 5.5", value: "gpt-5.5" },
    { provider: "grok", label: "Grok 4.20 Reasoning", value: "grok-4.20-0309-reasoning" },
    { provider: "gemini", label: "Gemini 3.1 Pro", value: "gemini-3.1-pro" }
  ]
};
let preparedImage = null;
let receivedStreamKeys = new Set();

function selectedModeValue() {
  return document.querySelector('input[name="mode"]:checked')?.value || "normal";
}

function getAskMode() {
  const selected = selectedModeValue();
  const code = passcodeEl.value.trim();
  if (selected === "high") {
    return code === "ASK5.4" ? "high" : "";
  }
  if (selected === "math") {
    return code === "ASK5.5" ? "math" : "";
  }
  return code === "ASK3" ? "normal" : "";
}

function getSelectedModels() {
  const option = providerModelSelect?.selectedOptions?.[0];
  return option?.dataset?.provider ? [option.dataset.provider] : ["gpt"];
}

function getModelChoices() {
  const choices = {};
  const option = providerModelSelect?.selectedOptions?.[0];
  if (option?.dataset?.provider && providerModelSelect.value) {
    choices[option.dataset.provider] = providerModelSelect.value;
  }
  return choices;
}

function updateVisibleCards() {
  const selected = new Set(getSelectedModels());
  Object.keys(cards).forEach(function (key) {
    if (cards[key]) {
      cards[key].hidden = !selected.has(key);
    }
  });
}

function updateModelSelects() {
  if (!providerModelSelect) {
    updateVisibleCards();
    return;
  }
  const mode = selectedModeValue();
  const current = providerModelSelect.value;
  providerModelSelect.innerHTML = "";
  modelCatalog[mode].forEach(function (item) {
    const option = document.createElement("option");
    option.value = item.value;
    option.dataset.provider = item.provider;
    option.textContent = item.label;
    providerModelSelect.appendChild(option);
  });
  if (Array.from(providerModelSelect.options).some(function (option) { return option.value === current; })) {
    providerModelSelect.value = current;
  }
  updateVisibleCards();
}

function setState(key, text, isError) {
  states[key].textContent = text;
  states[key].className = isError ? "error" : "";
}

function updateCount() {
  countEl.textContent = questionEl.value.length + " / " + MAX_QUESTION_CHARS + " 字";
}

function autoGrowQuestion() {
  const maxHeight = window.matchMedia("(max-width: 720px)").matches ? 260 : 560;
  questionEl.style.height = "auto";
  questionEl.style.height = Math.min(questionEl.scrollHeight, maxHeight) + "px";
  questionEl.style.overflowY = questionEl.scrollHeight > maxHeight ? "auto" : "hidden";
}

function updateQuestionBox() {
  updateCount();
  autoGrowQuestion();
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + "MB" : Math.ceil(bytes / 1024) + "KB";
}

function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result)); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function compressImage(file) {
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error("原图不能超过 5MB");
  }
  const sourceUrl = await readFileAsDataUrl(file);
  const sourceBytes = dataUrlBytes(sourceUrl);
  if (sourceBytes <= MAX_SEND_IMAGE_BYTES && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { mime: file.type, data: sourceUrl.split(",")[1], preview: sourceUrl, bytes: sourceBytes };
  }

  const img = await loadImage(sourceUrl);
  let maxSide = 1600;
  let ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  let canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrlBytes(dataUrl) > MAX_SEND_IMAGE_BYTES && quality > 0.42) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  while (dataUrlBytes(dataUrl) > MAX_SEND_IMAGE_BYTES && maxSide > 720) {
    maxSide = Math.round(maxSide * 0.82);
    ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", 0.72);
  }

  if (dataUrlBytes(dataUrl) > MAX_SEND_IMAGE_BYTES) {
    throw new Error("图片压缩后仍超过 2MB，请换一张较小的图片");
  }
  return { mime: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, bytes: dataUrlBytes(dataUrl) };
}

async function handleImageChange() {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  imageStatus.textContent = "压缩图片中...";
  try {
    preparedImage = await compressImage(file);
    previewImg.src = preparedImage.preview;
    imagePreview.hidden = false;
    imageStatus.textContent = "已准备：" + formatSize(preparedImage.bytes);
  } catch (error) {
    preparedImage = null;
    imageInput.value = "";
    imagePreview.hidden = true;
    imageStatus.textContent = error.message || "图片处理失败";
    alert(imageStatus.textContent);
  }
}

function removeImage() {
  preparedImage = null;
  imageInput.value = "";
  previewImg.removeAttribute("src");
  imagePreview.hidden = true;
  imageStatus.textContent = "未选择图片";
}

function shortClientError(message) {
  const text = String(message || "请求失败");
  if (text.includes("429") || text.includes("quota")) {
    return "API 配额已用完，或请求太频繁。请稍后再试，或检查 API key 的额度。";
  }
  return text.length > 500 ? text.slice(0, 500) + "..." : text;
}

function setLoading() {
  const selected = new Set(getSelectedModels());
  const mode = getAskMode();
  updateVisibleCards();
  statusEl.textContent = mode === "math" ? "数学推理中" : mode === "high" ? "高阶请求中" : "请求中";
  statusEl.classList.add("thinking-status");
  Object.keys(panels).forEach(function (key) {
    if (selected.has(key)) {
      panels[key].textContent = "思考中...";
      panels[key].className = "answer muted thinking";
      setState(key, "请求中", false);
    } else {
      panels[key].textContent = "未选择";
      panels[key].className = "answer muted";
      setState(key, "", false);
    }
  });
}

function renderOneResult(key, item) {
  if (item.ok) {
    panels[key].textContent = item.text || "(无文本)";
    panels[key].className = "answer";
    setState(key, "完成", false);
  } else {
    panels[key].textContent = shortClientError(item.error);
    panels[key].className = "answer error";
    setState(key, "失败", true);
  }
}

function renderResult(data) {
  const selected = new Set(data && data.models ? data.models : getSelectedModels());
  statusEl.textContent = "完成";
  statusEl.classList.remove("thinking-status");
  Object.keys(panels).forEach(function (key) {
    if (!selected.has(key)) {
      panels[key].textContent = "未选择";
      panels[key].className = "answer muted";
      setState(key, "", false);
      return;
    }
    const item = data && data.result && data.result[key];
    if (!item) {
      renderOneResult(key, { ok: false, error: "无返回" });
      return;
    }
    renderOneResult(key, item);
  });
}

async function readStreamResults(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = 0;
  const total = getSelectedModels().length;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventText of events) {
      const line = eventText.split("\n").find(function (item) { return item.startsWith("data: "); });
      if (!line) continue;
      let payload = null;
      try {
        payload = JSON.parse(line.slice(6));
      } catch (_error) {
        continue;
      }
      if (payload.type === "result") {
        completed += 1;
        receivedStreamKeys.add(payload.key);
        renderOneResult(payload.key, payload.item);
        statusEl.textContent = "已完成 " + completed + " / " + total;
      }
      if (payload.type === "done") {
        statusEl.textContent = "完成";
        statusEl.classList.remove("thinking-status");
      }
    }
  }
}

async function askAll() {
  const question = questionEl.value.trim();
  const mode = getAskMode();
  const models = getSelectedModels();
  if (!question) { alert("请先输入提示词"); questionEl.focus(); return; }
  if (!mode) { alert("请输入正确口令ASKXXX"); passcodeEl.focus(); return; }
  if (models.length === 0) { alert("请选择一个模型"); return; }
  if (question.length > MAX_QUESTION_CHARS) { alert("提示词不能超过 " + MAX_QUESTION_CHARS + " 字"); questionEl.focus(); return; }

  askBtn.disabled = true;
  receivedStreamKeys = new Set();
  setLoading();
  try {
    const resp = await fetch(API_BASE_URL + "/api/ask-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question,
        mode: mode,
        models: models,
        modelChoices: getModelChoices(),
        image: preparedImage ? { mime: preparedImage.mime, data: preparedImage.data } : null
      })
    });
    if (!resp.ok) {
      const data = await resp.json().catch(function () { return null; });
      throw new Error((data && data.error) || "请求失败");
    }
    if (resp.body) {
      await readStreamResults(resp);
    } else {
      const data = await resp.json();
      renderResult(data);
    }
  } catch (error) {
    statusEl.textContent = "失败";
    statusEl.classList.remove("thinking-status");
    const selected = new Set(models);
    Object.keys(panels).forEach(function (key) {
      if (!selected.has(key) || receivedStreamKeys.has(key)) {
        return;
      }
      panels[key].textContent = shortClientError(error && error.message ? error.message : String(error));
      panels[key].className = "answer error";
      setState(key, "失败", true);
    });
  } finally {
    askBtn.disabled = false;
  }
}

function clearAll() {
  questionEl.value = "";
  passcodeEl.value = "";
  statusEl.textContent = "";
  statusEl.classList.remove("thinking-status");
  removeImage();
  Object.keys(panels).forEach(function (key) {
    panels[key].textContent = placeholderText[key];
    panels[key].className = "answer muted";
    setState(key, "", false);
  });
  document.querySelector('input[name="mode"][value="normal"]').checked = true;
  updateModelSelects();
  updateVisibleCards();
  updateQuestionBox();
}

function exportTxt() {
  const content = [
    "一问三知 图片版问答记录", "",
    "【用户提示词】", questionEl.value.trim() || "(空)", "",
    "【图片】", preparedImage ? "已附加图片：" + formatSize(preparedImage.bytes) : "未附加图片", "",
    "【ChatGPT】", panels.gpt.innerText.trim() || "(空)", "",
    "【Grok】", panels.grok.innerText.trim() || "(空)", "",
    "【Gemini】", panels.gemini.innerText.trim() || "(空)"
  ].join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "yiwen-sanzhi-image-" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeMathText(value) {
  return String(value || "")
    .replaceAll("\\\\(", "\\(")
    .replaceAll("\\\\)", "\\)")
    .replaceAll("\\\\[", "\\[")
    .replaceAll("\\\\]", "\\]");
}

function inlineMarkdown(value) {
  return escapeHtml(normalizeMathText(value))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(value) {
  const lines = normalizeMathText(value).split("\n");
  const html = [];
  let inList = false;
  let inDisplayMath = false;
  let displayMathLines = [];
  lines.forEach(function (line) {
    const raw = line.trimEnd();
    const text = raw.trim();
    if (inDisplayMath) {
      displayMathLines.push(raw);
      if (text.includes("\\]")) {
        html.push('<div class="math-block">' + escapeHtml(displayMathLines.join("\n")) + "</div>");
        inDisplayMath = false;
        displayMathLines = [];
      }
      return;
    }
    if (!text) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      return;
    }
    if (text.startsWith("\\[") && !text.includes("\\]")) {
      if (inList) { html.push("</ul>"); inList = false; }
      inDisplayMath = true;
      displayMathLines = [raw];
      return;
    }
    if (text.startsWith("\\[") && text.includes("\\]")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push('<div class="math-block">' + escapeHtml(raw) + "</div>");
      return;
    }
    if (text.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push("<h3>" + inlineMarkdown(text.slice(4)) + "</h3>");
      return;
    }
    if (text.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push("<h2>" + inlineMarkdown(text.slice(3)) + "</h2>");
      return;
    }
    if (text === "---") {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push("<hr />");
      return;
    }
    if (/^[-*]\s+/.test(text)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push("<li>" + inlineMarkdown(text.replace(/^[-*]\s+/, "")) + "</li>");
      return;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    html.push("<p>" + inlineMarkdown(text) + "</p>");
  });
  if (inDisplayMath && displayMathLines.length) {
    html.push('<div class="math-block">' + escapeHtml(displayMathLines.join("\n")) + "</div>");
  }
  if (inList) {
    html.push("</ul>");
  }
  return html.join("\n");
}

function htmlSection(title, body) {
  return [
    '<section class="qa-section">',
    "<h1>" + escapeHtml(title) + "</h1>",
    markdownToHtml(body || "(空)"),
    "</section>"
  ].join("\n");
}

function exportHtml() {
  const question = questionEl.value.trim() || "(空)";
  const imageLine = preparedImage ? "已附加图片：" + formatSize(preparedImage.bytes) : "未附加图片";
  const doc = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>一问三知 数学排版记录</title>
  <style>
    body {
      margin: 0;
      padding: 36px 20px;
      color: #182235;
      background: #fbfaf7;
      font-family: "Noto Serif SC", "Songti SC", "SimSun", serif;
      line-height: 1.85;
    }
    main {
      max-width: 920px;
      margin: 0 auto;
      padding: 38px 44px;
      background: #fff;
      border: 1px solid #e8e1d7;
      box-shadow: 0 20px 60px rgba(35, 45, 70, 0.12);
    }
    h1, h2, h3 {
      color: #101a2d;
      line-height: 1.35;
    }
    h1 {
      font-size: 26px;
      border-bottom: 1px solid #e8e1d7;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      font-size: 21px;
      margin-top: 30px;
    }
    h3 {
      font-size: 18px;
      margin-top: 24px;
    }
    p, li {
      font-size: 17px;
    }
    code {
      padding: 2px 6px;
      border-radius: 6px;
      background: #f3efe8;
      color: #80533d;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 0.92em;
    }
    .meta {
      color: #667085;
      font-size: 14px;
      margin-bottom: 26px;
    }
    .qa-section {
      margin: 26px 0 34px;
    }
    hr {
      border: 0;
      border-top: 1px solid #e8e1d7;
      margin: 28px 0;
    }
    mjx-container[display="true"] {
      margin: 1.1em 0 !important;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .math-block {
      margin: 1.1em 0;
      text-align: center;
      white-space: pre-wrap;
    }
  </style>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['\\\\(', '\\\\)']],
        displayMath: [['\\\\[', '\\\\]']],
        processEscapes: true
      },
      chtml: { scale: 1.04 }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
  <script>
    window.addEventListener('load', function () {
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
      }
    });
  </script>
</head>
<body>
  <main>
    <h1>一问三知 数学排版记录</h1>
    <div class="meta">导出时间：${escapeHtml(new Date().toLocaleString())}<br />图片：${escapeHtml(imageLine)}</div>
    ${htmlSection("用户提示词", question)}
    ${htmlSection("ChatGPT", panels.gpt.innerText.trim())}
    ${htmlSection("Grok", panels.grok.innerText.trim())}
    ${htmlSection("Gemini", panels.gemini.innerText.trim())}
  </main>
</body>
</html>`;
  const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "yiwen-sanzhi-math-" + new Date().toISOString().slice(0, 10) + ".html";
  a.click();
  URL.revokeObjectURL(url);
}

questionEl.addEventListener("input", updateQuestionBox);
document.querySelectorAll('input[name="mode"]').forEach(function (input) {
  input.addEventListener("change", function () {
    updateModelSelects();
  });
});
if (providerModelSelect) {
  providerModelSelect.addEventListener("change", updateVisibleCards);
}
window.addEventListener("orientationchange", function () { setTimeout(autoGrowQuestion, 250); });
window.addEventListener("resize", autoGrowQuestion);
imageInput.addEventListener("change", handleImageChange);
if (removeImageBtn) {
  removeImageBtn.addEventListener("click", removeImage);
}
askBtn.addEventListener("click", askAll);
clearBtn.addEventListener("click", clearAll);
if (exportBtn) {
  exportBtn.addEventListener("click", exportTxt);
}
exportHtmlBtn.addEventListener("click", exportHtml);
updateModelSelects();
updateVisibleCards();
updateQuestionBox();
