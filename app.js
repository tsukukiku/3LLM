const askBtn = document.getElementById("askBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const questionEl = document.getElementById("question");
const passcodeEl = document.getElementById("passcode");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");

const panels = {
  gpt: document.getElementById("gpt"),
  gemini: document.getElementById("gemini"),
  grok: document.getElementById("grok")
};

const states = {
  gpt: document.getElementById("gptState"),
  gemini: document.getElementById("geminiState"),
  grok: document.getElementById("grokState")
};

const API_BASE_URL = ["star-style-studio.net", "www.star-style-studio.net"].includes(location.hostname)
  ? "https://api.star-style-studio.net"
  : "";
const MAX_QUESTION_CHARS = 200;
const placeholderText = {
  gpt: "这里会显示 ChatGPT 的纯文本回答",
  gemini: "这里会显示 Gemini 的纯文本回答",
  grok: "这里会显示 Grok 的纯文本回答"
};

function getAskMode() {
  const code = passcodeEl.value.trim();
  if (code === "ASK3") {
    return "normal";
  }
  if (code === "ASK5.3") {
    return "high";
  }
  return "";
}

function getSelectedModels() {
  return [...document.querySelectorAll('input[name="model"]:checked')].map((item) => item.value);
}

function setState(key, text, isError = false) {
  states[key].textContent = text;
  states[key].className = isError ? "error" : "";
}

function shortClientError(message) {
  const text = String(message || "请求失败");
  if (text.includes("429") || text.includes("配额") || text.includes("quota")) {
    return "API 配额已用完，或请求太频繁。请稍后再试，或检查该 API key 的额度。";
  }
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

function updateCount() {
  countEl.textContent = `${questionEl.value.length} / ${MAX_QUESTION_CHARS} 字`;
}

function setLoading() {
  const selected = new Set(getSelectedModels());
  statusEl.textContent = getAskMode() === "high" ? "高阶请求中" : "请求中";
  for (const key of Object.keys(panels)) {
    if (selected.has(key)) {
      panels[key].textContent = "思考中...";
      panels[key].className = "answer muted";
      setState(key, "请求中");
    } else {
      panels[key].textContent = "未选择";
      panels[key].className = "answer muted";
      setState(key, "");
    }
  }
}

function renderResult(data) {
  const selected = new Set(data?.models || getSelectedModels());
  statusEl.textContent = "完成";
  for (const key of Object.keys(panels)) {
    if (!selected.has(key)) {
      panels[key].textContent = "未选择";
      panels[key].className = "answer muted";
      setState(key, "");
      continue;
    }
    const item = data?.result?.[key];
    if (!item) {
      panels[key].textContent = "无返回";
      panels[key].className = "answer error";
      setState(key, "无返回", true);
      continue;
    }

    if (item.ok) {
      panels[key].textContent = item.text || "(无文本)";
      panels[key].className = "answer";
      setState(key, "完成");
    } else {
      panels[key].textContent = shortClientError(item.error);
      panels[key].className = "answer error";
      setState(key, "失败", true);
    }
  }
}

async function askAll() {
  const question = questionEl.value.trim();
  const mode = getAskMode();
  const models = getSelectedModels();
  if (!question) {
    alert("请先输入问题");
    questionEl.focus();
    return;
  }
  if (!mode) {
    alert("请输入正确口令：ASK3 或 ASK5.3");
    passcodeEl.focus();
    return;
  }
  if (models.length === 0) {
    alert("请至少选择一个模型");
    return;
  }
  if (question.length > MAX_QUESTION_CHARS) {
    alert(`提问文字不能超过 ${MAX_QUESTION_CHARS} 字`);
    questionEl.focus();
    return;
  }

  askBtn.disabled = true;
  setLoading();

  try {
    const resp = await fetch(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, mode, models })
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error || "请求失败");
    }
    renderResult(data);
  } catch (error) {
    statusEl.textContent = "失败";
    for (const key of Object.keys(panels)) {
      panels[key].textContent = error?.message || String(error);
      panels[key].className = "answer error";
      setState(key, "失败", true);
    }
  } finally {
    askBtn.disabled = false;
  }
}

function clearAll() {
  questionEl.value = "";
  passcodeEl.value = "";
  statusEl.textContent = "";
  for (const key of Object.keys(panels)) {
    panels[key].textContent = placeholderText[key];
    panels[key].className = "answer muted";
    setState(key, "");
  }
  updateCount();
}

function exportTxt() {
  const content = [
    "一问三知问答汇总",
    "",
    "【用户提问】",
    questionEl.value.trim() || "(空)",
    "",
    "【ChatGPT】",
    panels.gpt.innerText.trim() || "(空)",
    "",
    "【Grok】",
    panels.grok.innerText.trim() || "(空)",
    "",
    "【Gemini】",
    panels.gemini.innerText.trim() || "(空)"
  ].join("\n");

  const blob = new Blob([`\uFEFF${content}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yiwen-sanzhi-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

questionEl.addEventListener("input", updateCount);
askBtn.addEventListener("click", askAll);
clearBtn.addEventListener("click", clearAll);
exportBtn.addEventListener("click", exportTxt);
updateCount();
