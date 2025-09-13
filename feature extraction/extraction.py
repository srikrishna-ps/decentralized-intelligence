import os, mimetypes, tempfile, json
import cv2, numpy as np
import pytesseract, camelot, pdfplumber
from pdf2image import convert_from_path
from PIL import Image
from doctr.models import ocr_predictor
from doctr.io import DocumentFile
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import torch
from google.colab import files

# Upload
uploaded = files.upload()
file_path = list(uploaded.keys())[0]

# Detect if scanned
def is_scanned_pdf(filepath):
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                if page.extract_text():
                    return False
        return True
    except:
        return True

# Extract from digital PDFs
def extract_digital_pdf(filepath):
    output = {"text": [], "tables": []}
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    output["text"].append(text)
        tables = camelot.read_pdf(filepath, pages='all')
        for table in tables:
            output["tables"].append(table.df.to_dict())
    except Exception as e:
        output["error"] = f"Digital PDF parsing failed: {str(e)}"
    return output

# DocTR
def extract_with_doctr(filepath):
    try:
        model = ocr_predictor(pretrained=True)
        if filepath.lower().endswith(".pdf"):
            images = convert_from_path(filepath)
        else:
            images = [Image.open(filepath).convert("RGB")]
        temp_dir = tempfile.mkdtemp()
        image_paths = []
        for idx, img in enumerate(images):
            img_path = os.path.join(temp_dir, f"page_{idx}.png")
            img.save(img_path)
            image_paths.append(img_path)
        doc = DocumentFile.from_images(image_paths)
        result = model(doc)
        return result.export()
    except Exception as e:
        return {"error": f"DocTR failed: {str(e)}"}

# Tesseract
def extract_with_tesseract(filepath):
    try:
        img = cv2.imread(filepath)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        denoised = cv2.fastNlMeansDenoising(thresh, h=30)
        text = pytesseract.image_to_string(denoised)
        return {"text": text}
    except Exception as e:
        return {"error": f"Tesseract failed: {str(e)}"}

# TrOCR
def extract_with_trocr(filepath):
    try:
        processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
        model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")
        image = Image.open(filepath).convert("RGB")
        pixel_values = processor(images=image, return_tensors="pt").pixel_values
        generated_ids = model.generate(pixel_values)
        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return {"text": generated_text}
    except Exception as e:
        return {"error": f"TrOCR failed: {str(e)}"}

# Tesseract validation logic
def is_valid_text(text):
    if not text or len(text.strip()) < 10:
        return False
    ratio = sum(c.isalpha() for c in text) / (len(text) + 1)
    return ratio > 0.4

# Master logic
def auto_extract(file_path):
    file_type, _ = mimetypes.guess_type(file_path)

    if file_type == "application/pdf":
        if is_scanned_pdf(file_path):
            print("📄 Scanned PDF → Trying DocTR")
            doctr_result = extract_with_doctr(file_path)
            if doctr_result.get("error") or not doctr_result.get("pages"):
                print("⚠️ DocTR failed → Tesseract fallback")
                tess_result = extract_with_tesseract(file_path)
                if not is_valid_text(tess_result.get("text", "")):
                    print("⚠️ Tesseract invalid → TrOCR fallback")
                    trocr_result = extract_with_trocr(file_path)
                    return trocr_result
                return tess_result
            return doctr_result
        else:
            print("📄 Digital PDF → Using pdfplumber + camelot")
            return extract_digital_pdf(file_path)

    elif file_type and file_type.startswith("image"):
        print("🖼 Image → Trying DocTR")
        doctr_result = extract_with_doctr(file_path)
        blocks = doctr_result.get("pages", [{}])[0].get("blocks", []) if "pages" in doctr_result else []
        if doctr_result.get("error") or len(blocks) == 0:
            print("⚠️ DocTR gave no result → Trying Tesseract")
            tess_result = extract_with_tesseract(file_path)
            if not is_valid_text(tess_result.get("text", "")):
                print("⚠️ Tesseract bad → TrOCR fallback")
                trocr_result = extract_with_trocr(file_path)
                return trocr_result
            return tess_result
        return doctr_result

    else:
        return {"error": "Unsupported or unknown file type"}

# RUN
print("\n⏳ Processing file:", file_path)
extracted_output = auto_extract(file_path)
print("\n✅ Extraction Result:")
print(json.dumps(extracted_output, indent=2))

# OPTIONAL RUN
user_input = input("\n🧠 Do you want to run TrOCR anyway for comparison? (yes/no): ").strip().lower()
if user_input in ['yes', 'y']:
    print("\n🚀 Running TrOCR manually...")
    trocr_result = extract_with_trocr(file_path)
    print("\n📝 TrOCR Output:")
    print(json.dumps(trocr_result, indent=2))
