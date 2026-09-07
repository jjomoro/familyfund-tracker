import { monthNames, formatMoney } from "./fundUtils";

export function getReportPeriods(type, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const year = date.getFullYear();

  if (type === "monthly") {
    return Array.from({ length: 24 }, (_, index) => {
      const d = new Date(year, date.getMonth() - index, 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    });
  }

  if (type === "quarterly") {
    const currentQuarter = Math.floor(date.getMonth() / 3);
    return Array.from({ length: 8 }, (_, index) => {
      const quarterIndex = currentQuarter - index;
      const quarterDate = new Date(year, quarterIndex * 3, 1);
      const q = Math.floor(quarterDate.getMonth() / 3) + 1;
      return {
        key: `${quarterDate.getFullYear()}-Q${q}`,
        label: `Q${q} ${quarterDate.getFullYear()}`,
        start: new Date(quarterDate.getFullYear(), quarterDate.getMonth(), 1),
        end: new Date(quarterDate.getFullYear(), quarterDate.getMonth() + 3, 0, 23, 59, 59, 999)
      };
    });
  }

  return Array.from({ length: 5 }, (_, index) => {
    const y = year - index;
    return {
      key: String(y),
      label: String(y),
      start: new Date(y, 0, 1),
      end: new Date(y, 11, 31, 23, 59, 59, 999)
    };
  });
}

export function getReportData({ type, period, members, contributions, withdrawals, settings }) {
  const start = period.start;
  const end = period.end;
  const effectiveEnd = end > new Date() ? new Date() : end;
  const startTime = start.getTime();
  const endTime = effectiveEnd.getTime();
  const memberMap = new Map(members.map((member) => [member.id, member]));

  const periodContributions = contributions.filter((item) => {
    const date = new Date(Number(item.year), Number(item.month) - 1, 1);
    return date.getTime() >= new Date(start.getFullYear(), start.getMonth(), 1).getTime() && date.getTime() <= new Date(end.getFullYear(), end.getMonth(), 1).getTime();
  });

  const periodWithdrawals = withdrawals.filter((item) => {
    const dateValue = item.reviewed_at || item.requested_at;
    if (!dateValue) return false;
    const time = new Date(dateValue).getTime();
    return time >= startTime && time <= endTime;
  });

  const contributionTotal = periodContributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const approvedWithdrawals = periodWithdrawals.filter((item) => item.status === "approved");
  const approvedWithdrawalTotal = approvedWithdrawals.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingWithdrawals = periodWithdrawals.filter((item) => item.status === "pending");
  const pendingWithdrawalTotal = pendingWithdrawals.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const memberRows = members
    .filter((member) => member.role === "member")
    .map((member) => {
      const paid = periodContributions
        .filter((item) => item.member_id === member.id)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const targetMonths = getMonthsInPeriod(start, effectiveEnd);
      const target = Number(member.monthly_target || 0) * targetMonths;
      return { member, paid, target, outstanding: Math.max(target - paid, 0) };
    })
    .sort((a, b) => b.paid - a.paid || a.member.name.localeCompare(b.member.name));

  const monthlyRows = getMonthsInPeriod(start, effectiveEnd).map((_, index) => {
    const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const contribution = periodContributions
      .filter((item) => Number(item.month) === d.getMonth() + 1 && Number(item.year) === d.getFullYear())
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const withdrawal = approvedWithdrawals
      .filter((item) => {
        const reviewed = new Date(item.reviewed_at);
        return reviewed.getMonth() === d.getMonth() && reviewed.getFullYear() === d.getFullYear();
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { label: `${monthNames[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`, contribution, withdrawal, net: contribution - withdrawal };
  });

  const balanceBeforePeriod = contributions.reduce((sum, item) => {
    const date = new Date(Number(item.year), Number(item.month) - 1, 1);
    if (date < start) return sum + Number(item.amount || 0);
    return sum;
  }, 0) - withdrawals.filter((item) => item.status === "approved" && new Date(item.reviewed_at) < start).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const closingBalance = balanceBeforePeriod + contributionTotal - approvedWithdrawalTotal;

  return {
    type,
    period,
    currency: settings.currency || "KES",
    fundName: settings.fund_name || "Family Emergency Fund",
    contributionTotal,
    approvedWithdrawalTotal,
    pendingWithdrawalTotal,
    closingBalance,
    openingBalance: balanceBeforePeriod,
    memberRows,
    monthlyRows,
    periodContributions,
    periodWithdrawals,
    memberMap
  };
}

export function getMonthsInPeriod(start, end) {
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function formatReportMoney(amount, currency) {
  return formatMoney(amount, currency);
}

export function reportPeriodLabel(type) {
  if (type === "monthly") return "Monthly Report";
  if (type === "quarterly") return "Quarterly Report";
  return "Annual Report";
}
