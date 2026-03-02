import { useState } from 'react';

interface ExecutiveProfile {
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

interface Finding {
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

interface Source {
  publisher: string;
  url: string;
  date: string;
}

interface Activity {
  date: string;
  title: string;
  type: string;
  impact: string;
}

export function CSOIntelligence() {
  const [selectedExecutive, setSelectedExecutive] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const executives: ExecutiveProfile[] = [
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
          id: 'f1',
          type: 'thought_leadership',
          headline: 'Schmidt details Amazon\'s "no exceptions" internal authentication standard (Midway) and U2F-first posture',
          date: '2026-01-23',
          impactScore: 16,
          riskColor: 'ORANGE',
          summary: 'Schmidt argues strong authentication is the single most important security control. Describes Amazon\'s internal authentication system ("Midway") with universal adoption across environments, including legacy applications, with U2F security keys, device health checks, and continuous session revalidation.',
          whyItMatters: 'Direct signal of Amazon\'s identity program maturity and bias toward eliminating exceptions—reducing lateral-movement opportunities. Details indicate investment priorities (device posture + phishing-resistant MFA + continuous verification) that can raise the competitive bar for enterprise identity.',
          sources: [
            {
              publisher: 'LinkedIn (Stephen Schmidt)',
              url: 'https://www.linkedin.com/pulse/why-strong-authentication-your-most-important-security-schmidt-unm0e',
              date: '2026-01-23'
            }
          ]
        },
        {
          id: 'f2',
          type: 'incident_response',
          headline: 'Amazon publicizes scale of DPRK-linked hiring fraud detection and its AI + human verification model',
          date: '2026-01-02',
          impactScore: 12,
          riskColor: 'YELLOW',
          summary: 'Amazon blocked more than 1,800 suspected DPRK-linked attempts to obtain remote IT roles since April 2024. Approach combines AI-powered screening (institutional links, application anomalies, geographic inconsistencies) with human verification steps.',
          whyItMatters: 'Concrete insider-risk / identity signal: Amazon treating hiring pipelines as an attack surface with measurable, high-volume adversary activity. Suggests ongoing investment in recruitment fraud analytics, cross-signal correlation, and post-hire anomaly monitoring.',
          sources: [
            {
              publisher: 'Dataconomy',
              url: 'https://dataconomy.com/2026/01/02/amazon-blocks-1800-north-korean-operatives-from-remote-jobs/',
              date: '2026-01-02'
            },
            {
              publisher: 'LinkedIn (Stephen Schmidt)',
              url: 'https://www.linkedin.com/posts/stephenschmidt1_over-the-past-few-years-north-korean-dprk-activity-7407485036142276610-dot7',
              date: '2025-12-18'
            }
          ]
        },
        {
          id: 'f3',
          type: 'thought_leadership',
          headline: 'Amazon discloses \'Autonomous Threat Analysis\' agentic AI approach to scale bug hunting and defenses',
          date: '2025-11-24',
          impactScore: 12,
          riskColor: 'YELLOW',
          summary: 'Amazon publicly described an internal system (Autonomous Threat Analysis, ATA) using multiple specialized AI agents to identify weaknesses, perform variant analysis, and propose remediations and detections with human review. System intended to reduce analysis cycles from weeks to hours.',
          whyItMatters: 'Context for Amazon\'s AI/security automation posture and continued investment in agentic security testing, detection engineering, and accelerated remediation. Signals competitive pressure to modernize secure SDLC and automated analysis capabilities to match machine-speed threat evolution.',
          sources: [
            {
              publisher: 'WIRED',
              url: 'https://www.wired.com/story/amazon-autonomous-threat-analysis/',
              date: '2025-11-24'
            },
            {
              publisher: 'Amazon Science',
              url: 'https://www.amazon.science/blog/how-amazon-uses-ai-agents-to-anticipate-and-counter-cyber-threats',
              date: '2025-11-24'
            }
          ]
        }
      ],
      recentActivity: [
        { date: '2026-02-12', title: 'CyberScoop Safe Mode: How Amazon Killed the Password', type: 'Media Appearance', impact: 'High visibility thought leadership on passwordless + identity unification' },
        { date: '2026-01-23', title: 'LinkedIn Article: Why Strong Authentication Is Your Most Important Security Control', type: 'Thought Leadership', impact: 'Direct disclosure of Midway authentication system and U2F enforcement' },
        { date: '2026-01-02', title: 'DPRK Hiring Fraud Disclosure', type: 'Incident Response', impact: '1,800+ blocked attempts - sets industry standard for insider risk detection' },
        { date: '2025-11-24', title: 'ATA (Autonomous Threat Analysis) Launch', type: 'Product Innovation', impact: 'Agentic AI for bug hunting - weeks to hours acceleration' }
      ],
      strategicThreats: [
        '🔥 CRITICAL: Setting industry standards for passwordless auth and eliminating password-based lateral movement',
        '🔥 CRITICAL: 1,800+ DPRK hiring blocks demonstrate advanced insider-risk detection - raising competitive bar',
        '⚠️ HIGH: Autonomous Threat Analysis (ATA) AI agents accelerating security testing - machine-speed defense',
        '⚠️ HIGH: "No exceptions" Midway authentication - universal phishing-resistant MFA across all environments',
        '⚠️ HIGH: Public thought leadership via LinkedIn, CyberScoop - influencing enterprise security standards'
      ],
      recommendations: [
        '🔥 IMMEDIATE: Benchmark Walmart\'s identity coverage vs Amazon\'s "no exceptions" Midway model',
        '🔥 IMMEDIATE: Review DPRK screening protocols - Amazon blocking 1,800+ vs Walmart\'s current posture',
        '⚡ 30-DAY: Launch CSO thought leadership campaign to counter Amazon\'s standard-setting narrative',
        '⚡ 30-DAY: Accelerate passwordless MFA rollout - Amazon is eliminating passwords entirely',
        '⚡ 90-DAY: Evaluate agentic AI for security testing to match ATA\'s weeks-to-hours acceleration',
        '🎯 6-MONTH: Position Jerrad as industry voice on identity, AI security, and insider-risk detection'
      ]
    },
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
          id: 'f4',
          type: 'thought_leadership',
          headline: 'Herzog cites major GenAI efficiency gains for vulnerability identification and SOC alert contexting',
          date: '2026-01-07',
          impactScore: 12,
          riskColor: 'YELLOW',
          summary: 'GenAI reduced time to identify potentially vulnerable systems to ~11 minutes on average (from ~27 hours), and reduced time to assemble context on key SOC alerts to ~11 minutes (from ~four hours). Emphasizes applying \'security basics\' when managing identity for agentic AI.',
          whyItMatters: 'Indicates AWS has operationalized GenAI in core security workflows (vuln identification and SOC triage), suggesting maturity beyond pilots. Shifts the competitive benchmark for security operations automation and influences customer demand for measurable time-to-context/time-to-fix improvements.',
          sources: [
            {
              publisher: 'AI Leaders Council (citing WSJ)',
              url: 'https://aileaderscouncil.org/how-ai-is-reinventing-cybersecurity-for-2026/',
              date: '2026-01-07'
            }
          ]
        },
        {
          id: 'f5',
          type: 'partnership',
          headline: 'AWS Security Agent adds GitHub Enterprise Cloud connectivity and automated remediation PR workflows',
          date: '2026-01-22',
          impactScore: 16,
          riskColor: 'ORANGE',
          summary: 'AWS announced customers can connect GitHub Enterprise Cloud organizations to AWS Security Agent via a GitHub app. Features: automated code reviews on pull requests, use of private repository code during penetration testing, and optional automated remediation via agent-submitted pull requests.',
          whyItMatters: 'Concrete integration move toward developer workflow embedding (pull requests) and closed-loop remediation, reducing AppSec friction and increasing coverage at scale. Ecosystem strategy: meeting enterprises where code lives (GitHub Enterprise) and pushing security controls upstream.',
          sources: [
            {
              publisher: 'AWS (What\'s New)',
              url: 'https://aws.amazon.com/about-aws/whats-new/2026/01/aws-security-agent-ghe-support/',
              date: '2026-01-22'
            }
          ]
        },
        {
          id: 'f6',
          type: 'thought_leadership',
          headline: 'AWS publishes technical disclosure on Security Agent\'s multi-agent penetration testing architecture',
          date: '2026-02-26',
          impactScore: 12,
          riskColor: 'YELLOW',
          summary: 'AWS Security Blog published technical post detailing a multi-agent architecture for automated penetration testing within AWS Security Agent. Emphasizes orchestration of specialized agents, adaptive task generation, and assertion-based validation. Discusses mitigating LLM non-determinism (multiple runs, consolidating findings).',
          whyItMatters: 'Technical disclosure suggests AWS is investing in credible, repeatable agentic security workflows, not just marketing claims. Focus on validation and non-determinism mitigations is a key maturity signal. AWS will market Security Agent as both scalable and defensible (repeatability/validation).',
          sources: [
            {
              publisher: 'AWS Security Blog',
              url: 'https://aws.amazon.com/blogs/security/inside-aws-security-agent-a-multi-agent-architecture-for-automated-penetration-testing/',
              date: '2026-02-26'
            }
          ]
        }
      ],
      recentActivity: [
        { date: '2026-02-26', title: 'AWS Security Agent Multi-Agent Architecture Disclosure', type: 'Technical Publication', impact: 'Detailed agentic AI penetration testing approach - credibility building' },
        { date: '2026-02-09', title: 'AWS Security Agent IAM/API Migration Announcement', type: 'Product Decision', impact: 'Preparing for public API/SDK support - enabling enterprise automation' },
        { date: '2026-01-22', title: 'GitHub Enterprise Cloud Integration Launch', type: 'Partnership', impact: 'Developer workflow embedding - automated remediation PRs' },
        { date: '2026-01-07', title: 'WSJ Feature: GenAI SOC Efficiency Metrics', type: 'Media Coverage', impact: '11-minute vuln detection (from 27 hours) - operational proof points' },
        { date: '2026-01-05', title: 'Continuous Observability Messaging', type: 'Thought Leadership', impact: 'Framing SOC modernization as urgent requirement' }
      ],
      strategicThreats: [
        '🔥 CRITICAL: 11-minute vulnerability detection (from 27 hours) via GenAI - operational AI security leadership',
        '⚠️ HIGH: AWS Security Agent GitHub integration - embedding security in developer workflows',
        '⚠️ HIGH: Multi-agent penetration testing disclosure - technical credibility for agentic AI approach',
        '⚠️ HIGH: "Security-as-enabler" messaging at re:Inforce - influencing enterprise AI adoption narratives',
        '⚠️ MEDIUM: Continuous observability + automation advocacy - setting SOC modernization standards'
      ],
      recommendations: [
        '🔥 IMMEDIATE: Benchmark Walmart SOC automation vs AWS\'s 11-minute detection metrics',
        '🔥 IMMEDIATE: Evaluate AWS Security Agent competitive positioning vs Walmart\'s AppSec tooling',
        '⚡ 30-DAY: Launch measurable AI security metrics to counter AWS\'s operational proof points',
        '⚡ 90-DAY: Develop developer-embedded security workflow to match AWS\'s GitHub integration strategy',
        '🎯 6-MONTH: Position Walmart security as AI enabler (counter Herzog\'s "security-as-catalyst" messaging)'
      ]
    }
  ];

  const getExecutive = (id: string) => executives.find(e => e.id === id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-yellow-500 p-1 rounded-lg">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h1 className="text-4xl font-bold mb-2">🎯 CSO Intelligence Command Center</h1>
            <p className="text-gray-300">Live competitor executive tracking — Amazon security leadership analysis</p>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full border border-red-500/50">🔴 CRITICAL Threats: 2</span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/50">🟠 HIGH Threats: 4</span>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full">📅 Last Updated: March 2, 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {executives.map(exec => (
          <div
            key={exec.id}
            onClick={() => setSelectedExecutive(selectedExecutive === exec.id ? null : exec.id)}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-2xl"
          >
            {/* Card Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-start gap-4">
                {/* Profile Image */}
                <div className="w-24 h-24 rounded-full border-4 border-blue-500 overflow-hidden flex-shrink-0 bg-gray-800">
                  <img 
                    src={exec.profileImage} 
                    alt={exec.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-blue-500 to-purple-600">
                    {exec.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>

                {/* Executive Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{exec.name}</h2>
                      <p className="text-gray-400 text-sm">{exec.title}</p>
                      <p className="text-blue-400 font-semibold">{exec.company}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      exec.threatLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500' :
                      exec.threatLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500' :
                      exec.threatLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500' :
                      'bg-green-500/20 text-green-300 border border-green-500'
                    }`}>
                      {exec.threatLevel} THREAT
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{exec.bio}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{exec.keyFindings.length}</div>
                <div className="text-xs text-gray-400">Key Findings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{exec.recentActivity.length}</div>
                <div className="text-xs text-gray-400">Recent Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{exec.strategicThreats.length}</div>
                <div className="text-xs text-gray-400">Strategic Threats</div>
              </div>
            </div>

            {/* Expand Indicator */}
            <div className="p-4 text-center text-sm text-gray-400 border-t border-gray-700">
              {selectedExecutive === exec.id ? '🔽 Click to collapse' : '🔼 Click to expand full intelligence'}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Executive Detail */}
      {selectedExecutive && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-blue-500 shadow-2xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-3xl font-bold mb-6 border-b border-gray-700 pb-4">🔍 Detailed Intelligence: {getExecutive(selectedExecutive)?.name}</h2>

              {/* Strategic Threats */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Strategic Threats to Walmart</span>
                </h3>
                <div className="space-y-3">
                  {getExecutive(selectedExecutive)?.strategicThreats.map((threat, i) => (
                    <div key={i} className="bg-gray-900/70 p-4 rounded-lg border-l-4 border-red-500">
                      <p className="text-gray-200">{threat}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Findings */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>📊</span>
                  <span>Key Intelligence Findings</span>
                </h3>
                <div className="space-y-4">
                  {getExecutive(selectedExecutive)?.keyFindings.map(finding => (
                    <div
                      key={finding.id}
                      onClick={() => setSelectedFinding(selectedFinding?.id === finding.id ? null : finding)}
                      className="bg-gray-900/70 p-5 rounded-lg border border-gray-700 hover:border-blue-500 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              finding.riskColor === 'RED' ? 'bg-red-500/20 text-red-300 border border-red-500' :
                              finding.riskColor === 'ORANGE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500' :
                              finding.riskColor === 'YELLOW' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500' :
                              'bg-green-500/20 text-green-300 border border-green-500'
                            }`}>
                              {finding.riskColor} | Impact: {finding.impactScore}/25
                            </span>
                            <span className="text-xs text-gray-400">{finding.date}</span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">{finding.type}</span>
                          </div>
                          <h4 className="font-bold text-lg text-blue-300 mb-2">{finding.headline}</h4>
                        </div>
                      </div>

                      {/* Expandable Finding Detail */}
                      {selectedFinding?.id === finding.id && (
                        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                          <div>
                            <h5 className="font-semibold text-yellow-400 mb-2">📝 Summary:</h5>
                            <p className="text-gray-300 text-sm leading-relaxed">{finding.summary}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-red-400 mb-2">💡 Why It Matters:</h5>
                            <p className="text-gray-300 text-sm leading-relaxed">{finding.whyItMatters}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-blue-400 mb-2">🔗 Sources:</h5>
                            <div className="space-y-2">
                              {finding.sources.map((source, i) => (
                                <div key={i} className="bg-gray-800 p-3 rounded border border-gray-700">
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm font-medium block mb-1"
                                  >
                                    📰 {source.publisher}
                                  </a>
                                  <span className="text-xs text-gray-500">{source.date}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-xs text-gray-500">
                        {selectedFinding?.id === finding.id ? '🔽 Click to collapse' : '🔼 Click for full details & sources'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>📅</span>
                  <span>Recent Activity Timeline</span>
                </h3>
                <div className="space-y-3">
                  {getExecutive(selectedExecutive)?.recentActivity.map((activity, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-24 text-right">
                        <span className="text-sm text-gray-400">{activity.date}</span>
                      </div>
                      <div className="flex-shrink-0 w-1 bg-blue-500 rounded-full"></div>
                      <div className="flex-1 bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                        <h4 className="font-bold text-white mb-1">{activity.title}</h4>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">{activity.type}</span>
                        <p className="text-sm text-gray-400 mt-2">{activity.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Recommended Actions for Jerrad</span>
                </h3>
                <div className="space-y-3">
                  {getExecutive(selectedExecutive)?.recommendations.map((rec, i) => (
                    <div key={i} className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg border-l-4 border-yellow-500">
                      <p className="text-gray-200">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}