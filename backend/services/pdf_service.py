"""
PDF Service — Handles notice PDF extraction and supporting document parsing.
Uses PyMuPDF for text extraction, pikepdf for encryption, pdfplumber for tables.
"""
import io
import re
import os
from datetime import datetime
from typing import Optional, Dict, Any
import fitz  # PyMuPDF
import pdfplumber
import pikepdf


def derive_pdf_password(pan: str, dob: str) -> str:
    """
    IT Portal encrypted PDFs use PAN+DOB as password.
    Format: PANXXXXX01011990 (PAN uppercase + DOB as DDMMYYYY)
    """
    pan = pan.upper().strip()
    # Handle DOB formats: DD/MM/YYYY or DD-MM-YYYY or DDMMYYYY
    dob_clean = dob.replace("/", "").replace("-", "").strip()
    return f"{pan}{dob_clean}"


def decrypt_pdf(file_path: str, pan: str, dob: str) -> Optional[bytes]:
    """Decrypt an IT portal encrypted PDF using PAN+DOB password."""
    password = derive_pdf_password(pan, dob)
    try:
        with pikepdf.open(file_path, password=password) as pdf:
            decrypted_buffer = io.BytesIO()
            pdf.save(decrypted_buffer)
            return decrypted_buffer.getvalue()
    except pikepdf.PasswordError:
        # Try alternate password formats
        alt_passwords = [
            pan.lower() + dob.replace("/", "").replace("-", ""),
            pan.upper() + dob.replace("/", "").replace("-", ""),
            pan + dob[:2] + dob[3:5] + dob[6:],  # DD/MM/YYYY → DDMMYYYY
        ]
        for pwd in alt_passwords:
            try:
                with pikepdf.open(file_path, password=pwd) as pdf:
                    decrypted_buffer = io.BytesIO()
                    pdf.save(decrypted_buffer)
                    return decrypted_buffer.getvalue()
            except pikepdf.PasswordError:
                continue
        return None
    except Exception as e:
        print(f"PDF decryption error: {e}")
        return None


def extract_text_from_pdf(file_path: str, pdf_bytes: Optional[bytes] = None) -> str:
    """Extract full text from a PDF file or bytes."""
    try:
        if pdf_bytes:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        else:
            doc = fitz.open(file_path)

        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts)
    except Exception as e:
        print(f"PDF text extraction error: {e}")
        return ""


def extract_tables_from_pdf(file_path: str, pdf_bytes: Optional[bytes] = None) -> list:
    """Extract tables from PDF using pdfplumber."""
    tables = []
    try:
        if pdf_bytes:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
        else:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
    except Exception as e:
        print(f"Table extraction error: {e}")
    return tables


def parse_notice_fields_heuristic(text: str) -> Dict[str, Any]:
    """
    Heuristic extraction of common fields from notice text.
    This is a fallback/supplement to Mistral AI extraction.
    """
    fields = {
        "section": None,
        "assessment_year": None,
        "mismatch_amount": None,
        "deadline": None,
        "ao_name": None,
        "ao_ward": None,
        "portal_reference": None,
        "pan": None,
    }

    # Section extraction
    section_patterns = [
        r"[Ss]ection\s*(\d+\([a-zA-Z0-9]+\))",
        r"u/s\s*(\d+\([a-zA-Z0-9]+\))",
        r"under\s+[Ss]ection\s+(\d+[A-Z]?(?:\(\d+\))?)",
    ]
    for pattern in section_patterns:
        match = re.search(pattern, text)
        if match:
            fields["section"] = match.group(1)
            break

    # Assessment Year
    ay_patterns = [
        r"[Aa]ssessment\s+[Yy]ear\s*[:\-]?\s*(\d{4}[\-\/]\d{2,4})",
        r"A\.?Y\.?\s*[:\-]?\s*(\d{4}[\-\/]\d{2,4})",
    ]
    for pattern in ay_patterns:
        match = re.search(pattern, text)
        if match:
            fields["assessment_year"] = match.group(1)
            break

    # Amount (look for demand/mismatch amounts in INR)
    amount_patterns = [
        r"(?:demand|outstanding|mismatch|disputed)[^\d]*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.\d{2})?).*?(?:demand|tax|payable)",
        r"(?:tax\s+payable|amount\s+payable)[^\d]*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d{2})?)",
    ]
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(",", "")
            try:
                fields["mismatch_amount"] = float(amount_str)
                break
            except ValueError:
                continue

    # PAN
    pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
    if pan_match:
        fields["pan"] = pan_match.group(1)

    # Response deadline
    deadline_patterns = [
        r"(?:respond|reply|due)\s+(?:by|before)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
        r"(?:last\s+date|deadline)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
        r"on\s+or\s+before\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
    ]
    for pattern in deadline_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields["deadline"] = match.group(1)
            break

    # Portal reference / DIN
    din_match = re.search(r"(?:DIN|Reference)[:\s]+([A-Z0-9\/\-]{8,30})", text)
    if din_match:
        fields["portal_reference"] = din_match.group(1)

    return fields


