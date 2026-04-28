/* ── CONFIG ──────────────────────────────────────────── */
const API_BASE = "http://localhost:8000";

/* ── STATE ───────────────────────────────────────────── */
let selectedLang = "en";
let activeTab = "text";
let selectedFile = null;

/* ── DOM REFS ────────────────────────────────────────── */
const textInput     = document.getElementById("textInput");
const charCount     = document.getElementById("charCount");
const imageInput    = document.getElementById("imageInput");
const dropzone      = document.getElementById("dropzone");
const previewWrap   = document.getElementById("previewWrap");
const previewImg    = document.getElementById("previewImg");
const clearImgBtn   = document.getElementById("clearImg");
const analyseBtn    = document.getElementById("analyseBtn");
const btnText       = document.getElementById("btnText");
const btnSpinner    = document.getElementById("btnSpinner");
const resultSection = document.getElementById("resultSection");
const resultCard    = document.getElementById("resultCard");
const resetBtn      = document.getElementById("resetBtn");

/* ── LANGUAGE PILLS ──────────────────────────────────── */
document.querySelectorAll(".lang-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".lang-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    selectedLang = pill.dataset.lang;
  });
});

/* ── TABS ────────────────────────────────────────────── */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.tab;
    document.getElementById(`panel-${activeTab}`).classList.add("active");
  });
});

/* ── CHAR COUNT ──────────────────────────────────────── */
textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length.toLocaleString();
});

/* ── DRAG & DROP ─────────────────────────────────────── */
dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  dropzone.classList.add("drag-over");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) setImageFile(file);
});

imageInput.addEventListener("change", () => {
  if (imageInput.files[0]) setImageFile(imageInput.files[0]);
});

function setImageFile(file) {
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  dropzone.style.display = "none";
  previewWrap.style.display = "flex";
}

clearImgBtn.addEventListener("click", () => {
  selectedFile = null;
  imageInput.value = "";
  previewImg.src = "";
  previewWrap.style.display = "none";
  dropzone.style.display = "flex";
});

/* ── ANALYSE ─────────────────────────────────────────── */
analyseBtn.addEventListener("click", async () => {
  // Validate
  if (activeTab === "text" && !textInput.value.trim()) {
    showToast("Please enter some text to analyse.", "warn");
    return;
  }
  if (activeTab === "image" && !selectedFile) {
    showToast("Please select an image to analyse.", "warn");
    return;
  }

  setLoading(true);
  hideResult();

  try {
    let data;
    if (activeTab === "text") {
      data = await predictText(textInput.value.trim(), selectedLang);
    } else {
      data = await predictImage(selectedFile, selectedLang);
    }
    showResult(data);
  } catch (err) {
    showToast("Error connecting to backend. Make sure the server is running on port 8000.", "error");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

/* ── API CALLS ───────────────────────────────────────── */
async function predictText(text, language) {
  const form = new FormData();
  form.append("text", text);
  form.append("language", language);
  const res = await fetch(`${API_BASE}/predict-text`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function predictImage(file, language) {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language);
  const res = await fetch(`${API_BASE}/predict-image`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ── RENDER RESULT ───────────────────────────────────── */
function showResult(data) {
  const { prediction, confidence, detail, fake_signals, real_signals,
          extracted_text, translated, original_language } = data;

  // Badge
  const badge = document.getElementById("resultBadge");
  badge.textContent = prediction;
  badge.className = `result-badge badge-${prediction}`;

  // Confidence label
  document.getElementById("resultLabel").textContent = "Verdict";
  document.getElementById("resultConf").textContent = `Confidence: ${confidence}%`;

  // Detail
  document.getElementById("resultDetail").textContent = detail || "";

  // Confidence bar – maps fake probability
  let fillPct;
  if (prediction === "FAKE")      fillPct = confidence;
  else if (prediction === "REAL") fillPct = 100 - confidence;
  else                            fillPct = 50;
  document.getElementById("confBarFill").style.width = fillPct + "%";

  // Signals
  const signalsWrap = document.getElementById("signalsWrap");
  const fakeDiv = document.getElementById("fakeSignals");
  const realDiv = document.getElementById("realSignals");

  if ((fake_signals && fake_signals.length) || (real_signals && real_signals.length)) {
    signalsWrap.style.display = "flex";
    fakeDiv.innerHTML = fake_signals && fake_signals.length
      ? `<div class="signals-title" style="color:var(--fake)">⚠ Suspicious signals</div>` +
        fake_signals.map(s => `<span class="signal-tag">${s}</span>`).join("")
      : "";
    realDiv.innerHTML = real_signals && real_signals.length
      ? `<div class="signals-title" style="color:var(--real)">✓ Credibility signals</div>` +
        real_signals.map(s => `<span class="signal-tag">${s}</span>`).join("")
      : "";
  } else {
    signalsWrap.style.display = "none";
  }

  // Extracted text (image mode)
  const extractedWrap = document.getElementById("extractedWrap");
  if (extracted_text) {
    extractedWrap.style.display = "block";
    document.getElementById("extractedText").textContent = extracted_text;
  } else {
    extractedWrap.style.display = "none";
  }

  // Translation
  const translationWrap = document.getElementById("translationWrap");
  if (translated && original_language !== "en") {
    translationWrap.style.display = "block";
    document.getElementById("translatedText").textContent = translated;
  } else {
    translationWrap.style.display = "none";
  }

  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideResult() {
  resultSection.style.display = "none";
}

/* ── RESET ───────────────────────────────────────────── */
resetBtn.addEventListener("click", () => {
  hideResult();
  textInput.value = "";
  charCount.textContent = "0";
  clearImgBtn.click();
  window.scrollTo({ top: document.getElementById("detector").offsetTop - 80, behavior: "smooth" });
});

/* ── LOADING ─────────────────────────────────────────── */
function setLoading(on) {
  analyseBtn.disabled = on;
  btnText.style.display = on ? "none" : "inline";
  btnSpinner.style.display = on ? "inline-block" : "none";
}

/* ── TOAST ───────────────────────────────────────────── */
function showToast(msg, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;

  const colors = { warn: "#f5a623", error: "#ff4d6d", info: "#6c63ff" };
  Object.assign(t.style, {
    position: "fixed",
    bottom: "28px",
    right: "28px",
    background: "#1a1a24",
    border: `1px solid ${colors[type] || "#6c63ff"}`,
    color: "#e8e8f0",
    padding: "14px 20px",
    borderRadius: "12px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem",
    zIndex: "9999",
    maxWidth: "340px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    animation: "fadeUp .3s ease",
  });

  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
