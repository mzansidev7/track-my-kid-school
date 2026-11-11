import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiCreditCard, FiFileText, FiRefreshCw } from "react-icons/fi";
import { apiRequest } from "../api";
import "../styles/billing.css";
import SchoolPageHeader from "../components/SchoolPageHeader";

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

const money = (cents) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(cents || 0) / 100);

const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-ZA") : "—";

const getTrialRemainingDuration = (endsAt) => {
  const end = new Date(endsAt);
  const now = new Date();
  if (Number.isNaN(end.getTime()) || end <= now) {
    return { months: 0, days: 0 };
  }

  let months = 0;
  while (months < 3) {
    const nextMonth = new Date(now);
    const dayOfMonth = nextMonth.getUTCDate();
    nextMonth.setUTCDate(1);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + months + 1);
    const lastDayOfMonth = new Date(
      Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
    ).getUTCDate();
    nextMonth.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
    if (nextMonth > end) break;
    months += 1;
  }

  const nextMonth = new Date(now);
  const dayOfMonth = nextMonth.getUTCDate();
  nextMonth.setUTCDate(1);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  nextMonth.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  const days = Math.ceil((end.getTime() - nextMonth.getTime()) / 86400000);

  return { months, days: Math.max(days, 0) };
};

export default function Billing() {
  const session = readSession();
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session.token || ""}` }),
    [session.token],
  );
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reportingInvoice, setReportingInvoice] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [interval, setInterval] = useState("monthly");
  const [method, setMethod] = useState("card");
  const [selectedPlan, setSelectedPlan] = useState("starter");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const result = await apiRequest("/school/billing", { headers });
      setBilling(result);
      if (result.subscription?.plan_slug) {
        setSelectedPlan(result.subscription.plan_slug);
        if (["monthly", "annual"].includes(result.subscription.billing_interval)) {
          setInterval(result.subscription.billing_interval);
        }
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to load billing details.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const current = billing?.subscription;
  const canResumeCheckout =
    current?.billing_status === "pending" &&
    current.billing_provider === "paystack";
  const isSelectedCheckout =
    canResumeCheckout &&
    current?.plan_slug === selectedPlan &&
    current.billing_interval === interval;
  const canBuy = !current || ["canceled", "expired"].includes(current.billing_status);
  const canRequestBankTransferRenewal =
    current?.can_request_bank_transfer_renewal;
  const canProceed = method === "bank_transfer"
    ? canBuy || canRequestBankTransferRenewal || canResumeCheckout
    : canBuy || canResumeCheckout;
  const submit = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (method === "card") {
        const result = await apiRequest("/school/billing/checkout", {
          method: "POST",
          headers,
          body: JSON.stringify({
            plan_slug: selectedPlan,
            billing_interval: interval,
          }),
        });
        window.location.assign(result.checkout_url);
        return;
      }
      const result = await apiRequest("/school/billing/invoices", {
        method: "POST",
        headers,
        body: JSON.stringify({
          plan_slug: selectedPlan,
          billing_interval: interval,
        }),
      });
      setNotice(`Invoice ${result.invoice.invoice_number} is ready. Pay by EFT using the invoice number as your reference.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to start the selected payment.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm("Turn off automatic renewal? Your school will retain access through the paid period.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest("/school/billing/cancel", {
        method: "POST",
        headers,
      });
      setNotice("Automatic renewal has been turned off.");
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel renewal.");
    } finally {
      setBusy(false);
    }
  };

  const reportEftPayment = async (invoice) => {
    setReportingInvoice(invoice.id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/school/billing/invoices/${invoice.id}/payment-reported`, {
        method: "POST",
        headers,
      });
      setNotice(
        `Your EFT payment for invoice ${invoice.invoice_number} has been reported. Support will confirm it after checking the bank account.`,
      );
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to report the EFT payment.");
    } finally {
      setReportingInvoice("");
    }
  };

  if (loading) return <main className="billing-page"><p>Loading subscription details…</p></main>;

  const learnerCount = billing?.learner_count || 0;
  const selected = billing?.plans?.find((plan) => plan.slug === selectedPlan);
  const pendingInvoice = billing?.invoices?.find((invoice) => invoice.status === "awaiting_payment");
  const paymentPending =
    current?.billing_status === "pending" || Boolean(pendingInvoice);
  const bank = billing?.bank_details || {};
  const trial = billing?.trial;
  const trialDurationRemaining = trial?.ends_at
    ? getTrialRemainingDuration(trial.ends_at)
    : { months: 0, days: trial?.days_remaining || 0 };
  const trialDaysRemaining = trial?.days_remaining || 0;
  const trialDurationLabel = [
    trialDurationRemaining.months
      ? `${trialDurationRemaining.months} month${trialDurationRemaining.months === 1 ? "" : "s"}`
      : "",
    trialDurationRemaining.days
      ? `${trialDurationRemaining.days} day${trialDurationRemaining.days === 1 ? "" : "s"}`
      : "",
  ]
    .filter(Boolean)
    .join(" and ");
  const schoolName = billing?.school?.name || "Your school";
  const hasPaidSubscription = current?.billing_status === "active";
  const approvalPending = trial?.status === "pending_approval";
  const trialPlan = billing?.plans?.find(
    (plan) => plan.slug === trial?.recommended_plan_slug,
  );

  return (
    <main className="billing-page">
      <SchoolPageHeader
        className="billing-heading"
        eyebrow="SCHOOL ACCOUNT"
        titleIcon={<span className="school-page-heading-icon"><FiCreditCard /></span>}
        title="Subscription & Billing"
        description="Simple plans for your school, billed in South African rand."
        actions={
          <button className="billing-refresh" type="button" onClick={() => void refresh()}>
          <FiRefreshCw /> Refresh
          </button>
        }
      />

      {approvalPending && !hasPaidSubscription && (
        <div className="billing-alert warning" role="status">
          <strong>Awaiting admin approval</strong>{" "}
          Your school registration is awaiting approval from Track My Kid support. Your 3-month free trial starts on the approval date.
        </div>
      )}
      {trial?.status === "rejected" && !hasPaidSubscription && (
        <div className="billing-alert warning" role="status">
          <strong>Registration not approved</strong>{" "}
          Please contact Track My Kid support for information about your school registration.
        </div>
      )}
      {!hasPaidSubscription && !approvalPending && trial?.status !== "rejected" && paymentPending && (
        <div className="billing-alert warning" role="status">
          <strong>Pending payment</strong>{" "}
          {pendingInvoice
            ? pendingInvoice.payment_reported_at
              ? `EFT payment for invoice ${pendingInvoice.invoice_number} has been reported and is waiting for support confirmation.`
              : `Invoice ${pendingInvoice.invoice_number} is awaiting payment.`
            : "Your card checkout is not complete; payment has not been confirmed."}
          {trial?.status === "active" &&
            ` Your free trial has ${trialDurationLabel} remaining (${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} total), ending ${date(trial.ends_at)}.`}
          {trial?.status === "expired" &&
            ` Your free trial ended ${date(trial.ends_at)}. School access is limited to billing until payment is confirmed.`}
        </div>
      )}
      {!hasPaidSubscription && !approvalPending && !paymentPending && trial?.status === "active" && (
        <div className="billing-alert" role="status">
          <strong>Free trial</strong>{" "}
          {schoolName} has {trialDurationLabel} remaining ({trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} total) in its 3-month free trial, ending {date(trial.ends_at)}. Starter includes up to {trial.starter_learner_limit} learners. No payment is taken automatically when the trial ends.
        </div>
      )}
      {!hasPaidSubscription &&
      !approvalPending &&
      trial?.status !== "rejected" &&
      !paymentPending &&
      trial?.status === "expired" && (
          <div className="billing-alert warning" role="status">
            <strong>Trial ended</strong>{" "}
            Your free trial ended {date(trial.ends_at)}. No payment was taken automatically. Choose a plan to restore full school access.
          </div>
        )}

      {error && <div className="billing-alert error" role="alert">{error}</div>}
      {notice && <div className="billing-alert success" role="status">{notice}</div>}
      {new URLSearchParams(window.location.search).get("checkout") === "success" && (
        <div className="billing-alert success" role="status">
          Checkout completed. Your subscription status will update after payment confirmation.
        </div>
      )}
      {new URLSearchParams(window.location.search).get("checkout") === "cancelled" && (
        <div className="billing-alert">Checkout was cancelled; you have not been charged.</div>
      )}

      <section className="billing-current">
        <div>
          <span className="billing-eyebrow">CURRENT SUBSCRIPTION</span>
          {current ? (
            <>
              <h2>{billing.plans.find((plan) => plan.slug === current.plan_slug)?.name || current.plan_slug}</h2>
              <p>
                {current.billing_status.replaceAll("_", " ")} · {money(current.price_cents)} per {current.billing_interval === "annual" ? "year" : "month"}
              </p>
              <small>Paid through {date(current.current_period_end)} · {learnerCount} learners</small>
              {current.billing_status === "past_due" && current.grace_period_ends_at && (
                <p className="billing-grace">
                  Payment overdue. Your 14-day grace period ends {date(current.grace_period_ends_at)}.
                  School and learner-safety information remains available.
                </p>
              )}
              {current.billing_status === "active" && current.auto_renew && (
                <button className="billing-cancel" disabled={busy} type="button" onClick={() => void cancel()}>
                  Turn off automatic renewal
                </button>
              )}
            </>
          ) : trial?.status === "rejected" ? (
            <p>Your school registration was not approved. Please contact Track My Kid support for more information.</p>
          ) : (
            <>
              <h2>
                {trial?.status === "active"
                  ? "3-month free trial"
                  : approvalPending
                    ? "Awaiting admin approval"
                    : trial?.status === "rejected"
                      ? "Registration not approved"
                      : "No paid plan yet"}
              </h2>
              {trial?.status === "active" ? (
                <p>
                  {schoolName} is in its 3-month free trial, with {trialDurationLabel} remaining ({trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} total) · ends {date(trial.ends_at)} · {learnerCount} learners
                </p>
              ) : trial?.status === "expired" ? (
                <p>Your 3-month trial ended {date(trial.ends_at)}. Choose a plan to subscribe. No payment is taken automatically, and school access is limited to billing until a paid subscription is confirmed.</p>
              ) : approvalPending ? (
                <p>Your school must be approved by Track My Kid support before its free trial starts. No subscription payment is due while approval is pending.</p>
              ) : (
                <p>Choose a plan below to get started. School features remain available while billing is arranged.</p>
              )}
            </>
          )}
        </div>
        <FiCheck className="billing-check" aria-hidden="true" />
      </section>

      {current?.billing_status === "past_due" && current.grace_period_ends_at && (
        <div className="billing-alert warning">
          Your subscription payment is overdue. Grace period ends {date(current.grace_period_ends_at)}. Safety-critical information is not restricted.
        </div>
      )}

      {!hasPaidSubscription && trial?.is_over_starter_limit && trialPlan && (
        <div className="billing-alert warning">
          Your school has {learnerCount} learners, above Starter's {trial.starter_learner_limit}-learner limit. We recommend the {trialPlan.name} plan
          {trialPlan.monthly_price_cents !== null
            ? ` at ${money(trialPlan.monthly_price_cents)} per month or ${money(trialPlan.annual_price_cents)} per year`
            : ""}.
          {" "}
          {trialPlan.slug === "enterprise" ? (
            <a href="mailto:support@trackmykid.com?subject=Track%20My%20Kid%20school%20Enterprise%20plan">
              Contact us about Enterprise
            </a>
          ) : (
            <button
              className="billing-recommendation-action"
              type="button"
              onClick={() => {
                setSelectedPlan(trialPlan.slug);
                document.getElementById("school-plan-grid")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              Select {trialPlan.name}
            </button>
          )}
        </div>
      )}

      <section className="billing-plans">
        <div className="billing-section-heading">
          <div>
            <h2>Choose a plan</h2>
            <p>{learnerCount} enrolled learners · annual billing saves 10%</p>
          </div>
          <div className="billing-interval" role="group" aria-label="Billing interval">
            <button className={interval === "monthly" ? "active" : ""} onClick={() => setInterval("monthly")} type="button">Monthly</button>
            <button className={interval === "annual" ? "active" : ""} onClick={() => setInterval("annual")} type="button">Annual · save 10%</button>
          </div>
        </div>
        <div className="billing-plan-grid" id="school-plan-grid">
          {(billing?.plans || []).map((plan) => {
            const price = interval === "annual" ? plan.annual_price_cents : plan.monthly_price_cents;
            const overLimit = plan.learner_limit !== null && learnerCount > plan.learner_limit;
            return (
              <button
                type="button"
                key={plan.slug}
                disabled={
                  Boolean(pendingInvoice)
                }
                className={`billing-plan${selectedPlan === plan.slug ? " selected" : ""}`}
                onClick={() => setSelectedPlan(plan.slug)}
                aria-pressed={selectedPlan === plan.slug}
              >
                <span className="billing-plan-name">{plan.name}</span>
                {plan.slug === trial?.recommended_plan_slug && !hasPaidSubscription && (
                  <span className="billing-plan-recommended">Recommended for your school</span>
                )}
                {price === null ? <strong>Contact us</strong> : <strong>{money(price)}<small> / {interval === "annual" ? "year" : "month"}</small></strong>}
                <span className="billing-plan-limit">{plan.learner_limit ? `Up to ${plan.learner_limit.toLocaleString()} learners` : "Multiple campuses"}</span>
                {overLimit && <span className="billing-plan-warning">Your school is over this learner limit</span>}
                <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                {plan.slug === "enterprise" && (
                  <a
                    className="billing-enterprise-contact"
                    href="mailto:support@trackmykid.com?subject=Track%20My%20Kid%20school%20Enterprise%20plan"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Contact us about Enterprise
                  </a>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="billing-payment-card">
        <div className="billing-section-heading">
          <div>
            <h2>Payment method</h2>
            <p>
              {billing?.payment_provider === "paystack"
                ? "Paystack card payments are one-time. Renew manually before the paid period ends."
                : "Card checkout uses Paystack. EFT is confirmed by our team."}
            </p>
          </div>
        </div>
        <div className="billing-methods">
          <label><input type="radio" name="payment-method" value="card" checked={method === "card"} onChange={() => setMethod("card")} /><FiCreditCard /> Card · Paystack</label>
          <label><input type="radio" name="payment-method" value="bank_transfer" checked={method === "bank_transfer"} onChange={() => setMethod("bank_transfer")} /><FiFileText /> Invoice · EFT</label>
        </div>
        {method === "bank_transfer" && (
          <div className="billing-bank">
            <strong>Bank transfer details</strong>
            {bank.bank_name && <span>Bank: {bank.bank_name}</span>}
            {bank.account_name && <span>Account name: {bank.account_name}</span>}
            {bank.account_number && <span>Account number: {bank.account_number}</span>}
            {bank.branch_code && <span>Branch code: {bank.branch_code}</span>}
            {!bank.bank_name && !bank.account_number && <p>Bank account details have not been configured yet. Please contact Track My Kid support before requesting an EFT invoice.</p>}
            {pendingInvoice && <p>Invoice {pendingInvoice.invoice_number} is awaiting payment. Use that invoice number as your EFT reference.</p>}
          </div>
        )}
        {current?.billing_status === "active" && current.billing_provider === "paystack" && (
          <p className="billing-note">
            Your Paystack payment is active through{" "}
            {current.current_period_end
              ? new Date(current.current_period_end).toLocaleDateString()
              : "the end of the paid period"}. It will not renew automatically.
          </p>
        )}
        <button
          className="billing-submit"
          type="button"
          disabled={busy || !selected || selected.monthly_price_cents === null || Boolean(selected && selected.learner_limit !== null && learnerCount > selected.learner_limit) || (method === "bank_transfer" && !bank.account_number) || Boolean(pendingInvoice) || !canProceed}
          onClick={() => void submit()}
        >
          {busy
            ? "Please wait…"
            : pendingInvoice
              ? "Invoice already requested"
              : method === "card"
                ? isSelectedCheckout
                  ? "Resume secure checkout"
                  : canResumeCheckout
                    ? "Change plan and continue to checkout"
                    : "Continue to secure card checkout"
                : "Request EFT invoice"}
        </button>
        {!canProceed && (
          <p className="billing-note">
            {canResumeCheckout
              ? "Your checkout is unfinished. Choose another plan or billing interval to replace it, or continue to the current checkout."
              : "Your current plan is active. You can turn off renewal and select a new plan after the paid period ends."}
          </p>
        )}
      </section>

      <section className="billing-payment-card">
        <div className="billing-section-heading"><div><h2>Invoices &amp; payment history</h2></div></div>
        {billing?.invoices?.length ? (
          <div className="billing-invoice-list">
            {billing.invoices.map((invoice) => (
              <div className="billing-invoice" key={invoice.id}>
                <div><strong>{invoice.invoice_number}</strong><span>{date(invoice.created_at)} · due {date(invoice.due_at)}</span></div>
                <span>{money(invoice.amount_cents)}</span>
                <em className={`invoice-status ${invoice.status}`}>{invoice.status.replaceAll("_", " ")}{invoice.payment_method === "card" && " · card"}</em>
                {invoice.status === "awaiting_payment" && invoice.payment_method === "bank_transfer" && (
                  invoice.payment_reported_at ? (
                    <span className="billing-payment-reported">
                      EFT payment reported · {date(invoice.payment_reported_at)}
                    </span>
                  ) : (
                    <button
                      className="billing-report-payment"
                      type="button"
                      disabled={reportingInvoice === invoice.id}
                      onClick={() => void reportEftPayment(invoice)}
                    >
                      {reportingInvoice === invoice.id ? "Reporting..." : "I've paid by EFT"}
                    </button>
                  )
                )}
                {invoice.hosted_invoice_url && (
                  <a
                    className="billing-invoice-link"
                    href={invoice.hosted_invoice_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View invoice
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : <p className="billing-note">No invoices yet.</p>}
        {pendingInvoice?.payment_method === "bank_transfer" && (
          <div className="billing-bank">
            <strong>EFT payment details for {pendingInvoice.invoice_number}</strong>
            {bank.bank_name && <span>Bank: {bank.bank_name}</span>}
            {bank.account_name && <span>Account name: {bank.account_name}</span>}
            {bank.account_number && <span>Account number: {bank.account_number}</span>}
            {bank.branch_code && <span>Branch code: {bank.branch_code}</span>}
            <span>Payment reference: {pendingInvoice.invoice_number}</span>
            <p>After making the transfer, report it above. Support will confirm receipt after checking the bank account.</p>
          </div>
        )}
      </section>
    </main>
  );
}
