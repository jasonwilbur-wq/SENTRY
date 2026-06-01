/**
 * CSO Intelligence — Executive Profile data.
 * Sourced from OSINT scans. Keep data here, not in the component.
 * Last updated: 2026-04-07
 */

export interface Source {
  publisher: string;
  url: string;
  date: string;
}

export interface Finding {
  id: string;
  type: 'thought_leadership' | 'incident_response' | 'partnership' | 'decision' | 'org_change' | 'regulatory';
  headline: string;
  date: string;
  impactScore: number;
  riskColor: 'ORANGE' | 'YELLOW' | 'GREEN' | 'RED';
  summary: string;
  whyItMatters: string;
  sources: Source[];
}

export interface Activity {
  date: string;
  title: string;
  type: string;
  impact: string;
}

export interface ExecutiveProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  profileImage: string;
  bio: string;
  keyFindings: Finding[];
  recentActivity: Activity[];
  strategicThreats: string[];
  recommendations: string[];
}

export const CSO_PROFILES: ExecutiveProfile[] = [
  // ── Stephen Schmidt (Amazon CSO) ─────────────────────────────────────────
  {
    id: 'stephen-schmidt',
    name: 'Stephen Schmidt',
    title: 'SVP & Chief Security Officer',
    company: 'Amazon',
    threatLevel: 'CRITICAL',
    profileImage: '/images/executives/stephen-schmidt.jpg',
    bio: 'Amazon CSO with sustained influence across identity, insider-risk, cyber-physical resilience, and AI security automation. March signals reinforce centralized security ownership and resilient-operations messaging at hyperscale.',
    keyFindings: [
      {
        id: 'ss-f1',
        type: 'thought_leadership',
        headline: 'Schmidt details Amazon\'s "no exceptions" internal authentication standard (Midway) and U2F-first posture',
        date: '2026-01-23',
        impactScore: 16,
        riskColor: 'ORANGE',
        summary: 'Schmidt argues strong authentication is the single most important security control. Describes Amazon\'s internal authentication system ("Midway") with universal adoption across environments, including legacy applications, with U2F security keys, device health checks, and continuous session revalidation.',
        whyItMatters: 'Direct signal of Amazon\'s identity program maturity and bias toward eliminating exceptions — reducing lateral-movement opportunities. Details indicate investment priorities (device posture + phishing-resistant MFA + continuous verification) that can raise the competitive bar for enterprise identity.',
        sources: [{ publisher: 'LinkedIn (Stephen Schmidt)', url: 'https://www.linkedin.com/pulse/why-strong-authentication-your-most-important-security-schmidt-unm0e', date: '2026-01-23' }],
      },
      {
        id: 'ss-f2',
        type: 'incident_response',
        headline: 'Amazon publicizes scale of DPRK-linked hiring fraud detection and its AI + human verification model',
        date: '2026-01-02',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'Amazon blocked more than 1,800 suspected DPRK-linked attempts to obtain remote IT roles since April 2024. Approach combines AI-powered screening (institutional links, application anomalies, geographic inconsistencies) with human verification steps.',
        whyItMatters: 'Concrete insider-risk / identity signal: Amazon treating hiring pipelines as an attack surface with measurable, high-volume adversary activity. Suggests ongoing investment in recruitment fraud analytics, cross-signal correlation, and post-hire anomaly monitoring.',
        sources: [
          { publisher: 'Dataconomy', url: 'https://dataconomy.com/2026/01/02/amazon-blocks-1800-north-korean-operatives-from-remote-jobs/', date: '2026-01-02' },
          { publisher: 'LinkedIn (Stephen Schmidt)', url: 'https://www.linkedin.com/posts/stephenschmidt1_over-the-past-few-years-north-korean-dprk-activity-7407485036142276610-dot7', date: '2025-12-18' },
        ],
      },
      {
        id: 'ss-f3',
        type: 'thought_leadership',
        headline: 'Amazon discloses \'Autonomous Threat Analysis\' agentic AI approach to scale bug hunting and defenses',
        date: '2025-11-24',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'Amazon publicly described an internal system (Autonomous Threat Analysis, ATA) using multiple specialized AI agents to identify weaknesses, perform variant analysis, and propose remediations and detections with human review. System intended to reduce analysis cycles from weeks to hours.',
        whyItMatters: 'Context for Amazon\'s AI/security automation posture and continued investment in agentic security testing, detection engineering, and accelerated remediation. Signals competitive pressure to modernize secure SDLC and automated analysis capabilities to match machine-speed threat evolution.',
        sources: [
          { publisher: 'WIRED', url: 'https://www.wired.com/story/amazon-autonomous-threat-analysis/', date: '2025-11-24' },
          { publisher: 'Amazon Science', url: 'https://www.amazon.science/blog/how-amazon-uses-ai-agents-to-anticipate-and-counter-cyber-threats', date: '2025-11-24' },
        ],
      },
    ],
    recentActivity: [
      { date: '2026-03-31', title: 'Regional resilience signal highlighted in March executive monitoring', type: 'Resilience Signal', impact: 'Cyber-physical disruption narrative raises cloud resiliency expectations' },
      { date: '2026-03-02', title: 'Amazon senior leadership roster reconfirmed', type: 'Governance Signal', impact: 'Continues to publicly center CSO decision authority at enterprise level' },
      { date: '2026-02-12', title: 'CyberScoop Safe Mode: How Amazon Killed the Password', type: 'Media Appearance', impact: 'High visibility thought leadership on passwordless + identity unification' },
      { date: '2026-01-23', title: 'LinkedIn Article: Why Strong Authentication Is Your Most Important Security Control', type: 'Thought Leadership', impact: 'Direct disclosure of Midway authentication system and U2F enforcement' },
      { date: '2026-01-02', title: 'DPRK Hiring Fraud Disclosure', type: 'Incident Response', impact: '1,800+ blocked attempts — sets industry standard for insider risk detection' },
    ],
    strategicThreats: [
      '🔥 CRITICAL: Industry standard-setting on passwordless identity and exception elimination remains active',
      '🔥 CRITICAL: 1,800+ DPRK hiring blocks demonstrate advanced insider-risk detection at scale',
      '⚠️ HIGH: March resilience/cyber-physical signal adds pressure on cloud continuity narratives',
      '⚠️ HIGH: Autonomous Threat Analysis (ATA) AI agents continue to reinforce machine-speed security positioning',
      '⚠️ HIGH: Public thought leadership cadence continues shaping enterprise identity expectations',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Re-baseline Walmart identity exception governance against Amazon\'s no-exceptions model',
      '🔥 IMMEDIATE: Re-test insider-risk hiring controls against DPRK-style infiltration patterns',
      '⚡ 30-DAY: Run resilience tabletop for regional cloud disruption + cyber-physical scenario overlap',
      '⚡ 30-DAY: Accelerate passwordless MFA roadmap with measurable coverage metrics',
      '⚡ 90-DAY: Expand agentic AI security testing with explicit time-to-detection improvements',
      '🎯 6-MONTH: Strengthen executive external narrative on identity, resilience, and AI security governance',
    ],
  },

  // ── Amy Herzog (AWS CISO) ─────────────────────────────────────────────────
  {
    id: 'amy-herzog',
    name: 'Amy Herzog',
    title: 'VP & Chief Information Security Officer',
    company: 'AWS (Amazon Web Services)',
    threatLevel: 'HIGH',
    profileImage: '/images/executives/amy-herzog.jpg',
    bio: 'AWS CISO driving productized security automation, threat-intelligence visibility, and secure-AI operations messaging. March signals raise maturity posture around autonomous testing workflows and public secure-release discipline.',
    keyFindings: [
      {
        id: 'ah-f1',
        type: 'thought_leadership',
        headline: 'Herzog cites major GenAI efficiency gains for vulnerability identification and SOC alert contexting',
        date: '2026-01-07',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'GenAI reduced time to identify potentially vulnerable systems to ~11 minutes on average (from ~27 hours), and reduced time to assemble context on key SOC alerts to ~11 minutes (from ~four hours). Emphasizes applying \'security basics\' when managing identity for agentic AI.',
        whyItMatters: 'Indicates AWS has operationalized GenAI in core security workflows (vuln identification and SOC triage), suggesting maturity beyond pilots. Shifts the competitive benchmark for security operations automation and influences customer demand for measurable time-to-context/time-to-fix improvements.',
        sources: [{ publisher: 'AI Leaders Council (citing WSJ)', url: 'https://aileaderscouncil.org/how-ai-is-reinventing-cybersecurity-for-2026/', date: '2026-01-07' }],
      },
      {
        id: 'ah-f2',
        type: 'partnership',
        headline: 'AWS Security Agent adds GitHub Enterprise Cloud connectivity and automated remediation PR workflows',
        date: '2026-01-22',
        impactScore: 16,
        riskColor: 'ORANGE',
        summary: 'AWS announced customers can connect GitHub Enterprise Cloud organizations to AWS Security Agent via a GitHub app. Features: automated code reviews on pull requests, use of private repository code during penetration testing, and optional automated remediation via agent-submitted pull requests.',
        whyItMatters: 'Concrete integration move toward developer workflow embedding (pull requests) and closed-loop remediation, reducing AppSec friction and increasing coverage at scale. Ecosystem strategy: meeting enterprises where code lives (GitHub Enterprise) and pushing security controls upstream.',
        sources: [{ publisher: 'AWS (What\'s New)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/01/aws-security-agent-ghe-support/', date: '2026-01-22' }],
      },
      {
        id: 'ah-f3',
        type: 'thought_leadership',
        headline: 'AWS publishes technical disclosure on Security Agent\'s multi-agent penetration testing architecture',
        date: '2026-02-26',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'AWS Security Blog published technical post detailing a multi-agent architecture for automated penetration testing within AWS Security Agent. Emphasizes orchestration of specialized agents, adaptive task generation, and assertion-based validation. Discusses mitigating LLM non-determinism (multiple runs, consolidating findings).',
        whyItMatters: 'Technical disclosure suggests AWS is investing in credible, repeatable agentic security workflows, not just marketing claims. Focus on validation and non-determinism mitigations is a key maturity signal. AWS will market Security Agent as both scalable and defensible.',
        sources: [{ publisher: 'AWS Security Blog', url: 'https://aws.amazon.com/blogs/security/inside-aws-security-agent-a-multi-agent-architecture-for-automated-penetration-testing/', date: '2026-02-26' }],
      },
    ],
    recentActivity: [
      { date: '2026-03-31', title: 'March executive signals highlight autonomous testing maturity', type: 'Product Signal', impact: 'Raises benchmark for 24/7 AI-driven security testing workflows' },
      { date: '2026-03-31', title: 'Threat-intelligence and partner-coordination posture surfaced', type: 'Threat Intel Signal', impact: 'Strengthens trust narrative for early warning and response' },
      { date: '2026-03-31', title: 'AI tooling vulnerability disclosure/patch cycle noted', type: 'Security Engineering Signal', impact: 'Supports secure-release credibility for AI-era platform operations' },
      { date: '2026-02-26', title: 'AWS Security Agent Multi-Agent Architecture Disclosure', type: 'Technical Publication', impact: 'Detailed agentic AI penetration testing approach — credibility building' },
      { date: '2026-01-22', title: 'GitHub Enterprise Cloud Integration Launch', type: 'Partnership', impact: 'Developer workflow embedding — automated remediation PRs' },
    ],
    strategicThreats: [
      '🔥 CRITICAL: AWS continues moving from AI-security messaging to operationalized autonomous workflows',
      '⚠️ HIGH: Security Agent + developer embedding strategy can reset enterprise AppSec expectations',
      '⚠️ HIGH: Threat-intel-to-action narrative improves AWS trust positioning in high-stakes deployments',
      '⚠️ HIGH: Secure-release handling of AI tooling vulnerabilities can become procurement differentiator',
      '⚠️ MEDIUM: Continuous observability + automation advocacy still shapes SOC modernization benchmark',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Compare Walmart AppSec automation maturity against AWS autonomous testing posture',
      '🔥 IMMEDIATE: Define measurable time-to-detect/time-to-context metrics for executive scorecards',
      '⚡ 30-DAY: Tighten secure-release communication for AI tooling vulnerabilities and remediations',
      '⚡ 90-DAY: Expand developer-embedded security workflows with closed-loop remediation controls',
      '🎯 6-MONTH: Position Walmart security narrative around measured outcomes, not platform claims',
    ],
  },

  // ── Chet Kapoor (AWS VP Security Services & Observability) ────────────────
  // OSINT scan: 2026-03-02 | Confidence: PROVISIONAL / Medium
  {
    id: 'chet-kapoor',
    name: 'Chet Kapoor',
    title: 'Vice President, Security Services and Observability',
    company: 'Amazon Web Services (AWS)',
    threatLevel: 'HIGH',
    profileImage: '/images/executives/chet-kapoor.jpg',
    bio: 'AWS VP for Security Services and Observability. March signals emphasize telemetry centralization, org-scale posture ingestion, and security-data convergence for AI-era incident readiness across enterprise and regulated environments.',
    keyFindings: [
      {
        id: 'ck-f1',
        type: 'thought_leadership',
        headline: 'Kapoor frames AI-era security as a data/telemetry scale problem requiring more monitoring and AI parsing',
        date: '2026-02-27',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'In a Feb 27, 2026 Semafor interview, Kapoor argued that AI agents on corporate networks will create more work for security teams by expanding what must be observed and monitored. He stated the volume of security "signals" captured will increase dramatically, and that additional AI will be needed to parse that data. He also pointed to growth in AI-enabled cyberattacks as an emerging pressure on defenses.',
        whyItMatters: 'This messaging signals a likely push toward higher-fidelity telemetry, detection engineering, and AI-assisted triage across AWS security and observability offerings. Implies investment in platforms that ingest and analyze more signals — and in the automation needed to keep staffing requirements flat.',
        sources: [{ publisher: 'Semafor (Reed Albergotti)', url: 'https://www.semafor.com/article/02/27/2026/amazons-security-chief-chet-kapoor-on-data-in-the-age-of-ai', date: '2026-02-27' }],
      },
      {
        id: 'ck-f2',
        type: 'org_change',
        headline: 'Leaked AWS org chart lists Kapoor as a direct report in CEO Matt Garman\'s top leadership set',
        date: '2026-01-30',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'A Jan 30, 2026 Business Insider report describing a leaked AWS org chart lists Chet Kapoor (Security Services and Observability) among executives reporting directly to AWS CEO Matt Garman. The article frames the chart as reflecting leadership changes and shifting priorities amid broader restructuring.',
        whyItMatters: 'Being in the CEO\'s direct-report structure signals AWS treats security/observability as a top-tier strategic function, accelerating funding and decision velocity. Implies greater executive attention to security posture as AWS scales AI products and workloads.',
        sources: [{ publisher: 'Business Insider (Ashley Stewart)', url: 'https://www.businessinsider.com/leaked-aws-org-chart-execs-who-joined-stayed-left-ceo-2026-1', date: '2026-01-30' }],
      },
      {
        id: 'ck-f3',
        type: 'org_change',
        headline: 'AWS hired Kapoor to lead Security Services & Observability; CEO email emphasized AI-driven security needs',
        date: '2025-10-13',
        impactScore: 16,
        riskColor: 'ORANGE',
        summary: 'On Oct 13, 2025, Business Insider reported AWS hired Chet Kapoor as VP of Security Services and Observability, reporting to CEO Matt Garman. The article includes an excerpted internal email in which Garman ties the growing importance of external security/observability services to increasing cloud complexity and AI-driven change. The email also describes re-alignment of leaders to report into Kapoor\'s scope. [PRE-WINDOW context]',
        whyItMatters: 'Establishes the mandate for Kapoor\'s charter: security and observability as business-critical, AI-accelerated priorities. The explicit coupling of AI and security/operations suggests sustained investment and potentially expanded product packaging across these domains.',
        sources: [{ publisher: 'Business Insider (Eugene Kim)', url: 'https://www.businessinsider.com/aws-strengthens-ai-security-with-datastax-ceo-as-new-vp-2025-10', date: '2025-10-13' }],
      },
      {
        id: 'ck-f4',
        type: 'thought_leadership',
        headline: 'AWS customer story quoted Kapoor (as DataStax CEO) on AI accuracy, RAG context, and agentic futures',
        date: '2025-02-17',
        impactScore: 6,
        riskColor: 'GREEN',
        summary: 'An AWS customer story quotes Kapoor (then DataStax CEO) emphasizing that accuracy is a key differentiator for generative AI, and that context techniques like retrieval-augmented generation are essential. Also quotes him predicting a future where "agents will be the only way we build software." Provides pre-hire background on his AI/data posture. [PRE-WINDOW context]',
        whyItMatters: 'These themes align with current security/observability challenges in AI systems: provenance, context integrity, and governance for agentic workflows. Suggests a continuity of emphasis on data quality and context that may influence how AWS frames security controls for AI and agent operations.',
        sources: [{ publisher: 'AWS Editorial (DataStax customer story)', url: 'https://aws.amazon.com/isv/resources/how-datastax-is-making-accuracy-generative-ais-greatest-asset/', date: '2025-02-17' }],
      },
    ],
    recentActivity: [
      { date: '2026-03-30', title: 'Org-wide Security Hub CSPM ingestion into CloudWatch pipelines signaled', type: 'Platform Capability', impact: 'Converges security posture telemetry with observability workflows at scale' },
      { date: '2026-03-30', title: 'Security Hub GovCloud expansion highlighted in executive report', type: 'Regulated Market Signal', impact: 'Extends centralized risk analytics pattern into government cloud environments' },
      { date: '2026-03-05', title: 'CloudWatch centralization rules by source/type noted', type: 'Operational Feature Signal', impact: 'Reduces multi-account, multi-region ingestion friction' },
      { date: '2026-02-27', title: 'Semafor Interview: AI Agents Will Exponentially Expand Security Signals', type: 'Media Appearance', impact: 'Frames AWS telemetry-scale thesis and AI parsing need' },
    ],
    strategicThreats: [
      '⚠️ HIGH: Telemetry-first platform moves are now shipping as concrete capability updates',
      '⚠️ HIGH: Org-scale security-to-observability convergence can increase AWS customer stickiness',
      '⚠️ HIGH: GovCloud analytics expansion boosts AWS competitiveness in regulated procurement cycles',
      '📡 MEDIUM: Messaging remains tightly aligned to measurable platform shifts (higher credibility)',
      '📡 MEDIUM: Pre-window CEO-reporting signal still implies elevated budget and governance influence',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Benchmark Walmart telemetry centralization architecture against AWS org-wide patterns',
      '⚡ 30-DAY: Identify and reduce friction in multi-account security log governance and routing',
      '⚡ 90-DAY: Build converged security + observability KPI scorecard for leadership governance reviews',
      '🎯 6-MONTH: Strengthen AI-incident readiness playbooks across cyber, fraud, and platform operations',
      '🔍 ONGOING: Track Kapoor-linked AWS announcements for additional telemetry and response automation moves',
    ],
  },

  // ── Rich Agostino (Target CISO) ───────────────────────────────────────────
  // OSINT scan: 2026-03-02 | Confidence: PROVISIONAL / High (SEC filings)
  {
    id: 'rich-agostino',
    name: 'Rich Agostino',
    title: 'SVP & Chief Information Security Officer',
    company: 'Target Corporation',
    threatLevel: 'MEDIUM',
    profileImage: '/images/executives/rich-agostino.jpg',
    bio: 'Target CISO with March 2026 signals centered on SEC-grade governance transparency, in-house defensive capability disclosure, vendor exposure framing, and AI acceleration under enterprise technology investment.',
    keyFindings: [
      {
        id: 'ra-f1',
        type: 'org_change',
        headline: '~500 supply chain and store-district roles eliminated — insider-risk window now open',
        date: '2026-02-10',
        impactScore: 12,
        riskColor: 'YELLOW',
        summary: 'Target eliminated approximately 400 supply-chain-related roles and ~100 store-district roles, described as standardizing the field operating model and consolidating store districts. Reported by Supply Chain Dive (internal email), corroborated by WSJ and Fast Company. Simultaneous leadership reshuffle raises access-transition complexity.',
        whyItMatters: 'Workforce reductions and reorganizations elevate insider-risk exposure during access changes, role transitions, and contractor/vendor handoffs. Supply chain and store-district restructuring increases cyber-physical convergence risk if ownership and escalation paths shift — a CISO-level concern for any retailer.',
        sources: [
          { publisher: 'Supply Chain Dive (Dani James)', url: 'https://www.supplychaindive.com/news/target-layoffs-job-cuts-five-hundred-roles-supply-chain-store-payroll/811814/', date: '2026-02-10' },
          { publisher: 'Wall Street Journal', url: 'https://www.wsj.com/business/retail/target-to-lay-off-500-workers-as-new-ceo-shakes-up-leadership-team-d3c95e85', date: '2026-02-10' },
          { publisher: 'Fast Company', url: 'https://www.fastcompany.com/91490082/target-layoffs-today-more-jobs-cuts-customer-experience-lags', date: '2026-02-10' },
        ],
      },
      {
        id: 'ra-f2',
        type: 'org_change',
        headline: 'New COO (Lisa Roath, Feb 15) and CCO exit (Rick Gomez, Apr) reshape CISO\'s stakeholder map',
        date: '2026-02-06',
        impactScore: 9,
        riskColor: 'YELLOW',
        summary: 'Target announced Lisa Roath as EVP & COO effective Feb 15, 2026, and Rick Gomez stepping down as Chief Commercial Officer, transitioning to advisor before departing April 2026. Target described the changes as simplifying structure and accelerating growth. Filed via SEC 8-K, corroborated by corporate press release.',
        whyItMatters: 'Operational and commercial leadership changes reshape the CISO\'s stakeholder map and risk-ownership model. For Agostino, these transitions likely trigger re-validation of access pathways for new leaders and potential reallocation of security enablement resources across operations and commercial channels.',
        sources: [
          { publisher: 'SEC Form 8-K (2026-02-10)', url: 'https://www.sec.gov/Archives/edgar/data/27419/000002741926000006/tgt-20260206.htm', date: '2026-02-10' },
          { publisher: 'Target Corporate Press', url: 'https://corporate.target.com/press/release/2026/02/target-announces-executive-leadership-changes-to-accelerate-growth%2C-confirms-q4-financial-guidance', date: '2026-02-10' },
        ],
      },
      {
        id: 'ra-f3',
        type: 'org_change',
        headline: 'CEO transition: Michael Fiddelke takes over Feb 1; Brian Cornell continues as Executive Chair',
        date: '2026-01-31',
        impactScore: 6,
        riskColor: 'GREEN',
        summary: 'Target filed an 8-K detailing compensation terms for Michael J. Fiddelke as CEO effective February 1, 2026. Brian C. Cornell continues as Executive Chair through approximately March 13, 2027. A new CEO often resets operating priorities and governance rhythms that cascade to security funding and risk tolerance.',
        whyItMatters: 'New CEO\'s emphasis areas can accelerate or deprioritize cyber programs, especially those tied to digital growth and operational resilience. Fiddelke\'s background as CFO suggests a metrics-driven lens — Agostino will likely need to sharpen ROI narratives for security investments.',
        sources: [{ publisher: 'SEC Form 8-K (2026-02-05)', url: 'https://www.sec.gov/Archives/edgar/data/27419/000002741926000004/tgt-20260131.htm', date: '2026-02-05' }],
      },
      {
        id: 'ra-f4',
        type: 'regulatory',
        headline: 'Board refresh: two new directors added; one assigned to Audit & Risk and Infrastructure & Finance',
        date: '2026-01-21',
        impactScore: 9,
        riskColor: 'YELLOW',
        summary: 'Target elected John R. Hoke III (eff. March 1, 2026) and Stephen B. Bratspies (eff. April 1, 2026) to its Board. Bratspies was assigned to the Audit & Risk Committee and Infrastructure & Finance Committee. Hoke was assigned to Compensation & Human Capital Management and Governance & Sustainability.',
        whyItMatters: 'New directors on Audit & Risk and Infrastructure-related committees shift oversight emphasis for enterprise risk, including cybersecurity. Bratspies (ex-CEO, HanesBrands; former Walmart executive) brings operational retail experience — may bring more pointed scrutiny to resilience and security investment reporting.',
        sources: [{ publisher: 'SEC Form 8-K (2026-01-22)', url: 'https://www.sec.gov/Archives/edgar/data/27419/000002741926000002/tgt-20260121.htm', date: '2026-01-22' }],
      },
      {
        id: 'ra-c1',
        type: 'thought_leadership',
        headline: 'RH-ISAC podcast: Agostino discusses cyber-physical convergence and community-built tools [PRE-WINDOW]',
        date: '2024-05-15',
        impactScore: 6,
        riskColor: 'GREEN',
        summary: 'A Retail & Hospitality ISAC podcast episode features Rich Agostino discussing cybersecurity career development, convergence of physical and cybersecurity, and tools Target developed and shared with the RH-ISAC community. Emphasizes collaboration and information sharing as strategic levers.',
        whyItMatters: 'Cyber-physical convergence emphasis and community tool-sharing signal investment in detection/engineering capabilities beyond baseline controls. RH-ISAC participation means threat intelligence shared by Target could surface Walmart-relevant insights — and vice versa.',
        sources: [{ publisher: 'N2K CyberWire / RH-ISAC Ep. 50', url: 'https://thecyberwire.com/podcasts/rh-isac/50/transcript', date: '2024-05-15' }],
      },
      {
        id: 'ra-c2',
        type: 'thought_leadership',
        headline: 'CSO Online profile: Target CISO balances customer security and customer experience [PRE-WINDOW]',
        date: '2021-11-15',
        impactScore: 6,
        riskColor: 'GREEN',
        summary: 'A CSO Online feature profiles Rich Agostino and describes Target\'s approach to strengthening security while maintaining customer experience. The piece situates the work as part of Target\'s post-2013 breach evolution and broader cybersecurity transformation.',
        whyItMatters: 'Historical framing of how Target communicates security tradeoffs (friction vs. protection). Useful baseline: compare against current restructuring actions for signals of shifting risk tolerance under the new CEO.',
        sources: [{ publisher: 'CSO Online (James Careless)', url: 'https://www.csoonline.com/article/571591/how-targets-ciso-balances-customer-security-and-customer-experience.html', date: '2021-11-15' }],
      },
    ],
    recentActivity: [
      { date: '2026-03-11', title: 'Target Form 10-K Item 1C cybersecurity governance disclosure', type: 'Regulatory Filing', impact: 'Board + Audit & Risk oversight and in-house operating model clarified' },
      { date: '2026-03-11', title: '10-K risk factors include vendor incidents and AI-enabled threat evolution', type: 'Regulatory Filing', impact: 'Confirms vendor exposure framing and AI threat acceleration awareness' },
      { date: '2026-03-03', title: 'Target announces incremental $2B 2026 investment and technology acceleration', type: 'Strategic Messaging', impact: 'Likely expands governance and assurance needs around AI and data risk' },
      { date: '2026-02-10', title: '~500 Roles Eliminated (Supply Chain + Store Districts)', type: 'Org Risk Signal', impact: 'Insider-risk window remains relevant during transitions' },
      { date: '2024-05-15', title: 'RH-ISAC Podcast — Ep. 50 Feature', type: 'Industry Engagement', impact: 'Cyber-physical convergence + collaboration posture context' },
    ],
    strategicThreats: [
      '⚠️ HIGH: SEC Item 1C governance transparency provides clearer benchmark for investor/regulator cyber posture',
      '⚠️ HIGH: Explicit vendor-incident framing in risk factors highlights third-party exposure governance pressure',
      '📡 MEDIUM: Technology + AI acceleration increases control, assurance, and model-risk oversight requirements',
      '📡 MEDIUM: In-house fusion center/threat intel/testing disclosures signal sustained detection-response maturity investment',
      '📡 MEDIUM: Cyber + fraud operating-model convergence remains strategically relevant for retail competition',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Benchmark Walmart cyber governance narrative against Target\'s SEC Item 1C disclosure depth',
      '🔥 IMMEDIATE: Re-assess vendor-risk reporting and assurance language for board/investor readiness',
      '⚡ 30-DAY: Track how Target allocates $2B tech acceleration spend toward AI controls and resilience programs',
      '⚡ 90-DAY: Monitor cyber-fraud convergence signals for transferable operating-model tactics',
      '🎯 6-MONTH: Watch for renewed Agostino public cadence (NRF/RSAC/RH-ISAC style engagements)',
    ],
  },

  // ── Becky Hall (Amazon Global Security) ───────────────────────────────────
  // OSINT scan: 2026-03 | Confidence: PROVISIONAL / Medium
  {
    id: 'becky-hall',
    name: 'Becky Hall',
    title: 'VP, Global Security (Unverified)',
    company: 'Amazon',
    threatLevel: 'MEDIUM',
    profileImage: '/images/executives/becky-hall.jpg',
    bio: 'Profile remains PROVISIONAL: March 2026 review still did not confirm Becky Hall as Amazon VP of Global Security via primary public sources. Signals are useful for context, but executive attribution confidence stays capped until first-party validation.',
    keyFindings: [
      {
        id: 'bh-f1',
        type: 'org_change',
        headline: 'Target identity/title could not be corroborated in primary public sources',
        date: '2026-03-01',
        impactScore: 10,
        riskColor: 'YELLOW',
        summary: 'Open-source scanning did not locate a primary, publicly accessible Amazon source confirming Becky Hall as VP of Global Security. Publicly listed leadership pages surfaced other security leaders.',
        whyItMatters: 'Identity-resolution risk is high. Without validated identity/title, downstream attribution (strategy, incidents, speaking, vendor influence) can be noisy and misdirect CSO monitoring.',
        sources: [{ publisher: 'Amazon S-Team Leadership Page', url: 'https://www.aboutamazon.com/about-us/leadership', date: '2026-03-01' }],
      },
      {
        id: 'bh-f2',
        type: 'org_change',
        headline: 'Amazon publicly positions Steve Schmidt as enterprise Chief Security Officer',
        date: '2026-03-02',
        impactScore: 10,
        riskColor: 'YELLOW',
        summary: 'Amazon\'s public senior-leadership materials continue to identify Steve Schmidt as Chief Security Officer, reinforcing consolidated top-level security ownership.',
        whyItMatters: 'Clarifies decision authority concentration at Amazon security leadership level. Useful context while lower-visibility VP identity remains unresolved.',
        sources: [{ publisher: 'Amazon S-Team Leadership Page', url: 'https://www.aboutamazon.com/about-us/leadership', date: '2026-03-02' }],
      },
      {
        id: 'bh-f3',
        type: 'partnership',
        headline: 'Amazon recognized as 2026 SIA Member of the Year during ISC West week',
        date: '2026-03-24',
        impactScore: 8,
        riskColor: 'YELLOW',
        summary: 'Security Industry Association announced Amazon as 2026 SIA Member of the Year, with recognition presented during ISC West week.',
        whyItMatters: 'Indicates sustained Amazon presence in physical-security ecosystem and standards networks that influence cyber-physical security practices.',
        sources: [{ publisher: 'Security Industry Association', url: 'https://www.securityindustry.org/2026-sia-members-of-the-year/', date: '2026-03-24' }],
      },
      {
        id: 'bh-f4',
        type: 'thought_leadership',
        headline: 'Media reporting highlights internal AI-usage monitoring concerns at Amazon',
        date: '2026-03-11',
        impactScore: 8,
        riskColor: 'YELLOW',
        summary: 'Major media reporting described employee concerns regarding AI-driven productivity pressure and perceived dashboard-based monitoring of AI tool usage; Amazon disputed broad characterization.',
        whyItMatters: 'Whether fully accurate or not, this narrative can influence workforce trust, insider-risk dynamics, and external perception of Amazon\'s AI governance posture.',
        sources: [{ publisher: 'The Guardian', url: 'https://www.theguardian.com/technology/2026/mar/11/amazon-ai-productivity-pressure-report', date: '2026-03-11' }],
      },
    ],
    recentActivity: [
      { date: '2026-03-24', title: 'Amazon SIA Member of the Year Recognition (ISC West Week)', type: 'Industry Recognition', impact: 'Strengthens cyber-physical network influence visibility' },
      { date: '2026-03-11', title: 'AI Monitoring Narrative in Major Media', type: 'Public Narrative Signal', impact: 'Potential workforce and reputation pressure around AI governance' },
      { date: '2026-03-02', title: 'Amazon Leadership Roster Reviewed', type: 'Leadership Signal', impact: 'Reinforces CSO-level decision authority concentration' },
      { date: '2026-03-01', title: 'Identity/Title Corroboration Gap Recorded', type: 'Data Quality Signal', impact: 'Confidence remains capped until first-party role validation' },
    ],
    strategicThreats: [
      '⚠️ HIGH: Identity-resolution uncertainty still creates attribution risk for executive-level reporting',
      '📡 MEDIUM: Amazon physical-security ecosystem visibility (SIA recognition) supports cyber-physical influence',
      '📡 MEDIUM: AI monitoring/pressure narratives can affect insider-risk and workforce trust dynamics',
      '📡 MEDIUM: Public CSO roster continuity reinforces centralized Amazon security prioritization',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Do not elevate this profile above PROVISIONAL until role/title is first-party verified',
      '⚡ 30-DAY: Track SIA/ISC West follow-on announcements for concrete Amazon physical-security signals',
      '⚡ 30-DAY: Monitor AI workforce-surveillance narrative drift and potential insider-risk implications',
      '⚡ 90-DAY: Keep explicit confidence tags and source quality notes in all Becky-profile briefings',
    ],
  },

  // ── Michael Carr (Kroger) — PROVISIONAL lead ─────────────────────
  {
    id: 'michael-carr-kroger',
    name: 'Michael Carr',
    title: 'Business Information Security Officer (Unverified)',
    company: 'Kroger',
    threatLevel: 'MEDIUM',
    profileImage: '/images/executives/michael-carr.jpg',
    bio: 'PROVISIONAL lead from a 2026-05-29 public-source scout run. Michael Carr was cited as a Kroger Business Information Security Officer (BISO) in CDO Magazine InfoSec event coverage (Sep/Oct 2024). Not confirmed via an official Kroger source; currency for 2025/2026 unverified, and a CISO may sit above the BISO role. Treat as a starting lead, not an established profile.',
    keyFindings: [
      {
        id: 'mc-f1',
        type: 'org_change',
        headline: 'Cited as Kroger Business Information Security Officer in CDO Magazine InfoSec coverage',
        date: '2024-10-01',
        impactScore: 8,
        riskColor: 'YELLOW',
        summary: 'Michael Carr appeared as a Kroger BISO in CDO Magazine Cincinnati InfoSec dinner coverage (Sep + Oct 2024). This is the only productive public source located; official Kroger leadership pages were not accessible to the scout.',
        whyItMatters: 'Establishes a candidate point-of-contact for Kroger\'s cyber org, but the BISO title is not a traditional CISO role — org-structure verification is required before this drives any CSO-level monitoring.',
        sources: [{ publisher: 'CDO Magazine', url: 'https://www.cdomagazine.tech/', date: '2024-10-01' }],
      },
    ],
    recentActivity: [
      { date: '2024-10-01', title: 'CDO Magazine Cincinnati InfoSec dinner coverage', type: 'Public Appearance', impact: 'Only confirmed public citation; currency unverified' },
      { date: '2026-05-29', title: 'Identity/title corroboration gap recorded', type: 'Data Quality Signal', impact: 'Confidence capped until first-party Kroger source validates role' },
    ],
    strategicThreats: [
      '⚠️ HIGH: Incumbency + currency unverified — do not attribute Kroger security strategy to this profile yet',
      '📡 MEDIUM: BISO title suggests a possible CISO above; org structure unknown',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Verify current Kroger security org structure + incumbent via official/first-party sources',
      '⚡ 30-DAY: Confirm whether a CISO sits above the BISO role before elevating profile confidence',
      '⚡ 90-DAY: Refresh from RH-ISAC / conference rosters if official disclosure stays unavailable',
    ],
  },

  // ── Albertsons — UNCONFIRMED placeholder ──────────────────────
  {
    id: 'albertsons-ciso-unconfirmed',
    name: 'Albertsons — Security Leader (Unconfirmed)',
    title: 'CISO / VP Security (Unconfirmed)',
    company: 'Albertsons',
    threatLevel: 'LOW',
    profileImage: '',
    bio: 'UNCONFIRMED placeholder. A 2026-05-29 public-source scout could not identify Albertsons\' top security executive (newsroom + press paths were bot-walled). Tracked here so the gap is visible. Analyst action: pull the SEC DEF 14A proxy and 10-K cybersecurity-officer disclosure, and review albertsonscompanies.com/leadership manually.',
    keyFindings: [],
    recentActivity: [
      { date: '2026-05-29', title: 'Public-source identification attempt failed', type: 'Data Quality Signal', impact: 'No public incumbent found; SEC filings are the recommended next source' },
    ],
    strategicThreats: [
      '⚠️ Incumbent unknown — no attribution possible until an analyst confirms via SEC filings or first-party sources',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Pull Albertsons SEC DEF 14A + 10-K for named cybersecurity officer',
      '⚡ 30-DAY: Review official leadership page manually; confirm before adding any findings',
    ],
  },

  // ── HEB — UNCONFIRMED placeholder ─────────────────────────
  {
    id: 'heb-security-unconfirmed',
    name: 'H-E-B — Security Leader (Unconfirmed)',
    title: 'Head of Security (Unconfirmed)',
    company: 'H-E-B',
    threatLevel: 'LOW',
    profileImage: '',
    bio: 'UNCONFIRMED placeholder. H-E-B is privately held with minimal public leadership disclosure; the 2026-05-29 scout found no public security executive. This gap may be structurally irreducible from public sources alone. Analyst action: use RH-ISAC network contacts and Texas Cybersecurity Summit speaker rosters.',
    keyFindings: [],
    recentActivity: [
      { date: '2026-05-29', title: 'Public-source identification attempt failed', type: 'Data Quality Signal', impact: 'Private company — minimal disclosure; network intelligence required' },
    ],
    strategicThreats: [
      '⚠️ Incumbent unknown — private company, no SEC filings; public attribution likely not possible',
    ],
    recommendations: [
      '⚡ 30-DAY: Source via RH-ISAC contacts or Texas Cybersecurity Summit speaker lists',
      '🎯 Treat as low-priority until a credible first-party signal appears',
    ],
  },

  // ── Costco — UNCONFIRMED placeholder ───────────────────────
  {
    id: 'costco-ciso-unconfirmed',
    name: 'Costco — Security Leader (Unconfirmed)',
    title: 'CISO / VP Security (Unconfirmed)',
    company: 'Costco',
    threatLevel: 'LOW',
    profileImage: '',
    bio: 'UNCONFIRMED placeholder. The 2026-05-29 scout could not identify Costco\'s top security executive (investor-relations paths were bot-walled). Tracked so the gap is visible. Analyst action: pull the Costco SEC 10-K (CIK 0000909832) for a named cybersecurity officer and review investor.costco.com manually.',
    keyFindings: [],
    recentActivity: [
      { date: '2026-05-29', title: 'Public-source identification attempt failed', type: 'Data Quality Signal', impact: 'No public incumbent found; SEC 10-K is the recommended next source' },
    ],
    strategicThreats: [
      '⚠️ Incumbent unknown — no attribution possible until an analyst confirms via SEC filings or first-party sources',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Pull Costco SEC 10-K (CIK 0000909832) for named cybersecurity officer',
      '⚡ 30-DAY: Review investor.costco.com + Gartner Security Summit speaker archives',
    ],
  },

];

// Derived threat-summary counts for the hero badges
export const THREAT_COUNTS = {
  critical: CSO_PROFILES.flatMap(p => p.keyFindings).filter(f => f.riskColor === 'ORANGE' || f.riskColor === 'RED').length,
  high:     CSO_PROFILES.flatMap(p => p.keyFindings).filter(f => f.riskColor === 'YELLOW').length,
  updated:  'Apr 7, 2026',
};
