const askBtn = document.getElementById("askBtn");
const clearBtn = document.getElementById("clearBtn");
const questionEl = document.getElementById("question");

const panels = {
  gpt: document.getElementById("gpt"),
  gemini: document.getElementById("gemini"),
  grok: document.getElementById("grok")
};
const API_BASE_URL = "https://api.star-style-studio.net";

function setLoading() {
  Object.values(panels).forEach((el) => {
    el.textContent = "思考中...";
    el.className = "output muted";
  });
}

function fillResult(data) {
  for (const key of ["gpt", "gemini", "grok"]) {
    const item = data?.result?.[key];
    const el = panels[key];
    if (!item) {
      el.textContent = "无返回";
      el.className = "output error";
      continue;
    }

    if (item.ok) {
      el.textContent = item.text;
      el.className = "output";
    } else {
      el.textContent = item.error || "请求失败";
      el.className = "output error";
    }
  }
}

askBtn.addEventListener("click", async () => {
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
  Object.values(panels).forEach((el) => {
    el.textContent = "等待提问...";
    el.className = "output muted";
  });
});
