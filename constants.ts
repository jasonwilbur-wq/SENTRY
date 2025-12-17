import { PhaseNode } from './types';

export const RAW_CSV_DATA = `Company,Vendor Report,Category,Technology_Product,CompanyUrl,Overall Rating,Vendor Status,Last Assessed Date
1AHEAD Technologies,/:u:/r/sites/EmergingTechnologySecurity/SitePages/1AHEAD-Technologies--Quantum-Safe-Access-Control-and-Global-Logistics-Optimizer-Overview.aspx?csf=1&web=1&e=k5iu1P,Access Control & Identity,Quantum-Safe Access Control Platform,https://www.securityinfowatch.com,1.8,,7/16/2025
3dEYE,/:u:/r/sites/EmergingTechnologySecurity/SitePages/3dEYE-AI-Video-Analytics-Rule-Engine--Security-Assessment-and-Use-Case-Overview.aspx?csf=1&web=1&e=ouSIwF,Video Analytics & VMS,AI Video Analytics Rule Engine,https://www.3deye.me,2.3,,10/10/2025
3xLOGIC,/:u:/r/sites/EmergingTechnologySecurity/SitePages/3xLOGIC-VIGIL-CLOUD-Security-and-Compliance-Assessment-%E2%80%93-November-2025.aspx?csf=1&web=1&e=ENHPD5,Video Analytics & VMS,Multi-Modal Security Platform,https://www.google.com/search?q=3xLOGIC+official+site,2,,7/25/2025
7AI / DXC Technology,/:u:/r/sites/EmergingTechnologySecurity/SitePages/DXC-Technology-and-7AI--Agentic-Security-Operations-Center-Assessment-and-Partnership-Overview.aspx?csf=1&web=1&e=2a0tBg,AI Platforms & Agentic,DXC Agentic Security Operations Center,https://dxc.com/,2.5,,7/25/2025
7STARLAKE,"/:u:/r/sites/EmergingTechnologySecurity/SitePages/Assessment-of-7STARLAKE-SK901-AD5000-Rugged-GPGPU-Card--Features,-Use-Cases,-and-Security-Considerations.aspx?csf=1&web=1&e=PSIpGi",Other / Misc,GPGPU Card with NVIDIA Ada GPU,https://7starlake.com/ (7StarLake),2.5,,7/27/2025
AAEON,/sites/EmergingTechnologySecurity/SitePages/AAEON-Software-Guardian--Advancing-Edge-AI-Security-and-Networking.aspx?web=1,Networking & Edge,Software Guardian for Edge AI,https://www.aaeon.com/,2,,7/27/2025
Abode,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Abode-HomeKit-Compatible-Security-Cameras--Security-Assessment-and-Use-Case-Review.aspx?csf=1&web=1&e=fiFTjy,Other / Misc,HomeKit-Compatible Security Cameras,https://goabode.com/,1.5,,8/1/2025
Absolute Security,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Absolute-Security--GenAI-Assistant-and-Endpoint-Resilience-Overview.aspx?csf=1&web=1&e=VsBc4D,Command & Incident Mgmt,GenAI Assistant for Security Teams,https://www.absolute.com/,3.8,,8/1/2025
Accenture,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Accenture-Supply-Chain-Risk-Management-and-Control-Tower-Assessment.aspx?csf=1&web=1&e=cylrJL,Logistics & Fleet,Supply Chain Risk Management Tools,https://www.accenture.com/,1.5,,8/3/2025
AccessGrid,/sites/EmergingTechnologySecurity/SitePages/AccessGrid--Assessment-of-NFC-Mobile-Credential-Solutions-for-Access-Control-&-Identity.aspx,Access Control & Identity,API for NFC Mobile Credentials (Apple/Google Wallet),https://accessgrid.com,3.2,,10/23/2025
Acoem,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Acoem-ATD-300-and-Cadence-On-Premises-Assessment-Overview.aspx?csf=1&web=1&e=evcwS6,IoT & Specialty Sensors,ATD-300 + Cadence (on-prem) updates,https://acoematd.com/,3.2,,10/23/2025
Acromag,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Acromag-XMC-FZU7EV-Module--Assessment-and-Fit-for-Edge-AI-IoT-Applications.aspx?csf=1&web=1&e=Tko87c,Networking & Edge,XMC-FZU7EV Module Edge AI_IoT Edge AI,https://www.acromag.com/,2,,10/5/2025
Actuate,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Actuate-Gun-Detect-Module--Security-Assessment-and-Technology-Overview.aspx?csf=1&web=1&e=6MBOl7,Command & Incident Mgmt,AI Integration with Patriot Systems,https://actuate.ai/,2.3,,7/10/2025
Actuate,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Actuate-Gun-Detect-Module--Security-Assessment-and-Use-Case-Overview.aspx?csf=1&web=1&e=EmCq3C,Other / Misc,Gun Detect Module,https://actuate.ai/,4,,7/11/2025
Acumera,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Acumera-Edge-Security-and-Platform-Assessment-Overview(1).aspx?csf=1&web=1&e=NQwRD0,Other / Misc,Edge Computing Software,https://acumera.com/,1.5,,10/1/2025
Adaptive Security,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Adaptive-Security--Assessment-and-Risk-Review-of-Agentic-AI-Security-Awareness.aspx?csf=1&web=1&e=QyNdKJ,AI Platforms & Agentic,Agentic AI Security Awareness,https://www.adaptivesecurity.com/,3.1,,9/15/2025
Advantech,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Advantech-MIC-742-AT-Robotics-Development-Kit--Edge-AI-Innovation-and-Assessment.aspx?csf=1&web=1&e=Y52IYd,Robotics & Automation,MIC-742-AT Robotics Development Kit (NVIDIA Jetson Thor),https://www.advantech.com,4,,10/23/2025
Adversa AI,"/:u:/r/sites/EmergingTechnologySecurity/SitePages/Adversa-AI-%E2%80%94-MCP-Security-TOP-25--Assessment,-Risks,-and-Enterprise-Readiness.aspx?csf=1&web=1&e=v0in4l",Cybersecurity,Cybersecurity MCP Security TOP 25,https://adversa.ai/,3.6,,9/13/2025
Aechelon,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Aechelon-Project-Orbion--Security-Assessment-and-Technology-Overview.aspx?csf=1&web=1&e=eCdOpx,Other / Misc,Project Orbion,https://aechelon.com/,2,,9/15/2025
Aera Technology,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Aera-Technology-Decision-Intelligence-Platform--Assessment-and-Insights.aspx?csf=1&web=1&e=NHNcQx,Logistics & Fleet,Decision Intelligence Platform,https://aeratechnology.com/,3.6,,9/18/2025
AeroVironment,/sites/EmergingTechnologySecurity/SitePages/AeroVironment-Counter-UAS-Solutions--Assessment-and-Deployment-Insights.aspx,Drones & C-UAS,Counter-drone deployment at Grand Forks AFB,https://www.avinc.com,3.6,,10/17/2025
Aether,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Aether--Crowd-Sentiment-AI-Analysis-and-Security-Assessment.aspx?csf=1&web=1&e=HWgsrG,Access Control & Identity,Crowd Sentiment AI Analysis,https://www.pymnts.com,2,,7/8/2025
Aeva,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Aeva-4D-LiDAR--Perimeter-and-Intrusion-Detection-Assessment.aspx?csf=1&web=1&e=zsSiaQ,Perimeter/Intrusion Detection,4D LiDAR,https://www.aeva.com/ (homepage),4.3,,7/8/2025
AEye/Flasheye,/:u:/r/sites/EmergingTechnologySecurity/SitePages/AEye-and-Flasheye-LiDAR-Perimeter-Security-Assessment.aspx?csf=1&web=1&e=nJKUEC,Perimeter/Intrusion Detection,LiDAR Perimeter Security,https://www.aeye.ai/,2,,9/4/2025
Agility Robotics,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Agility-Robotics--Evaluation-and-Insights-on-the-Digit-Humanoid-Warehouse-Robot.aspx?csf=1&web=1&e=8NVMgS,Robotics & Automation,Digit Humanoid Warehouse Robot,https://www.google.com/search?q=Agility+Robotics+official+site,2,,7/12/2025
AiFi,"/:u:/r/sites/EmergingTechnologySecurity/SitePages/AiFi-eddie-API-Pre-Assessment--Security,-Compliance,-and-Operational-Insights.aspx?csf=1&web=1&e=Su8qF6",LP & Inventory Protection,eddie API,https://aifi.io,4,,10/1/2025
AimLock,/:u:/r/sites/EmergingTechnologySecurity/SitePages/AimLock-Autonomous-Drone-Targeting--Pre-Assessment-and-Risk-Overview.aspx?csf=1&web=1&e=AMxTMk,Drones & C-UAS,Autonomous Drone Targeting,https://aim-lock.com/,1.8,,9/16/2025
AInvest,"/:u:/r/sites/EmergingTechnologySecurity/SitePages/AInvest-Pre-Assessment--Security,-Compliance,-and-Fit-Evaluation.aspx?csf=1&web=1&e=l3elcW",Robotics & Automation,AI & Robotics Investment,https://ainvest.ai/,1,,8/31/2025
AInvest,/:u:/r/sites/EmergingTechnologySecurity/SitePages/AInvest-Logistics-Assessment--AI-Powered-Shipment-Tracking-and-Security-Evaluation.aspx?csf=1&web=1&e=2dMKKY,Logistics & Fleet,AI-powered Shipment Tracking,https://www.ainvest.com/,2.4,,9/23/2025
AIPro,/:u:/r/sites/EmergingTechnologySecurity/SitePages/AIPro-%E2%80%94-Assessment-of-AI-BOX-High-Precision-Video-Analytics.aspx?csf=1&web=1&e=k1tBEA,Video Analytics & VMS,AI-BOX high-precision video analytics,https://aipro.ai,1.3,,10/24/2025
Ai-RGUS,/sites/EmergingTechnologySecurity/SitePages/Ai-RGUS-Camera-Health-Analytics-and-Integration-Assessment.aspx,Video Analytics & VMS,Ai-RGUS Camera Health Analytics,https://www.ai-rgus.com/,2,,8/21/2025
Airobotics Ltd.,/:u:/r/sites/EmergingTechnologySecurity/SitePages/Airobotics-Ltd.-Vendor-Assessment-and-Autonomous-Drone-Solutions-Overview.aspx?csf=1&web=1&e=4tDhST,Drones & C-UAS,Optimus System (drone-in-a-box); Iron Drone Raider (counter-UAS); automated data capture & analysis,https://www.google.com/search?q=Airobotics+Ltd.+official+site,4,,9/4/2025
Airship AI,,IoT & Specialty Sensors,Edge video/sensor data platform funding update,https://airship.ai,3.5,,10/10/2025
Airship AI Holdings,,Networking & Edge,Edge AI Security Solutions,https://airship.ai/,3,,8/12/2025
Airspace Link,,Drones & C-UAS,FAA-approved UTM service provision,https://www.airspacelink.com,3.5,,10/10/2025
AIThority,,Other / Misc,Generative AI for Autonomous Agents,https://aithority.com/guest-authors/rise-of-the-autonomous-agents-when-ai-starts-thinking-for-itself/,2,,8/17/2025 21:58
AITX / RAD,,Video Analytics & VMS,Real-time Gun Detection AI (ROAMEO Gen 4),https://www.google.com/search?q=AITX+%2F+RAD+official+site,3.6,,8/17/2025
Akamai & Aqua Security,,Cybersecurity,Integrated AI Security Solution,https://www.akamai.com/; https://www.aquasec.com/,1,,8/2/2025
Albert Heijn,,LP & Inventory Protection,Smart Tech Food Waste Reduction,https://www.ah.nl/,2,,9/11/2025
Alcatraz,,Access Control & Identity,Biometric Security,https://alcatraz.ai,3.7,,11/4/2025
Alcatraz AI,,Access Control & Identity,Privacy-first Facial Authentication Platform,https://www.alcatraz.ai,3.7,,10/9/2025
Algolux,,Other / Misc,AI Vision Software for Challenging Environments,https://www.algolux.com/ (GlobeNewswire),2,,7/26/2025 22:00
Alibi Security; Actuate; Eagle Eye,,Video Analytics & VMS,AI weapon detection + cloud VMS,https://alibidealer.com,3.8,,10/2/2025
Allegion,,Access Control & Identity,Readers with multi-vendor mobile IDs,https://www.allegion.com,3.8,,10/10/2025
Allegion/Schlage,,Access Control & Identity,L Series Lock Update,https://www.allegion.com/corp/en/index.html?utm_source=chatgpt.com,4.6,,8/2/2025
AllGoVision,,Other / Misc,Edge AI Surveillance,https://www.allgovision.com/,1.5,,8/8/2025
Alpha Modus & VSBLTY,,Other / Misc,AI Retail Ecosystem,https://www.alphamodus.com/; https://vsblty.net/,1,,8/21/2025
AMAG Technology,,Access Control & Identity,Symmetry Access Control V10,https://www.amag.com/?utm_source=chatgpt.com,3.8,,8/5/2025
AMAG Technology; Suprema,,Access Control & Identity,Symmetry–Suprema biometric integration,https://www.supremainc.com,3.5,,8/5/2025
Amazon,,Logistics & Fleet,Amelia AR Glasses for Delivery Drivers,https://www.amazon.com,2,,10/22/2025
Amazon,,Other / Misc,Quick Suite workplace automation,https://www.amazon.com,2,,10/13/2025
Amazon,,Other / Misc,Fire TV Stick 2025 crackdown features,https://www.amazon.com,2,,10/13/2025
Amazon,,LP & Inventory Protection,AI-Enabled Retail Checkout,https://aws.amazon.com/just-walk-out/,3,,7/21/2025
Amazon,,Robotics & Automation,Robotics in Fulfillment Center,https://aws.amazon.com/just-walk-out/,2,,7/3/2025
Amazon,,Access Control & Identity,Agentic AI Access Management,https://www.amazon.com/,1.5,,8/30/2025
Amazon AWS,,Access Control & Identity,Attribute-Based Access Control,https://www.amazon.com/,2.5,,8/2/2025
Amazon Bedrock Agents,,Video Analytics & VMS,Real-time video monitoring AI system,https://aws.amazon.com/,1.5,,7/8/2025
Amazon India & I4C,,Logistics & Fleet,ScamSmartIndia,https://aboutamazon.in/news/retail/amazon-india-ecommerce-fraud-protection,1.9,,9/15/2025
Ambarella,,Other / Misc,Edge AI Video Analytics,https://www.ambarella.com/,2,,9/1/2025
Ambi Robotics,,Robotics & Automation,AmbiStack AI Robotic Stacking (palletizing),https://www.ambirobotics.com,3.9,,10/21/2025
Ambient Scientific,,IoT & Specialty Sensors,GPX10 Pro SoC,https://www.ambientscientific.ai/,3.5,,9/17/2025
Ambient.ai,,IoT & Specialty Sensors,Gun Detection,https://ambient.ai/,4,,9/25/2025
Ambiq,,Networking & Edge,Edge AI Biometric Smart Card MCU,https://www.ambiq.com/ (Insider Risk Index),1.5,,7/22/2025 22:00
Ambiq,,Networking & Edge,HeliosRT & HeliosAOT,https://www.ambiq.com/ (Insider Risk Index),1.5,,7/27/2025 22:00
AMCA (India),,IoT & Specialty Sensors,AI-Assisted Sensor Fusion Avionics,https://www.amcaindia.com/,1,,8/7/2025
"American Robotics, Inc.",,Robotics & Automation,Scout System™; Optimus System; Kestrel-D Radar; training & operational services,https://www.google.com/search?q=American+Robotics%2C+Inc.+official+site,4,,9/4/2025
Anava,,Video Analytics & VMS,Edge-Deployed AI Surveillance Platform,https://anava.ai/,4,,9/1/2025
Anchore & Chainguard,,Logistics & Fleet,Next-Gen Supply Chain Security,https://anchore.com/,4,,9/24/2025
Anduril Industries,,Drones & C-UAS,Next-Gen C-UAS Fire Control (Army/DIU),https://www.anduril.com,3.7,,10/21/2025
Anduril Industries,,Other / Misc,Underwater Threat Detection AI,https://www.anduril.com/hardware/seabed-sentry/,3.7,,10/20/2025 22:00
Anker,,Video Analytics & VMS,eufy S350 Cam 100,https://www.anker.com/,2,,8/19/2025
Anno Robot,,Robotics & Automation,Retail Automation Robots,https://annorobot.com/,3,,8/3/2025
Anno Robotics,,Robotics & Automation,AI-powered beverage and retail service robotics,https://www.google.com/search?q=Anno+Robotics+official+site,2,,7/18/2025
Anonybit / Armatura,,Access Control & Identity,Decentralized biometric platform,https://www.google.com/search?q=Anonybit+%2F+Armatura+official+site,2,,7/14/2025
Anviz,,Other / Misc,W2,https://www.anviz.com/,2,,9/19/2025
APEPDCL,,Other / Misc,AI-Powered Grid System,https://www.apeasternpower.com/,2,,9/21/2025
Apple,,Video Analytics & VMS,PromptAIcomputervisiontechnology,https://www.apple.com,4.2,,10/13/2025
Apple,,Robotics & Automation,"Tabletop Robot, Security Cameras",https://www.apple.com/,3,,8/14/2025
Aqara,,Video Analytics & VMS,AI Doorbell Camera Hub G410,https://www.google.com/search?q=Aqara+official+site,1.5,,7/11/2025
Arcana,,Logistics & Fleet,Blockchain Security for Supply Chain,https://arcana.network,1,,9/21/2025
Arcana; EigenLayer,,Access Control & Identity,Crypto Wallets as Digital Identity Hub,https://arcana.network,2.2,,9/22/2025
Arcanna.ai,,Command & Incident Mgmt,AI SOC Assistant,https://www.google.com/search?q=Arcanna.ai+official+site,4.5,,7/30/2025
ArcGIS,,Perimeter/Intrusion Detection,LiDAR Imaging,https://www.esri.com/en-us/arcgis/products/overview,3.2,,9/4/2025
ARGUS,,Robotics & Automation,Autonomous Robotic Guard System,https://smprobotics.com,2.2,,10/9/2025
Arlo,,Video Analytics & VMS,Arlo Intelligence AI Security Cameras,https://www.arlo.com/,3,,8/26/2025
Arm,,Networking & Edge,Flexible Access expansion for Armv9 edge AI,https://www.arm.com,2.3,,10/21/2025
Armis,,AI Platforms & Agentic,Agentic AI in Torq AMP,https://www.armis.com,4.3,,9/25/2025
Armis,,Cybersecurity,Cyber Exposure Management,https://www.armis.com/,4.3,,9/25/2025
Arrow Security & i-PRO,,Video Analytics & VMS,Grant-Funded Camera Systems,https://arrowsecurity.net/; https://i-pro.com/,3,,8/28/2025
ASDA,,Cloud Platforms,Microsoft Azure,https://corporate.asda.com/newsroom/2025/22/09/asda-announces-renewed-ai-and-cloud-collaboration-with-microsoft/,5,,9/22/2025
ASSA ABLOY,,Access Control & Identity,Grade 1 ADA-Compliant Locks with Access Control Integration,https://www.assaabloy.com,3.8,,10/10/2025
ASSA ABLOY & Sharry,,Access Control & Identity,Mobile Access Credential Integration,https://www.sourcesecurity.com,2.5,,7/3/2025
ASSA ABLOY/ALCEA,,Access Control & Identity,Infrastructure Security Solutions,https://www.assaabloy.com,4,,9/15/2025
Astrix Security,,AI Platforms & Agentic,AI Agent Control Plane,https://astrix.security/,3.5,,9/16/2025
ASUS IoT,,Networking & Edge,PE3000N,https://iot.asus.com,3.8,,10/30/2025
ASUS IoT,,Networking & Edge,AISVision 365,https://www.asus.com,1.5,,10/8/2025
Asylon,,Drones & C-UAS,DroneDog™,https://asylonrobotics.com/,2,,9/16/2025
Asylon Robotics,,Robotics & Automation,Robot Patrol (mobile robot/dog with autonomous patrol),https://www.google.com/search?q=Asylon+Robotics+official+site,4,,9/3/2025
Asylon Robotics,,Robotics & Automation,Autonomous Security Robot (ground + aerial),https://www.google.com/search?q=Asylon+Robotics+official+site,3.5,,7/22/2025
Athena Security,,Video Analytics & VMS,H-Shield + Weapon Detection Suite,https://www.google.com/search?q=Athena+Security+official+site,3.3,,8/17/2025
Athena Security,,Video Analytics & VMS,AI-Powered X-Ray Security,https://www.google.com/search?q=Athena+Security+official+site,3.5,,8/12/2025
AtlasIED & Sittig Technologies,,Other / Misc,PAXGuide Platform Integration,https://www.atlasied.com/; https://www.sittig.de/,3.5,,8/3/2025
AtlasIED & Sittig Technologies,,Other / Misc,PAXGuide Platform Integration,https://www.atlasied.com/; https://www.sittig.de/,3.3,,8/3/2025
Auerswald & DoorBird,,Access Control & Identity,Integrated Access Control Systems,https://www.auerswald.de/,3.5,,8/3/2025
Augury,,Other / Misc,Industrial AI Analytics,https://www.augury.com,3.5,,10/7/2025
Auki Labs,,Robotics & Automation,Humanoid Terri,https://aukilabs.com/,2,,9/3/2025
Auror,,Access Control & Identity,Subject Recognition (facial recognition integration),https://www.auror.co,3.9,,9/25/2025
Auror / Vaxtor / Axis Communications,,ALPR & Vehicle Analytics,Auror LPR with Vaxtor Edge AI on Axis,https://www.auror.co,4.3,,10/21/2025
Auror RNZ,,Access Control & Identity,Facial Recognition in Shops,https://www.auror.co,2.5,,9/21/2025
Authentica,,Logistics & Fleet,AI Agents,https://www.authenti.ca/,1.8,,9/11/2025
AuthenTrend,,Other / Misc,Biometric FIDO Access Card,https://www.authentrend.com/,1.6,,8/14/2025
authID,,Access Control & Identity,Biometric digital identity (workforce),https://authid.ai,3.8,,10/22/2025
Avigilon,,Access Control & Identity,Alta Open,https://www.avigilon.com/,4.2,,10/21/2025
Axelera AI,,Networking & Edge,Metis® AIPU Edge AI Accelerators,https://axelera.ai,3.6,,10/23/2025
Axiomtek,,Networking & Edge,eBOX630B Edge AI System,https://www.axiomtek.com/,2,,8/31/2025
Axis Communications,,ALPR & Vehicle Analytics,AI Video Analytics Expansion,https://www.google.com/search?q=Axis+Communications+official+site,3.5,,7/18/2025
Axon; Auror,,Command & Incident Mgmt,Integration between Axon systems and the Auror Retail Crime Intelligence platform,https://www.axon.com,4.2,,10/10/2025
Axonius,,Other / Misc,Cybersecurity & IoT Visibility Platform,https://www.axonius.com/ (Axonius),2,,7/27/2025 22:00
Azimuth,,Drones & C-UAS,Ukrainian Drone Detection System,https://kvertus.ua/en/product/kvertus-ms-azimuth/,1.9,,9/14/2025
BadgePass & ProdataKey,,Access Control & Identity,BadgeHub + PDK Integration,https://badgepass.com/?utm_source=chatgpt.com,3,,8/21/2025
BankInfoSecurity,,Cloud Platforms,Sola Security,https://sola.security/,5,,9/5/2025
Belitsoft,,LP & Inventory Protection,Shadow AI Detection for Loss Prevention,https://belitsoft.com/,2,,7/13/2025
BigBear.ai,,Access Control & Identity,veriScan / Entry-Exit Processing (EPP),https://bigbear.ai,3.2,,9/24/2025
BigBear.ai,,Other / Misc,AI Security Solutions,https://bigbear.ai/,4.5,,8/20/2025
BigBear.ai,,Access Control & Identity,Biometric Defense Tech,https://www.bigbear.ai,4,,9/23/2025
BigBear.ai & Smiths Detection,,Command & Incident Mgmt,AI Analytics for Airport Security,https://bigbear.ai/; https://www.smithsdetection.com/,3,,8/28/2025
BigID,,Access Control & Identity,AI Access Control,https://www.bigid.com,3.7,,10/10/2025
BigID,,Privacy & Compliance,BigID Next DSP,https://bigid.com/,2,,9/25/2025
BioCatch,,Access Control & Identity,Behavioral Biometrics for Fraud and Scam Defense,https://www.biocatch.com/,3.6,,9/22/2025
BIO‑key,,Access Control & Identity,Biometric IAM Software,https://www.bio-key.com/?utm_source=chatgpt.com,3.6,,8/5/2025
Biometric Update,,Access Control & Identity,Biometric Systems by Government Vendors,https://www.google.com/search?q=Biometric+Update+official+site,2.5,,7/27/2025
Biometric Update,,Other / Misc,Biometric Data Privacy Framework,https://www.biometricupdate.com/,2,,8/10/2025
Biometric Update Credence ID,,Access Control & Identity,Biometric Partner System,https://www.google.com/search?q=Biometric+Update+Credence+ID+official+site,4.5,,7/30/2025
BioQube,,Access Control & Identity,Biometric-Free Identity Verification,https://yourstory.com,2,,7/25/2025
Blaize,,Networking & Edge,Multi-Modal Edge AI Platform,https://www.blaize.ai/,2,,8/8/2025
Blaize; Yotta,,Video Analytics & VMS,Edge AI VSaaS rollout,https://www.blaize.com; https://drishticam.ai,2,,9/30/2025
Blighter Surveillance Systems,,Perimeter/Intrusion Detection,Smart Multi‑Sensor E‑Scan Radar,https://www.blighter.com/ (homepage),2,,7/29/2025 22:00
Bloodhound,,Logistics & Fleet,Bloodhound Tracking Device,https://btdtracker.com/,4.3,,9/8/2025
Bloodhound,,Logistics & Fleet,Bloodhound Tracking Device,https://btdtracker.com/,3.3,,9/10/2025
Blue Cloud Softech Solutions,,Command & Incident Mgmt,Multi-Sensor Surveillance Integration,https://www.bluecloudsoftech.com/,2.5,,9/12/2025
Blue Cloud Softech Solutions,,Other / Misc,3P Vision Multi-Sensor Surveillance,https://www.bluecloudsoftech.com/,2.5,,9/12/2025
Blue Eye Soft,,Other / Misc,Spacecraft Anomaly Detection via AI,https://www.blueyesoft.com/projects,2,,7/24/2025 22:00
Blue Innovation,,Drones & C-UAS,Drone-Based Disaster Warning,https://blue-i.co.jp/,1.5,,8/1/2025
Blue Yonder (Optoro),,Logistics & Fleet,Optoro,https://blueyonder.com/; https://www.optoro.com/,5,,8/24/2025
BLUEVISION,,Perimeter/Intrusion Detection,AI-Powered Maritime Surveillance Platform,https://www.google.com/search?q=BLUEVISION+official+site,3.7,,7/18/2025
BOLO Drone,,Drones & C-UAS,Drone AI for Real-Time Identification,https://www.centinus.com/,2,,9/4/2025
Bonfy.AI,,LP & Inventory Protection,Adaptive AI Content Protection,https://bonfy.ai/,2,,7/1/2025
Booz Allen Hamilton Ventures,,Other / Misc,Defense Tech Startup Investments,https://www.boozallen.com/ventures.html,2.5,,8/3/2025
Bordeaux Airport,,Robotics & Automation,GR100 Autonomous Patrol Robot,https://www.google.com/search?q=Bordeaux+Airport+official+site,2,,7/29/2025
Bosch Security and Safety Systems,,Perimeter/Intrusion Detection,IVA Pro Perimeter,https://www.boschsecurity.com/,3.2,,8/13/2025
Boston Dynamics,,Robotics & Automation,Spot,https://bostondynamics.com,3.6,,10/28/2025
Boston Dynamics,,Robotics & Automation,Spot robotic inspections,https://cargill.com; https://bostondynamics.com,3.6,,10/28/2025
Boston Dynamics,,Robotics & Automation,Security Surveillance Robots,https://www.bostondynamics.com/,1,,8/24/2025
BraveXDrones,,Drones & C-UAS,Customizable Drone Security Solutions,https://www.google.com/search?q=BraveXDrones+official+site,3.6,,7/24/2025
Brecourt Solutions,,Drones & C-UAS,iDFR Indoor Drone First Responder,https://brecourtsolutions.com,4,,10/28/2025
BriefCam,,Video Analytics & VMS,BriefCam 2025 R1,https://www.briefcam.com/,1.5,,9/19/2025
BRINC,,Drones & C-UAS,Lemur 2 – Indoor Security & Surveillance Drone,https://brincdrones.com/,4.5,,8/23/2025
Britive,,Access Control & Identity,AI Identity Security,https://www.britive.com,1.5,,9/19/2025
Brivo,,Access Control & Identity,Identity Connector for Microsoft Entra ID (SCIM provisioning),https://www.brivo.com,2.5,,10/20/2025
Brivo & Envoy,,Access Control & Identity,Integrated Physical Security,https://www.brivo.com/,4,,10/20/2025
Buyutech & Titra,,Drones & C-UAS,AI-Powered Drone Cameras,https://buyutech.com.tr/; https://titra.com.tr/,1,,8/2/2025
Cambridge Terahertz,,LP & Inventory Protection,3D Imaging Tech to Prevent Return Fraud,https://www.cambridgeterahertz.com/,2,,7/24/2025
Campus Guardian Angel Drone,,Drones & C-UAS,Autonomous Campus Security Drone Platform,https://www.campusguardianangel.com/,3.5,,9/1/2025
Canary Speech,,Other / Misc,Canary Ambient Continuous Monitoring,https://canaryspeech.com,1,,10/16/2025
Canon,,Video Analytics & VMS,Workplace AI Video Analytics,https://www.canon.com/,4.2,,9/15/2025
Carbyne,,Other / Misc,AI Emergency Response Platform,https://carbyne.com/,2,,7/31/2025 22:00
Card Depot,,Cybersecurity,Fraud Detection for Gift Cards,https://www.carddepot.com/,4.4,,9/11/2025
Carnegie Mellon,,Other / Misc,LLM‑enabled Cyber Attacks,https://www.cmu.edu/ (Carnegie Mellon University),2,,7/31/2025 22:00
Carrefour,,Command & Incident Mgmt,Generative AI Assistant,https://www.carrefour.com/,3.5,,8/18/2025
Caspia Technologies,,Cybersecurity,AI-Powered Chip Security,https://www.caspiatechnologies.com/,1,,8/9/2025
Cato Networks,,Cybersecurity,AIM Security,https://www.catonetworks.com/,4.2,,9/3/2025
Cato Networks,,Other / Misc,Aim Security (Acquisition),https://www.catonetworks.com/,4,,9/8/2025
CB Insights,,AI Platforms & Agentic,AI Agent Technology Stack,https://www.cbinsights.com/,3.5,,9/15/2025
Cellebrite,,Command & Incident Mgmt,AI Device Forensics Platform,https://www.google.com/search?q=Cellebrite+official+site,2.5,,7/26/2025
Cellebrite + SentinelOne,,Cybersecurity,Cyber-Physical Threat Intelligence Platform,https://www.google.com/search?q=Cellebrite+%2B+SentinelOne+official+site,2.2,,7/26/2025
Check Point,,Cybersecurity,AI Security Expansion,https://www.checkpoint.com/,4.2,,9/16/2025
Chess Dynamics,,Perimeter/Intrusion Detection,EOSS-D Multi-Sensor Surveillance,https://www.chess-dynamics.com/,4,,9/15/2025
China (Govt/Defense),,Perimeter/Intrusion Detection,Adaptive AI Radar,https://www.cetc.com.cn/,1,,9/8/2025
Cisco,,Other / Misc,AI Supply Chain Risk Platform,https://www.cisco.com/site/us/en/products/security/ai-defense/ai-supply-chain-risk-management/index.html,4.1,,10/6/2025 22:00
Cisco,,Cloud Platforms,Sovereign Critical Infrastructure Portfolio,https://www.cisco.com/,4.2,,9/24/2025
Clarity,,Drones & C-UAS,UAV Aerial Imagery Analytics,,3.5,,10/9/2025
Claroty,,Cybersecurity,AI-Driven Cybersecurity for Retail OT/IoT,https://claroty.com/,4,,9/25/2025
Claroty,,IoT & Specialty Sensors,CPS protection; IPO watch,https://claroty.com/,1,,9/25/2025
CLEAR,,Access Control & Identity,eGates,https://www.clearme.com/,3,,8/28/2025
"Clear Secure, Inc./TSA",,Access Control & Identity,Biometric eGates,https://www.clearme.com/,3.5,,8/28/2025
Cloudastructure,,Other / Misc,AI Surveillance & Remote Guarding Platform,https://www.cloudastructure.com/,3.3,,9/22/2025 22:00
Cloudastructure,,Networking & Edge,Edge-Based AI Video Surveillance,https://www.cloudastructure.com/,2,,9/21/2025
Cloudastructure,,Video Analytics & VMS,MotionGi video processing,https://www.cloudastructure.com/,1.5,,9/19/2025
Cloudera,,Other / Misc,"AI Inference Service, AI Studios",https://www.cloudera.com/,2.5,,8/8/2025
Cloudflare,,Other / Misc,AI Security Posture Management,https://www.cloudflare.com/,4.3,,10/21/2025
Clumit Security,,LP & Inventory Protection,AI POS Monitoring System,,2,,7/8/2025
CNL Software + Pelco,,Cybersecurity,IPSecurityCenter Integration,https://www.cnlsoftware.com/; https://www.pelco.com/,3.3,,8/10/2025
Cobalt Robotics,,Robotics & Automation,Autonomous Patrol Robots,https://www.cobaltrobotics.com/,3,,8/9/2025
Code 4 Private Security,,Video Analytics & VMS,Advanced Threat Assessment Technology,https://www.code4security.com/,3,,8/29/2025
Cogent Security,,Command & Incident Mgmt,AI Security Platform,https://www.fintech.global,2,,7/16/2025
Cognosos,,LP & Inventory Protection,AI-Powered Asset Tracking (GearTrack acquisition),https://www.globenewswire.com/news-release/2025/07/24/3121092/0/en/GearTrack-by-COX2M-Acquired-by-Cognosos-to-Supercharge-AI-Powered-Asset-Visibility.html,3.8,,7/25/2025
Comcast Business,,Cybersecurity,AI-Based Security Tools,https://business.comcast.com,3.9,,10/10/2025
Compass Plus,,Video Analytics & VMS,AI-powered Real-Time Fraud Management,https://compassplustechnologies.com/,4,,9/17/2025
Concentric AI,,Command & Incident Mgmt,Unified DLP + DSPM + GenAI Suite,https://www.google.com/search?q=Concentric+AI+official+site,2,,7/31/2025
Concentric AI,,AI Platforms & Agentic,GenAI Governance Suite,https://www.google.com/search?q=Concentric+AI+official+site,2,,7/31/2025
Confidential Computing (Various Vendors),,Other / Misc,Confidential Computing for Zero Trust,https://www.google.com/search?q=Confidential+Computing+%28Various+Vendors%29+official+site,2,,7/19/2025 22:00
ConFirePatch,,IoT & Specialty Sensors,Multi-Sensor Fire Detection,https://confirepatch.com/,3,,8/17/2025
Coralogix,,Command & Incident Mgmt,AI-Powered Observability Platform,https://msspalert.com/,2.5,,7/8/2025
Coram,,Video Analytics & VMS,ONVIF Camera Integration Dashboard,https://www.google.com/search?q=Coram+official+site,1.5,,7/22/2025
Coram,,Access Control & Identity,Cloud/Hybrid Access Control,https://www.coram.ai/?utm_source=chatgpt.com,3.3,,8/17/2025
Corsight AI,,Access Control & Identity,Retail facial recognition partnership (Philippines),https://www.corsight.ai,3.5,,10/22/2025
Corvus Robotics,,Drones & C-UAS,Autonomous Indoor Inventory Drones,https://www.corvus-robotics.com/,3.8,,10/16/2025
Council of Europe,,Access Control & Identity,Biometric Access Systems,https://www.idtech.com,2,,7/7/2025
CPX,,Cybersecurity,End-to-End Cybersecurity Platform,https://cpxsecurity.com/,1,,8/1/2025
Cranium & Supply Wisdom,,Other / Misc,Know Your AI (KYAI),https://www.google.com/search?q=Cranium+%26+Supply%E2%80%AFWisdom+official+site,2,,7/22/2025 22:00
Creet Ventures/Newbility,,Robotics & Automation,Autonomous Patrol Robots,https://creetventures.com/; https://newbility.com/,3,,8/2/2025
CrowdStrike,,Cybersecurity,Falcon AI-Native Platform,https://www.crowdstrike.com/,4.4,,9/22/2025
CrowdStrike,,Cybersecurity,AI-Native Cybersecurity Platform,https://www.crowdstrike.com/,4.4,,9/22/2025
CrowdStrike,,Access Control & Identity,AI‑Driven Identity Security,https://www.crowdstrike.com/,2,,8/3/2025
CrowdStrike,,Cybersecurity,Next-Gen SIEM with Real-Time Telemetry,https://www.crowdstrike.com/,1.8,,9/1/2025
CSO Online,,Cybersecurity,Zero Trust AI Framework,https://www.google.com/search?q=CSO+Online+official+site,2,,7/30/2025
CTX Patrol,,Robotics & Automation,AI Security Robots,https://www.ctxpatrol.com/,2,,9/12/2025
CVEDIA,,Other / Misc,Gun Detector Model,https://www.cvedia.com/,3.7,,9/25/2025
CyberArk,,Cybersecurity,AI-Driven Cybersecurity Suite,https://www.google.com/search?q=CyberArk+official+site,2,,7/31/2025
CyberLink,,Access Control & Identity,FaceMe Platform with Age/Gender Analytics,https://www.google.com/search?q=CyberLink+official+site,3.7,,7/26/2025
Cyble,,AI Platforms & Agentic,Agentic AI Risk Platform for Retail,https://www.google.com/search?q=Cyble+official+site,2,,7/25/2025
CyCraft & APMIC,,Cybersecurity,AI Threat Detection Platform,https://www.google.com/search?q=CyCraft+%26+APMIC+official+site,2,,7/3/2025
Dallmeier,,Perimeter/Intrusion Detection,Panomera Perimeter,https://www.dallmeier.com/,1,,8/29/2025
Darwinium,,Perimeter/Intrusion Detection,Perimeter Detection (AI fraud & adversarial detection),https://www.darwinium.com,3.7,,9/24/2025
Dataminr,,Command & Incident Mgmt,ThreatConnect Acquisition,https://www.dataminr.com,2,,9/22/2025
Dataminr + Genetec,,Command & Incident Mgmt,Pulse for Corporate Security (integration),https://www.dataminr.com/,3,,9/22/2025
Dataminr + Genetec,,Other / Misc,Real-time alerts integration,https://www.dataminr.com/,2,,9/22/2025
DAWGS,,Other / Misc,Steel Door and Window Guard Systems,https://www.dawgsinc.com,4,,10/7/2025
Daylight Security,,Command & Incident Mgmt,AI Cyber Agents + Human Expert Security,https://www.google.com/search?q=Daylight+Security+official+site,2,,7/22/2025
DDN,,Video Analytics & VMS,AI400X3 + Infinia 2.1,https://www.google.com/search?q=DDN+official+site,1.5,,7/3/2025
Dedrone,,Drones & C-UAS,Smart Airspace Security Stack,https://www.dedrone.com/,3.6,,10/22/2025
Dedrone + AXON,,Drones & C-UAS,Sensor Fusion Drone Detection,https://www.dedrone.com/,4.2,,9/24/2025
Dedrone by Axon,,Drones & C-UAS,Dedrone + TYTAN interceptor integration,https://dedrone.com,3.6,,10/22/2025
Dedrone by Axon,,Drones & C-UAS,Airspace Protection System,https://www.dedrone.com/; https://www.axon.com/,1.5,,8/4/2025
Dedrone; TYTAN,,Drones & C-UAS,DedroneTracker.AI + Sensors; TYTAN Partnership Context,https://www.dedrone.com,3.6,,10/22/2025
DEEP Robotics,,Robotics & Automation,Intelligent Patrol Robot,https://www.google.com/search?q=DEEP+Robotics+official+site,3,,7/27/2025
DEEP Robotics,,Robotics & Automation,Multi-Robot Collaborative System,https://deeprobotics.us/,2,,9/8/2025
Deep Sentinel,,Perimeter/Intrusion Detection,AI Surveillance for Waste/Recycling Sites,https://www.deepsentinel.com,3.7,,10/8/2025
Deep Sentinel,,Perimeter/Intrusion Detection,Edge AI security system,https://www.deepsentinel.com/,2,,8/1/2025
Deep Sentinel,,Video Analytics & VMS,Partner milestones: Artistic Design & Moonlight Security >200 customers each,https://www.deepsentinel.com/,4.3,,9/29/2025
DEEPX,,Video Analytics & VMS,AI-Powered Video Management System,https://deepx.ai/solutions/success-stories/video-management-systems/,2,,9/11/2025
Delinea,,Access Control & Identity,Iris AI Identity Protection Tool,https://delinea.com/,2,,8/12/2025
Dev Technosys,,Access Control & Identity,eWallet App with Biometrics,https://devtechnosys.com/,1.5,,9/19/2025
DEXA (Drone Express),,Drones & C-UAS,Autonomous drone logistics,https://droneexpress.com,3.7,,10/9/2025
Dexory,,Robotics & Automation,DexoryView + Autonomous Inventory Robots,https://www.dexory.com,3.5,,10/17/2025
D-Fend Solutions,,Drones & C-UAS,EnforceAir2 Maritime Drone Defense,https://www.google.com/search?q=D-Fend+Solutions+official+site,3,,8/20/2025
D-Fend Solutions,,Drones & C-UAS,EnforceAir PLUS,https://d-fendsolutions.com/,1.5,,8/20/2025
Dicofra + Xona,,Perimeter/Intrusion Detection,Secure Access for Critical Infrastructure,https://www.google.com/search?q=Dicofra+%2B+Xona+official+site,3.7,,10/8/2025
Diebold Nixdorf,,Video Analytics & VMS,AI-Powered Self-Checkout Loss Prevention,https://www.dieboldnixdorf.com/,1.5,,8/29/2025
Divergent Tech,,Drones & C-UAS,Autonomous Drone Surveillance for Mfg,https://www.google.com/search?q=Divergent+Tech+official+site,3.6,,8/22/2025
DJI,,Drones & C-UAS,Mini 3 consumer drone,https://www.dji.com,2,,10/17/2025
DJI,,Drones & C-UAS,FlightHub 2 On-Premises,https://www.dji.com,3.8,,10/17/2025
DJI,,Drones & C-UAS,Drone Obstacle Detection Tech,https://www.dji.com/,1.5,,8/10/2025
DJI,,Other / Misc,BVLOS NPRM comments,https://www.dji.com/,3.8,,10/17/2025
DoorDash & Serve Robotics,,Robotics & Automation,Autonomous Sidewalk Delivery,https://doordash.com,3.5,,10/20/2025
DoorDash + Wing + Waymo,,Drones & C-UAS,Integrated drone + AV delivery pilot,https://wing.com,4,,10/21/2025
Doyle Security,,Video Analytics & VMS,AI-powered Live Video Monitoring,https://www.google.com/search?q=Doyle+Security+official+site,1.5,,7/15/2025
Draganfly,,Drones & C-UAS,Surveillance Drone (Commander 3XL),https://www.google.com/search?q=Draganfly+official+site,3.1,,8/30/2025
Draganfly,,Drones & C-UAS,Domestic Drone Manufacturing,https://www.draganfly.com/,4,,8/30/2025
Dräger,,Other / Misc,Alcotest 7000,https://www.draeger.com/,2,,8/2/2025
Dragonfruit AI,,Video Analytics & VMS,Enterprise Video AI Platform,https://dragonfruit.ai/,3.8,,9/1/2025
Dragos,,IoT & Specialty Sensors,Platform for OT/ICS,https://www.dragos.com/,4.2,,9/25/2025
Drata,,Robotics & Automation,Autonomous Trust Management,https://drata.com/,1,,8/9/2025
Drive Group,,Perimeter/Intrusion Detection,Barak LightGuard,https://drivegroupltd.com/,3.2,,8/20/2025
DroneSense & Versaterm,,Drones & C-UAS,Drone Incident Response Platform,https://www.versaterm.com/solution/dronesense/,3.6,,10/17/2025
DroneShield,,Drones & C-UAS,DroneSentry-C2 with ADS-B integration,https://droneshield.com,3.9,,10/20/2025
DroneShield,,Command & Incident Mgmt,DroneSentry-C2 Enterprise (C2E),https://www.droneshield.com,3.9,,10/20/2025
DroneShield,,Drones & C-UAS,Integrated Counter-Drone System,https://www.droneshield.com/,3.6,,9/8/2025
DroneShield,,Drones & C-UAS,SentryCiv Counter-Drone Solution,https://droneshield.com/,1.5,,8/11/2025
DroneShield,,Drones & C-UAS,Counter-UAS Sensor Fusion,https://www.droneshield.com/,4.5,,10/20/2025
DroneXL / Skydweller,,Drones & C-UAS,Persistent Autonomous Drone,https://www.google.com/search?q=DroneXL+%2F+Skydweller+official+site,3.6,,7/30/2025
Dropla Tech,,Drones & C-UAS,AI Mine Detection,https://dropla.tech/,2,,8/18/2025
Dropzone,,Command & Incident Mgmt,AI SOC Analyst Tool,https://www.geekwire.com/2025/seattle-startup-dropzone-ai-raises-37m-to-supercharge-its-ai-soc-analyst-software,2,,7/28/2025
DTEX,,Other / Misc,Insider Risk Management,https://www.dtexsystems.com/,4,,9/11/2025
DTEX Systems,,LP & Inventory Protection,AI-powered insider risk platform,https://www.dtexsystems.com/,2.6,,8/6/2025
DTiQ,,LP & Inventory Protection,Loss Prevention Platform,https://www.dtiq.com/,2,,9/2/2025
DXC/7AI,,Robotics & Automation,Autonomous Security Operations,https://dxc.com/; https://7ai.io/,2,,8/5/2025
Eagle Eye Networks,,Video Analytics & VMS,AI Video Surveillance,https://een.com/,2.2,,9/8/2025
Eagle Eye Networks + Blue Eye,,Video Analytics & VMS,Remote Guarding Integration,https://www.een.com; https://blueeyemonitoring.com,4.2,,10/21/2025
EagleEye (Eagle Eye Networks),,Video Analytics & VMS,AI Security Camera,https://www.een.com/,2,,8/2/2025
EagleEye (SOS Tech),,Video Analytics & VMS,AI Threat Detection Platform,https://www.een.com/; https://www.sostech.ai/,3,,8/1/2025
Earth Intelligence,,Command & Incident Mgmt,Threat Intelligence via AI,https://www.google.com/search?q=Earth+Intelligence+official+site,2,,7/27/2025
East Riding Council,,Video Analytics & VMS,AI-Enabled CCTV,https://www.eastriding.gov.uk/,1.5,,8/1/2025
ECAM AI,,Networking & Edge,Edge AI Video Surveillance + Access Alerts,https://ecam.com/,1.5,,9/24/2025
Echo,,Command & Incident Mgmt,AI-Powered Application Security,https://echosecurity.ai/,3,,8/28/2025
e-con Systems,,Robotics & Automation,Support for Renesas RZ/G3E + Morgan IMX678,https://www.e-con.com/,2,,9/19/2025
eConnect & Signature Systems,,LP & Inventory Protection,AI POS + Surveillance Alignment,https://www.econnect.tv/,2,,7/31/2025
Elbit Systems,,Perimeter/Intrusion Detection,Frontier AI System,https://elbitsystems.com/,2.5,,9/12/2025
Elbit Systems,,Video Analytics & VMS,Frontier AI System,https://elbitsystems.com/,1.5,,9/9/2025
Elisa,,Cybersecurity,Cybersecurity Services,https://www.elisa.com/,3.2,,8/31/2025
Elistair,,Drones & C-UAS,"Tethered Drone Systems (Khronos, Safe-T 2, Ligh-T 4)",https://elistair.com/,3,,8/27/2025
EnGenius,,Video Analytics & VMS,Cloud AI Surveillance System,https://www.engeniustech.com/,1.5,,8/2/2025
EOS Defense Systems USA,,Drones & C-UAS,Slinger Remote Weapon System enhancements,https://www.eosdsusa.com,1,,10/22/2025
Epic.org,,Privacy & Compliance,Surveillance Regulation Brief to Washington Court,https://www.epic.org,2,,7/29/2025
Epirus,,Drones & C-UAS,Counter-UAS (HPM),https://www.epirusinc.com/,2,,9/25/2025
ePlus,,Networking & Edge,Edge AI Security Solutions,https://www.eplus.com/,2,,8/9/2025
Equifax,,Access Control & Identity,Kount 360 Fraud Platform,https://www.equifax.com,4.5,,9/4/2025
Ericsson + Supermicro,,Networking & Edge,Edge AI Suite,https://www.ericsson.com/ (Insider Risk Index) (Ericsson’s homepage),2,,7/2/2025 22:00
ETUNNEL,,Access Control & Identity,Multimodal Biometric Access,https://etunnel.net,3.2,,10/10/2025
eufy,,Video Analytics & VMS,SoloCam E42 AI Security Camera,https://eu.eufy.com/,2,,8/7/2025
Eve Security,,AI Platforms & Agentic,AI Agent Risk Monitoring,https://eve.security/,2,,9/16/2025
Everbridge,,Command & Incident Mgmt,CEM integration with Personal Safety Device,https://www.everbridge.com/,3.5,,9/22/2025
Everon,,Video Analytics & VMS,AI Video Monitoring Platform,https://www.everonsolutions.com/solutions/video-solutions/,2,,9/12/2025
Everstream Analytics,,Logistics & Fleet,E2E Supply Chain Risk Management (AI),https://www.everstream.ai/,1.5,,8/14/2025
Evolv,,Other / Misc,Evolv Express,https://evolv.com/,3.3,,10/20/2025
Evolv Technologies,,Video Analytics & VMS,AI-Driven Weapons Detection,https://evolv.com/,2,,8/17/2025
Evolv Technology,,Video Analytics & VMS,"Evolv Express feature update (integrated tablet management, enhanced controls)",https://www.evolvtechnology.com,1.7,,10/20/2025
Evolv Technology,,Other / Misc,Concealed weapons detection portals/bag scan,https://www.evolv.com/,3.3,,10/21/2025
Evolv Technology,,Video Analytics & VMS,Evolv Express,https://evolv.com/,1.8,,9/23/2025
Exabeam,,Other / Misc,Agentic AI Security Platform,https://www.exabeam.com/,2,,8/10/2025
Exiger,,Logistics & Fleet,Supply Chain AI Platform,https://www.exiger.com/,3,,8/21/2025
ExMesh Engineering,,Perimeter/Intrusion Detection,ProtEx Perimeter Fencing,https://exmeshengineering.com/,3,,9/15/2025
Experian + Resistant AI,,Other / Misc,AI for Financial Crime Detection,https://www.experian.com/ (Experian homepage),2,,7/22/2025 22:00
F5 & Equinix,,Networking & Edge,AI-Ready Infrastructure Platform,https://www.f5.com/; https://www.equinix.com/,2,,8/7/2025
F5 & MinIO,,Cybersecurity,AI Data Security Platform,https://www.f5.com/; https://min.io/,2,,8/2/2025
Fable,,AI Platforms & Agentic,AI Security Training Platform,https://www.google.com/search?q=Fable+official+site,3.5,,7/28/2025
Fable Security,,AI Platforms & Agentic,Behavioral Analytics AI,https://www.google.com/search?q=Fable+Security+official+site,4.5,,7/29/2025
Fabric,,Logistics & Fleet,Orchestra AI-Native Fulfillment Platform,https://www.getfabric.com/,3.1,,9/11/2025
FaceTec,,Access Control & Identity,3D Face Verification v10,https://www.facetec.com/?utm_source=chatgpt.com,4,,9/8/2025
Facewatch,,Video Analytics & VMS,Real-time Facial Recognition,https://www.facewatch.co.uk/,1.6,,9/6/2025
Falcon,,Access Control & Identity,Next-gen Identity Security,https://www.crowdstrike.com/en-us/platform/next-gen-identity-security/?utm_source=chatgpt.com,1.5,,9/19/2025
Falcon (CrowdStrike),,Access Control & Identity,Next-Gen Identity Security (AI),https://www.crowdstrike.com/,3.8,,9/8/2025
Farmonaut,,Perimeter/Intrusion Detection,Countrywide Satellite Infrastructure Mapping,https://www.google.com/search?q=Farmonaut+official+site,3,,7/27/2025
Farmonaut,,Perimeter/Intrusion Detection,IoT-Enabled Smart Fencing,https://farmonaut.com/,3,,8/14/2025
FARx,,Access Control & Identity,Fused‐Biometrics Fraud Prevention,https://www.farx.co.uk/,2.4,,9/22/2025
FARx,,Access Control & Identity,AI fused-biometrics,https://www.farx.co.uk/,2.4,,9/22/2025
Fasoo,,Cybersecurity,Wrapsody eCo Cloud for Supply Chain Surveillance,https://www.google.com/search?q=Fasoo+official+site,2,,7/22/2025
Feedzai/BioCatch/IBM,,Access Control & Identity,Behavioral Biometrics,https://feedzai.com/,3.5,,8/26/2025
Fenton / Eagle Eye,,IoT & Specialty Sensors,AI Vape Sensor / AI Surveillance,https://www.google.com/search?q=Fenton+%2F+Eagle+Eye+official+site,3.1,,7/2/2025
Fetch.ai & Internet Computer,,AI Platforms & Agentic,On-Chain AI Agents for Security,https://fetch.ai/,3.6,,8/3/2025
Fiber SenSys,,Perimeter/Intrusion Detection,FD322 fiber-optic fence sensor,https://fibersensys.com/,3.5,,9/22/2025
Fiber SenSys,,Perimeter/Intrusion Detection,FD322 fiber-optic fence sensor,https://fibersensys.com/,3.9,,9/22/2025
FIDO Alliance / Dashlane,,Access Control & Identity,FIDO2 Physical Security Keys for passwordless vault access,https://www.dashlane.com,3.6,,10/20/2025
Flashfood & IGA,,LP & Inventory Protection,Flashfood Shrink Reduction Platform,https://flashfood.com/,3,,9/15/2025
FLIR,,Perimeter/Intrusion Detection,PT-Series AI SR Camera,https://www.google.com/search?q=FLIR+official+site,3.7,,7/27/2025
FLIR,,Perimeter/Intrusion Detection,Multi-layered Security Solutions,https://www.flir.com/,3,,9/15/2025
FLIR,,Perimeter/Intrusion Detection,Multi-layered Security Solutions,https://www.flir.com/,2,,9/12/2025
Flock Safety,,ALPR & Vehicle Analytics,ALPR (License Plate Reader) Cameras,https://www.google.com/search?q=Flock+Safety+official+site,2.5,,7/27/2025
Flock Safety,,ALPR & Vehicle Analytics,Flock Cameras,https://www.flocksafety.com/,3.5,,10/13/2025
Flock Safety,,ALPR & Vehicle Analytics,License Plate Reader System,https://www.flocksafety.com/,3.5,,10/13/2025
Flock Safety,,Other / Misc,Automated Surveillance System,https://www.flocksafety.com/,2,,8/3/2025
Flytrex,,Drones & C-UAS,Autonomous Drone Delivery,https://www.flytrex.com/,2,,9/19/2025
FORT Robotics,,Robotics & Automation,Remote Control & Security for Robots,https://fortrobotics.com/,2,,8/7/2025
Fortem Technologies,,Drones & C-UAS,Unknown (no public evidence found),https://fortemtech.com,3.8,,10/14/2025
Fortem Technologies,,Drones & C-UAS,DroneHunter F700 with Enhanced Radar,https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B4EDA6F17-0C9D-4EAD-8306-F3C91C2144DB%7D&file=Fortem%20Technologies%20DroneHunter%20F700.docx&action=default&mobileredirect=true,3.8,,8/17/2025
Forter,,AI Platforms & Agentic,Agentic AI Risk Detection Tools,https://www.forter.com/,3.9,,9/22/2025
Forter,,AI Platforms & Agentic,Identity Monitoring Platform,https://www.forter.com/,3.9,,9/22/2025
Forter,,Other / Misc,Trust Platform for Real-Time Fraud Decisions,https://www.forter.com/,3.9,,9/22/2025
Fortinet,,Cybersecurity,OT Cybersecurity + Physical Convergence,https://www.google.com/search?q=Fortinet+official+site,2,,7/12/2025
Forward Edge-AI,,Networking & Edge,Edge AI Security,https://forward-edgeai.com/,2,,8/14/2025
Fotokite,,Drones & C-UAS,Actively Tethered Drone System (Fotokite Sigma),https://fotokite.com/,3.5,,9/16/2025
FoxTech,,Other / Misc,Cybersecurity Suite,https://www.google.com/search?q=FoxTech+official+site,2,,7/1/2025 22:00
Frankenburg Technologies,,Drones & C-UAS,Mark 1 Counter-Drone Missile,https://frankenburg.tech/,1.5,,9/14/2025
Frigate NVR,,Video Analytics & VMS,Open-Source AI NVR,https://frigate.video/,1.5,,8/5/2025
Fugro/DTACT/Ubotica,,IoT & Specialty Sensors,Fusion & Intelligence Platform,https://www.google.com/search?q=Fugro%2FDTACT%2FUbotica+official+site,3.1,,7/8/2025
Fujitsu,,Logistics & Fleet,AI‑driven supply chain resilience,https://global.fujitsu/en-global/newsroom/gl/2025/07/02-01,2.3,,7/4/2025 22:00
Gaggle,,Video Analytics & VMS,AI Surveillance Tool (K-12),https://www.gaggle.net/,1.5,,8/2/2025
Gainfront,,Logistics & Fleet,AI in Supplier Risk Management,https://www.gainfront.com/solutions/supplier-relationship-management/supplier-risk/,2.3,,7/2/2025 22:00
Gallagher Security,,Access Control & Identity,ISTC distribution partnership,https://security.gallagher.com,3.9,,10/17/2025
Gallagher Security,,Access Control & Identity,QuickSwitch,https://security.gallagher.com/,4.5,,8/1/2025
Gallagher Security,,Command & Incident Mgmt,AI Security Platform,https://security.gallagher.com/,3.9,,10/17/2025
Gather AI,,Drones & C-UAS,Warehouse intelligence platform (drones to digital twin),https://www.gather.ai,1,,10/24/2025
Gecko Robotics / StratoSight,,Drones & C-UAS,Drone based Roof Inspection,https://www.geckorobotics.com/,3,,9/19/2025
Genetec,,Video Analytics & VMS,Security Center 25.1 (incl. Security Center SaaS),https://www.genetec.com,4.8,,10/20/2025
Genetec,,Access Control & Identity,Expanded Biometric Access Control Suite,https://www.genetec.com,4.5,,10/20/2025
Giesecke+Devrient; Amazon eero,,Networking & Edge,SGP.32 eSIM in eero Signal routers,https://www.gi-de.com; https://eero.com,2,,10/13/2025
Gladstone / Global GRAB,,Perimeter/Intrusion Detection,AI-Powered Perimeter Security,https://www.google.com/search?q=Gladstone+%2F+Global+GRAB+official+site,3.7,,7/27/2025
Global Guardian,,Video Analytics & VMS,AI Gun Detection Technology (visual analytics overview),https://globalguardian.com,1.7,,10/17/2025
Globe Telecom,,Access Control & Identity,Number Verification API,https://www.globe.com.ph/?utm_source=chatgpt.com,0,,(Last Assessed missing)
GM,,Logistics & Fleet,AI Supply Chain Monitoring,https://www.gm.com/,1.9,,9/22/2025
GMO GlobalSign,,Cryptography & PKI,Cryptography Platform,https://www.google.com/search?q=GMO+GlobalSign+official+site,2,,7/2/2025
Google,,Video Analytics & VMS,Nest Cam Indoor 2K; Nest Cam Outdoor 2K; Nest Doorbell 2K,https://www.google.com,3,,10/1/2025
Google,,Access Control & Identity,Biometric Lock for Chrome,https://about.google/,2,,8/1/2025
Granilux Solutions / Avigilon,,Audio Analytics,Avigilon Gunshot Sound Detection (on-camera audio ML),https://www.avigilon.com,4.2,,10/21/2025
Green Hills Software,,Video Analytics & VMS,Secure OS for AI Video Surveillance Devices,https://www.google.com/search?q=Green+Hills+Software+official+site,2,,7/26/2025
GreenBox Systems,,LP & Inventory Protection,AI-Powered Distribution Center,https://greenboxsystems.com/,1.8,,8/11/2025
Griffon Aerospace,,Drones & C-UAS,MQM-172 Arrowhead Security Drone,https://www.griffonaerospace.com/,1,,8/17/2025
GrowHub,,Logistics & Fleet,Blockchain Supply Chain Platform,https://www.thegrowhub.co/,1.5,,8/30/2025
GTB Technologies,,LP & Inventory Protection,AI Data Loss Prevention (DLP),https://www.gtbtechnologies.com/,3.2,,8/4/2025
GTT Communications / Palo Alto Networks,,Cloud Platforms,GTT Secure Connect with Prisma SASE (Managed SASE),https://www.paloaltonetworks.com,4.1,,10/21/2025
Guardforce AI,,LP & Inventory Protection,AI Cash Handling + Retail Analytics,https://www.guardforceai.com/smart-retail,3.6,,7/28/2025
Guardium,,Robotics & Automation,Autonomous Border Robot,                    https://www.iai.co.il/p/guardium,2.2,,9/15/2025
Guardrail Tech,,Other / Misc,Trust Layer AI Platform,https://guardrail.tech/ (Guardrail Technologies),4,,7/30/2025 22:00
Gunnebo,,Access Control & Identity,Rotasec HS180 Turnstile,https://www.gunneboentrancecontrol.com/,4.1,,9/24/2025
Gunsens,,Networking & Edge,AI-Powered Early Warning (Edge Gun Detectors + SOS App + Panic Buttons),https://gunsens.com/,1.5,,8/23/2025
Gurucul,,Cybersecurity,AI Insider Risk Management Platform,https://www.gurucul.com/,4.2,,9/17/2025
HAI Robotics,,Robotics & Automation,HaiPick Systems EU RED 3.3(d) cybersecurity compliance,https://www.hairobotics.com,4,,10/24/2025
Hailo,,Networking & Edge,Hailo‑10H Edge AI Chip,https://www.hailo.ai/ (Insider Risk Index),1.5,,7/24/2025 22:00
Hanwha Vision,,Video Analytics & VMS,AI Multi-Sensor Camera,https://www.hanwhavision.com,3.5,,9/24/2025
Hanwha Vision,,Video Analytics & VMS,AI Video Analytics,https://www.hanwha-security.com/,2,,8/11/2025
Hanwha Vision,,Access Control & Identity,OnCAFE Access Control,https://hanwhavisionamerica.com/oncafe/,3,,9/23/2025
Hanwha Vision,,Other / Misc,Wisenet9 Edge AI Surveillance,https://www.hanwhavision.com/,3.5,,9/24/2025
Hanwha Vision,,Video Analytics & VMS,Audio Beacon,https://hanwhavisionamerica.com/,3.5,,9/24/2025
HeroDevs,,Cybersecurity,Legacy System Security Updates,https://www.google.com/search?q=HeroDevs+official+site,1.8,,7/25/2025
`;

