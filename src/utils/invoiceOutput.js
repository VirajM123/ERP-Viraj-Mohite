import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const createInvoiceFrame = (html) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:900px;border:0;";
  document.body.appendChild(frame);
  const frameDocument = frame.contentDocument;
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  return frame;
};

const waitForInvoiceAssets = async (frame) => {
  const frameDocument = frame.contentDocument;
  await frameDocument.fonts?.ready;
  await Promise.all(Array.from(frameDocument.images, (image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
};

export const printSalesInvoiceHtml = async (html) => {
  const frame = createInvoiceFrame(html);
  try {
    await waitForInvoiceAssets(frame);
    const printWindow = frame.contentWindow;
    let cleanupTimer;
    const cleanup = () => {
      window.clearTimeout(cleanupTimer);
      printWindow.removeEventListener("afterprint", cleanup);
      frame.remove();
    };
    printWindow.addEventListener("afterprint", cleanup, { once: true });
    cleanupTimer = window.setTimeout(cleanup, 120000);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    frame.remove();
    throw error;
  }
};

export const downloadSalesInvoicePdf = async (html, paperSize, fileName) => {
  const frame = createInvoiceFrame(html);
  try {
    await waitForInvoiceAssets(frame);
    const isA5 = paperSize === "A5";
    const pdf = new jsPDF({
      orientation: isA5 ? "landscape" : "portrait",
      unit: "mm",
      format: isA5 ? "a5" : "a4",
      compress: true,
    });
    const pages = Array.from(frame.contentDocument.querySelectorAll(".invoice-page"));
    if (!pages.length) throw new Error("Invoice pages could not be generated.");

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        windowWidth: frame.contentWindow.innerWidth,
      });
      if (index) pdf.addPage();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = isA5 ? 5 : 7;
      const imageWidth = pageWidth - 2 * margin;
      const imageHeight = canvas.height * imageWidth / canvas.width;
      const fittedHeight = Math.min(imageHeight, pageHeight - 2 * margin);
      const fittedWidth = imageWidth * fittedHeight / imageHeight;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, fittedWidth, fittedHeight);
    }
    pdf.save(fileName);
  } finally {
    frame.remove();
  }
};
