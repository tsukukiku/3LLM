const askBtn = document.getElementById("askBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const questionEl = document.getElementById("question");
const statusEl = document.getElementById("status");

const panels = {
  gpt: document.getElementById("gpt"),
  gemini: document.getElementById("gemini"),
  grok: document.getElementById("grok")
};

const API_BASE_URL = location.hostname === "www.star-style-studio.net"
  ? "https://api.star-style-studio.net"
  : "";

const states = {
  gpt: document.getElementById("gptState"),
  gemini: document.getElementById("geminiState"),
  grok: document.getElementById("grokState")
};

function setState(key, text, isError = false) {
  states[key].textContent = text;
  states[key].className = isError ? "error" : "";
}

function setLoading() {
  statusEl.textContent = "请求中";
  for (const key of Object.keys(panels)) {
    panels[key].textContent = "思考中...";
    panels[key].className = "answer muted";
    setState(key, "请求中");
  }
}

function renderResult(data) {
  statusEl.textContent = "完成";
  for (const key of Object.keys(panels)) {
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
      panels[key].textContent = item.error || "请求失败";
      panels[key].className = "answer error";
      setState(key, "失败", true);
    }
  }
}

async function askAll() {
  const question = questionEl.value.trim();
  if (!question) {
    alert("请先输入问题");
    return;
  }

  askBtn.disabled = true;
  setLoading();

  try {
    const resp = await fetch(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
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
  statusEl.textContent = "待提问";
  for (const key of Object.keys(panels)) {
    panels[key].textContent = "等待提问...";
    panels[key].className = "answer muted";
    setState(key, "等待");
  }
}

function exportTxt() {
  const content = [
    "一问三知 API 四窗口导出",
    "",
    "【用户提问】",
    questionEl.value.trim() || "(空)",
    "",
    "【GPT】",
    panels.gpt.innerText.trim() || "(空)",
    "",
    "【Gemini】",
    panels.gemini.innerText.trim() || "(空)",
    "",
    "【Grok】",
    panels.grok.innerText.trim() || "(空)"
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `api-4window-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

askBtn.addEventListener("click", askAll);
clearBtn.addEventListener("click", clearAll);
exportBtn.addEventListener("click", exportTxt);