export const SENTRY_FRAMEWORK_TEXT = `
Phase I: Data Foundation and Curation
The primary objective is to ingest the Emerging Technology Security Vendor Report data and establish it as a reliable System of Record (SOR) for the application, ensuring data quality and a manageable structure for search and filtering.
1. Establish Data Model and Taxonomy:
    ◦ Utilize the existing vendor attributes (Company, Category, Overall Rating, Risk/Severity) to define the canonical data schema.
    ◦ Create the core taxonomy structure based on the vendor Category field (e.g., Video Analytics & VMS, Drones & C-UAS, etc.). This taxonomy will be essential for user interface navigation and Faceted Search functionality.
2. Ensure Data Uniqueness (Entity Resolution):
    ◦ Implement an Entity Resolution (ER) or data deduplication process to resolve inconsistencies and aliases within the vendor list (e.g., resolving minor variations in Company Name into a single, authoritative "Golden Record").
    ◦ The ER process should involve identifying attributes for comparison, calculating similarity scores, and executing entity clustering logic to build unique vendor profiles. This process mitigates relying on potentially dirty data.
3. Select Core Database (System of Record):
    ◦ Use a managed relational database service that guarantees strong consistency (ACID properties) for operational data.
    ◦ Recommendation: Implement Cloud SQL for PostgreSQL or, for superior enterprise performance and high availability, deploy AlloyDB for PostgreSQL. Cloud SQL provides features such as automated backups and managed operational overhead, allowing focus on application development.

Phase II: Application Architecture (SENTRY Deployment on GCP)
The core application should be deployed as a stateless microservice architecture to benefit from modern, serverless scaling on GCP.
1. Compute Service Selection:
    ◦ Deploy the SENTRY front-end and API backend using Cloud Run. This leverages a fully managed serverless platform for stateless containers, supporting rapid deployment, automatic scaling to zero (optimizing costs for intermittent usage), and simplified operations.
    ◦ Set concurrency settings on the Cloud Run service to manage the volume of simultaneous connections to the backend database, protecting the Cloud SQL instance from being overwhelmed during peak load.
2. Secure Networking (Private Connectivity):
    ◦ Ensure the Cloud Run service establishes secure communication with the database instance by connecting via a Virtual Private Cloud (VPC) network.
    ◦ Use a Serverless VPC Access connector to route traffic privately from the Cloud Run container instance to the Cloud SQL/AlloyDB database via internal IP addresses, isolating the database from the public internet and reducing latency.
3. Secure Credential Management:
    ◦ Store all application credentials, such as database passwords and API keys, in Secret Manager. This prevents hardcoding credentials in the codebase.
    ◦ Configure the Cloud Run service to retrieve secrets dynamically at runtime by setting secret environment variables that reference the Secret Manager resources. This approach adheres to the principle of least privilege.

Phase III: Security, Governance, and Lifecycle Management
To manage the sensitive nature of the security data, the deployment pipeline and access model must adhere to stringent Zero Trust and DevSecOps controls.
1. Zero Trust Access Enforcement:
    ◦ Authentication for Walmart personnel must be rigorously verified on a per-session basis ("never trust, always verify").
    ◦ Implement Identity-Aware Proxy (IAP) as the primary Policy Enforcement Point (PEP) at the application ingress layer.
    ◦ IAP must enforce dynamic access policies by evaluating contextual signals, such as user identity (via SSO/MFA) and device security posture, before granting access to the internal Cloud Run services.
2. DevSecOps Pipeline and Integrity:
    ◦ Shift Left Security: Integrate security validation throughout the Continuous Integration (CI) process, moving security checks earlier in the pipeline.
    ◦ Use Cloud Build as the core engine for the CI process. Cloud Build automatically generates and signs build provenance metadata (like the source commit, build tool, and parameters) which can provide assurance up to SLSA level 2.
    ◦ Store resulting container images in Artifact Registry. Enable Artifact Analysis for automated vulnerability scanning on built images, flagging known OS and language package vulnerabilities. The pipeline should be configured to automatically fail the build if high or critical severity vulnerabilities are detected.
    ◦ Enforce Binary Authorization policies on the Cloud Run runtime environment to ensure that only container images cryptographically verified (attested) as safe and compliant are permitted to deploy and execute.
3. Data and Key Protection:
    ◦ For sensitive data stored in the database, encryption at rest must be governed by Customer-Managed Encryption Keys (CMEK) using Cloud Key Management Service (Cloud KMS). This provides the organization full control over the key lifecycle, including location and rotation.
    ◦ Implement key rotation schedules for cryptographic keys used to protect stored data to minimize risk of compromise.
4. Logging, Monitoring, and Auditing (Assume Breach):
    ◦ Assume an adversary is already present in the environment (Assume Breach tenet) and focus on continuous monitoring and logging.
    ◦ Centralize system and activity logs using Cloud Logging to capture all administrative actions (Admin Activity) and configuration changes (e.g., changes to IAM roles, VPC firewall rules, or SQL instance settings).
    ◦ Utilize Cloud Monitoring to define and enforce alerts based on performance metrics (e.g., CPU utilization) and security logs to ensure timely response to anomalies.

Phase IV: Automated Pipeline & Event-Driven Architecture (Integration)
This phase establishes the automated, serverless pipeline for ingesting the Emerging Technology Security Vendor Report.
1. Trigger Mechanism (Cloud Storage):
    ◦ The entry point is a Cloud Storage bucket where the CSV file is uploaded.
    ◦ Eventarc or native Cloud Storage triggers detect the 'google.storage.object.finalize' event immediately upon upload.
2. Serverless Data Processing (ETL):
    ◦ A Cloud Function (2nd Gen) or Cloud Run Job is triggered by the upload event.
    ◦ This service downloads the CSV, parses it row-by-row, and executes Entity Resolution logic (deduplication of vendor names).
    ◦ Validated "Golden Records" are written to the Cloud SQL/AlloyDB database, ensuring the System of Record is always current.
3. Near-Real-Time Synchronization (Pub/Sub):
    ◦ Upon successful database update, the processing service publishes a message to a Pub/Sub topic.
    ◦ The active Cloud Run application instances subscribe to this topic (via push subscription) to invalidate their local data cache, ensuring the frontend reflects the new data immediately without manual redeployment.
4. Monitoring & Audit:
    ◦ Cloud Logging captures every step of the ingestion process (file detection, parse errors, row updates).
    ◦ Cloud Monitoring alerts are configured to notify the team if the pipeline fails or if data integrity checks (e.g., missing columns) fail.
`;

export const ARCHITECTURE_TREE_DATA: PhaseNode = {
  name: "SENTRY Framework",
  children: [
    {
      name: "Phase I: Data",
      children: [
        { name: "Schema & Taxonomy" },
        { name: "Entity Resolution (Golden Record)" },
        { name: "Cloud SQL / AlloyDB (SOR)" }
      ]
    },
    {
      name: "Phase II: Architecture",
      children: [
        { name: "Cloud Run (Compute)" },
        { name: "VPC Connector" },
        { name: "Secret Manager" }
      ]
    },
    {
      name: "Phase III: Security",
      children: [
        { name: "IAP (Zero Trust)" },
        { name: "Cloud Build (CI/CD)" },
        { name: "Artifact Registry" },
        { name: "Binary Auth" },
        { name: "Cloud KMS (CMEK)" },
        { name: "Cloud Logging & Monitoring" }
      ]
    },
    {
      name: "Phase IV: Pipeline",
      children: [
        { name: "Cloud Storage (Ingest)" },
        { name: "Cloud Functions (ETL)" },
        { name: "Pub/Sub (Real-time Sync)" },
        { name: "Pipeline Monitoring" }
      ]
    }
  ]
};