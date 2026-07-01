import { supabase } from "./supabaseClient";
import {
  buildAuditItem,
  getContributionStatus,
  getMemberById,
  getMemberMonthlyPaid
} from "./fundUtils";

function normalizeArray(data) {
  return Array.isArray(data) ? data : [];
}

function normalizeSnapshot(snapshot) {
  return {
    fundBalance: Number(snapshot?.fundBalance || 0),
    monthlyGrowth: normalizeArray(snapshot?.monthlyGrowth).map((item) => ({
      ...item,
      month: Number(item.month),
      year: Number(item.year),
      contributionTotal: Number(item.contributionTotal || 0),
      withdrawalTotal: Number(item.withdrawalTotal || 0),
      balance: Number(item.balance || 0)
    })),
    outstanding: normalizeArray(snapshot?.outstanding).map((item) => ({
      ...item,
      paid: Number(item.paid || 0),
      owed: Number(item.owed || 0),
      member: {
        ...item.member,
        monthly_target: Number(item.member?.monthly_target || 0)
      }
    })),
    recentActivity: normalizeArray(snapshot?.recentActivity).map((item) => ({
      ...item,
      amount: Number(item.amount || 0)
    }))
  };
}

function throwIfError(error, fallbackMessage = "Supabase request failed") {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
}

export async function signInWithEmail({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  throwIfError(error, "Could not sign in");
}

export async function signUpWithEmail({ name, email, password }) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });
  throwIfError(error, "Could not create account");
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error, "Could not sign out");
}

export async function getInitialSession() {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error, "Could not read session");
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}

export async function loadFundData(authUserId) {
  const [membersResult, settingsResult, contributionsResult, withdrawalsResult, auditResult, snapshotResult] = await Promise.all([
    supabase.from("members").select("*").order("name", { ascending: true }),
    supabase.from("fund_settings").select("*").eq("id", 1).single(),
    supabase.from("contributions").select("*").order("recorded_at", { ascending: false }),
    supabase.from("withdrawals").select("*").order("requested_at", { ascending: false }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.rpc("get_dashboard_snapshot")
  ]);

  throwIfError(membersResult.error, "Could not load members");
  throwIfError(settingsResult.error, "Could not load settings");
  throwIfError(contributionsResult.error, "Could not load contributions");
  throwIfError(withdrawalsResult.error, "Could not load withdrawals");
  throwIfError(auditResult.error, "Could not load activity");
  throwIfError(snapshotResult.error, "Could not load dashboard summary");

  const members = normalizeArray(membersResult.data).map((member) => ({
    ...member,
    monthly_target: Number(member.monthly_target || 0)
  }));

  const currentUser = members.find((member) => member.user_id === authUserId) || null;

  return {
    members,
    currentUser,
    settings: settingsResult.data,
    contributions: normalizeArray(contributionsResult.data).map((contribution) => ({
      ...contribution,
      amount: Number(contribution.amount || 0)
    })),
    withdrawals: normalizeArray(withdrawalsResult.data).map((withdrawal) => ({
      ...withdrawal,
      amount: Number(withdrawal.amount || 0)
    })),
    auditTrail: normalizeArray(auditResult.data).map((item) => ({
      ...item,
      amount: Number(item.amount || 0)
    })),
    dashboardSnapshot: normalizeSnapshot(snapshotResult.data)
  };
}

export async function recordContribution({ members, contributions, currentUser, payload }) {
  if (currentUser.role !== "admin") throw new Error("Only admins can record contributions.");

  const member = getMemberById(members, payload.member_id);
  const alreadyPaid = getMemberMonthlyPaid(contributions, payload.member_id, payload.month, payload.year);
  const amount = Number(payload.amount || 0);
  const status = getContributionStatus(member?.monthly_target || 0, alreadyPaid + amount);

  const { data, error } = await supabase
    .from("contributions")
    .insert({
      member_id: payload.member_id,
      amount,
      month: Number(payload.month),
      year: Number(payload.year),
      status,
      recorded_by: currentUser.id
    })
    .select()
    .single();

  throwIfError(error, "Could not record contribution");

  await writeAudit({
    ...buildAuditItem({
      type: "contribution_recorded",
      title: "Contribution recorded",
      detail: `${member?.name || "Unknown member"} paid ${amount.toLocaleString()}`,
      amount,
      status
    }),
    actor_member_id: currentUser.id
  });

  return data;
}

export async function submitWithdrawal({ members, currentUser, payload }) {
  const requestedBy = currentUser.role === "admin" ? payload.requested_by_member_id : currentUser.id;
  const amount = Number(payload.amount || 0);
  const requester = getMemberById(members, requestedBy);

  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      requested_by_member_id: requestedBy,
      amount,
      reason: payload.reason,
      status: "pending"
    })
    .select()
    .single();

  throwIfError(error, "Could not submit withdrawal request");

  await writeAudit({
    ...buildAuditItem({
      type: "withdrawal_requested",
      title: "Withdrawal requested",
      detail: `${requester?.name || "Unknown member"} requested support: ${payload.reason}`,
      amount,
      status: "pending"
    }),
    actor_member_id: currentUser.id
  });

  return data;
}

