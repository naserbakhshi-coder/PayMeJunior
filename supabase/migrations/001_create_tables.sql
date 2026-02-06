-- PayMeJunior Database Schema
-- Run this in Supabase SQL Editor

-- Expense reports (groups of expenses)
CREATE TABLE IF NOT EXISTS expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_expenses INTEGER DEFAULT 0
);

-- Individual expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES expense_reports(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL,
  payment_type TEXT DEFAULT 'Credit Card',
  city TEXT,
  items TEXT,
  receipt_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_report_id ON expenses(report_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_created_at ON expense_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow public access (for MVP without auth)
-- In production, you'd want to add user_id and restrict access
CREATE POLICY "Allow public read expense_reports" ON expense_reports
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert expense_reports" ON expense_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update expense_reports" ON expense_reports
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete expense_reports" ON expense_reports
  FOR DELETE USING (true);

CREATE POLICY "Allow public read expenses" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert expenses" ON expenses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update expenses" ON expenses
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete expenses" ON expenses
  FOR DELETE USING (true);
