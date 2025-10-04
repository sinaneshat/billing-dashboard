-- Create revalidations table for Next.js tag cache
-- This table tracks On-Demand revalidation times for tags and paths

CREATE TABLE IF NOT EXISTS revalidations (
  tag TEXT PRIMARY KEY,
  revalidated_at INTEGER NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_revalidated_at ON revalidations(revalidated_at);
