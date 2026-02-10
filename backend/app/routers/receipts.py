"""
Receipt processing API endpoints
"""
import base64
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel

from app.services.receipt_processor import get_receipt_processor
from app.services.supabase_service import get_supabase_service


router = APIRouter(prefix="/receipts", tags=["receipts"])


# Models for base64 upload
class ImageData(BaseModel):
    data: str  # base64 encoded image
    filename: str
    content_type: str


class ProcessBase64Request(BaseModel):
    report_name: str = "Expense Report"
    images: list[ImageData]


class ProcessBase64SingleRequest(BaseModel):
    report_id: str
    image: ImageData


@router.post("/process")
async def process_receipts(
    files: list[UploadFile] = File(...),
    report_name: str = Form(default="Expense Report")
):
    """
    Process multiple receipt images and extract expense data.

    - Creates a new expense report
    - Uploads receipt images to Supabase Storage
    - Extracts expense data using Claude Vision API
    - Saves expenses to Supabase Database

    Returns the created expenses and any failed receipts.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Validate file types
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/bmp", "application/pdf"}
    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: {allowed_types}"
            )

    supabase = get_supabase_service()
    processor = get_receipt_processor()

    # Create expense report
    report = supabase.create_expense_report(report_name)
    if not report:
        raise HTTPException(status_code=500, detail="Failed to create expense report")

    report_id = report["id"]

    # Read all files
    file_data = []
    for file in files:
        content = await file.read()
        file_data.append((content, file.filename))

    # Process receipts
    result = processor.process_multiple_receipts(file_data, report_id)

    return {
        "report_id": report_id,
        "report_name": report_name,
        "expenses": result["expenses"],
        "failed_receipts": result["failed_receipts"],
        "summary": result["summary"]
    }


@router.post("/process-single")
async def process_single_receipt(
    file: UploadFile = File(...),
    report_id: str = Form(...)
):
    """
    Process a single receipt image and add to an existing report.

    Useful for processing receipts one at a time with progress feedback.
    """
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/bmp", "application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}"
        )

    processor = get_receipt_processor()

    # Read file content
    content = await file.read()

    # Process receipt
    expense = processor.process_receipt(content, file.filename, report_id)

    if expense is None:
        raise HTTPException(
            status_code=422,
            detail="Could not extract expense data from receipt"
        )

    return {
        "success": True,
        "expense": expense
    }


@router.post("/process-base64")
async def process_receipts_base64(request: ProcessBase64Request):
    """
    Process receipt images sent as base64.
    This endpoint is easier to use from React Native.
    """
    if not request.images:
        raise HTTPException(status_code=400, detail="No images provided")

    supabase = get_supabase_service()
    processor = get_receipt_processor()

    # Create expense report
    report = supabase.create_expense_report(request.report_name)
    if not report:
        raise HTTPException(status_code=500, detail="Failed to create expense report")

    report_id = report["id"]

    # Decode and process images
    file_data = []
    for img in request.images:
        try:
            image_bytes = base64.b64decode(img.data)
            print(f"Decoded image: {img.filename}, size: {len(image_bytes)} bytes")
            file_data.append((image_bytes, img.filename))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")

    # Process receipts with detailed error tracking
    expenses = []
    failed_receipts = []

    for image_bytes, filename in file_data:
        try:
            # Try to upload to storage first
            print(f"Uploading {filename} to storage...")
            receipt_path = supabase.upload_receipt(image_bytes, filename, report_id)
            print(f"Uploaded to: {receipt_path}")

            # Extract expense data
            print(f"Extracting data from {filename}...")
            extracted, extract_error = processor.extract_expense_data(image_bytes, filename)

            if extracted is None:
                print(f"Extraction failed for {filename}: {extract_error}")
                supabase.delete_receipt(receipt_path)
                failed_receipts.append({
                    "filename": filename,
                    "error": extract_error or "Claude could not extract expense data from image"
                })
                continue

            print(f"Extracted: {extracted}")

            # Save to database
            expense_data = {
                "date": extracted.date,
                "merchant": extracted.merchant,
                "description": extracted.description,
                "amount": extracted.amount,
                "currency": extracted.currency,
                "category": extracted.category,
                "payment_type": extracted.payment_type,
                "city": extracted.city,
                "items": extracted.items,
                "receipt_path": receipt_path
            }

            saved_expense = supabase.save_expense(expense_data, report_id)
            expenses.append(saved_expense)
            print(f"Saved expense: {saved_expense}")

        except Exception as e:
            import traceback
            error_detail = f"{type(e).__name__}: {str(e)}"
            print(f"Error processing {filename}: {error_detail}")
            traceback.print_exc()
            failed_receipts.append({
                "filename": filename,
                "error": error_detail
            })

    # Update report count
    supabase.update_expense_report_count(report_id, len(expenses))

    return {
        "report_id": report_id,
        "report_name": request.report_name,
        "expenses": expenses,
        "failed_receipts": failed_receipts,
        "summary": {
            "total": len(file_data),
            "successful": len(expenses),
            "failed": len(failed_receipts)
        }
    }


@router.post("/test-image")
async def test_image(request: ProcessBase64Request):
    """Test endpoint to verify image data is being received correctly"""
    if not request.images:
        return {"error": "No images"}

    img = request.images[0]
    try:
        image_bytes = base64.b64decode(img.data)
        # Check if it looks like an image
        is_jpeg = image_bytes[:2] == b'\xff\xd8'
        is_png = image_bytes[:8] == b'\x89PNG\r\n\x1a\n'

        return {
            "filename": img.filename,
            "content_type": img.content_type,
            "data_length": len(img.data),
            "decoded_size": len(image_bytes),
            "is_jpeg": is_jpeg,
            "is_png": is_png,
            "first_bytes": image_bytes[:20].hex() if len(image_bytes) > 20 else image_bytes.hex(),
        }
    except Exception as e:
        return {"error": str(e)}


@router.post("/process-base64-single")
async def process_single_receipt_base64(request: ProcessBase64SingleRequest):
    """
    Process a single receipt image (base64) and add to an existing report.
    """
    processor = get_receipt_processor()

    try:
        image_bytes = base64.b64decode(request.image.data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")

    # Process receipt
    expense = processor.process_receipt(image_bytes, request.image.filename, request.report_id)

    if expense is None:
        raise HTTPException(
            status_code=422,
            detail="Could not extract expense data from receipt"
        )

    return {
        "success": True,
        "expense": expense
    }
