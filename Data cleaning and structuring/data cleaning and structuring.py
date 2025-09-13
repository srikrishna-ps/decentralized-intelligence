import re, json, pandas as pd

# ----------------- TEXT CLEANING ------------------
def clean_text_block(text_list):
    if isinstance(text_list, list):
        raw_text = "\n".join(text_list)
    else:
        raw_text = text_list
    cleaned_text = re.sub(r'\s+', ' ', raw_text)  # Normalize whitespace
    cleaned_text = re.sub(r'[^a-zA-Z0-9:.,/%\s-]', '', cleaned_text)  # Remove garbage
    return cleaned_text.strip()

# ----------------- FIELD EXTRACTION ------------------
def extract_fields(text):
    return {
        "patient_name": re.search(r'(?i)(?:name|patient name)[:\s]*([A-Za-z\s]+)', text),
        "age": re.search(r'(?i)age[:\s]*(\d{1,3})', text),
        "gender": re.search(r'(?i)gender[:\s]*(male|female)', text),
        "diagnosis": re.search(r'(?i)diagnosis[:\s]*([A-Za-z\s,]+)', text)
    }

# ----------------- LABELING ------------------
def assign_label(text):
    text_lower = text.lower()
    if "blood report" in text_lower or "haemoglobin" in text_lower:
        return "Blood Report"
    elif "discharge summary" in text_lower:
        return "Discharge Summary"
    elif "prescription" in text_lower or "rx" in text_lower:
        return "Prescription"
    elif "scan report" in text_lower or "radiology" in text_lower:
        return "Scan Report"
    else:
        return "Unknown"

# ----------------- TABLE CLEANING ------------------
def clean_tables(table_dicts):
    cleaned_tables = []
    for table in table_dicts:
        try:
            df = pd.DataFrame.from_dict(table)
            df.columns = df.iloc[0]  # First row as header
            df = df.drop(index=0).reset_index(drop=True)
            df = df.dropna(axis=0, how='all')  # Drop empty rows
            df = df.dropna(axis=1, how='all')  # Drop empty columns
            cleaned_tables.append(df)
        except Exception as e:
            continue
    return cleaned_tables

# ----------------- COMBINED PROCESS FUNCTION ------------------
def process_extracted_output(file_name, extracted_output, output_path="cleaned_output.json"):
    text = extracted_output.get("text", "")
    tables = extracted_output.get("tables", [])

    text_clean = clean_text_block(text)
    extracted_fields = extract_fields(text_clean)
    cleaned_tables = clean_tables(tables)
    label = assign_label(text_clean)

    structured_output = {
        "file_name": file_name,
        "label": label,
        "text_clean": text_clean,
        "extracted_fields": {
            k: (v.group(1).strip() if v else None)
            for k, v in extracted_fields.items()
        },
        "tables_cleaned": [df.to_dict(orient="records") for df in cleaned_tables]
    }

    # Save to file
    with open(output_path, "w") as f:
        json.dump(structured_output, f, indent=2)

    return structured_output

# ----------------- RUN THE PROCESS AND SHOW OUTPUT ------------------

# Run this only after `extracted_output` is defined in previous cell
# (e.g. from your auto_extract() call)

file_name = file_path  # from uploaded file
structured_output = process_extracted_output(file_name, extracted_output)

# Output preview
print("\n✅ Final Structured Output:")
print(json.dumps(structured_output, indent=2))

