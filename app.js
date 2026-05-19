const askBtn = document.getElementById("askBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const accessCodeEl = document.getElementById("accessCode");
const questionEl = document.getElementById("question");
const questionMeta = document.getElementById("questionMeta");

const panels = {
  gpt: document.getElementById("gpt"),
  gemini: document.getElementById("gemini"),
  grok: document.getElementById("grok")
};

const APP_VERSION = "20260520-access-code";
const API_BASE_URL = "https://api.star-style-studio.net";
const MAX_QUESTION_CHARS = 99;

const providerUrls = {
  gpt: "https://chatgpt.com/",
  gemini: "https://gemini.google.com/",
  grok: "https://grok.com/"
};

const providerNames = {
  gpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok"
};

let lastAnswers = {
  gpt: "",
  gemini: "",
  grok: ""
};

function getMode(key) {
  return document.querySelector(`input[name="mode-${key}"]:checked`)?.value || "api";
}

function getProviderModes() {
  return {
    gpt: getMode("gpt"),
    gemini: getMode("gemini"),
    grok: getMode("grok")
  };
}

function updateQuestionMeta() {
  const count = questionEl.value.trim().length;
  questionMeta.textContent = `${count} / ${MAX_QUESTION_CHARS} 字`;
  questionMeta.className = count > MAX_QUESTION_CHARS ? "meta error" : "meta";
}

function bindCopyButton(el) {
  el.querySelector("[data-copy-question]").addEventListener("click", async () => {
    const question = questionEl.value.trim();
    if (!question) {
      alert("请先输入用户提问");
      return;
    }
    await navigator.clipboard.writeText(question);
  });
}

function renderManualMode(el, key) {
  lastAnswers[key] = "网页版模式：请在官方网页手动提问。";
  el.className = "output manual-fallback";
  el.innerHTML = `
    <div>${providerNames[key]} 当前选择：网页版。</div>
    <div class="muted">复制用户提问后，在官方网页粘贴发送。</div>
    <div class="manual-actions">
      <button type="button" data-copy-question>复制用户提问</button>
      <a class="provider-link" href="${providerUrls[key]}" target="_blank" rel="noreferrer">打开 ${providerNames[key]}</a>
    </div>
  `;
  bindCopyButton(el);
}

function renderErrorOrManualFallback(el, key, error) {
  if (!error.includes("未配置")) {
    el.textContent = error;
    el.className = "output error";
    lastAnswers[key] = error;
    return;
  }

  el.className = "output manual-fallback";
  el.innerHTML = `
    <div>${providerNames[key]} API key 未配置。</div>
    <div class="muted">可以切换到网页版，或先复制用户提问去官方网页手动提问。</div>
    <div class="manual-actions">
      <button type="button" data-copy-question>复制用户提问</button>
      <a class="provider-link" href="${providerUrls[key]}" target="_blank" rel="noreferrer">打开 ${providerNames[key]}</a>
    </div>
  `;
  lastAnswers[key] = `${providerNames[key]} API key 未配置。`;
  bindCopyButton(el);
}

function setLoading() {
  const modes = getProviderModes();
  for (const key of ["gpt", "gemini", "grok"]) {
    if (modes[key] === "api") {
      panels[key].textContent = "思考中...";
      panels[key].className = "output muted";
    } else {
      renderManualMode(panels[key], key);
    }
  }
}

function fillResult(data) {
  for (const key of ["gpt", "gemini", "grok"]) {
    if (getMode(key) === "web") {
      renderManualMode(panels[key], key);
      continue;
    }

    const item = data?.result?.[key];
    const el = panels[key];
    if (!item) {
      el.textContent = "无返回";
      el.className = "output error";
      lastAnswers[key] = "无返回";
      continue;
    }

    if (item.ok) {
      el.textContent = item.text;
      el.className = "output";
      lastAnswers[key] = item.text;
    } else {
      renderErrorOrManualFallback(el, key, item.error || "请求失败");
    }
  }
}

function getPanelText(key) {
  return panels[key].innerText.trim() || lastAnswers[key] || "(无内容)";
}

function exportTxt() {
  const question = questionEl.value.trim();
  const content = [
    "一问三知导出",
    "",
    "【用户提问】",
    question || "(空)",
    "",
    "【GPT】",
    getPanelText("gpt"),
    "",
    "【Gemini】",
    getPanelText("gemini"),
    "",
    "【Grok】",
    getPanelText("grok")
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yuwen-sanzhi-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

askBtn.addEventListener("click", async () => {
  const accessCode = accessCodeEl.value.trim();
  const question = questionEl.value.trim();
  if (!accessCode) {
    alert("请先输入口令");
    return;
  }
  if (!question) {
    alert("请先输入用户提问");
    return;
  }
  if (question.length > MAX_QUESTION_CHARS) {
    alert("用户提问必须少于 100 字");
    return;
  }

  askBtn.disabled = true;
  setLoading();
  lastAnswers = { gpt: "", gemini: "", grok: "" };

  const providers = getProviderModes();
  const hasApiProvider = Object.values(providers).includes("api");
  if (!hasApiProvider) {
    askBtn.disabled = false;
    return;
  }

  try {
    const resp = await fetch(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, providers, accessCode })
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error || "请求失败");
    }
    fillResult(data);
  } catch (err) {
    const msg = err?.message || String(err);
    Object.values(panels).forEach((el) => {
      el.textContent = msg;
      el.className = "output error";
    });
  } finally {
    askBtn.disabled = false;
  }
});

clearBtn.addEventListener("click", () => {
  questionEl.value = "";
  lastAnswers = { gpt: "", gemini: "", grok: "" };
  Object.values(panels).forEach((el) => {
    el.textContent = "等待提问...";
    el.className = "output muted";
  });
  updateQuestionMeta();
});

questionEl.addEventListener("input", updateQuestionMeta);
exportBtn.addEventListener("click", exportTxt);

document.querySelectorAll(".mode-row input").forEach((input) => {
  input.addEventListener("change", () => {
    const key = input.name.replace("mode-", "");
    if (getMode(key) === "web") {
      renderManualMode(panels[key], key);
    } else {
      panels[key].textContent = "等待提问...";
      panels[key].className = "output muted";
    }
  });
});

updateQuestionMeta();