export async function reviewWithdrawal({ members, currentUser, withdrawal, status, rejectionNote = "" }) {
  if (currentUser.role !== "admin") throw new Error("Only admins can review withdrawals.");
  if (!withdrawal || withdrawal.status !== "pending") throw new Error("This withdrawal is not pending.");

  const { data, error } = await supabase
    .from("withdrawals")
    .update({
      status,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      rejection_note: status === "rejected" ? rejectionNote : null
    })
    .eq("id", withdrawal.id)
    .select()
    .single();

  throwIfError(error, "Could not review withdrawal");

  const requester = getMemberById(members, withdrawal.requested_by_member_id);
  await writeAudit({
    ...buildAuditItem({
      type: `withdrawal_${status}`,
      title: `Withdrawal ${status}`,
      detail: `${requester?.name || "Unknown member"} request ${status}`,
      amount: withdrawal.amount,
      status
    }),
    actor_member_id: currentUser.id
  });

  return data;
}

export async function saveMember({ currentUser, memberPayload }) {
  if (currentUser.role !== "admin") throw new Error("Only admins can save members.");

  const payload = {
    name: memberPayload.name,
    email: memberPayload.email,
    monthly_target: Number(memberPayload.monthly_target || 0),
    role: memberPayload.role
  };

  const request = memberPayload.id
    ? supabase.from("members").update(payload).eq("id", memberPayload.id).select().single()
    : supabase.from("members").insert(payload).select().single();

  const { data, error } = await request;
  throwIfError(error, "Could not save member");

  await writeAudit({
    ...buildAuditItem({
      type: memberPayload.id ? "member_updated" : "member_added",
      title: memberPayload.id ? "Member updated" : "Member added",
      detail: `${payload.name} — ${payload.role}`,
      amount: payload.monthly_target,
      status: payload.role
    }),
    actor_member_id: currentUser.id
  });

  return data;
}

export async function saveSettings({ currentUser, settings }) {
  if (currentUser.role !== "admin") throw new Error("Only admins can save fund settings.");

  const { data, error } = await supabase
    .from("fund_settings")
    .upsert({
      id: 1,
      fund_name: settings.fund_name,
      currency: settings.currency,
      start_date: settings.start_date
    })
    .select()
    .single();

  throwIfError(error, "Could not save settings");

  await writeAudit({
    ...buildAuditItem({
      type: "settings_updated",
      title: "Fund settings updated",
      detail: `${settings.fund_name} starts ${settings.start_date}`,
      amount: 0,
      status: "approved"
    }),
    actor_member_id: currentUser.id
  });

  return data;
}

async function writeAudit(item) {
  const { error } = await supabase.from("audit_logs").insert({
    type: item.type,
    title: item.title,
    detail: item.detail,
    amount: Number(item.amount || 0),
    status: item.status,
    actor_member_id: item.actor_member_id || null
  });

  throwIfError(error, "Could not write audit log");
}
