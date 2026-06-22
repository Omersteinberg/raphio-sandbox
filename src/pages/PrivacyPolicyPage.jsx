import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const C = {
  bg:       '#F5F0EB',
  dark:     '#1C1917',
  terra:    '#C1440E',
  terraLt:  '#E8603C',
  muted:    '#7A6A62',
  faint:    '#DDD6CC',
  white:    '#FFFAF7',
};

const SECTIONS = [
  {
    title: "About this Privacy Policy",
    body: [
      "This Privacy Policy explains how Raphio collects, uses, stores and protects personal information when you use our website, platform, AI tools, products and services.",
      "By using Raphio, creating an account, uploading content, making a payment, or communicating with us, you agree to this Privacy Policy.",
      "Raphio is based in Melbourne, Australia. Where applicable, we handle personal information in accordance with the Privacy Act 1988 (Cth), the Australian Privacy Principles and other applicable Australian privacy laws."
    ],
  },
  {
    title: "What information we collect",
    body: [
      "We may collect the following types of information:",
      "Account information: This may include your name, business name, email address, phone number, password, billing details, user profile information and account settings.",
      "Payment information: We may collect payment related information such as billing name, billing address, transaction history, subscription details, invoices and payment status. Payment card information may be processed by third party payment providers and may not be stored directly by us.",
      "Uploaded content: When you use Raphio, you may upload or submit content, including text prompts, scripts, images, videos, logos, brand assets, audio files, documents, reference materials and other creative assets.",
      "AI generated content: We may collect and store outputs created through the platform, including generated images, videos, prompts, scenes, voice outputs, edits, revisions and project history.",
      "Technical information: We may collect information such as IP address, device type, browser type, operating system, session activity, pages visited, platform usage, error logs, cookies, analytics data and approximate location data.",
      "Communication information: If you contact us, we may collect your emails, support messages, feedback, call notes, chat messages and other communications."
    ],
  },
  {
    title: "How we collect information",
    body: [
      "We collect information when you visit our website, create an account, use the Raphio platform, upload prompts, images, videos, audio or files, generate, edit or download AI content, subscribe, purchase credits or make payments, contact us for support, respond to forms, surveys or marketing, or interact with our emails, ads or website analytics tools.",
      "We may also collect information from third party tools we use to operate the platform, such as payment providers, hosting providers, analytics tools, email services, support tools and AI service providers."
    ],
  },
  {
    title: "Why we collect and use information",
    body: [
      "We collect and use information to provide, operate and improve Raphio, create and manage user accounts, process subscriptions, payments, credits and invoices, and generate AI images, videos, audio and other content.",
      "We also use it to store projects, prompts, uploads and outputs, provide customer support, improve AI workflows, user experience and platform performance, detect bugs, abuse, fraud, security risks and misuse, send service updates, billing notices, platform communications, and marketing communications where permitted.",
      "Finally, we use your information to comply with legal, tax, accounting and regulatory obligations, and enforce our Terms and Conditions."
    ],
  },
  {
    title: "AI processing and uploaded content",
    body: [
      "Raphio uses artificial intelligence tools and third party technology providers to process prompts, images, videos, audio and other uploaded content.",
      "By using Raphio, you understand and agree that content you upload may be processed by AI systems, and that AI systems may analyse, transform, generate, edit or enhance your content.",
      "AI outputs may contain errors, defects, distortions, inaccurate visuals, spelling issues, incorrect details or unexpected results. We do not independently verify whether uploaded content is owned by you or whether you have the required legal rights to use it.",
      "You are responsible for ensuring that any content you upload, generate, publish or use complies with applicable laws and third party rights. You must not upload private, confidential, sensitive or personal information unless you have the right and authority to do so."
    ],
  },
  {
    title: "Sensitive information",
    body: [
      "We do not intentionally request sensitive information unless it is necessary for the service or you choose to provide it. Sensitive information may include health information, biometric information, racial or ethnic origin, political opinions, religious beliefs, sexual orientation, criminal record or other sensitive categories under Australian law.",
      "You should not upload sensitive information to Raphio unless you are legally allowed to do so and understand the risks of AI processing."
    ],
  },
  {
    title: "Use of third party providers",
    body: [
      "We may share information with trusted third party service providers who help us operate Raphio, including cloud hosting providers, AI model providers, payment processors, email and SMS providers, analytics providers, customer support tools, security and monitoring tools, file storage and content delivery services, and professional advisers such as accountants, lawyers and consultants.",
      "Some providers may be located outside Australia. By using Raphio, you understand that your information may be transferred, stored or processed in other countries where our providers operate."
    ],
  },
  {
    title: "Disclosure of information",
    body: [
      "We may disclose your information to provide the platform and services, process payments and subscriptions, support our business via third party providers, comply with legal obligations, respond to lawful requests from courts, regulators or authorities, investigate fraud, abuse, security incidents or misuse, enforce our Terms and Conditions, or in connection with a business sale, merger, restructure or transfer of assets, as well as with your consent.",
      "We do not sell your personal information to advertisers."
    ],
  },
  {
    title: "Cookies and analytics",
    body: [
      "We may use cookies, pixels, tracking tools and analytics technologies to understand how users interact with our website and platform. These tools may collect information such as pages viewed, buttons clicked, session duration, device type, browser type, IP address and referral source.",
      "You may disable cookies through your browser settings, but some parts of the website or platform may not work properly."
    ],
  },
  {
    title: "Marketing communications",
    body: [
      "We may send you emails about platform updates, features, offers, billing, support or relevant business information.",
      "You can unsubscribe from marketing emails at any time by using the unsubscribe link or contacting us. We may still send important service, account, security or billing messages."
    ],
  },
  {
    title: "Data storage and security",
    body: [
      "We take reasonable steps to protect personal information from misuse, interference, loss, unauthorised access, modification or disclosure.",
      "However, no website, platform, AI system, cloud service or internet transmission is completely secure. You use Raphio at your own risk and are responsible for keeping your login details secure. You must notify us immediately if you believe your account has been accessed without permission."
    ],
  },
  {
    title: "Data retention",
    body: [
      "We may retain personal information, uploaded content, generated outputs, billing records and account data for as long as needed to provide the service, maintain project history, meet legal, tax and accounting obligations, resolve disputes, enforce agreements, and improve and secure the platform.",
      "We may delete or anonymise information when it is no longer required."
    ],
  },
  {
    title: "Access and correction",
    body: [
      "You may request access to personal information we hold about you. You may also ask us to correct inaccurate, outdated or incomplete personal information.",
      "To make a request, contact us at Contact@raphio.ai. We may need to verify your identity before responding."
    ],
  },
  {
    title: "Account deletion",
    body: [
      "You may request deletion of your account by contacting us.",
      "Deleting your account may result in loss of access to projects, uploaded files, generated outputs, credits, subscription data and account history.",
      "We may retain certain records where required by law, for legitimate business purposes, for dispute resolution, for fraud prevention, or to enforce our Terms and Conditions."
    ],
  },
  {
    title: "Children",
    body: [
      "Raphio is not intended for children under 18 years of age. You must not use Raphio if you are under 18 unless you have permission from a parent, guardian or authorised adult."
    ],
  },
  {
    title: "International users",
    body: [
      "Raphio is operated from Australia. If you access Raphio from outside Australia, you are responsible for complying with the laws that apply in your location."
    ],
  },
  {
    title: "Privacy complaints",
    body: [
      "If you believe we have breached this Privacy Policy or mishandled your personal information, contact us first so we can try to resolve the issue at Contact@raphio.ai. Please include your name, contact details and details of your concern.",
      "If you are not satisfied with our response, you may be able to contact the Office of the Australian Information Commissioner or another relevant authority."
    ],
  },
  {
    title: "Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. The updated version will be posted on our website with a new effective date.",
      "Your continued use of Raphio after changes are published means you accept the updated Privacy Policy."
    ],
  },
];

export default function PrivacyPolicyPage() {
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
          Privacy <span style={{ color: C.terra }}>Policy.</span>
        </h1>
        <p className="text-sm font-semibold mt-3" style={{ color: C.muted }}>Effective date: 22 June 2026</p>

        <p className="text-base leading-relaxed mt-8" style={{ color: C.dark }}>
          This Privacy Policy explains how Raphio collects, uses, stores and protects personal information when you use our website, platform, AI tools, products and services.
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
            Questions about this policy?
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