"""
Receipt processing API endpoints
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, File, UploadFile, Form, HTTPException

from app.services.receipt_processor import get_receipt_processor
from app.services.supabase_service import get_supabase_service


router = APIRouter(prefix="/receipts", tags=["receipts"])


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
