*trail-2*   **Smart Medical Report Extraction Pipeline
(PDFs / Images from Doctors, Labs, Patients)**

🗂️** Step 1: File Upload**
Files can be uploaded from:

👩‍⚕️ Doctor portal

🧪 Lab/Diagnostics portal

👨‍💻 Patient dashboard

Supported formats:

✅ PDF (digital or scanned)

✅ Image (JPEG/PNG of reports or prescriptions)

🔍 **Step 2: File Type Detection
Uses mimetypes to classify**:

📄 PDF → Check if it's scanned (image-based) or digital (text-based)

🖼️ Image → Go to OCR directly

🤖 **Step 3: Intelligent Routing Logic**
File Type	Condition	Tool Used
PDF	Digital (contains selectable text)	pdfplumber + camelot
PDF	Scanned (no embedded text)	Try DocTR, fallback to Tesseract, fallback to TrOCR
Image	Typed text / printed lab report	Try DocTR, fallback to Tesseract
Image	Messy handwritten (doctor note)	If Tesseract output is invalid → ✅ use TrOCR
Any Format	❓ Force user override (optional)	Option to run TrOCR manually

✅ **Step 4: OCR Engine Execution
Digital PDF:**

pdfplumber: Extracts free-text

camelot: Extracts tabular lab values

DocTR:

Transformer-based model for clean scanned documents

Extracts block-level and line-level text

Tesseract:

Lightweight OCR engine for printed text

Preprocessing: grayscale → denoise → threshold

TrOCR:

DL-based model trained on handwriting

Used when:

Tesseract output is too short or garbled

User manually triggers it

🧪 **Step 5: Validation & Fallback
If Tesseract output:**

<10 characters or

Low ratio of alphabetic characters
→ considered invalid → fallback to TrOCR

💬 Step 6: Manual Override
After auto-processing, user is asked:

“Do you want to force-run TrOCR anyway?”

✅ Yes → TrOCR output is displayed

❌ No → Skip and finish

🧾 **Final Output**
Displayed as prettified JSON:



   ┌────────────────────────┐
                   │      Upload File       │
                   └──────────┬─────────────┘
                              │
                 ┌────────────▼────────────┐
                 │  Detect File Type (MIME)│
                 └──────┬─────────┬────────┘
                        │         │
                  Is PDF?     Is Image?
                        │         │
             ┌──────────▼──┐ ┌────▼─────────────┐
             │Check if PDF │ │Use DocTR         │
             │is Scanned   │ │(Image OCR)       │
             └─────┬───────┘ └─────┬────────────┘
                   │               │
┌──────────────────▼──┐    ┌───────▼─────────────┐
│ If Digital (text)   │    │If DocTR fails or    │
│ → Use pdfplumber +  │    │blocks are empty     │
│   camelot           │    └────────┬────────────┘
└─────────────────────┘             │
                               Use Tesseract
                                     │
                          ┌──────────▼────────────┐
                          │ Check if output valid │
                          └──────────┬────────────┘
                                     │
                       ┌─────────────▼──────────────┐
                       │ If invalid → Use TrOCR     │
                       └────────────────────────────┘

                                    ▼
                     ┌─────────────────────────────┐
                     │ Display Extracted Output     │
                     └─────────────────────────────┘
                                    │
                   ┌────────────────▼────────────────┐
                   │ Ask User: Run TrOCR manually?    │
                   └──────────────┬───────────────────┘
                                  │
                       ┌──────────▼───────────┐
                       │ If yes → Run TrOCR    │
                       └──────────────────────┘