def parse_form_26as(file_path: str) -> Dict[str, Any]:
    """
    Parse Form 26AS (TDS certificate) to extract TDS credits.
    Returns structured data with Part A (TDS on salary) and Part A1 (other TDS).
    """
    text = extract_text_from_pdf(file_path)
    tables = extract_tables_from_pdf(file_path)

    result = {
        "pan": None,
        "assessment_year": None,
        "tds_entries": [],
        "tcs_entries": [],
        "total_tds": 0.0,
        "raw_text": text[:2000],  # First 2000 chars for AI
    }

    # Extract TDS entries from tables
    for table in tables:
        if not table:
            continue
        for row in table[1:]:  # Skip header
            if row and len(row) >= 4:
                entry = {
                    "deductor_name": str(row[0]).strip() if row[0] else "",
                    "tan": str(row[1]).strip() if row[1] else "",
                    "amount_paid": 0.0,
                    "tds_deposited": 0.0,
                }
                # Try to parse amounts
                for i, val in enumerate(row):
                    if val and re.search(r"[\d,]+\.?\d*", str(val)):
                        amount_str = re.sub(r"[^\d.]", "", str(val))
                        if amount_str:
                            try:
                                amount = float(amount_str)
                                if i >= 2:
                                    entry["amount_paid"] = amount
                                if i >= 3:
                                    entry["tds_deposited"] = amount
                            except ValueError:
                                pass
                if entry["deductor_name"] or entry["tds_deposited"] > 0:
                    result["tds_entries"].append(entry)
                    result["total_tds"] += entry["tds_deposited"]

    # PAN from text
    pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
    if pan_match:
        result["pan"] = pan_match.group(1)

    return result


def parse_itr_acknowledgement(file_path: str) -> Dict[str, Any]:
    """Parse ITR acknowledgement PDF to extract key figures."""
    text = extract_text_from_pdf(file_path)

    result = {
        "pan": None,
        "assessment_year": None,
        "gross_total_income": 0.0,
        "total_income": 0.0,
        "tax_payable": 0.0,
        "tds_claimed": 0.0,
        "refund_claimed": 0.0,
        "schedules": {},
        "raw_text": text[:3000],
    }

    # Extract common ITR fields
    pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
    if pan_match:
        result["pan"] = pan_match.group(1)

    ay_match = re.search(r"A\.?Y\.?\s*[:\-]?\s*(\d{4}[\-\/]\d{2,4})", text)
    if ay_match:
        result["assessment_year"] = ay_match.group(1)

    # Income amounts
    income_patterns = {
        "gross_total_income": r"[Gg]ross\s+[Tt]otal\s+[Ii]ncome[:\s]+([\d,]+)",
        "total_income": r"[Tt]otal\s+[Ii]ncome[:\s]+([\d,]+)",
        "tax_payable": r"[Tt]ax\s+[Pp]ayable[:\s]+([\d,]+)",
        "tds_claimed": r"[Tt][Dd][Ss]\s+[Cc]redited[:\s]+([\d,]+)",
        "refund_claimed": r"[Rr]efund[:\s]+([\d,]+)",
    }

    for field, pattern in income_patterns.items():
        match = re.search(pattern, text)
        if match:
            amount_str = match.group(1).replace(",", "")
            try:
                result[field] = float(amount_str)
            except ValueError:
                pass

    return result
