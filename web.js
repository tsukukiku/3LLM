const questionEl = document.getElementById("question");
const copyBtn = document.getElementById("copyBtn");
const openAllBtn = document.getElementById("openAllBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

const providerUrls = [
  "https://chatgpt.com/",
  "https://gemini.google.com/",
  "https://grok.com/"
];

async function copyQuestion() {
  const question = questionEl.value.trim();
  if (!question) {
    alert("请先输入问题");
    return false;
  }

  await navigator.clipboard.writeText(question);
  statusEl.textContent = "问题已复制，可以粘贴到三家官方网页。";
  return true;
}

copyBtn.addEventListener("click", copyQuestion);

openAllBtn.addEventListener("click", async () => {
  const copied = await copyQuestion();
  if (!copied) return;

  for (const url of providerUrls) {
    window.open(url, "_blank", "noreferrer");
  }
});

clearBtn.addEventListener("click", () => {
  questionEl.value = "";
  statusEl.textContent = "这个版本不调用 API，也不自动读取网页回答。";
});
