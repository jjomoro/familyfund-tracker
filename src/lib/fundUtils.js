export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function formatMoney(amount, currency = "KES") {
  const roundedAmount = Number(amount || 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(roundedAmount);
}

export function getMemberById(members, memberId) {
  return members.find((member) => member.id === memberId);
}

export function calculateFundBalance(contributions, withdrawals) {
  const totalContributions = contributions.reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0);
  const approvedWithdrawals = withdrawals
    .filter((withdrawal) => withdrawal.status === "approved")
    .reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);

  return totalContributions - approvedWithdrawals;
}

export function getMemberMonthlyPaid(contributions, memberId, month, year) {
  return contributions
    .filter(
      (contribution) =>
        contribution.member_id === memberId &&
        Number(contribution.month) === Number(month) &&
        Number(contribution.year) === Number(year)
    )
    .reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0);
}

export function getContributionStatus(target, paid) {
  if (Number(target || 0) <= 0) return "paid";
  if (Number(paid || 0) >= Number(target)) return "paid";
  if (Number(paid || 0) > 0) return "partial";
  return "outstanding";
}

export function calculateOutstanding(members, contributions, date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return members
    .filter((member) => member.role === "member")
    .map((member) => {
      const paid = getMemberMonthlyPaid(contributions, member.id, month, year);
      const owed = Math.max(Number(member.monthly_target || 0) - paid, 0);
      const status = getContributionStatus(member.monthly_target, paid);
      return { member, paid, owed, status, month, year };
    })
    .filter((item) => item.owed > 0);
}

export function getMonthsSinceStart(startDate, maxMonths = 12) {
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const firstAllowed = new Date(now.getFullYear(), now.getMonth() - maxMonths + 1, 1);

  if (cursor < firstAllowed) cursor.setTime(firstAllowed.getTime());

  while (cursor <= now) {
    months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function getMonthlyGrowth(contributions, withdrawals, startDate) {
  let runningBalance = 0;
  return getMonthsSinceStart(startDate).map(({ month, year }) => {
    const monthContributionTotal = contributions
      .filter((contribution) => Number(contribution.month) === month && Number(contribution.year) === year)
      .reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0);

    const monthWithdrawalTotal = withdrawals
      .filter((withdrawal) => {
        if (withdrawal.status !== "approved" || !withdrawal.reviewed_at) return false;
        const reviewedDate = new Date(withdrawal.reviewed_at);
        return reviewedDate.getMonth() + 1 === month && reviewedDate.getFullYear() === year;
      })
      .reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);

    runningBalance += monthContributionTotal - monthWithdrawalTotal;

    return {
      month,
      year,
      label: `${monthNames[month - 1].slice(0, 3)} ${String(year).slice(2)}`,
      contributionTotal: monthContributionTotal,
      withdrawalTotal: monthWithdrawalTotal,
      balance: runningBalance
    };
  });
}

export function getMemberContributionHistory(member, contributions, settings) {
  if (!member || !settings?.start_date) return [];

  const months = getMonthsSinceStart(settings.start_date);
  return months.map(({ month, year }) => {
    const paid = getMemberMonthlyPaid(contributions, member.id, month, year);
    const status = getContributionStatus(member.monthly_target, paid);
    return {
      member,
      month,
      year,
      paid,
      target: Number(member.monthly_target || 0),
      outstanding: Math.max(Number(member.monthly_target || 0) - paid, 0),
      status
    };
  });
}

export function getAdminContributionHistory(members, contributions, settings) {
  return members
    .filter((member) => member.role === "member")
    .flatMap((member) => getMemberContributionHistory(member, contributions, settings));
}

export function getRecentActivity(members, contributions, withdrawals, auditTrail, limit = 5) {
  const contributionItems = contributions.map((contribution) => {
    const member = getMemberById(members, contribution.member_id);
    return {
      id: contribution.id,
      type: "contribution",
      title: "Contribution recorded",
      detail: `${member?.name || "Unknown member"} paid for ${monthNames[contribution.month - 1]} ${contribution.year}`,
      amount: contribution.amount,
      status: contribution.status,
      created_at: contribution.recorded_at
    };
  });

  const withdrawalItems = withdrawals.map((withdrawal) => {
    const member = getMemberById(members, withdrawal.requested_by_member_id);
    return {
      id: withdrawal.id,
      type: "withdrawal",
      title: withdrawal.status === "pending" ? "Withdrawal requested" : `Withdrawal ${withdrawal.status}`,
      detail: `${member?.name || "Unknown member"}: ${withdrawal.reason}`,
      amount: withdrawal.amount,
      status: withdrawal.status,
      created_at: withdrawal.reviewed_at || withdrawal.requested_at
    };
  });

  const auditItems = auditTrail.map((item) => ({ ...item, status: item.status || item.type }));

  return [...contributionItems, ...withdrawalItems, ...auditItems]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, limit);
}

export function buildAuditItem({ type, title, detail, amount, status }) {
  return {
    id: createId("audit"),
    type,
    title,
    detail,
    amount: Number(amount || 0),
    status,
    created_at: new Date().toISOString()
  };
}
