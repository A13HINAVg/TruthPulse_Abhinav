# TruthPulse – Fake News Detection Website

## Project Structure
```
truthpulse/
├── backend/
│   ├── app.py              # FastAPI application
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## Features
- ✅ Text fake news detection
- ✅ Image fake news detection (OCR via pytesseract)
- ✅ Multilingual: English, Hindi, Marathi (auto-translated via googletrans)
- ✅ Confidence score + signal breakdown
- ✅ Dark-themed, responsive UI

## Prerequisites
- Python 3.9+
- Tesseract OCR installed on your system

### Install Tesseract
- **Ubuntu/Debian:** `sudo apt install tesseract-ocr`
- **macOS:**         `brew install tesseract`
- **Windows:**       Download from https://github.com/tesseract-ocr/tesseract/releases

## Setup & Run

### 1. Backend
```bash
cd truthpulse/backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 2. Frontend
Open `truthpulse/frontend/index.html` in your browser.

Or serve it with Python:
```bash
cd truthpulse/frontend
python -m http.server 3000
# Open: http://localhost:3000
```

## API Endpoints

### POST /predict-text
```
Form data:
  text     : string (required)
  language : "en" | "hi" | "mr" (default: "en")
```

### POST /predict-image
```
Form data:
  file     : image file (required)
  language : "en" | "hi" | "mr" (default: "en")
```

### Response format
```json
{
  "prediction": "FAKE | REAL | UNCERTAIN",
  "confidence": 78,
  "detail": "Detected 3 suspicious pattern(s)...",
  "fake_signals": ["shocking", "secret"],
  "real_signals": ["according to"],
  "extracted_text": "...",   // image only
  "translated": "...",       // non-English only
  "original_language": "hi"
}
```
