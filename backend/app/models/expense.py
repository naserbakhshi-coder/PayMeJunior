"""
Pydantic models for expense data
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field


# Expense categories matching SAP Concur
ExpenseCategory = Literal[
    "Meals",
    "Transportation",
    "Office Supplies",
    "Entertainment",
    "Lodging",
    "Other"
]


class ExpenseBase(BaseModel):
    """Base expense fields"""
    date: date
    merchant: str
    description: Optional[str] = None
    amount: Decimal = Field(..., decimal_places=2)
    currency: str = "USD"
    category: ExpenseCategory
    payment_type: str = "Credit Card"
    city: Optional[str] = None
    items: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    """Expense data for creation"""
    receipt_path: Optional[str] = None


class Expense(ExpenseBase):
    """Full expense model with database fields"""
    id: UUID
    report_id: UUID
    receipt_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseExtracted(BaseModel):
    """Expense data extracted from receipt by Claude"""
    date: str  # YYYY-MM-DD format string
    merchant: str
    description: Optional[str] = None
    amount: float
    currency: str = "USD"
    category: ExpenseCategory = "Other"
    payment_type: str = "Credit Card"
    city: Optional[str] = None
    items: Optional[str] = None


class ExpenseReportCreate(BaseModel):
    """Create a new expense report"""
    name: str


class ExpenseReport(BaseModel):
    """Full expense report model"""
    id: UUID
    name: str
    created_at: datetime
    total_expenses: int = 0

    class Config:
        from_attributes = True


class ProcessingResult(BaseModel):
    """Result from processing receipts"""
    report_id: UUID
    expenses: list[Expense]
    failed_receipts: list[dict]
    summary: dict


class ExcelRequest(BaseModel):
    """Request to generate Excel report"""
    report_name: str = "expense_report"
