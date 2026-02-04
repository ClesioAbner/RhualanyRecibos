import { useMemo } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateReceiptsPdf } from "@/hooks/use-receipts";

function downloadBase64Pdf(pdfBase64: string, filename: string) {
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${pdfBase64}`;
  a.download = filename || "recibos.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function PdfActions({
  receiptIds,
  variant = "default",
  size = "default",
  onPrint,
  testIdPrefix,
}: {
  receiptIds: number[];
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  onPrint: () => void;
  testIdPrefix: string;
}) {
  const { toast } = useToast();
  const pdf = useCreateReceiptsPdf();
  const disabled = useMemo(() => receiptIds.length === 0 || pdf.isPending, [receiptIds.length, pdf.isPending]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={() => onPrint()}
        data-testid={`${testIdPrefix}-print`}
        className="rounded-xl"
      >
        <Printer className="h-4 w-4 mr-2" />
        Imprimir
      </Button>

      <Button
        variant={variant}
        size={size}
        onClick={async () => {
          try {
            const result = await pdf.mutateAsync({ receiptIds });
            downloadBase64Pdf(result.pdfBase64, result.filename);
            toast({ title: "PDF gerado", description: "O download começou automaticamente." });
          } catch (e: any) {
            toast({
              title: "Falha ao gerar PDF",
              description: e?.message ?? "Tente novamente.",
              variant: "destructive",
            });
          }
        }}
        disabled={disabled}
        data-testid={`${testIdPrefix}-pdf`}
        className="rounded-xl"
      >
        {pdf.isPending ? <FileDown className="h-4 w-4 mr-2 animate-pulse" /> : <Download className="h-4 w-4 mr-2" />}
        {pdf.isPending ? "A gerar..." : "Gerar PDF"}
      </Button>
    </div>
  );
}
