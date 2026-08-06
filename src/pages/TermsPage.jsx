import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const C = {
  bg:       '#F5F0EB',
  dark:     'var(--ink-warm)',
  terra:    '#C1440E',
  terraLt:  '#E8603C',
  muted:    '#7A6A62',
  faint:    '#DDD6CC',
  white:    '#FFFAF7',
};

const SECTIONS = [
  {
    title: "Agreement",
    body: [
      "By accessing or using Raphio, creating an account, uploading content, generating content, purchasing credits, subscribing to a plan or downloading outputs, you agree to these Terms.",
      "If you do not agree, you must not use Raphio."
    ],
  },
  {
    title: "About Raphio",
    body: [
      "Raphio is an AI powered creative platform that may allow users to generate, edit or transform images, videos, audio, text, scenes, prompts and other creative content.",
      "Raphio may use third party AI models, APIs, cloud services and processing tools to provide its services."
    ],
  },
  {
    title: "Eligibility",
    body: [
      "To use Raphio, you must be at least 18 years old, or have permission from a parent, guardian or authorised adult; have the legal authority to agree to these Terms; provide accurate account and billing information; and use Raphio only for lawful purposes.",
      "If you use Raphio on behalf of a company, organisation or client, you confirm that you have authority to bind that entity to these Terms."
    ],
  },
  {
    title: "Account registration",
    body: [
      "You may need to create an account to use some parts of Raphio. You are responsible for keeping your login details secure, all activity that occurs under your account, ensuring account information is accurate and up to date, not sharing access with unauthorised users, and not using another person’s account without permission.",
      "You must notify us immediately if you suspect unauthorised access to your account."
    ],
  },
  {
    title: "Subscriptions, credits and payments",
    body: [
      "Raphio may offer free plans, paid plans, subscriptions, usage credits, generation credits, add ons or custom services. Prices, inclusions, limits and features may change from time to time.",
      "By purchasing a subscription, credit package or service, you authorise us and our payment provider to charge the applicable fees. You are responsible for all taxes, charges and fees associated with your purchase, unless stated otherwise."
    ],
  },
  {
    title: "Credit usage",
    body: [
      "Credits may be consumed when you generate, edit, process, test, render, upscale, revise or download content. Credits may be used even where the output is not perfect, not commercially usable, not what you expected, contains AI errors, or requires further editing.",
      "AI generation is experimental and output quality can vary. Unless required by law or expressly stated otherwise, used credits are not refundable, expired credits are not refundable, credits have no cash value, and credits cannot be transferred to another account. Credits may be subject to expiry, usage limits or plan rules."
    ],
  },
  {
    title: "Refund policy",
    body: [
      "Raphio does not offer refunds for change of mind, unsatisfactory creative results caused by the nature of AI generation, or AI mistakes (including visual errors, distorted images, spelling errors, unexpected movement, inconsistent characters, incorrect details or failed creative direction).",
      "We also do not offer refunds for used credits or completed generations, failure to use the service, lack of technical knowledge by the user, uploading poor quality or unsuitable source material, suspension or termination caused by breach of these Terms, or delays, errors or outages caused by third party providers, where permitted by law.",
      "However, nothing in these Terms limits, excludes or modifies any rights you may have under the Australian Consumer Law or any other law that cannot legally be excluded. If you believe you are entitled to a refund or remedy under law, contact us at Contact@raphio.ai."
    ],
  },
  {
    title: "Australian Consumer Law",
    body: [
      "Our services may come with guarantees that cannot be excluded under the Australian Consumer Law.",
      "To the maximum extent permitted by law, our liability for failure to comply with a consumer guarantee is limited to supplying the services again, paying the cost of having the services supplied again, or any other remedy required by law.",
      "Nothing in these Terms is intended to mislead you about your rights under Australian Consumer Law."
    ],
  },
  {
    title: "AI output disclaimer",
    body: [
      "You understand and agree that AI generated content may be inaccurate, incomplete, offensive, unsafe, unrealistic, low quality, misleading, defective or unsuitable for your intended purpose. AI outputs may include incorrect spelling, distorted features, factual errors, or copyright and privacy risks.",
      "You are responsible for reviewing, editing and approving all outputs before publishing, distributing, selling, advertising or using them. Raphio does not guarantee that any AI output will be accurate, legal, original, unique, commercially suitable, platform compliant or free from third party claims."
    ],
  },
  {
    title: "User responsibility for uploaded content",
    body: [
      "You are solely responsible for all content you upload, submit, provide, generate, publish or use through Raphio.",
      "You confirm that you own the content you upload or have permission to use it, that it does not infringe third-party rights, and that you will not upload private, sensitive, or non-consensual material.",
      "Raphio is not responsible for checking whether you have the right to use uploaded content."
    ],
  },
  {
    title: "Client and agency use",
    body: [
      "If you use Raphio for a client, employer, customer or third party, you are responsible for obtaining all approvals, consents, permissions and licences from that party.",
      "You are also responsible for ensuring that the final content complies with the client’s brand rules, advertising rules, platform rules and legal obligations. Raphio is not responsible for disputes between you and your clients."
    ],
  },
  {
    title: "Prohibited use",
    body: [
      "You must not use Raphio to create, upload, generate, edit, promote or distribute content that is unlawful, fraudulent, infringing, defamatory, abusive, or discriminatory.",
      "Prohibited conduct also includes impersonation, non-consensual deepfakes, minor exploitation, misinformation, circumventing platform filters, automated scraping, or breaching rules of third-party systems.",
      "We may suspend or terminate your account if we believe you have breached this section."
    ],
  },
  {
    title: "Intellectual property",
    body: [
      "Raphio owns or licenses all rights in the platform, website, software, systems, workflows, designs, branding, templates, code, features, documentation and technology. You must not copy, modify, reverse engineer, resell, reproduce, distribute or exploit Raphio’s platform or technology unless we give written permission.",
      "You retain ownership of content you upload, subject to any rights held by third parties. By uploading content to Raphio, you grant us a worldwide, non exclusive, royalty free licence to use, host, store, copy, process, transmit, display, modify and create derivative works from that content for the purpose of providing, operating, securing and improving the service.",
      "Subject to these Terms, your payment obligations and any third party provider rules, you may use outputs generated through your account for lawful personal or commercial purposes. However, you understand that AI generated outputs may not be unique, and Raphio does not guarantee exclusive ownership, copyright protection, originality or registrability of any output."
    ],
  },
  {
    title: "Third party AI providers",
    body: [
      "Raphio may use third party AI providers, APIs, tools, infrastructure and models. Your use of Raphio may be subject to the terms, policies and technical limitations of those third party providers.",
      "We are not responsible for third party model errors, downtime, safety filters, rejected prompts, changed features, quality changes, pricing changes, moderation decisions or discontinued services."
    ],
  },
  {
    title: "Content moderation and removal",
    body: [
      "We may review, block, remove or restrict content where we believe it breaches these Terms, creates legal, reputational, technical or safety risk, breaches third party provider rules, may infringe another person’s rights, or may expose Raphio or others to liability.",
      "We are not required to monitor all content, but we may do so at our discretion."
    ],
  },
  {
    title: "No professional advice",
    body: [
      "Raphio does not provide legal, financial, medical, advertising, copyright, compliance or professional advice.",
      "Any content, prompt suggestion, generated output, template or guidance provided by Raphio is general in nature only. You should obtain professional advice before using AI outputs for important, regulated, commercial or public purposes."
    ],
  },
  {
    title: "User warranties",
    body: [
      "You warrant that you will comply with these Terms and all applicable laws; you have the rights required to upload and use your content; you will not use Raphio for unlawful or harmful purposes; you will review all outputs before use; and you accept responsibility for all content created, published or distributed from your account."
    ],
  },
  {
    title: "Availability and platform changes",
    body: [
      "We aim to provide a reliable service, but we do not guarantee that Raphio will always be available, uninterrupted, secure or error free. We may change, suspend, limit, remove or discontinue any part of Raphio at any time, including features, plans, models, pricing, credits, integrations and workflows.",
      "We are not liable for loss caused by downtime, maintenance, bugs, third party outages, AI provider issues or internet failures, to the maximum extent permitted by law."
    ],
  },
  {
    title: "Beta and experimental features",
    body: [
      "Some features may be released as beta, trial, experimental or early access features. These features may be unstable, incomplete, inaccurate, delayed, removed or changed at any time.",
      "You use beta and experimental features at your own risk."
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "To the maximum extent permitted by law, Raphio is not liable for loss of profit, revenue, business, opportunity, goodwill or data; loss caused by AI errors; loss caused by your use or publication of content; copyright, trade mark, or advertising disputes; platform downtime; or indirect, consequential, special or incidental loss.",
      "To the maximum extent permitted by law, our total liability to you for any claim is limited to the amount you paid to Raphio in the three months before the claim arose. This limitation does not apply where liability cannot legally be limited."
    ],
  },
  {
    title: "Indemnity",
    body: [
      "You agree to indemnify Raphio, its owners, employees, contractors, officers and suppliers against any claim, loss, damage, cost or expense arising from your use of Raphio, your uploaded content, your generated outputs, your breach of these Terms or any law, your infringement of third party rights, or your use of content for a commercial campaign or advertising purpose."
    ],
  },
  {
    title: "Suspension and termination",
    body: [
      "We may suspend, restrict or terminate your account if you breach these Terms, fail to pay fees, create legal or security risk, we suspect fraud, a provider requires it, or we decide to discontinue the service.",
      "If your account is terminated due to breach, you may lose access to projects, uploaded content, outputs, credits and subscription benefits."
    ],
  },
  {
    title: "Cancellation",
    body: [
      "You may cancel your subscription according to the cancellation process available in your account or by contacting us.",
      "Cancelling a subscription does not automatically entitle you to a refund for past payments, used credits, generated content or unused time, unless required by law. You are responsible for cancelling before the next billing date if you do not want to be charged again."
    ],
  },
  {
    title: "Chargebacks",
    body: [
      "If you make a chargeback or payment dispute without first contacting us, we may suspend your account while the dispute is investigated.",
      "We reserve the right to recover unpaid fees, chargeback fees, collection costs and other reasonable costs where permitted by law."
    ],
  },
  {
    title: "Confidentiality",
    body: [
      "If you receive confidential information from Raphio, including private business information, pricing, technical information, platform workflows or unreleased features, you must not disclose it without our written permission."
    ],
  },
  {
    title: "Privacy",
    body: [
      "Your use of Raphio is also governed by our Privacy Policy. By using Raphio, you consent to the collection, use and disclosure of information as described in the Privacy Policy."
    ],
  },
  {
    title: "Third party links",
    body: [
      "Raphio may contain links to third party websites, services or tools. We are not responsible for third party websites, content, terms, privacy policies, prices, services or practices."
    ],
  },
  {
    title: "Changes to these Terms",
    body: [
      "We may update these Terms from time to time. The updated version will be posted on our website with a new effective date.",
      "Your continued use of Raphio after updated Terms are published means you accept the updated Terms."
    ],
  },
  {
    title: "Governing law",
    body: [
      "These Terms are governed by the laws of Victoria, Australia. The parties submit to the courts of Victoria, Australia and any courts entitled to hear appeals from those courts."
    ],
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-figtree" style={{ background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,750&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 750; }
      `}</style>

      {/* Top bar */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: C.muted }}
          onMouseEnter={e => { e.currentTarget.style.color = C.terra; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-28">
        <h1 className="display" style={{ fontSize: 'clamp(32px,5vw,48px)', color: C.dark, letterSpacing: '-0.01em', lineHeight: 1.08 }}>
          Terms & <span style={{ color: C.terra }}>Conditions.</span>
        </h1>
        <p className="text-sm font-semibold mt-3" style={{ color: C.muted }}>Effective date: 22 June 2026</p>

        <p className="text-base leading-relaxed mt-8" style={{ color: C.dark }}>
          These Terms and Conditions apply to your use of the Raphio website, platform, AI tools, products and services.
        </p>

        <div className="mt-12 space-y-12">
          {SECTIONS.map((section, i) => (
            <div key={section.title} style={{ borderTop: `1px solid ${C.faint}`, paddingTop: 32 }}>
              <div className="flex items-start gap-4">
                <span
                  className="font-bold flex-shrink-0"
                  style={{ fontSize: 13, color: C.terra, marginTop: 4 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="font-bold mb-3" style={{ fontSize: 'clamp(18px,2.2vw,22px)', color: C.dark, letterSpacing: '-0.01em' }}>
                    {section.title}
                  </h2>
                  <div className="space-y-3">
                    {section.body.map((para, j) => (
                      <p key={j} className="text-sm leading-relaxed" style={{ color: C.muted }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div
          className="mt-16 rounded-2xl p-6 sm:p-8 text-center"
          style={{ background: C.white, border: `1.5px solid rgba(193,68,14,0.12)` }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: C.dark }}>
            Questions about these terms?
          </p>
          <a
            href="mailto:Contact@raphio.ai"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300"
            style={{ background: `linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow: '0 4px 16px rgba(193,68,14,0.30)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(193,68,14,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(193,68,14,0.30)'; }}
          >
            Contact@raphio.ai
          </a>
        </div>
      </main>
    </div>
  );
}