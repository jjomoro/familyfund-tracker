import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatReportMoney, reportPeriodLabel } from "./reportUtils";

export function downloadFundReport(report) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const money = (value) => formatReportMoney(value, report.currency);
  const periodLabel = report.period.label;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(report.fundName, margin, 18);
  doc.setFontSize(13);
  doc.text(reportPeriodLabel(report.type), margin, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(periodLabel, margin, 33);
  doc.text(`Generated ${new Date().toLocaleDateString("en-KE")}`, 196, 33, { align: "right" });

  autoTable(doc, {
    startY: 41,
    theme: "grid",
    head: [["Summary", "Amount"]],
    body: [
      ["Opening balance", money(report.openingBalance)],
      ["Contributions received", money(report.contributionTotal)],
      ["Approved withdrawals", money(report.approvedWithdrawalTotal)],
      ["Pending withdrawals", money(report.pendingWithdrawalTotal)],
      ["Closing balance", money(report.closingBalance)]
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } }
  });

  let y = doc.lastAutoTable.finalY + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Member contributions", margin, y);

  autoTable(doc, {
    startY: y + 4,
    theme: "striped",
    head: [["Member", "Target", "Paid", "Outstanding"]],
    body: report.memberRows.map((row) => [row.member.name, money(row.target), money(row.paid), money(row.outstanding)]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } }
  });

  y = doc.lastAutoTable.finalY + 9;
  if (y > 265) { doc.addPage(); y = 18; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Period activity by month", margin, y);
  autoTable(doc, {
    startY: y + 4,
    theme: "grid",
    head: [["Month", "Contributions", "Withdrawals", "Net"]],
    body: report.monthlyRows.map((row) => [row.label, money(row.contribution), money(row.withdrawal), money(row.net)]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } }
  });

  y = doc.lastAutoTable.finalY + 9;
  if (y > 260) { doc.addPage(); y = 18; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Withdrawals", margin, y);
  const withdrawalRows = report.periodWithdrawals.map((item) => [
    report.memberMap.get(item.requested_by_member_id)?.name || "Unknown member",
    money(item.amount),
    item.status,
    item.reason || "—",
    item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString("en-KE") : new Date(item.requested_at).toLocaleDateString("en-KE")
  ]);
  autoTable(doc, {
    startY: y + 4,
    theme: "striped",
    head: [["Member", "Amount", "Status", "Reason", "Date"]],
    body: withdrawalRows.length ? withdrawalRows : [["No withdrawals in this period", "", "", "", ""]],
    styles: { fontSize: 7.5, cellPadding: 2.3, overflow: "linebreak" },
    headStyles: { fontStyle: "bold" }
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${report.fundName} • ${periodLabel}`, margin, 289);
    doc.text(`Page ${page} of ${pages}`, 196, 289, { align: "right" });
  }

  const safeFund = report.fundName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "family-fund";
  const safePeriod = report.period.key.replace(/[^a-z0-9-]+/gi, "-");
  doc.save(`${safeFund}-${report.type}-${safePeriod}.pdf`);
}
