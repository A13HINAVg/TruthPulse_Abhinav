from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import io
import random

app = FastAPI(title="TruthPulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-load OCR only when image endpoint is called
ocr_reader = None

def get_ocr_reader():
    global ocr_reader
    if ocr_reader is None:
        import easyocr
        ocr_reader = easyocr.Reader(['en'], gpu=False)
    return ocr_reader

FAKE_SIGNALS = [
    "breaking", "shocking", "unbelievable", "secret", "miracle", "hoax",
    "illuminati", "conspiracy", "coverup", "fraud", "scam", "exposed",
    "banned", "censored", "must share", "share before deleted", "urgent",
    "100%", "guaranteed", "cure", "proven", "scientists baffled",
    "big pharma", "deep state", "wake up", "sheeple", "truth revealed",
    "they don't want", "what they hide", "mainstream media",
]

REAL_SIGNALS = [
    "according to", "research shows", "study published", "reported by",
    "officials said", "data indicates", "evidence suggests", "sources confirm",
    "peer-reviewed", "cited", "verified", "official", "government",
    "university", "journal", "statistics", "survey",
]

def analyze_text(text):
    text_lower = text.lower()
    fake_score = sum(1 for w in FAKE_SIGNALS if w in text_lower)
    real_score = sum(1 for w in REAL_SIGNALS if w in text_lower)
    if text.count("!") > 3: fake_score += 2
    if sum(1 for c in text if c.isupper()) / max(len(text), 1) > 0.3: fake_score += 2
    if len(text.strip()) < 20:
        return {"prediction": "UNCERTAIN", "confidence": 50, "fake_signals": [], "real_signals": [], "detail": "Text too short to analyze."}
    fake_prob = max(0, min(100, (fake_score / (fake_score + real_score + 1)) * 100 + random.uniform(-5, 5)))
    found_fake = [w for w in FAKE_SIGNALS if w in text_lower]
    found_real = [w for w in REAL_SIGNALS if w in text_lower]
    if fake_prob >= 55: pred, conf = "FAKE", round(fake_prob)
    elif fake_prob <= 40: pred, conf = "REAL", round(100 - fake_prob)
    else: pred, conf = "UNCERTAIN", round(50 + abs(fake_prob - 50))
    return {"prediction": pred, "confidence": conf, "fake_signals": found_fake[:5], "real_signals": found_real[:5], "detail": f"Detected {len(found_fake)} suspicious and {len(found_real)} credibility signal(s)."}

def translate(text, language):
    if language == "en": return text
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="hi" if language == "hi" else "mr", target="en").translate(text) or text
    except: return text

@app.get("/")
def root(): return {"message": "TruthPulse API is running"}

@app.post("/predict-text")
async def predict_text(text: str = Form(...), language: str = Form(default="en")):
    if not text.strip(): raise HTTPException(status_code=400, detail="Text cannot be empty.")
    translated = translate(text, language)
    result = analyze_text(translated)
    result["original_language"] = language
    result["translated"] = translated if language != "en" else None
    return JSONResponse(result)

@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...), language: str = Form(default="en")):
    if not file.content_type.startswith("image/"): raise HTTPException(status_code=400, detail="Must be an image.")
    contents = await file.read()
    try:
        import numpy as np
        from PIL import Image
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        results = get_ocr_reader().readtext(np.array(img), detail=0)
        extracted_text = " ".join(results).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
    if not extracted_text:
        return JSONResponse({"prediction": "UNCERTAIN", "confidence": 0, "fake_signals": [], "real_signals": [], "extracted_text": "", "detail": "No text found in image.", "original_language": language, "translated": None})
    translated = translate(extracted_text, language)
    result = analyze_text(translated)
    result["extracted_text"] = extracted_text
    result["original_language"] = language
    result["translated"] = translated if language != "en" else None
    return JSONResponse(result)
