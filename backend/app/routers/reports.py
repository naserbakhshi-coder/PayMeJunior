"""
Report management and Excel generation API endpoints
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

from app.services.supabase_service import get_supabase_service
from app.services.excel_generator import get_excel_generator
from app.models.expense import ExpenseReportCreate, ExcelRequest


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def list_reports():
    """
    List all expense reports, ordered by most recent.
    """
    supabase = get_supabase_service()
    reports = supabase.list_expense_reports()
    return {"reports": reports}


@router.post("")
async def create_report(data: ExpenseReportCreate):
    """
    Create a new empty expense report.
    """
    supabase = get_supabase_service()
    report = supabase.create_expense_report(data.name)

    if not report:
        raise HTTPException(status_code=500, detail="Failed to create report")

    return report


@router.get("/{report_id}")
async def get_report(report_id: str):
    """
    Get a specific expense report by ID.
    """
    supabase = get_supabase_service()
    report = supabase.get_expense_report(report_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return report


@router.delete("/{report_id}")
async def delete_report(report_id: str):
    """
    Delete an expense report and all its expenses.
    """
    supabase = get_supabase_service()
    success = supabase.delete_expense_report(report_id)

    if not success:
        raise HTTPException(status_code=404, detail="Report not found")

    return {"success": True, "message": "Report deleted"}


@router.get("/{report_id}/expenses")
async def get_report_expenses(report_id: str):
    """
    Get all expenses for a specific report.
    """
    supabase = get_supabase_service()

    # Verify report exists
    report = supabase.get_expense_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    expenses = supabase.get_expenses_for_report(report_id)

    return {
        "report_id": report_id,
        "report_name": report["name"],
        "expenses": expenses,
        "total": len(expenses)
    }


@router.post("/{report_id}/excel")
async def generate_excel(report_id: str, data: ExcelRequest = None):
    """
    Generate SAP Concur-compatible Excel report for the given report ID.

    Returns the Excel file as a download.
    """
    supabase = get_supabase_service()

    # Verify report exists
    report = supabase.get_expense_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get expenses
    expenses = supabase.get_expenses_for_report(report_id)

    if not expenses:
        raise HTTPException(status_code=400, detail="No expenses to export")

    # Generate Excel
    excel_gen = get_excel_generator()
    report_name = data.report_name if data else report["name"]
    excel_bytes = excel_gen.generate_report(expenses, report_name)

    # Return as downloadable file
    filename = f"{report_name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{report_id}/summary")
async def get_report_summary(report_id: str):
    """
    Get expense summary (by category, by currency) for a report.
    """
    supabase = get_supabase_service()

    # Verify report exists
    report = supabase.get_expense_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    expenses = supabase.get_expenses_for_report(report_id)

    excel_gen = get_excel_generator()
    summary = excel_gen.generate_summary(expenses)

    return {
        "report_id": report_id,
        "report_name": report["name"],
        **summary
    }


# Individual expense endpoints

@router.get("/expenses/{expense_id}")
async def get_expense(expense_id: str):
    """
    Get a single expense by ID.
    """
    supabase = get_supabase_service()
    expense = supabase.get_expense(expense_id)

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    return expense


@router.patch("/expenses/{expense_id}")
async def update_expense(expense_id: str, updates: dict):
    """
    Update an expense.
    """
    supabase = get_supabase_service()

    # Don't allow updating certain fields
    protected_fields = {"id", "report_id", "created_at", "receipt_path"}
    updates = {k: v for k, v in updates.items() if k not in protected_fields}

    expense = supabase.update_expense(expense_id, updates)

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    return expense


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """
    Delete an expense.
    """
    supabase = get_supabase_service()
    success = supabase.delete_expense(expense_id)

    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")

    return {"success": True, "message": "Expense deleted"}
