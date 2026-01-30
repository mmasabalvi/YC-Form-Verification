# app/services/image_checks.py

import cv2
import numpy as np


# ============================
# TUNABLE HARD GATES
# ============================

# Resolution: slightly relaxed so 787x505 doesn't fail
MIN_W = 750
MIN_H = 480

# Lighting
MIN_BRIGHTNESS = 40
MAX_BRIGHTNESS = 220
MIN_CONTRAST = 15

# Blur
MIN_BLUR_SCORE = 80  # Laplacian variance

# Reject "long / phone-wide" uploads (16:9-ish). Also reject portrait/rotated.
MIN_UPLOAD_ASPECT = 1.10
MAX_UPLOAD_ASPECT = 1.85

# Cropped-only requirement: card must fill most of the image
MIN_CARD_AREA_RATIO = 0.55

# CNIC aspect ratio (relaxed a bit)
MIN_CARD_ASPECT = 1.15
MAX_CARD_ASPECT = 2.00

# Margin rule:
# If card fill is HIGH (tight crop), allow touching borders.
EDGE_MARGIN_PX = 6
ALLOW_TIGHT_CROP_IF_AREA_RATIO_GE = 0.88  # if >= 0.88, don't fail for being at border

# Rectangle quality (relaxed)
MIN_RECTANGULARITY = 0.35  # was effectively too strict in some frames


def _decode(image_bytes: bytes):
    arr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


# ============================
# STEP 1: IMAGE QUALITY (HARD)
# ============================
def check_image_quality(image_bytes: bytes) -> dict:
    """
    HARD GATE:
    - resolution
    - brightness
    - contrast
    - blur
    - reject long/phone-wide (16:9) + reject portrait/rotated
    """
    img = _decode(image_bytes)
    if img is None:
        return {"passed": False, "reason": "Invalid or unsupported image format"}

    h, w = img.shape[:2]

    if w < MIN_W or h < MIN_H:
        return {
            "passed": False,
            "reason": "Image resolution too low",
            "metrics": {"resolution": f"{w}x{h}", "min_required": f"{MIN_W}x{MIN_H}"}
        }

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    brightness = float(gray.mean())
    if brightness < MIN_BRIGHTNESS or brightness > MAX_BRIGHTNESS:
        return {
            "passed": False,
            "reason": "Poor lighting conditions",
            "metrics": {"brightness": round(brightness, 2)}
        }

    contrast = float(gray.std())
    if contrast < MIN_CONTRAST:
        return {
            "passed": False,
            "reason": "Image lacks contrast (too dark/flat)",
            "metrics": {"contrast": round(contrast, 2)}
        }

    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_score < MIN_BLUR_SCORE:
        return {
            "passed": False,
            "reason": "Image is too blurry",
            "metrics": {"blur_score": round(blur_score, 2)}
        }

    aspect_ratio = w / float(h)
    if aspect_ratio < MIN_UPLOAD_ASPECT or aspect_ratio > MAX_UPLOAD_ASPECT:
        return {
            "passed": False,
            "reason": "Only cropped CNIC images are allowed (reject wide 16:9 or rotated/portrait images)",
            "metrics": {
                "aspect_ratio": round(aspect_ratio, 2),
                "min_allowed": MIN_UPLOAD_ASPECT,
                "max_allowed": MAX_UPLOAD_ASPECT
            }
        }

    # informational only
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(edges.mean())

    return {
        "passed": True,
        "metrics": {
            "resolution": f"{w}x{h}",
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "blur_score": round(blur_score, 2),
            "aspect_ratio": round(aspect_ratio, 2),
            "edge_density": round(edge_density, 2),
        },
        "warning": None
    }


# ============================
# STEP 2: COMPLETENESS (HARD but sensible)
# ============================
def check_document_completeness(image_bytes: bytes) -> dict:
    """
    SOFT CHECK (non-blocking):
    - Tries to detect a card-like rectangle.
    - NEVER fails if rectangle is not found (just warns).
    - Only provides helpful metrics + guidance.
    """

    img = _decode(image_bytes)
    if img is None:
        return {"passed": True, "message": "Skipped completeness (invalid image decode)", "metrics": {}, "warning": "Invalid image format"}

    H, W = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    edges = cv2.Canny(blur, 40, 120)
    edges = cv2.dilate(edges, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)), iterations=1)
    edges = cv2.morphologyEx(
        edges, cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)),
        iterations=1
    )

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours_found = len(contours)

    if not contours:
        return {
            "passed": True,
            "message": "Completeness uncertain (no strong outer contour found)",
            "metrics": {"contours_found": 0},
            "warning": "Card border not detected; OCR may still work if image is cropped and clear."
        }

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    img_area = float(H * W)

    best = None
    for c in contours[:40]:
        area = float(cv2.contourArea(c))
        if area <= 0:
            continue

        area_ratio = area / img_area
        if area_ratio < 0.12:
            continue

        rect = cv2.minAreaRect(c)
        (_, _), (rw, rh), _ = rect
        if rw <= 0 or rh <= 0:
            continue

        aspect = max(rw, rh) / float(min(rw, rh))

        x, y, bw, bh = cv2.boundingRect(c)
        rect_area = float(bw * bh) if bw > 0 and bh > 0 else 1.0
        rectangularity = min(1.0, area / rect_area)

        score = area_ratio * (0.7 + 0.3 * rectangularity)

        cand = {
            "bbox": [int(x), int(y), int(bw), int(bh)],
            "card_area": round(area, 2),
            "card_area_ratio": round(area_ratio, 3),
            "card_aspect": round(aspect, 3),
            "rectangularity": round(rectangularity, 3),
            "score": round(score, 4),
        }

        if best is None or cand["score"] > best["score"]:
            best = cand

    if not best:
        # IMPORTANT: soft-pass
        return {
            "passed": True,
            "message": "Completeness uncertain (could not score a card-like rectangle)",
            "metrics": {"contours_found": contours_found},
            "warning": "Border detection failed; OCR may still work. Ensure CNIC is cropped and readable."
        }

    # Provide soft warnings only
    warnings = []
    if best["card_area_ratio"] < MIN_CARD_AREA_RATIO:
        warnings.append("Card seems small in frame (too much background). Crop tighter for best OCR.")

    x, y, bw, bh = best["bbox"]
    touching = (
        x <= EDGE_MARGIN_PX or y <= EDGE_MARGIN_PX or
        (x + bw) >= (W - EDGE_MARGIN_PX) or
        (y + bh) >= (H - EDGE_MARGIN_PX)
    )
    if touching:
        warnings.append("Card touches image border; may be tight crop or cut edge. Prefer small margin.")

    return {
        "passed": True,
        "message": "Document completeness check (non-blocking)",
        "metrics": {**best, "contours_found": contours_found},
        "warning": " | ".join(warnings) if warnings else None,
        "mode": "non-blocking"
    }
