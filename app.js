const askBtn = document.getElementById("askBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const questionEl = document.getElementById("question");
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

function setState(key, text, isError = false) {
  states[key].textContent = text;
  states[key].className = isError ? "error" : "";
}

function updateCount() {
  countEl.textContent = `${questionEl.value.length} / ${MAX_QUESTION_CHARS} 字`;
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
    questionEl.focus();
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
  statusEl.textContent = "";
  for (const key of Object.keys(panels)) {
    panels[key].textContent = key === "gpt"
      ? "提交问题后，这里会显示 ChatGPT 的纯文本回答。文字较多时可上下滚动查看。"
      : key === "gemini"
        ? "提交问题后，这里会显示 Gemini 的纯文本回答。文字较多时可上下滚动查看。"
        : "提交问题后，这里会显示 Grok 的纯文本回答。文字较多时可上下滚动查看。";
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
