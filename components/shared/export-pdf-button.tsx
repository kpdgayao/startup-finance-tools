"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { EmailCaptureDialog } from "@/components/shared/email-capture-dialog";

interface ExportPDFButtonProps {
  elementId: string;
  filename?: string;
  enableEmailCapture?: boolean;
}

export function ExportPDFButton({
  elementId,
  filename = "export",
  enableEmailCapture = false,
}: ExportPDFButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  const doPrint = () => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; color: #1a1a1a; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background: #f5f5f5; text-align: left; }
            .text-red-400, .text-red-500 { color: #ef4444; }
            .text-green-400, .text-green-500 { color: #22c55e; }
            .text-yellow-400 { color: #eab308; }
          </style>
        </head>
        <body>
          <h1>${filename}</h1>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClick = () => {
    if (
      enableEmailCapture &&
      !sessionStorage.getItem("pdf-email-captured")
    ) {
      setShowDialog(true);
    } else {
      doPrint();
    }
  };

  const handleEmailSuccess = () => {
    sessionStorage.setItem("pdf-email-captured", "true");
  };

  const handleDialogChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      // Proceed with print after dialog is dismissed
      doPrint();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick}>
        <Download className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
      {enableEmailCapture && (
        <EmailCaptureDialog
          open={showDialog}
          onOpenChange={handleDialogChange}
          onSuccess={handleEmailSuccess}
        />
      )}
    </>
  );
}
