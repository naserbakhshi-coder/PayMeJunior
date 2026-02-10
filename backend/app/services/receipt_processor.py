"""
Receipt processing service using Claude Vision API
Refactored from original paymejunior_agent.py
"""
import base64
import json
from typing import Optional
import anthropic

from app.config import get_settings
from app.models.expense import ExpenseExtracted
from app.services.supabase_service import SupabaseService, get_supabase_service


# Claude prompt for extracting expense data from receipts
EXTRACTION_PROMPT = """Analyze this receipt and extract the following information in JSON format:
{
  "date": "YYYY-MM-DD format",
  "merchant": "Merchant/Vendor name",
  "description": "Brief description of the expense",
  "amount": "Total amount as decimal number only",
  "currency": "Currency code (USD, EUR, etc.)",
  "category": "Expense category (Meals, Transportation, Office Supplies, Entertainment, Lodging, Other)",
  "payment_type": "Credit Card",
  "city": "City if available",
  "items": "Brief list of items purchased"
}

Please extract the exact values from the receipt. For the category, choose the most appropriate one based on what was purchased. Return ONLY the JSON object, no other text."""


class ReceiptProcessor:
    """
    Processes receipt images using Claude Vision API.
    Extracts expense data and saves to Supabase.
    """

    def __init__(self, supabase: Optional[SupabaseService] = None):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.supabase = supabase or get_supabase_service()

    def encode_image(self, image_bytes: bytes, filename: str) -> tuple[str, str]:
        """
        Encode image bytes to base64 and determine media type.

        Args:
            image_bytes: Raw image file content
            filename: Original filename (to determine media type)

        Returns:
            Tuple of (base64_data, media_type)
        """
        image_data = base64.standard_b64encode(image_bytes).decode('utf-8')

        # Determine media type from filename
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        media_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp'
        }
        media_type = media_types.get(ext, 'image/jpeg')

        return image_data, media_type

    def extract_expense_data(self, image_bytes: bytes, filename: str) -> Optional[ExpenseExtracted]:
        """
        Extract expense information from a receipt image using Claude Vision.

        Args:
            image_bytes: Raw image file content
            filename: Original filename

        Returns:
            ExpenseExtracted model or None if extraction fails
        """
        try:
            image_data, media_type = self.encode_image(image_bytes, filename)

            response = self.client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": EXTRACTION_PROMPT
                            }
                        ]
                    }
                ]
            )

            # Extract JSON from response
            content = response.content[0].text.strip()

            # Remove markdown code blocks if present
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
                content = content.strip()

            expense_data = json.loads(content)

            # Convert amount to float
            if isinstance(expense_data.get('amount'), str):
                # Remove currency symbols and commas
                amount_str = expense_data['amount'].replace('$', '').replace(',', '').strip()
                expense_data['amount'] = float(amount_str)

            return ExpenseExtracted(**expense_data)

        except anthropic.APIError as e:
            print(f"Claude API error for {filename}: {str(e)}")
            return None
        except json.JSONDecodeError as e:
            print(f"JSON parse error for {filename}: {str(e)}")
            return None
        except Exception as e:
            print(f"Error extracting expense data from {filename}: {type(e).__name__}: {str(e)}")
            return None

    def process_receipt(
        self,
        image_bytes: bytes,
        filename: str,
        report_id: str
    ) -> Optional[dict]:
        """
        Process a single receipt: upload to storage, extract data, save to database.

        Args:
            image_bytes: Raw image file content
            filename: Original filename
            report_id: The expense report ID to associate with

        Returns:
            Saved expense data dict or None if processing fails
        """
        try:
            # 1. Upload receipt to Supabase Storage
            receipt_path = self.supabase.upload_receipt(image_bytes, filename, report_id)

            # 2. Extract expense data using Claude Vision
            extracted = self.extract_expense_data(image_bytes, filename)

            if extracted is None:
                # Delete uploaded file if extraction failed
                self.supabase.delete_receipt(receipt_path)
                return None

            # 3. Prepare expense data for database
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

            # 4. Save to database
            saved_expense = self.supabase.save_expense(expense_data, report_id)

            return saved_expense

        except Exception as e:
            print(f"Error processing receipt {filename}: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def process_multiple_receipts(
        self,
        files: list[tuple[bytes, str]],
        report_id: str
    ) -> dict:
        """
        Process multiple receipt images.

        Args:
            files: List of (image_bytes, filename) tuples
            report_id: The expense report ID

        Returns:
            Dict with expenses, failed_receipts, and summary
        """
        expenses = []
        failed_receipts = []

        for image_bytes, filename in files:
            result = self.process_receipt(image_bytes, filename, report_id)

            if result:
                expenses.append(result)
            else:
                failed_receipts.append({
                    "filename": filename,
                    "error": "Could not extract expense data"
                })

        # Update report count
        self.supabase.update_expense_report_count(report_id, len(expenses))

        return {
            "expenses": expenses,
            "failed_receipts": failed_receipts,
            "summary": {
                "total": len(files),
                "successful": len(expenses),
                "failed": len(failed_receipts)
            }
        }


# Singleton instance
_receipt_processor: Optional[ReceiptProcessor] = None


def get_receipt_processor() -> ReceiptProcessor:
    """Get or create the receipt processor singleton"""
    global _receipt_processor
    if _receipt_processor is None:
        _receipt_processor = ReceiptProcessor()
    return _receipt_processor
