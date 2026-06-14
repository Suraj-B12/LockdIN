// NOT legal advice — have a qualified lawyer review before production launch.
/* =====================================================================
   Privacy.tsx — LockdIN Privacy Policy.

   Plain-language, worldwide-aware policy covering GDPR (EU/EEA/UK),
   India's DPDP Act 2023, and CCPA/CPRA. Content is grounded in LockdIN's
   ACTUAL data flows: Supabase (auth + DB), Google OAuth (sign-in),
   OpenRouter (AI scoring of work-log text), OneSignal (push), plus
   browser localStorage and the PWA service-worker cache.

   Square-bracket [placeholders] mark items only counsel can finalise
   (legal entity, address, DPO, governing law). Lazy-loaded as a named
   export to match the App.tsx routing pattern.
   ===================================================================== */
import {
  LegalLayout,
  Sec,
  H3,
  P,
  Note,
  UL,
  LI,
  Term,
  A,
  Placeholder,
  Row,
} from "./legal/LegalLayout";

export function Privacy() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro={
        <>
          This policy explains what personal data LockdIN collects, why we collect it, who we share
          it with, and the rights you have over it. We&rsquo;ve tried to write it like a human, not a
          lawyer.
        </>
      }
      lastUpdated="14 June 2026"
      sibling={{ label: "Terms of Service", to: "/terms" }}
    >
      {/* ---- Who we are ---- */}
      <Sec id="who-we-are" title="1. Who we are">
        <P>
          &ldquo;LockdIN&rdquo; (&ldquo;<Term>we</Term>&rdquo;, &ldquo;<Term>us</Term>&rdquo;,
          &ldquo;<Term>our</Term>&rdquo;) is a friends accountability and focus-session tracker. You
          run focus sessions, log what you worked on, get an AI score, build streaks, and stay
          accountable with friends and a virtual buddy.
        </P>
        <P>
          For the purposes of the EU/UK General Data Protection Regulation (&ldquo;<Term>GDPR</Term>
          &rdquo;) and India&rsquo;s Digital Personal Data Protection Act, 2023 (&ldquo;
          <Term>DPDP Act</Term>&rdquo;), LockdIN is the <Term>data controller</Term> / <Term>Data
          Fiduciary</Term> for the personal data described here.
        </P>
        <UL>
          <LI>
            <Term>Legal entity:</Term> <Placeholder>Legal entity name</Placeholder>
          </LI>
          <LI>
            <Term>Registered address:</Term> <Placeholder>Registered address</Placeholder>
          </LI>
          <LI>
            <Term>Contact / Data Protection &amp; Grievance Officer:</Term>{" "}
            <A href="mailto:capstoneysl@gmail.com">capstoneysl@gmail.com</A>{" "}
            (<Placeholder>DPO / Grievance Officer name, if appointed</Placeholder>)
          </LI>
        </UL>
        <Note>
          If you are in the EU/EEA or UK and we are required to appoint a representative or Data
          Protection Officer, their details will be added here.
        </Note>
      </Sec>

      {/* ---- What we collect ---- */}
      <Sec id="what-we-collect" title="2. What data we collect">
        <P>
          We collect only what we need to run LockdIN. We don&rsquo;t buy personal data from third
          parties, and we don&rsquo;t build advertising profiles.
        </P>

        <H3>Account &amp; identity (via Google sign-in)</H3>
        <P>
          You sign in with Google through our authentication provider, Supabase. From your Google
          account we receive your <Term>email address</Term>, your <Term>display name</Term>, and
          your <Term>profile picture (avatar URL)</Term>. We do not receive or store your Google
          password.
        </P>

        <H3>Your activity in the app</H3>
        <UL>
          <LI>
            <Term>Focus sessions</Term> — start/end times, duration, and session metadata.
          </LI>
          <LI>
            <Term>Work-logs</Term> — the free-text notes you type describing what you actually did
            during a session.
          </LI>
          <LI>
            <Term>AI scores</Term> — the score and any feedback our AI generates for a session.
          </LI>
          <LI>
            <Term>Streaks &amp; progress</Term> — derived stats such as current streak and history.
          </LI>
          <LI>
            <Term>Virtual buddy</Term> — your buddy state and related preferences.
          </LI>
          <LI>
            <Term>Friend connections</Term> — friend relationships you create using an invite code
            or a friend&rsquo;s email, including pending invites.
          </LI>
          <LI>
            <Term>Notification preferences</Term> — which nudges and reminders you&rsquo;ve enabled.
          </LI>
        </UL>

        <H3>Technical &amp; device data</H3>
        <P>
          To deliver and secure the service we and our processors handle limited technical data such
          as your IP address, browser/device type, and timestamps (for example in security and
          server logs). We store a <Term>session token</Term> in your browser&rsquo;s{" "}
          <Term>localStorage</Term> to keep you signed in, and the installable (PWA) version uses a{" "}
          <Term>service-worker cache</Term> on your device so the app loads quickly and works
          offline. See <A href="#cookies">Cookies &amp; local storage</A>.
        </P>

        <Note>
          We do not intentionally collect special-category / sensitive personal data. Please do not
          put health, financial, government-ID, or other sensitive information into your free-text
          work-logs.
        </Note>
      </Sec>

      {/* ---- Why + legal bases ---- */}
      <Sec id="why" title="3. Why we use your data, and our legal basis">
        <P>
          Under the GDPR we must have a lawful basis for each use of your data. The table below maps
          each purpose to its basis (GDPR Article 6). Under the DPDP Act we rely on your consent or
          on certain &ldquo;legitimate uses&rdquo; permitted by that Act.
        </P>
        <div className="rounded-squircle border border-hairline/[0.07] bg-surface/40 px-5 py-2 shadow-inset-top">
          <Row label="Provide your account">
            Authenticate you and keep you signed in. <Term>Basis:</Term> performance of our contract
            with you (Art. 6(1)(b)).
          </Row>
          <Row label="Run focus sessions & work-logs">
            Store and display your sessions, logs, streaks, and buddy. <Term>Basis:</Term> contract
            (Art. 6(1)(b)).
          </Row>
          <Row label="AI scoring">
            Send your work-log text to our AI provider to generate a score and feedback.{" "}
            <Term>Basis:</Term> contract (Art. 6(1)(b)); your continued use is the requested service.
          </Row>
          <Row label="Friends & social features">
            Connect you with friends and show shared progress. <Term>Basis:</Term> contract
            (Art. 6(1)(b)) and your consent when you send/accept invites (Art. 6(1)(a)).
          </Row>
          <Row label="Notifications & nudges">
            Send push reminders you&rsquo;ve enabled. <Term>Basis:</Term> your consent (Art. 6(1)(a))
            — you can turn these off at any time.
          </Row>
          <Row label="Security & abuse prevention">
            Protect accounts, debug, and prevent misuse. <Term>Basis:</Term> our legitimate interests
            (Art. 6(1)(f)) in keeping LockdIN safe and reliable.
          </Row>
          <Row label="Legal compliance">
            Meet legal, tax, and regulatory obligations. <Term>Basis:</Term> legal obligation
            (Art. 6(1)(c)).
          </Row>
        </div>
        <Note>
          Where we rely on consent, you can withdraw it at any time without affecting processing that
          already happened. Where we rely on legitimate interests, you can object — see{" "}
          <A href="#your-rights">Your rights</A>.
        </Note>
      </Sec>

      {/* ---- AI scoring ---- */}
      <Sec id="ai" title="4. AI scoring of your work-logs">
        <P>
          This is important, so we&rsquo;re calling it out separately. When your session is scored,
          the <Term>text of your work-log</Term> is sent to <A href="https://openrouter.ai/">
          OpenRouter</A>, a third-party AI routing provider, which passes it to an underlying large
          language model to generate a score and feedback.
        </P>
        <UL>
          <LI>The scoring is fully automated and is best-effort — it can be wrong or inconsistent.</LI>
          <LI>
            Because your work-log leaves our systems for processing, <Term>avoid including anything
            confidential or sensitive</Term> in it.
          </LI>
          <LI>
            We do not use your work-logs to train our own models. OpenRouter and the model providers
            handle data under their own terms — see{" "}
            <A href="https://openrouter.ai/privacy">OpenRouter&rsquo;s Privacy Policy</A>.
          </LI>
        </UL>
        <Note>
          The score is a motivational signal, not a judgment about you, and it does not produce legal
          or similarly significant effects. If you&rsquo;d like a human to look at a score, contact us.
        </Note>
      </Sec>

      {/* ---- Sharing ---- */}
      <Sec id="sharing" title="5. Who we share your data with">
        <P>
          We don&rsquo;t sell your personal data. We share it only with the service providers
          (&ldquo;processors&rdquo; / &ldquo;Data Processors&rdquo;) that make LockdIN work, with your
          friends as you direct, and where the law requires.
        </P>

        <H3>Service providers (sub-processors)</H3>
        <div className="rounded-squircle border border-hairline/[0.07] bg-surface/40 px-5 py-2 shadow-inset-top">
          <Row label="Supabase">
            Database hosting and authentication — stores your account and app data.{" "}
            <A href="https://supabase.com/privacy">Privacy Policy</A>.
          </Row>
          <Row label="Google">
            OAuth sign-in — verifies your identity when you log in.{" "}
            <A href="https://policies.google.com/privacy">Privacy Policy</A>.
          </Row>
          <Row label="OpenRouter">
            AI scoring — receives your work-log text to score sessions.{" "}
            <A href="https://openrouter.ai/privacy">Privacy Policy</A>.
          </Row>
          <Row label="OneSignal">
            Push notifications — delivers the nudges and reminders you enable.{" "}
            <A href="https://onesignal.com/privacy_policy">Privacy Policy</A>.
          </Row>
        </div>
        <P>
          These providers act on our instructions under data-processing agreements and may only use
          your data to provide their service to us.
        </P>

        <H3>What your friends can see</H3>
        <P>
          LockdIN is social by design. When you connect with a friend, that friend can typically see
          your <Term>display name and avatar</Term>, your <Term>streaks and focus activity</Term>,
          and shared accountability signals (for example, whether you completed a session).
        </P>
        <UL>
          <LI>
            Friends do <Term>not</Term> see the full free-text content of your private work-logs
            unless a feature explicitly states that you are sharing it.
          </LI>
          <LI>
            Invites are tied to an invite code or email. Anyone with your invite code may request to
            connect, so share it only with people you trust.
          </LI>
          <LI>You can remove a friend connection at any time.</LI>
        </UL>

        <H3>Legal &amp; other disclosures</H3>
        <P>
          We may disclose data if required by law, to enforce our terms, to protect the rights and
          safety of our users or the public, or in connection with a merger, acquisition, or
          reorganisation (in which case we&rsquo;ll notify you and any new owner remains bound by this
          policy).
        </P>
      </Sec>

      {/* ---- International transfers ---- */}
      <Sec id="transfers" title="6. International data transfers">
        <P>
          Our providers may store and process data in countries outside your own, including the
          United States. Where we transfer personal data out of the EEA, UK, or other regions with
          transfer restrictions, we rely on appropriate safeguards such as the European
          Commission&rsquo;s <Term>Standard Contractual Clauses (SCCs)</Term>, the UK International
          Data Transfer Addendum, or an adequacy decision where one applies.
        </P>
        <Note>
          You can ask us for more information about these safeguards using the contact details above.
        </Note>
      </Sec>

      {/* ---- Retention ---- */}
      <Sec id="retention" title="7. How long we keep your data">
        <P>
          We keep your personal data only as long as we need it for the purposes above — generally
          for as long as your account is active.
        </P>
        <UL>
          <LI>
            When you delete your account, we delete or anonymise your personal data within a
            reasonable period, except where we must retain limited records to meet legal obligations,
            resolve disputes, or enforce our agreements.
          </LI>
          <LI>
            Backups and logs are kept for a limited time on a rolling basis and then overwritten.
          </LI>
          <LI>
            Aggregated or de-identified data that can no longer identify you may be kept for
            analytics and product improvement.
          </LI>
        </UL>
      </Sec>

      {/* ---- Rights ---- */}
      <Sec id="your-rights" title="8. Your rights over your data">
        <H3>If you are in the EU/EEA or UK (GDPR)</H3>
        <P>You have the right to:</P>
        <UL>
          <LI>
            <Term>Access</Term> — get a copy of the personal data we hold about you.
          </LI>
          <LI>
            <Term>Rectification</Term> — correct inaccurate or incomplete data.
          </LI>
          <LI>
            <Term>Erasure</Term> — ask us to delete your data (&ldquo;right to be forgotten&rdquo;).
          </LI>
          <LI>
            <Term>Portability</Term> — receive your data in a portable, machine-readable format.
          </LI>
          <LI>
            <Term>Restriction</Term> — ask us to limit how we use your data.
          </LI>
          <LI>
            <Term>Objection</Term> — object to processing based on our legitimate interests.
          </LI>
          <LI>
            <Term>Withdraw consent</Term> — withdraw any consent you&rsquo;ve given, at any time.
          </LI>
          <LI>
            <Term>Complain</Term> — lodge a complaint with your local data-protection supervisory
            authority (in the UK, the Information Commissioner&rsquo;s Office).
          </LI>
        </UL>

        <H3>If you are in India (DPDP Act, 2023)</H3>
        <UL>
          <LI>
            <Term>Access</Term> — a summary of the personal data we process and how.
          </LI>
          <LI>
            <Term>Correction &amp; completion</Term> — correct, complete, or update your data.
          </LI>
          <LI>
            <Term>Erasure</Term> — request deletion of your personal data.
          </LI>
          <LI>
            <Term>Grievance redressal</Term> — raise a grievance with our Grievance Officer (contact
            above); we will respond within the timelines required by law.
          </LI>
          <LI>
            <Term>Nominate</Term> — nominate another person to exercise your rights in the event of
            death or incapacity.
          </LI>
        </UL>

        <H3>If you are in California (CCPA/CPRA)</H3>
        <UL>
          <LI>
            The right to <Term>know</Term> what personal information we collect and how we use it.
          </LI>
          <LI>
            The right to <Term>delete</Term> personal information we hold about you.
          </LI>
          <LI>
            The right to <Term>correct</Term> inaccurate personal information.
          </LI>
          <LI>
            The right to <Term>opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo;</Term> of
            personal information. <Term>We do not sell or share your personal information</Term> as
            those terms are defined under California law, and we don&rsquo;t use it for cross-context
            behavioural advertising.
          </LI>
          <LI>The right not to be discriminated against for exercising your privacy rights.</LI>
        </UL>

        <H3>How to exercise your rights</H3>
        <P>
          Email <A href="mailto:capstoneysl@gmail.com">capstoneysl@gmail.com</A> from the address tied
          to your account, or use the in-app settings where available. We may need to verify your
          identity first. We&rsquo;ll respond within the timeframe required by the applicable law
          (generally within one month under the GDPR), and we won&rsquo;t charge you unless a request
          is manifestly unfounded or excessive.
        </P>
      </Sec>

      {/* ---- Cookies / local storage ---- */}
      <Sec id="cookies" title="9. Cookies &amp; local storage">
        <P>
          LockdIN does not use third-party advertising or tracking cookies. We rely on a small amount
          of browser storage that is strictly necessary to run the app:
        </P>
        <UL>
          <LI>
            <Term>Session token (localStorage)</Term> — keeps you signed in between visits.
          </LI>
          <LI>
            <Term>Service-worker cache (PWA)</Term> — stores app assets on your device for speed and
            offline use.
          </LI>
        </UL>
        <P>
          You can clear this storage at any time through your browser settings or by signing out and
          uninstalling the PWA. Our providers (e.g. Supabase, OneSignal) may set their own strictly
          necessary identifiers to deliver their services.
        </P>
      </Sec>

      {/* ---- Children ---- */}
      <Sec id="children" title="10. Children">
        <P>
          LockdIN is not intended for children under <Term>13</Term>, and we do not knowingly collect
          personal data from them. In the EEA, users under <Term>16</Term> (or the lower age set by
          their country, down to 13) need a parent or guardian&rsquo;s consent. Under the DPDP Act,
          processing the data of a person under <Term>18</Term> requires verifiable parental/guardian
          consent.
        </P>
        <P>
          If you believe a child has provided us personal data without the required consent, contact
          us and we&rsquo;ll delete it.
        </P>
      </Sec>

      {/* ---- Security ---- */}
      <Sec id="security" title="11. How we protect your data">
        <P>
          We use industry-standard measures to protect your data, including encryption in transit
          (HTTPS), authentication handled by Supabase, access controls, and reputable infrastructure
          providers. No method of transmission or storage is 100% secure, so we can&rsquo;t guarantee
          absolute security — but we work to protect your data and will notify you and the relevant
          authorities of a data breach where the law requires.
        </P>
      </Sec>

      {/* ---- Changes ---- */}
      <Sec id="changes" title="12. Changes to this policy">
        <P>
          We may update this policy as LockdIN evolves. When we make material changes, we&rsquo;ll
          update the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you in the
          app or by email. Your continued use after an update means you accept the revised policy.
        </P>
      </Sec>

      {/* ---- Contact ---- */}
      <Sec id="contact" title="13. Contact us">
        <P>
          Questions, requests, or grievances about your privacy? Email us at{" "}
          <A href="mailto:capstoneysl@gmail.com">capstoneysl@gmail.com</A>. For formal notices, write
          to <Placeholder>Legal entity name</Placeholder>, <Placeholder>Registered address</Placeholder>.
        </P>
      </Sec>
    </LegalLayout>
  );
}
