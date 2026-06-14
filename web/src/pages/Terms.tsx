// NOT legal advice — have a qualified lawyer review before production launch.
/* =====================================================================
   Terms.tsx — LockdIN Terms of Service.

   Plain-language terms covering acceptance, eligibility, account
   responsibilities, acceptable use (no harassment via nudges/friend
   requests, no illegal content in work-logs), user content & licence,
   the best-effort/automated nature of AI scoring, "as is" disclaimers,
   limitation of liability, termination, and a clearly-marked governing-law
   placeholder. Lazy-loaded as a named export to match App.tsx.
   ===================================================================== */
import {
  LegalLayout,
  Sec,
  P,
  Note,
  UL,
  LI,
  Term,
  A,
  Placeholder,
} from "./legal/LegalLayout";

export function Terms() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro={
        <>
          These terms are the agreement between you and LockdIN for using the app. They&rsquo;re
          written to be readable, but they&rsquo;re still a binding contract — please read them.
        </>
      }
      lastUpdated="14 June 2026"
      sibling={{ label: "Privacy Policy", to: "/privacy" }}
    >
      {/* ---- Acceptance ---- */}
      <Sec id="acceptance" title="1. Acceptance of these terms">
        <P>
          By creating an account or using LockdIN (the &ldquo;<Term>Service</Term>&rdquo;), you agree
          to these Terms of Service (&ldquo;<Term>Terms</Term>&rdquo;) and to our{" "}
          <A href="/privacy">Privacy Policy</A>. If you don&rsquo;t agree, please don&rsquo;t use the
          Service. If you&rsquo;re using LockdIN on behalf of an organisation, you confirm you have
          authority to bind that organisation to these Terms.
        </P>
      </Sec>

      {/* ---- Eligibility ---- */}
      <Sec id="eligibility" title="2. Eligibility & age">
        <P>
          You must be at least <Term>13 years old</Term> to use LockdIN. If you are in the EEA you
          must be at least <Term>16</Term> (or the lower age set by your country, down to 13) or have
          your parent or guardian&rsquo;s consent. If you are in India and under <Term>18</Term>, you
          may only use the Service with verifiable consent from your parent or legal guardian. By
          using the Service you confirm you meet these requirements.
        </P>
      </Sec>

      {/* ---- Accounts ---- */}
      <Sec id="accounts" title="3. Your account & responsibilities">
        <P>
          You sign in with Google. You&rsquo;re responsible for the activity under your account and
          for keeping access to it secure.
        </P>
        <UL>
          <LI>Provide accurate information and keep your display name appropriate.</LI>
          <LI>
            Don&rsquo;t share your account or let others use it, and don&rsquo;t impersonate anyone.
          </LI>
          <LI>
            Tell us promptly at <A href="mailto:support@lockdin.app">support@lockdin.app</A> if you
            suspect unauthorised use of your account.
          </LI>
          <LI>You&rsquo;re responsible for any devices and connections you use to access LockdIN.</LI>
        </UL>
      </Sec>

      {/* ---- Acceptable use ---- */}
      <Sec id="acceptable-use" title="4. Acceptable use">
        <P>
          LockdIN is a place to focus and support each other. To keep it that way, you agree
          <Term> not</Term> to:
        </P>
        <UL>
          <LI>
            <Term>Harass or abuse anyone</Term> — including through nudges, reminders, repeated or
            unwanted friend requests, invite spam, or messages designed to annoy, threaten, or
            intimidate.
          </LI>
          <LI>
            <Term>Post illegal or harmful content</Term> in your work-logs or anywhere in the Service
            — including anything unlawful, hateful, defamatory, sexually exploitative, or that
            infringes someone else&rsquo;s rights.
          </LI>
          <LI>
            Upload malware, attempt to break, overload, probe, or reverse-engineer the Service, or
            bypass its security or rate limits.
          </LI>
          <LI>
            Scrape or harvest data, use bots to inflate streaks or scores, or otherwise game the
            accountability features.
          </LI>
          <LI>
            Use the Service to violate the rights of others or any applicable law or regulation.
          </LI>
        </UL>
        <Note>
          We may remove content or restrict accounts that break these rules. Friend connections are
          consensual — respect it when someone declines or removes you.
        </Note>
      </Sec>

      {/* ---- User content ---- */}
      <Sec id="content" title="5. Your content & licence">
        <P>
          Your work-logs, session notes, and other content you create are yours (&ldquo;<Term>Your
          Content</Term>&rdquo;). We don&rsquo;t claim ownership of them.
        </P>
        <P>
          To run the Service, you grant LockdIN a worldwide, non-exclusive, royalty-free licence to
          host, store, process, display, and transmit Your Content solely to operate and improve the
          Service — for example, to show your activity to friends you&rsquo;ve connected with and to
          send your work-log text to our AI provider for scoring (see{" "}
          <A href="/privacy">Privacy Policy</A>). This licence ends when you delete the content or
          your account, except for copies retained in backups for a limited time or as required by
          law.
        </P>
        <P>
          You&rsquo;re responsible for Your Content and confirm you have the right to share it and
          that it doesn&rsquo;t break these Terms.
        </P>
      </Sec>

      {/* ---- AI scoring ---- */}
      <Sec id="ai-scoring" title="6. AI scoring is automated & best-effort">
        <P>
          LockdIN scores your sessions automatically by sending your work-log text to a third-party AI
          provider (<A href="https://openrouter.ai/">OpenRouter</A>). Scores and feedback are
          generated by software and are provided on a <Term>best-effort basis</Term>.
        </P>
        <UL>
          <LI>
            We make <Term>no guarantee</Term> that any score is accurate, consistent, fair, or
            suitable for any purpose.
          </LI>
          <LI>Scores are motivational signals — not professional, academic, or productivity advice.</LI>
          <LI>
            AI output can be wrong or unexpected. Don&rsquo;t rely on it for important decisions, and
            don&rsquo;t put confidential or sensitive information into your work-logs.
          </LI>
        </UL>
      </Sec>

      {/* ---- Disclaimer ---- */}
      <Sec id="disclaimer" title="7. Service provided “as is”">
        <P>
          The Service is provided <Term>&ldquo;as is&rdquo;</Term> and <Term>&ldquo;as
          available&rdquo;</Term>, without warranties of any kind, whether express or implied,
          including implied warranties of merchantability, fitness for a particular purpose, and
          non-infringement. We don&rsquo;t warrant that the Service will be uninterrupted, error-free,
          secure, or that streaks, data, or notifications will always be accurate or delivered on
          time. Some jurisdictions don&rsquo;t allow certain warranty exclusions, so parts of this
          section may not apply to you.
        </P>
      </Sec>

      {/* ---- Liability ---- */}
      <Sec id="liability" title="8. Limitation of liability">
        <P>
          To the maximum extent permitted by law, LockdIN and its operators will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or for any loss of data,
          profits, goodwill, or productivity, arising out of or relating to your use of (or inability
          to use) the Service.
        </P>
        <P>
          To the extent any liability cannot be excluded, our total liability for all claims relating
          to the Service is limited to the greater of (a) the amount you paid us for the Service in
          the 12 months before the claim, or (b){" "}
          <Placeholder>nominal cap amount, e.g. USD 100</Placeholder>.
        </P>
        <Note>
          Nothing in these Terms limits liability that cannot be limited by law (for example, for
          death or personal injury caused by negligence, or for fraud). Your statutory consumer rights
          are unaffected.
        </Note>
      </Sec>

      {/* ---- Termination ---- */}
      <Sec id="termination" title="9. Termination">
        <P>
          You can stop using LockdIN and delete your account at any time. We may suspend or terminate
          your access if you breach these Terms, if required by law, or to protect the Service or its
          users. On termination, your right to use the Service ends, and we&rsquo;ll handle your data
          as described in the <A href="/privacy">Privacy Policy</A>. Sections that by their nature
          should survive (content licence for retained copies, disclaimers, limitation of liability,
          and governing law) will continue to apply.
        </P>
      </Sec>

      {/* ---- Governing law ---- */}
      <Sec id="governing-law" title="10. Governing law & disputes">
        <P>
          These Terms are governed by{" "}
          <Placeholder>Governing law: to be set by LockdIN</Placeholder>, without regard to its
          conflict-of-laws rules. Any disputes will be subject to the courts or dispute-resolution
          process of <Placeholder>jurisdiction / forum: to be set by LockdIN</Placeholder>.
        </P>
        <Note>
          Depending on where you live, you may have mandatory rights to bring claims in your local
          courts; nothing here removes those rights.
        </Note>
      </Sec>

      {/* ---- Changes ---- */}
      <Sec id="changes" title="11. Changes to these terms">
        <P>
          We may update these Terms as LockdIN evolves. When we make material changes, we&rsquo;ll
          update the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you in the
          app or by email. If you keep using the Service after an update, you accept the revised Terms.
        </P>
      </Sec>

      {/* ---- Contact ---- */}
      <Sec id="contact" title="12. Contact us">
        <P>
          Questions about these Terms? Email{" "}
          <A href="mailto:support@lockdin.app">support@lockdin.app</A>. For formal notices, write to{" "}
          <Placeholder>Legal entity name</Placeholder>, <Placeholder>Registered address</Placeholder>.
        </P>
      </Sec>
    </LegalLayout>
  );
}
