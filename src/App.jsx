import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ContributionsPage from "./pages/ContributionsPage";
import WithdrawalsPage from "./pages/WithdrawalsPage";
import SettingsPage from "./pages/SettingsPage";
import {
  getInitialSession,
  loadFundData,
  onAuthStateChange,
  deleteMember as deleteMemberRequest,
  recordContribution as recordContributionRequest,
  reviewWithdrawal as reviewWithdrawalRequest,
  saveMember as saveMemberRequest,
  saveSettings as saveSettingsRequest,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  submitWithdrawal as submitWithdrawalRequest
} from "./lib/fundService";
import "./styles.css";

const defaultSettings = {
  fund_name: "Family Emergency Fund",
  currency: "KES",
  start_date: new Date().toISOString().slice(0, 10)
};

export default function App() {
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [auditTrail, setAuditTrail] = useState([]);
  const [dashboardSnapshot, setDashboardSnapshot] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isSignedIn = Boolean(session?.user);

  const refreshData = useCallback(async ({ silent = false } = {}) => {
    if (!session?.user?.id) return;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const data = await loadFundData(session.user.id);
      setMembers(data.members);
      setCurrentUser(data.currentUser);
      setSettings(data.settings || defaultSettings);
      setContributions(data.contributions);
      setWithdrawals(data.withdrawals);
      setAuditTrail(data.auditTrail);
      setDashboardSnapshot(data.dashboardSnapshot);

      if (!data.currentUser) {
        setErrorMessage("Your login is valid, but no member profile was found. Ask the admin to add your email in Settings.");
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      setIsLoading(true);
      try {
        const initialSession = await getInitialSession();
        if (isMounted) setSession(initialSession);
      } catch (error) {
        if (isMounted) setErrorMessage(error.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    boot();
    const unsubscribe = onAuthStateChange((nextSession) => setSession(nextSession));

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      refreshData();
    } else {
      setMembers([]);
      setCurrentUser(null);
      setContributions([]);
      setWithdrawals([]);
      setAuditTrail([]);
      setDashboardSnapshot(null);
      setIsLoading(false);
    }
  }, [isSignedIn, refreshData]);

  async function handleSignIn(payload) {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await signInWithEmail(payload);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUp(payload) {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await signUpWithEmail(payload);
      setErrorMessage("Account created. If email confirmation is enabled, confirm your email, then sign in.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function runMutation(action) {
    if (!currentUser) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await action();
      await refreshData({ silent: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function recordContribution(payload) {
    runMutation(() => recordContributionRequest({ members, contributions, currentUser, payload }));
  }

  function submitWithdrawal(payload) {
    runMutation(() => submitWithdrawalRequest({ members, currentUser, payload }));
  }

  function reviewWithdrawal(withdrawalId, status, rejectionNote = "") {
    const withdrawal = withdrawals.find((item) => item.id === withdrawalId);
    runMutation(() => reviewWithdrawalRequest({ members, currentUser, withdrawal, status, rejectionNote }));
  }

  function saveMember(memberPayload) {
    runMutation(() => saveMemberRequest({ currentUser, memberPayload }));
  }

  function deleteMember(member) {
    runMutation(() => deleteMemberRequest({ currentUser, member }));
  }

  function saveSettings(nextSettings) {
    runMutation(() => saveSettingsRequest({ currentUser, settings: nextSettings }));
  }

  const readyToRenderApp = useMemo(() => isSignedIn && currentUser && !isLoading, [isSignedIn, currentUser, isLoading]);

  if (!isSignedIn) {
    return (
      <AuthPage
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />
    );
  }

  if (isLoading) {
    return <main className="loading-shell">Loading FamilyFund Tracker...</main>;
  }

  if (!readyToRenderApp) {
    return (
      <main className="loading-shell">
        <section className="table-card profile-warning">
          <h2>Member profile needed</h2>
          <p className="muted">{errorMessage || "Your account does not have a FamilyFund member profile yet."}</p>
          <div className="inline-actions">
            <button type="button" className="secondary-button" onClick={() => refreshData({ silent: true })}>Try again</button>
            <button type="button" className="ghost-button" onClick={handleSignOut}>Sign out</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <Layout
      page={page}
      setPage={setPage}
      currentUser={currentUser}
      settings={settings}
      onSignOut={handleSignOut}
      onRefresh={() => refreshData({ silent: true })}
      isRefreshing={isRefreshing}
    >
      {errorMessage ? <div className="error-box page-error">{errorMessage}</div> : null}

      {page === "dashboard" ? (
        <DashboardPage
          members={members}
          contributions={contributions}
          withdrawals={withdrawals}
          auditTrail={auditTrail}
          settings={settings}
          dashboardSnapshot={dashboardSnapshot}
        />
      ) : null}

      {page === "contributions" ? (
        <ContributionsPage
          members={members}
          currentUser={currentUser}
          contributions={contributions}
          settings={settings}
          onRecordContribution={recordContribution}
          isSubmitting={isSubmitting}
        />
      ) : null}

      {page === "withdrawals" ? (
        <WithdrawalsPage
          members={members}
          currentUser={currentUser}
          withdrawals={withdrawals}
          settings={settings}
          onSubmitWithdrawal={submitWithdrawal}
          onReviewWithdrawal={reviewWithdrawal}
          isSubmitting={isSubmitting}
        />
      ) : null}

      {page === "settings" ? (
        <SettingsPage
          members={members}
          currentUser={currentUser}
          settings={settings}
          onSaveMember={saveMember}
          onDeleteMember={deleteMember}
          onSaveSettings={saveSettings}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </Layout>
  );
}
