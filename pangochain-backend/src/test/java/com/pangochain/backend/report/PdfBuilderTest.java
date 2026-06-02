package com.pangochain.backend.report;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PdfBuilderTest {

    @Test
    void producesValidMultiPagePdf() throws Exception {
        byte[] pdf;
        try (PdfBuilder b = new PdfBuilder()) {
            b.title("PangoChain Compliance Report")
             .subtitle("Access Log Summary")
             .rule()
             .heading("Events by type");
            // Force pagination by writing well past one page.
            for (int i = 0; i < 120; i++) b.row("DOCUMENT_ACCESS_" + i, i + " events");
            b.mono("tx=0xdeadbeef-anchored-on-fabric");
            pdf = b.toBytes();
        }

        // Valid PDF signature and parseable by PDFBox with at least 2 pages.
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(2);
        }
    }

    @Test
    void sanitisesNonLatinCharacters() {
        try (PdfBuilder b = new PdfBuilder()) {
            b.paragraph("Unicode smart quotes “hello” and emoji 😀 should not throw");
            assertThat(b.toBytes().length).isGreaterThan(100);
        }
    }
}
