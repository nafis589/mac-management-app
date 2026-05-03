import { jsPDF } from "jspdf";

export interface TicketSaleData {
  reference: string;
  date: string | Date;
  cashierName: string;
  subTotal: number;
  discountType?: 'PERCENTAGE' | 'FIXED' | null;
  discountValue?: number;
  finalAmount: number;
}

export interface TicketItemData {
  name: string;
  quantity: number;
  unitPrice: number;
}

const formatPrice = (price: number) => {
  // Example: "1 000 FCFA"
  // Using replace to ensure standard space is used instead of narrow no-break space
  return price.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' FCFA';
};

export const generateTicket = (saleData: TicketSaleData, items: TicketItemData[]): Blob => {
  // Calculate dynamic height
  const baseHeight = 110;
  const itemHeight = 5;
  const totalHeight = baseHeight + (items.length * itemHeight);

  // Width 80mm (standard thermal printer)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, totalHeight],
  });

  doc.setFont("courier", "normal");

  let y = 10;

  // 1. Header
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.text("FRIPERIE DE LUXE", 40, y, { align: "center" });

  y += 5;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text("123 Avenue de la Mode, Paris", 40, y, { align: "center" });
  y += 4;
  doc.text("Tel: +228 99 68 25 56", 40, y, { align: "center" });

  y += 6;
  doc.text("--------------------------------", 40, y, { align: "center" });

  // 2. Transaction Info
  y += 6;
  doc.setFontSize(9);

  const dateStr = saleData.date instanceof Date
    ? saleData.date.toLocaleString('fr-FR')
    : new Date(saleData.date).toLocaleString('fr-FR');

  doc.text(`Ref   : ${saleData.reference}`, 5, y);
  y += 4;
  doc.text(`Date  : ${dateStr}`, 5, y);
  y += 4;
  doc.text(`Caisse: ${saleData.cashierName}`, 5, y);

  y += 6;
  doc.text("--------------------------------", 40, y, { align: "center" });

  // 3. Items Table
  y += 6;
  doc.setFont("courier", "bold");
  doc.text("Qté", 5, y);
  doc.text("Article", 14, y);
  doc.text("P.U.", 52, y, { align: "right" });
  doc.text("Total", 75, y, { align: "right" });

  doc.setFont("courier", "normal");
  y += 4;

  items.forEach(item => {
    doc.text(item.quantity.toString(), 5, y);

    // Truncate long article names to fit the column
    const maxNameLen = 13;
    let shortName = item.name;
    if (shortName.length > maxNameLen) {
      shortName = shortName.substring(0, maxNameLen - 1) + ".";
    }
    doc.text(shortName, 14, y);

    const pu = item.unitPrice.toLocaleString('fr-FR').replace(/\s/g, ' ');
    doc.text(pu, 52, y, { align: "right" });

    const tot = (item.unitPrice * item.quantity).toLocaleString('fr-FR').replace(/\s/g, ' ');
    doc.text(tot, 75, y, { align: "right" });

    y += 5;
  });

  y += 2;
  doc.text("--------------------------------", 40, y, { align: "center" });

  // 4. Footer
  y += 6;
  doc.text(`Sous-total:`, 5, y);
  doc.text(formatPrice(saleData.subTotal), 75, y, { align: "right" });

  if (saleData.discountValue && saleData.discountValue > 0) {
    y += 5;
    const discountText = saleData.discountType === 'PERCENTAGE'
      ? `Remise (${saleData.discountValue}%):`
      : `Remise:`;

    const discountAmount = saleData.subTotal - saleData.finalAmount;
    doc.text(discountText, 5, y);
    doc.text(`-${formatPrice(discountAmount)}`, 75, y, { align: "right" });
  }

  y += 8;
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 5, y);
  doc.text(formatPrice(saleData.finalAmount), 75, y, { align: "right" });

  y += 8;
  doc.setFontSize(9);
  doc.setFont("courier", "normal");
  doc.text("--------------------------------", 40, y, { align: "center" });

  // 5. Final Message
  y += 8;
  doc.text("Merci pour votre visite !", 40, y, { align: "center" });
  y += 5;
  // Using standard ASCII 'E' if jsPDF Courier encoding fails with 'É', but 'É' generally works in jsPDF WinAnsiEncoding.
  doc.text("Échange possible sous 7 jours", 40, y, { align: "center" });

  return doc.output("blob");
};
