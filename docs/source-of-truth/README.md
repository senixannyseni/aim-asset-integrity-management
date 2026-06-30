# AIM+n8n API Payload Examples

These JSON files are request payload fixtures for `04_API/openapi.yaml`. They follow `03_Database/data_dictionary.xlsx` / `03_Database/data_dictionary.md` field names and preserve the AIM/n8n boundary:

- AIM remains the system of record.
- n8n sends workflow events only and never writes directly to PostgreSQL.
- AI extraction is staged and reviewed before promotion.
- Calculation, integrity decision, and report issue require human review/approval and audit logging.
