import json
import os
import logging
from typing import Dict, Any

log = logging.getLogger("gemini")

def _get_api_key() -> str:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

def _guess_mime(file_bytes: bytes, filename: str = None) -> str:
    if file_bytes[:4] == b"%PDF":
        return "application/pdf"
    if file_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if file_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return "image/jpeg"

def extract_cnic_details(image_file) -> Dict[str, Any]:
    """
    Extracts fields from CNIC using Gemini (google.genai SDK).
    """
    api_key = _get_api_key()
    if not api_key:
        log.error("GEMINI_API_KEY not set")
        return {}

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        log.error("google.genai import failed")
        return {}

    file_bytes = image_file.read()
    mime_type = _guess_mime(file_bytes, getattr(image_file, 'name', None))
    
    client = genai.Client(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    prompt = """
    Extract the following from this Pakistani Identification Card (CNIC, NICOP, or POC) image into strict JSON:
    {
      "full_name": "...",
      "father_husband_name": "...",
      "cnic_number": "...",
      "date_of_issue": "DD.MM.YYYY",
      "date_of_expiry": "DD.MM.YYYY",
      "date_of_birth": "DD.MM.YYYY",
      "gender": "M|F"
    }
    If a field is unclear, use null.
    """

    file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
    
    try:
        resp = client.models.generate_content(
            model=model,
            contents=[prompt, file_part],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        # Parse response
        text = resp.text if hasattr(resp, 'text') else ""
        text = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)

        # Save to temp file for stateful verification
        import uuid
        request_id = str(uuid.uuid4())
        
        # Ensure reports dir exists
        reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "reports")
        os.makedirs(reports_dir, exist_ok=True)
        

            
        data["request_id"] = request_id
        
        # Cleanup old temp files (older than 1 hour)
        try:
            import time
            current_time = time.time()
            for f in os.listdir(reports_dir):
                if f.startswith("temp_extraction_") and f.endswith(".json"):
                    f_path = os.path.join(reports_dir, f)
                    if current_time - os.path.getmtime(f_path) > 3600:
                        try:
                            os.remove(f_path)
                        except OSError:
                            pass
        except Exception as e:
            log.warning(f"Failed to cleanup temp files: {e}")

        # Save to temp file for stateful verification
        temp_path = os.path.join(reports_dir, f"temp_extraction_{request_id}.json")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
            
        return data

    except Exception as e:
        err_str = str(e).upper()
        if "503" in err_str or "UNAVAILABLE" in err_str or "OVERLOADED" in err_str:
            log.error(f"Gemini service unavailable (503): {e}")
            return {"error": "SERVICE_UNAVAILABLE"}
        log.error(f"CNIC extraction error: {e}")
        return {}

def extract_cnic_back_details(image_file, mime_type=None) -> Dict[str, Any]:
    """
    Extracts CNIC number and addresses (Urdu -> English) from CNIC Back using Gemini.
    """
    api_key = _get_api_key()
    if not api_key:
        return {}

    try:
        from google import genai
        from google.genai import types
        
        # If image_file is a path (str), read it. If it's a file-like, read bytes.
        if isinstance(image_file, str):
             with open(image_file, "rb") as f:
                 file_bytes = f.read()
             if not mime_type:
                mime_type = _guess_mime(file_bytes, image_file)
        else:
             file_bytes = image_file.read()
             if not mime_type:
                mime_type = _guess_mime(file_bytes, getattr(image_file, 'name', None))
        
        client = genai.Client(api_key=api_key)
        model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

        # Strict JSON schema prompt
        prompt = """
        Analyze this Pakistani CNIC BACK side image.
        1. Extract the CNIC Number.
        2. Extract "Permanent Address" and "Current Address" (often in Urdu).
        3. TRANSLATE the addresses to clear, standard English.
        
        Output valid JSON:
        {
          "cnic_number": "...",
          "permanent_address_english": "...",
          "current_address_english": "..."
        }
        If any field is missing/unreadable, use null.
        """

        file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        resp = client.models.generate_content(
            model=model,
            contents=[prompt, file_part],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        text = resp.text if hasattr(resp, 'text') else ""
        text = text.replace("```json", "").replace("```", "").strip()
        
        # DEBUG LOGGING
        log.info(f"--- [CNIC Back Extraction] Raw Gemini Response ---\n{text}\n------------------------------------------------")
        
        data = json.loads(text)
        log.info(f"--- [CNIC Back Extraction] Parsed JSON ---\n{json.dumps(data, indent=2)}\n------------------------------------------")
        
        return data

    except Exception as e:
        err_str = str(e).upper()
        if "503" in err_str or "UNAVAILABLE" in err_str or "OVERLOADED" in err_str:
            log.error(f"Gemini service unavailable (503) for back: {e}")
            return {"error": "SERVICE_UNAVAILABLE"}
        log.error(f"CNIC Back extraction error: {e}")
        return {}

def extract_cnic_number_only(image_file, mime_type=None) -> str:
    """
    Fast, focused extraction of CNIC Number from Back image for blocking verification.
    """
    api_key = _get_api_key()
    if not api_key:
        return ""

    try:
        from google import genai
        from google.genai import types
        
        # Handle file reading
        if isinstance(image_file, str):
             with open(image_file, "rb") as f:
                 file_bytes = f.read()
             if not mime_type:
                mime_type = _guess_mime(file_bytes, image_file)
        else:
             if hasattr(image_file, 'seek'):
                 image_file.seek(0)
             file_bytes = image_file.read()
             if not mime_type:
                mime_type = _guess_mime(file_bytes, getattr(image_file, 'name', None))
        
        client = genai.Client(api_key=api_key)
        model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

        # Very strict, simple prompt
        prompt = """
        Extract the CNIC Number from this Pakistan ID Card back side.
        Output ONLY the number (e.g., 12345-1234567-1).
        If not found, output NULL.
        """

        file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        resp = client.models.generate_content(
            model=model,
            contents=[prompt, file_part]
        )
        
        text = resp.text if hasattr(resp, 'text') else ""
        text = text.strip()
        
        log.info(f"--- [CNIC Back SYNC] Raw Gemini Response ---\n{text}\n------------------------------------------")
        
        # Simple cleanup
        if "NULL" in text.upper():
            return ""
        
        # Extract purely digits/dashes if Gemini chats too much
        import re
        match = re.search(r"\d{5}-\d{7}-\d{1}", text)
        if match:
             extracted = match.group(0)
             log.info(f"--- [CNIC Back SYNC] Extracted: {extracted} ---")
             return extracted
             
        log.info(f"--- [CNIC Back SYNC] Extracted (No Regex Match): {text if len(text) > 10 else 'Too Short'} ---")
        return text if len(text) > 10 else ""

    except Exception as e:
        err_str = str(e).upper()
        if "503" in err_str or "UNAVAILABLE" in err_str or "OVERLOADED" in err_str:
            log.error(f"Gemini service unavailable (503) for number sync: {e}")
            # Returning special string for downstream check
            return "SERVICE_UNAVAILABLE"
        log.error(f"CNIC Number Only extraction error: {e}")
        return ""


