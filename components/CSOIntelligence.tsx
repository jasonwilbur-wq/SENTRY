import React from 'react';

interface CSOProfile {
  name: string;
  title: string;
  company: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  focusAreas: string[];
  initiatives: string[];
  threatAssessment: string;
  lastActivity: string;
  status: 'Active' | 'Vacant' | 'Interim';
}

const CSO_PROFILES: CSOProfile[] = [
  {
    name: 'Stephen Schmidt',
    title: 'SVP & Chief Security Officer',
    company: 'Amazon',
    threatLevel: 'CRITICAL',
    focusAreas: ['Passwordless Auth', 'AI Security', 'Insider Risk', 'Identity'],
    initiatives: [
      '"Midway" - Universal U2F auth, zero exceptions',
      'DPRK Detection - Blocked 1,800+ infiltration attempts',
      'ATA Agents - Autonomous threat analysis AI',
      'MadPot - Threat intel honeypot network'
    ],
    threatAssessment: 'Amazon is setting industry standards for passwordless authentication, AI-driven security automation, and insider risk detection. Their "no exceptions" philosophy and public disclosure of advanced capabilities (Midway, ATA, DPRK screening) raise the competitive bar.',
    lastActivity: 'Feb 12, 2026 (CyberScoop Safe Mode)',
    status: 'Active'
  },
  {
    name: 'Amy Herzog',
    title: 'VP & Chief Information Security Officer',
    company: 'Amazon Web Services (AWS)',
    threatLevel: 'HIGH',
    focusAreas: ['Cloud Security', 'Security at Scale', 'Customer Trust'],
    initiatives: [
      'AWS re:Inforce 2025 - Keynote on security simplification',
      'Security Services - Customer-facing security portfolio',
      'Global Cloud Sec - Leading AWS security org'
    ],
    threatAssessment: 'Herzog positions AWS as security-by-default. Her public keynotes emphasize "simplifying security at scale" and customer-facing security services, influencing enterprise expectations.',
    lastActivity: 'AWS Security Blog, re:Inforce 2025',
    status: 'Active'
  },
  {
    name: 'Rich Agostino',
    title: 'SVP, Chief Information Security Officer',
    company: 'Target',
    threatLevel: 'HIGH',
    focusAreas: ['Cyber Fusion Center', 'NIST CSF', 'Threat Intel'],
    initiatives: [
      '24/7 Cyber Fusion Center - Centralized threat ops',
      'NIST CSF Maturity - Disclosed in 10-K governance',
      'Threat-Driven Strategy - RSAC speaker/advisor',
      'Infrastructure Security - SVP dual role'
    ],
    threatAssessment: 'Target\'s Cyber Fusion Center and NIST CSF alignment show mature, threat-driven operations. Agostino\'s dual CISO/Infrastructure role suggests tight integration of cyber and physity.',
    lastActivity: 'Target 10-K (Item 1C), RSAC Bio',
    status: 'Active'
  },
  {
    name: 'CISO Position',
    title: 'VACANT (Interim Coverage)',
    company: 'Costco',
    threatLevel: 'MEDIUM',
    focusAreas: [],
    initiatives: [
      'Former CISO departed June 2025',
      'Deputy CISO managing responsibilities',
      'Replacement search in progress (unconfirmed timeline)',
      'CISO reports to CIDO → CEO (per 10-K)'
    ],
    threatAssessment: 'STRATEGIC OPPORTUNITY: Costco\'s extended CISO vacancy (9+ months) suggests potential gaps in cyber program leadership, strategic initiatives, and vendor relationships. Walmart can accelerate competitive advantage during this transition period.',
    lastActivity: 'Costco SEC 10-K (Item 1C), March 2026',
    status: 'Vacant'
  },
  {
    name: 'Interim CISO',
    title: 'Name Not Disclosed',
    company: 'Kroger',
    threatLevel: 'MEDIUM',
    focusAreas: [],
    initiatives: [
      'Interim CISO managing cybersecurity program',
      'Individual not named in public 10-K filing',
      'Audit Committee oversight structure',
      'Quarterly updates + NIST CSF scorecards to Board'
    ],
    threatAssessment: 'COMPETITIVE OPENING: Interim CISO status suggests Kroger may have reduced strategic security agility. Opportunity for Walmart to demonstrate leadership stability and attract top talent.',
    lastActivity: 'Kroger SEC 10-K (Item 1C), Feb 2026',
    status: 'Interim'
  }
];

const ThreatBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/10 text-green-400 border-green-500/30'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colors[level as keyof typeof colors]}`}>
      {level}
    </span>
  );
};

const CSOCard: React.FC<{ profile: CSOProfile }> = ({ profile }) => {
  const borderColors = {
    CRITICAL: 'border-l-red-500',
    HIGH: 'border-l-orange-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-green-500'
  };

  return (
    <div className={`bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-lg border border-slate-700/50 ${borderColors[profile.threatLevel]} border-l-4 p-6 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{profile.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{profile.title}</p>
          <p className="text-xs font-medium mt-1" style={{ color: profile.company === 'Amazon' ? '#FF9900' : profile.company.includes('AWS') ? '#FF9900' : profile.company === 'Target' ? '#CC0000' : '#0053e2' }}>
            {profile.company}
          </p>
        </div>
        <ThreatBadge level={profile.threatLevel} />
      </div>

      {/* Focus Areas */}
      {profile.focusAreas.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-slate-300 mb-2">Key Focus Areas:</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.focusAreas.map((area, idx) => (
              <span key={idx} className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Initiatives */}
      <div className="mb-4 bg-slate-950/30 p-3 rounded border border-slate-700/30">
        <div className="text-xs font-semibold text-slate-300 mb-2">
          {profile.status === 'Vacant' ? '⚠️ LEADERSHIP TRANSITION:' : profile.status === 'Interim' ? '⚠️ INTERIM LEADERSHIP:' : 'RECENT INITIATIVES:'}
        </div>
        <ul className="text-xs space-y-1.5 text-slate-400">
          {profile.initiatives.map((init, idx) => (
            <li key={idx} className="flex items-start">
              <span className="mr-2">{profile.status === 'Active' ? '✅' : '•'}</span>
              <span dangerouslySetInnerHTML={{ __html: init.replace(/"(.*?)"/g, '<strong>"$1"</strong>') }} />
            </li>
          ))}
        </ul>
      </div>

      {/* Threat Assessment */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate-300 mb-1.5">
          {profile.status === 'Active' ? 'THREAT ASSESSMENT:' : 'OPPORTUNITY ASSESSMENT:'}
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">
          {profile.threatAssessment}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-700/50">
        <div className="text-xs text-slate-500">Last Activity: {profile.lastActivity}</div>
      </div>
    </div>
  );
};

export const CSOIntelligence: React.FC = () => {
  return (
    <div className="space-y-6">
      
      {/* Executive Summary */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-700/50 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          Executive Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/20">
            <div className="text-sm font-medium text-blue-300">Amazon (Stephen Schmidt)</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">Most Aggressive</div>
            <div className="text-sm text-slate-400 mt-2">Leading in passwordless auth, AI-driven security, and insider risk detection</div>
          </div>
          <div className="bg-yellow-500/5 p-4 rounded-lg border border-yellow-500/20">
            <div className="text-sm font-medium text-yellow-300">Target (Rich Agostino)</div>
            <div className="text-2xl font-bold text-yellow-400 mt-1">Strong Position</div>
            <div className="text-sm text-slate-400 mt-2">24/7 Cyber Fusion Center, NIST CSF maturity, threat-driven ops</div>
          </div>
          <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div className="text-sm font-medium text-red-300">Costco & Kroger</div>
            <div className="text-2xl font-bold text-red-400 mt-1">Leadership Gaps</div>
            <div className="text-sm text-slate-400 mt-2">CISO vacancies present strategic opportunity for Walmart</div>
          </div>
        </div>
      </div>

      {/* CSO Profiles */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Competitor CSO/CISO Profiles</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CSO_PROFILES.map((profile, idx) => (
            <CSOCard key={idx} profile={profile} />
          ))}
          
          {/* Walmart Card */}
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg border-l-4 border-l-blue-500 border border-blue-700/50 p-6 hover:border-blue-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Jerrad Crabtree</h3>
                <p className="text-sm text-blue-300 font-semibold mt-1">SVP, Global Security & Chief Security Officer</p>
                <p className="text-xs text-blue-400 font-bold mt-1">Walmart (YOU)</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                INCUMBENT
              </span>
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-300 mb-2">Your Scope:</div>
              <div className="flex flex-wrap gap-1.5">
                {['Enterprise Protection', 'Threat Mgmt', 'Risk Intel', 'GSOC 24/7', 'Crisis Response'].map((area, idx) => (
                  <span key={idx} className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4 bg-slate-950/30 p-3 rounded border border-blue-700/30">
              <div className="text-xs font-semibold text-blue-300 mb-2">YOUR COMPETITIVE POSITION:</div>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex items-start"><span className="mr-2">✅</span><strong>Scale Advantage</strong> - Largest retail security org globally</li>
                <li className="flex items-start"><span className="mr-2">✅</span><strong>GSOC Operations</strong> - 24/7 enterprise-wide monitoring</li>
                <li className="flex items-start"><span className="mr-2">✅</span><strong>Convergence Model</strong> - Physical + cyber + resilience</li>
                <li className="flex items-start"><span className="mr-2">✅</span><strong>Global Reach</strong> - International security operations</li>
              </ul>
            </div>

            <div className="mb-3 bg-green-500/5 p-3 rounded border border-green-500/20">
              <div className="text-xs font-semibold text-green-300 mb-1.5">📊 COMPETITIVE GAPS TO CLOSE:</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div><strong>1. Public Thought Leadership</strong> - Amazon CSO dominates industry narrative</div>
                <div><strong>2. Passwordless Auth</strong> - Midway-style "no exceptions" identity program</div>
                <div><strong>3. AI-Driven Security</strong> - Autonomous threat analysis capabilities</div>
                <div><strong>4. Insider Risk Detection</strong> - DPRK-level hiring fraud defenses</div>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-700/50">
              <div className="text-xs text-blue-400 font-medium">Opportunity: Lead during competitor transitions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Threats */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            Key Threats
          </h3>
          <div className="space-y-3">
            <div className="border-l-4 border-red-500 pl-3 py-2 bg-red-500/5 rounded">
              <div className="text-sm font-bold text-red-300">Amazon Setting Industry Standards</div>
              <div className="text-xs text-slate-400 mt-1">
                Stephen Schmidt's public disclosure of Midway (passwordless), ATA (AI agents), and DPRK screening raises the bar for enterprise security.
              </div>
            </div>
            <div className="border-l-4 border-orange-500 pl-3 py-2 bg-orange-500/5 rounded">
              <div className="text-sm font-bold text-orange-300">Target's Cyber Fusion Center Maturity</div>
              <div className="text-xs text-slate-400 mt-1">
                Rich Agostino's 24/7 Cyber Fusion Center demonstrates threat-driven ops at retail scale.
              </div>
            </div>
            <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-yellow-500/5 rounded">
              <div className="text-sm font-bold text-yellow-300">Thought Leadership Gap</div>
              <div className="text-xs text-slate-400 mt-1">
                Amazon CSO dominates public narrative. Walmart has limited external visibility.
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            Opportunities
          </h3>
          <div className="space-y-3">
            <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-500/5 rounded">
              <div className="text-sm font-bold text-green-300">Costco & Kroger Leadership Gaps</div>
              <div className="text-xs text-slate-400 mt-1">
                <strong className="text-green-400">CRITICAL WINDOW:</strong> Extended vacancies enable Walmart to accelerate partnerships and talent acquisition.
              </div>
            </div>
            <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-500/5 rounded">
              <div className="text-sm font-bold text-blue-300">Public Thought Leadership</div>
              <div className="text-xs text-slate-400 mt-1">
                <strong className="text-blue-400">RECOMMENDATION:</strong> Launch CSO campaign via LinkedIn, podcasts, conferences on physical-cyber convergence.
              </div>
            </div>
            <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-500/5 rounded">
              <div className="text-sm font-bold text-purple-300">AI & Automation Investment</div>
              <div className="text-xs text-slate-400 mt-1">
                <strong className="text-purple-400">STRATEGIC PLAY:</strong> Develop Walmart-equivalent of ATA and Midway. Public disclosure positions us as innovators.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-700/50 p-6">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
          </svg>
          Recommended Actions for Jerrad Crabtree
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Immediate */}
          <div className="bg-red-500/5 p-4 rounded-lg border-l-4 border-red-500">
            <div className="font-bold text-red-300 mb-2 text-sm">🔥 IMMEDIATE (30 days)</div>
            <ol className="text-xs space-y-2 text-slate-400 list-decimal list-inside">
              <li><strong>Launch Thought Leadership:</strong> Publish LinkedIn article</li>
              <li><strong>Accelerate Vendor Deals:</strong> Leverage competitor gaps</li>
              <li><strong>Benchmark Midway:</strong> Assess passwordless auth posture</li>
              <li><strong>DPRK Screening:</strong> Review hiring fraud detection</li>
            </ol>
          </div>

          {/* Near-term */}
          <div className="bg-yellow-500/5 p-4 rounded-lg border-l-4 border-yellow-500">
            <div className="font-bold text-yellow-300 mb-2 text-sm">⚡ NEAR-TERM (90 days)</div>
            <ol className="text-xs space-y-2 text-slate-400 list-decimal list-inside">
              <li><strong>Conference Circuit:</strong> RSA, Black Hat speaking slots</li>
              <li><strong>AI Security POC:</strong> Agentic threat analysis pilot</li>
              <li><strong>Fusion Center Upgrade:</strong> Assess vs Target capabilities</li>
              <li><strong>Industry Partnerships:</strong> Join CISA NSTAC</li>
            </ol>
          </div>

          {/* Strategic */}
          <div className="bg-green-500/5 p-4 rounded-lg border-l-4 border-green-500">
            <div className="font-bold text-green-300 mb-2 text-sm">🎯 STRATEGIC (6-12 months)</div>
            <ol className="text-xs space-y-2 text-slate-400 list-decimal list-inside">
              <li><strong>Security Brand:</strong> Position Walmart as thought leader</li>
              <li><strong>Zero Trust Rollout:</strong> "No exceptions" identity program</li>
              <li><strong>Talent Magnet:</strong> Attract from Amazon/Target</li>
              <li><strong>Regulatory Influence:</strong> Shape regulations via testimony</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Intelligence Sources */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Intelligence Sources & Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-slate-300 mb-2">Primary Sources:</div>
            <ul className="space-y-1 text-slate-400">
              <li>✅ Stephen Schmidt LinkedIn (Jan 23, 2026)</li>
              <li>✅ CyberScoop Safe Mode (Feb 12, 2026)</li>
              <li>✅ Amazon Science Blog (Nov 24, 2025)</li>
              <li>✅ WIRED (Nov 24, 2025)</li>
              <li>✅ AWS Executive Insights (Feb 2025)</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-300 mb-2">Regulatory Filings:</div>
            <ul className="space-y-1 text-slate-400">
              <li>✅ Target SEC 10-K (Item 1C)</li>
              <li>✅ Costco SEC 10-K (Item 1C)</li>
              <li>✅ Kroger SEC 10-K (Item 1C)</li>
              <li>✅ CISA NSTAC Fact Sheet</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            <strong>Prepared by:</strong> Enterprise Security - Emerging Technology | Jason Wilbur (j0w16ja)<br/>
            <strong>Classification:</strong> Internal Use Only | <strong>Distribution:</strong> Jerrad Crabtree, CSO<br/>
            <strong>Next Update:</strong> April 1, 2026 (Monthly intelligence cycle)
          </div>
        </div>
      </div>

    </div>
  );
};