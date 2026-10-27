import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class WatermarkedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_watermark()
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_watermark(self):
        self.saveState()
        self.setFont("Helvetica-Bold", 36)
        self.setFillColor(colors.Color(0.85, 0.2, 0.2, alpha=0.18))
        self.translate(396, 306)
        self.rotate(35)
        self.drawCentredString(0, 0, "SYNTHETIC SAMPLE - NOT A REAL FDR")
        self.drawCentredString(0, -45, "FOR AICTE TESTING ONLY")
        self.restoreState()

def generate_synthetic_fdr_pdf(output_path: str = "sample_synthetic_fdr.pdf") -> str:
    """
    Generates a beautifully structured, clearly marked synthetic Fixed Deposit Receipt for testing.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(letter),
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=1,
        textColor=colors.HexColor('#0f172a')
    )

    bank_sub_style = ParagraphStyle(
        'BankSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        alignment=1,
        textColor=colors.HexColor('#475569')
    )

    warning_banner_style = ParagraphStyle(
        'WarningBanner',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor('#991b1b')
    )

    cell_label_style = ParagraphStyle(
        'CellLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    cell_val_style = ParagraphStyle(
        'CellVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a')
    )

    lien_style = ParagraphStyle(
        'LienNotice',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#b91c1c')
    )

    story = []

    # Warning Header
    warning_text = Paragraph(
        "*** DEMONSTRATION & TESTING SAMPLE ONLY — FICTIONAL ENTITY — NOT A LEGAL FINANCIAL INSTRUMENT ***",
        warning_banner_style
    )
    story.append(warning_text)
    story.append(Spacer(1, 8))

    # Bank Title & Header
    story.append(Paragraph("BHARAT NATIONAL BANK (TEST SIMULATION ENTITY)", title_style))
    story.append(Paragraph("Regulatory Bureau Banking Wing, Vasant Kunj Branch, New Delhi 110070<br/>IFSC: <b>BNBK0009988</b> | MICR: 110024999 | Tel: +91 11 2958 1000", bank_sub_style))
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>SPECIAL FIXED DEPOSIT RECEIPT (AICTE SECURITY DEPOSIT)</b>", ParagraphStyle('FDRTitle', parent=title_style, fontSize=13, textColor=colors.HexColor('#1e40af'))))
    story.append(Spacer(1, 10))

    # Instrument Details Table
    table_data = [
        [
            Paragraph("FDR Reference Number:", cell_label_style),
            Paragraph("<b>BNB-FDR-2026-889900</b>", cell_val_style),
            Paragraph("Deposit Account Number:", cell_label_style),
            Paragraph("110022334455", cell_val_style),
        ],
        [
            Paragraph("Institution Name:", cell_label_style),
            Paragraph("Apex Institute of Advanced Technology & AI", cell_val_style),
            Paragraph("AICTE Permanent ID:", cell_label_style),
            Paragraph("<b>1-9087654321</b>", cell_val_style),
        ],
        [
            Paragraph("Principal Deposit Amount:", cell_label_style),
            Paragraph("<b>₹ 35,00,000.00</b> (Thirty-Five Lakhs Only)", cell_val_style),
            Paragraph("Maturity Value:", cell_label_style),
            Paragraph("<b>₹ 71,96,250.00</b>", cell_val_style),
        ],
        [
            Paragraph("Date of Deposit (Issue Date):", cell_label_style),
            Paragraph("<b>15/01/2024</b>", cell_val_style),
            Paragraph("Date of Maturity:", cell_label_style),
            Paragraph("<b>15/01/2034</b> (120 Months Tenure)", cell_val_style),
        ],
        [
            Paragraph("Interest Rate (% p.a.):", cell_label_style),
            Paragraph("<b>7.25% p.a.</b> (Compounded Quarterly)", cell_val_style),
            Paragraph("Deposit Classification:", cell_label_style),
            Paragraph("AICTE Mandatory Institutional Security Deposit", cell_val_style),
        ],
        [
            Paragraph("Joint Account Beneficiaries:", cell_label_style),
            Paragraph("Jointly: Regional Officer, All India Council for Technical Education (AICTE) & Principal, Apex Institute of Advanced Technology", cell_val_style),
            Paragraph("Discharge Condition:", cell_label_style),
            Paragraph("Joint signature & AICTE formal discharge voucher mandatory", cell_val_style),
        ]
    ]

    t = Table(table_data, colWidths=[150, 210, 150, 210])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Mandatory Lien Endorsement Block
    lien_text = Paragraph(
        "<b>MANDATORY AICTE LIEN ENDORSEMENT CLAUSE:</b><br/>"
        "It is certified that the above Fixed Deposit Receipt has been placed under exclusive, irrevocable regulatory lien in favor of "
        "<b>Member Secretary / Regional Officer, All India Council for Technical Education (AICTE), New Delhi</b>. "
        "The issuing bank undertakes not to permit any premature closure, renewal modification, or loan against this deposit without "
        "prior authenticated written discharge authorization issued by the AICTE Regulation Bureau.",
        lien_style
    )
    story.append(lien_text)
    story.append(Spacer(1, 20))

    # Signatures
    sig_data = [
        [
            Paragraph("<b>Prepared By:</b><br/>Authorized Officer<br/>Employee ID: BNB-84920", cell_val_style),
            Paragraph("<b>Verified By (CBS Cell):</b><br/>Branch Operations Manager<br/>Employee ID: BNB-30219", cell_val_style),
            Paragraph("<b>Bank Official Seal & Signature:</b><br/>Chief Manager / Branch Head<br/>Bharat National Bank, Vasant Kunj", cell_val_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[240, 240, 240])
    sig_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sig_table)

    doc.build(story, canvasmaker=WatermarkedCanvas)
    return output_path

if __name__ == "__main__":
    generate_synthetic_fdr_pdf()
    print("Synthetic sample FDR generated successfully.")
