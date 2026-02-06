"""
Supabase service for storage and database operations
"""
from typing import Optional
from uuid import UUID
from supabase import create_client, Client

from app.config import get_settings


class SupabaseService:
    """Service for interacting with Supabase Storage and Database"""

    def __init__(self):
        settings = get_settings()
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
        self.storage_bucket = "receipts"

    # ============ Storage Operations ============

    def upload_receipt(self, file_bytes: bytes, filename: str, report_id: str) -> str:
        """
        Upload a receipt image to Supabase Storage.

        Args:
            file_bytes: The image file content
            filename: Original filename
            report_id: The expense report ID to organize files

        Returns:
            The storage path of the uploaded file
        """
        # Create path: report_id/filename
        path = f"{report_id}/{filename}"

        # Upload to storage bucket
        self.client.storage.from_(self.storage_bucket).upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": self._get_content_type(filename)}
        )

        return path

    def get_receipt_url(self, path: str) -> str:
        """Get the public URL for a receipt image"""
        response = self.client.storage.from_(self.storage_bucket).get_public_url(path)
        return response

    def delete_receipt(self, path: str) -> bool:
        """Delete a receipt from storage"""
        try:
            self.client.storage.from_(self.storage_bucket).remove([path])
            return True
        except Exception:
            return False

    # ============ Database Operations ============

    def create_expense_report(self, name: str) -> dict:
        """Create a new expense report"""
        result = self.client.table("expense_reports").insert({
            "name": name
        }).execute()
        return result.data[0] if result.data else None

    def get_expense_report(self, report_id: str) -> Optional[dict]:
        """Get an expense report by ID"""
        result = self.client.table("expense_reports").select("*").eq(
            "id", report_id
        ).execute()
        return result.data[0] if result.data else None

    def list_expense_reports(self, limit: int = 50) -> list[dict]:
        """List all expense reports, ordered by most recent"""
        result = self.client.table("expense_reports").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []

    def update_expense_report_count(self, report_id: str, count: int) -> None:
        """Update the total_expenses count on a report"""
        self.client.table("expense_reports").update({
            "total_expenses": count
        }).eq("id", report_id).execute()

    def delete_expense_report(self, report_id: str) -> bool:
        """Delete an expense report (cascades to expenses)"""
        try:
            self.client.table("expense_reports").delete().eq(
                "id", report_id
            ).execute()
            return True
        except Exception:
            return False

    def save_expense(self, expense: dict, report_id: str) -> dict:
        """Save an expense to the database"""
        expense_data = {
            **expense,
            "report_id": report_id
        }
        result = self.client.table("expenses").insert(expense_data).execute()
        return result.data[0] if result.data else None

    def get_expenses_for_report(self, report_id: str) -> list[dict]:
        """Get all expenses for a specific report"""
        result = self.client.table("expenses").select("*").eq(
            "report_id", report_id
        ).order("date", desc=False).execute()
        return result.data or []

    def get_expense(self, expense_id: str) -> Optional[dict]:
        """Get a single expense by ID"""
        result = self.client.table("expenses").select("*").eq(
            "id", expense_id
        ).execute()
        return result.data[0] if result.data else None

    def update_expense(self, expense_id: str, updates: dict) -> Optional[dict]:
        """Update an expense"""
        result = self.client.table("expenses").update(updates).eq(
            "id", expense_id
        ).execute()
        return result.data[0] if result.data else None

    def delete_expense(self, expense_id: str) -> bool:
        """Delete an expense"""
        try:
            # Get the expense first to get receipt path
            expense = self.get_expense(expense_id)
            if expense and expense.get("receipt_path"):
                self.delete_receipt(expense["receipt_path"])

            self.client.table("expenses").delete().eq("id", expense_id).execute()
            return True
        except Exception:
            return False

    # ============ Helpers ============

    def _get_content_type(self, filename: str) -> str:
        """Determine content type from filename"""
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        content_types = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "bmp": "image/bmp",
            "pdf": "application/pdf",
        }
        return content_types.get(ext, "application/octet-stream")


# Singleton instance
_supabase_service: Optional[SupabaseService] = None


def get_supabase_service() -> SupabaseService:
    """Get or create the Supabase service singleton"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
