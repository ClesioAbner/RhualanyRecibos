## Packages
(none needed)

## Notes
Use existing shadcn/ui components already present in client/src/components/ui
Printing: uses CSS @media print with A4 and two receipts per page (top/bottom with cut line)
PDF generation: POST /api/receipts/pdf returns { pdfBase64, filename } — frontend downloads via data:application/pdf;base64
No authentication required; all fetches include credentials: "include" per shared defaults
Add data-testid on key inputs/buttons/list rows and key displayed text (receipt number, student name)
