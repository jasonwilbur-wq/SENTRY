/**
 * CSO Intelligence — Executive Profile data.
 * Sourced from OSINT scans. Keep data here, not in the component.
 * Last updated: 2026-03-02
 */

export interface Source {
  publisher: string;
  url: string;
  date: string;
}

export interface Finding {
  id: string;
  type: 'thought_leadership' | 'incident_response' | 'partnership' | 'decision' | 'org_change';
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
    bio: 'Amazon CSO driving passwordless authentication, AI-powered security, and industry standard-setting. Leading 1,800+ DPRK infiltration blocks. Most aggressive competitor CSO.',
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
      { date: '2026-02-12', title: 'CyberScoop Safe Mode: How Amazon Killed the Password', type: 'Media Appearance', impact: 'High visibility thought leadership on passwordless + identity unification' },
      { date: '2026-01-23', title: 'LinkedIn Article: Why Strong Authentication Is Your Most Important Security Control', type: 'Thought Leadership', impact: 'Direct disclosure of Midway authentication system and U2F enforcement' },
      { date: '2026-01-02', title: 'DPRK Hiring Fraud Disclosure', type: 'Incident Response', impact: '1,800+ blocked attempts — sets industry standard for insider risk detection' },
      { date: '2025-11-24', title: 'ATA (Autonomous Threat Analysis) Launch', type: 'Product Innovation', impact: 'Agentic AI for bug hunting — weeks to hours acceleration' },
    ],
    strategicThreats: [
      '🔥 CRITICAL: Setting industry standards for passwordless auth and eliminating password-based lateral movement',
      '🔥 CRITICAL: 1,800+ DPRK hiring blocks demonstrate advanced insider-risk detection — raising competitive bar',
      '⚠️ HIGH: Autonomous Threat Analysis (ATA) AI agents accelerating security testing — machine-speed defense',
      '⚠️ HIGH: "No exceptions" Midway authentication — universal phishing-resistant MFA across all environments',
      '⚠️ HIGH: Public thought leadership via LinkedIn, CyberScoop — influencing enterprise security standards',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Benchmark Walmart\'s identity coverage vs Amazon\'s "no exceptions" Midway model',
      '🔥 IMMEDIATE: Review DPRK screening protocols — Amazon blocking 1,800+ vs Walmart\'s current posture',
      '⚡ 30-DAY: Launch CSO thought leadership campaign to counter Amazon\'s standard-setting narrative',
      '⚡ 30-DAY: Accelerate passwordless MFA rollout — Amazon is eliminating passwords entirely',
      '⚡ 90-DAY: Evaluate agentic AI for security testing to match ATA\'s weeks-to-hours acceleration',
      '🎯 6-MONTH: Position Jerrad as industry voice on identity, AI security, and insider-risk detection',
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
    bio: 'AWS CISO (appointed June 2025) driving AI-powered SOC automation, AWS Security Agent rollout, and "security-as-enabler" messaging. 11-minute vulnerability detection (from 27 hours). Influencing enterprise expectations.',
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
      { date: '2026-02-26', title: 'AWS Security Agent Multi-Agent Architecture Disclosure', type: 'Technical Publication', impact: 'Detailed agentic AI penetration testing approach — credibility building' },
      { date: '2026-02-09', title: 'AWS Security Agent IAM/API Migration Announcement', type: 'Product Decision', impact: 'Preparing for public API/SDK support — enabling enterprise automation' },
      { date: '2026-01-22', title: 'GitHub Enterprise Cloud Integration Launch', type: 'Partnership', impact: 'Developer workflow embedding — automated remediation PRs' },
      { date: '2026-01-07', title: 'WSJ Feature: GenAI SOC Efficiency Metrics', type: 'Media Coverage', impact: '11-minute vuln detection (from 27 hours) — operational proof points' },
      { date: '2026-01-05', title: 'Continuous Observability Messaging', type: 'Thought Leadership', impact: 'Framing SOC modernization as urgent requirement' },
    ],
    strategicThreats: [
      '🔥 CRITICAL: 11-minute vulnerability detection (from 27 hours) via GenAI — operational AI security leadership',
      '⚠️ HIGH: AWS Security Agent GitHub integration — embedding security in developer workflows',
      '⚠️ HIGH: Multi-agent penetration testing disclosure — technical credibility for agentic AI approach',
      '⚠️ HIGH: "Security-as-enabler" messaging at re:Inforce — influencing enterprise AI adoption narratives',
      '⚠️ MEDIUM: Continuous observability + automation advocacy — setting SOC modernization standards',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Benchmark Walmart SOC automation vs AWS\'s 11-minute detection metrics',
      '🔥 IMMEDIATE: Evaluate AWS Security Agent competitive positioning vs Walmart\'s AppSec tooling',
      '⚡ 30-DAY: Launch measurable AI security metrics to counter AWS\'s operational proof points',
      '⚡ 90-DAY: Develop developer-embedded security workflow to match AWS\'s GitHub integration strategy',
      '🎯 6-MONTH: Position Walmart security as AI enabler (counter Herzog\'s "security-as-catalyst" messaging)',
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
    bio: 'Joined AWS Oct 2025 from DataStax CEO role, reporting directly to AWS CEO Matt Garman. Charter: scale security services and observability to meet AI-era telemetry demands. Advocates AI-driven signal parsing, RAG accuracy, and agentic software as core pillars — signals sustained AWS investment in AI-native security tooling.',
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
      { date: '2026-02-27', title: 'Semafor Interview: AI Agents Will Exponentially Expand Security Signals', type: 'Media Appearance', impact: 'Frames AWS\'s telemetry-scale thesis — signals roadmap toward AI-driven observability products' },
      { date: '2026-01-30', title: 'Leaked AWS Org Chart: Kapoor in CEO Direct-Report Set', type: 'Org Signal', impact: 'Confirms security/observability elevated to top-tier AWS strategic priority' },
      { date: '2025-10-13', title: 'Hired as VP, Security Services & Observability', type: 'Org Change', impact: 'CEO email explicitly tied hire to AI-driven security needs — mandate established' },
    ],
    strategicThreats: [
      '⚠️ HIGH: Direct CEO reporting line elevates security/observability budget velocity and decision authority at AWS',
      '⚠️ HIGH: Telemetry-scale thesis signals AWS product push — AI-native signal ingestion at enterprise scale',
      '⚠️ HIGH: RAG + agentic focus from DataStax background informs AWS\'s AI security governance roadmap',
      '📡 MEDIUM: Kapoor\'s public media profile is rising — expected to become a high-visibility competitor voice in 2026',
      '📡 MEDIUM: Confidence cap PROVISIONAL — limited in-window, executive-attributed AWS artifacts yet located',
    ],
    recommendations: [
      '⚡ 30-DAY: Monitor Kapoor\'s AWS blog/keynote cadence — expected to accelerate as mandate matures',
      '⚡ 30-DAY: Assess Walmart\'s observability coverage vs AWS\'s likely telemetry-scale product push',
      '⚡ 90-DAY: Track AWS Security Services portfolio expansion under Kapoor — new product announcements expected',
      '🎯 6-MONTH: Evaluate agentic/RAG security governance posture to prepare for AWS\'s AI-era security narrative',
      '🔍 ONGOING: Next OSINT run — search Kapoor on aws.amazon.com/blogs/security, re:Inforce speaker lists, LinkedIn',
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
    bio: 'Long-standing Target CISO navigating a turbulent leadership transition (new CEO Feb 2026, 500 layoffs, senior exec reshuffling). Historically focused on cyber-physical convergence, security-vs-customer-experience balance, and community intelligence sharing via RH-ISAC. Post-breach rebuilder turned industry collaborator.',
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
      { date: '2026-02-10', title: '~500 Roles Eliminated (Supply Chain + Store Districts)', type: 'Org Risk Signal', impact: 'Insider-risk window: elevated offboarding exposure, access transition complexity' },
      { date: '2026-02-06', title: 'New COO Appointed; CCO Exit Announced', type: 'Stakeholder Change', impact: 'CISO must re-validate risk ownership and access pathways for new leadership' },
      { date: '2026-02-01', title: 'Michael Fiddelke Becomes CEO', type: 'Leadership Transition', impact: 'New CEO resets priorities — Agostino\'s security ROI narrative becomes critical' },
      { date: '2026-01-21', title: 'Two New Board Directors Elected', type: 'Governance Change', impact: 'Audit & Risk committee refresh — heightened scrutiny on security posture expected' },
      { date: '2024-05-15', title: 'RH-ISAC Podcast — Ep. 50 Feature', type: 'Industry Engagement', impact: 'Cyber-physical convergence + community tool-sharing as strategic posture' },
    ],
    strategicThreats: [
      '⚠️ HIGH: Leadership upheaval (new CEO, COO, board) creates security governance gaps and reprioritization risk',
      '⚠️ HIGH: 500 layoffs open insider-risk window — elevated offboarding, access transition, and vendor handoff exposure',
      '📡 MEDIUM: Cyber-physical convergence investments at Target stores directly parallel Walmart\'s retail security needs',
      '📡 MEDIUM: RH-ISAC community tool-sharing — Target\'s threat intel contributions may surface Walmart-adjacent risks',
      '📡 LOW: Limited in-window CISO-attributed content — signal visibility is low vs Amazon counterparts',
    ],
    recommendations: [
      '🔥 IMMEDIATE: Monitor Target\'s offboarding practices — current insider-risk window is elevated (500 departures)',
      '⚡ 30-DAY: Watch Fiddelke\'s early CEO priorities — security funding signals will emerge in earnings calls / 10-Q',
      '⚡ 30-DAY: Note that Stephen B. Bratspies (new Target board/Audit & Risk) is a former Walmart executive — monitor for any cross-org intelligence relevance',
      '⚡ 90-DAY: Track Target\'s cyber-physical convergence investments — parallels to Walmart store security roadmap',
      '🎯 6-MONTH: RH-ISAC cadence monitoring — Agostino public appearances likely to increase post-stabilization',
    ],
  },
];

// Derived threat-summary counts for the hero badges
export const THREAT_COUNTS = {
  critical: CSO_PROFILES.flatMap(p => p.keyFindings).filter(f => f.riskColor === 'ORANGE' || f.riskColor === 'RED').length,
  high:     CSO_PROFILES.flatMap(p => p.keyFindings).filter(f => f.riskColor === 'YELLOW').length,
  updated:  'Mar 2, 2026',
};