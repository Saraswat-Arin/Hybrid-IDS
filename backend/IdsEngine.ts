import { randomUUID } from "crypto";

export interface IdsState {
  monitoring: boolean;
  riskLevel: "Low" | "Medium" | "High";
  trafficLogs: TrafficLog[];
  detectedAttacks: DetectedAttack[];
  blockedIps: string[];
  trafficGraph: TrafficGraphPoint[];
  totalPackets: number;
  attacksDetected: number;
  portHeatmap: PortHeatmapEntry[];
  sessionStats: SessionStats;
  attackHeatmap: number[][];
}

export interface TrafficLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationPort: number;
  protocol: "TCP" | "UDP" | "ICMP";
  packetSize: number;
  connectionRate: number;
  synRatio: number;
  status: "normal" | "suspicious" | "malicious";
}

export interface DetectedAttack {
  id: string;
  timestamp: string;
  sourceIp: string;
  attackType: string;
  method: "ML" | "Signature" | "Hybrid";
  mlModel: string | null;
  reason: string;
  riskLevel: "Low" | "Medium" | "High";
  portsScanned: number;
  blocked: boolean;
  confidenceScore: number;
  mttdMs: number;
  methodTooltip: string;
  reasonTooltip: string;
  connectionRate: number;
  synRatio: number;
}

export interface TrafficGraphPoint {
  time: string;
  normal: number;
  malicious: number;
  total: number;
}

export interface PortHeatmapEntry {
  port: number;
  count: number;
}

export interface SessionStats {
  uniqueAttackers: number;
  falsePositiveRate: number;
  avgMttdMs: number;
  attackVelocity: number;
}

export class IdsEngine {
  private state: IdsState;
  private timer: NodeJS.Timeout | null = null;
  private internalBlockedIps: Set<string> = new Set();
  private ipPortTracker: Map<string, Set<number>> = new Map();
  private portCounts: Map<number, number> = new Map();

  private uniqueAttackersSet: Set<string> = new Set();
  private totalMttdMs: number = 0;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): IdsState {
    this.internalBlockedIps.clear();
    this.ipPortTracker.clear();
    this.portCounts.clear();
    this.uniqueAttackersSet.clear();
    this.totalMttdMs = 0;

    const attackHeatmap = Array(7).fill(0).map(() => Array(24).fill(0));
    // Add some realistic background noise for the presentation
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (Math.random() > 0.6) {
          attackHeatmap[d][h] = Math.floor(Math.random() * 5); // 0-4 attacks
        }
        // simulate peak hours at 2-4 AM
        if (h >= 2 && h <= 4 && Math.random() > 0.3) {
          attackHeatmap[d][h] += Math.floor(Math.random() * 15) + 5;
        }
      }
    }

    return {
      monitoring: false,
      riskLevel: "Low",
      trafficLogs: [],
      detectedAttacks: [],
      blockedIps: [],
      trafficGraph: [],
      totalPackets: 0,
      attacksDetected: 0,
      portHeatmap: [],
      sessionStats: {
        uniqueAttackers: 0,
        falsePositiveRate: 0.02,
        avgMttdMs: 0,
        attackVelocity: 0,
      },
      attackHeatmap,
    };
  }

  public getState(): IdsState {
    return {
      ...this.state,
      blockedIps: Array.from(this.internalBlockedIps),
    };
  }

  public start() {
    if (this.state.monitoring) return;
    this.state.monitoring = true;
    this.timer = setInterval(() => this.tick(), 2000);
  }

  public stop() {
    if (!this.state.monitoring) return;
    this.state.monitoring = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  public reset() {
    const wasMonitoring = this.state.monitoring;
    this.stop();
    this.state = this.getInitialState();
    if (wasMonitoring) this.start();
  }

  public simulateAttack() {
    const numAttackers = Math.floor(Math.random() * 4) + 4; // 4 to 7
    let hasHighOrHybrid = false;

    const attackers = Array.from({ length: numAttackers }, (_, i) => {
      const typeChoice = Math.random();
      let type = "signature-only";
      if (i === 0 || typeChoice > 0.8) {
        type = "hybrid";
        hasHighOrHybrid = true;
      } else if (typeChoice > 0.6) {
        type = "high-signature";
        hasHighOrHybrid = true;
      } else if (typeChoice > 0.4) {
        type = "ml-only";
      }
      return {
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        type,
      };
    });

    if (!hasHighOrHybrid) {
      attackers[0].type = "hybrid";
    }

    const timestamp = new Date().toISOString();
    let tickNormal = 0;
    let tickMalicious = 0;

    attackers.forEach((attacker) => {
      if (this.internalBlockedIps.has(attacker.ip)) return;

      let ports = 0;
      let connectionRate = 0;
      let synRatio = 0;

      if (attacker.type === "signature-only") {
        ports = Math.floor(Math.random() * 14) + 12; // 12-25
        connectionRate = Math.random() * 5 + 1; // 1-6
        synRatio = Math.random() * 0.2 + 0.05; // 0.05-0.25
      } else if (attacker.type === "ml-only") {
        ports = Math.floor(Math.random() * 2) + 3; // 3-4
        connectionRate = Math.random() * 32 + 18; // 18-50
        synRatio = Math.random() * 0.2 + 0.78; // 0.78-0.98
      } else if (attacker.type === "hybrid") {
        ports = Math.floor(Math.random() * 31) + 55; // 55-85
        connectionRate = Math.random() * 33 + 22; // 22-55
        synRatio = Math.random() * 0.19 + 0.80; // 0.80-0.99
      } else if (attacker.type === "high-signature") {
        ports = Math.floor(Math.random() * 36) + 55; // 55-90
        connectionRate = Math.random() * 4 + 1; // 1-5
        synRatio = Math.random() * 0.15 + 0.05; // 0.05-0.20
      }

      this.processAttack(attacker.ip, ports, connectionRate, synRatio, timestamp);
      tickMalicious += ports;
    });

    this.updateGraph(tickNormal, tickMalicious, timestamp);
  }

  private tick() {
    const timestamp = new Date().toISOString();
    const numNormalLogs = Math.floor(Math.random() * 5) + 2; // 2-6
    let tickNormal = 0;
    let tickMalicious = 0;

    for (let i = 0; i < numNormalLogs; i++) {
      const log: TrafficLog = {
        id: randomUUID(),
        timestamp,
        sourceIp: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        destinationPort: Math.floor(Math.random() * 1024) + 1,
        protocol: ["TCP", "UDP", "ICMP"][Math.floor(Math.random() * 3)] as any,
        packetSize: Math.floor(Math.random() * 1400) + 64,
        connectionRate: Math.random() * 5.5 + 0.5, // 0.5-6
        synRatio: Math.random() * 0.25, // 0-0.25
        status: "normal",
      };

      this.addLog(log);
      this.state.totalPackets++;
      tickNormal++;
      this.trackPort(log.destinationPort);
    }

    this.updateGraph(tickNormal, tickMalicious, timestamp);
  }

  private processAttack(ip: string, portsScanned: number, connectionRate: number, synRatio: number, timestamp: string) {
    for (let i = 0; i < portsScanned; i++) {
      const log: TrafficLog = {
        id: randomUUID(),
        timestamp,
        sourceIp: ip,
        destinationPort: Math.floor(Math.random() * 1024) + 1,
        protocol: "TCP",
        packetSize: Math.floor(Math.random() * 100) + 40,
        connectionRate,
        synRatio,
        status: "malicious",
      };
      this.addLog(log);
      this.state.totalPackets++;
      this.trackPort(log.destinationPort);
    }

    if (!this.ipPortTracker.has(ip)) {
      this.ipPortTracker.set(ip, new Set());
    }
    const ipPorts = this.ipPortTracker.get(ip)!;
    for (let i = 0; i < portsScanned; i++) {
      ipPorts.add(Math.floor(Math.random() * 65535));
    }
    const uniquePorts = ipPorts.size;

    const isSig = uniquePorts >= 5;
    const isMlGate = connectionRate > 10 || synRatio > 0.40;
    
    let isMl = false;
    let mlModel: string | null = null;

    if (isMlGate) {
      const composite = connectionRate * 0.4 + uniquePorts * 0.4 + synRatio * 50 * 0.2;
      if (connectionRate > 15 && synRatio > 0.7) {
        isMl = true;
        mlModel = "Random Forest";
      } else if (uniquePorts > 10 && synRatio > 0.5) {
        isMl = true;
        mlModel = uniquePorts <= 20 && synRatio < 0.75 ? "Isolation Forest" : "Random Forest";
      } else if (composite > 20) {
        isMl = true;
        mlModel = "Isolation Forest";
      }
    }

    let method: "Signature" | "ML" | "Hybrid" | null = null;
    if (isSig && isMl) method = "Hybrid";
    else if (isSig) method = "Signature";
    else if (isMl) method = "ML";

    if (method) {
      let riskLevel: "Low" | "Medium" | "High" = "Low";
      if (portsScanned > 50) riskLevel = "High";
      else if (portsScanned >= 10) riskLevel = "Medium";

      let confidenceScore = 0;
      if (method === "Hybrid") confidenceScore = Math.floor(Math.random() * 7) + 93;
      else if (mlModel === "Random Forest") confidenceScore = Math.floor(Math.random() * 10) + 84;
      else if (mlModel === "Isolation Forest") confidenceScore = Math.floor(Math.random() * 11) + 77;
      else if (method === "Signature") confidenceScore = Math.floor(Math.random() * 13) + 70;

      const sigMttd = Math.min((portsScanned / Math.max(connectionRate, 1)) * 1000, 30000);
      const mlMttd = Math.floor(Math.random() * 1800) + 400;
      let mttdMs = 0;
      if (method === "Hybrid") mttdMs = Math.min(sigMttd, mlMttd);
      else if (method === "Signature") mttdMs = sigMttd;
      else if (method === "ML") mttdMs = mlMttd;

      const blocked = riskLevel === "High";
      if (blocked) {
        this.internalBlockedIps.add(ip);
      }

      this.uniqueAttackersSet.add(ip);
      this.state.attacksDetected++;
      this.totalMttdMs += mttdMs;

      this.state.sessionStats.uniqueAttackers = this.uniqueAttackersSet.size;
      this.state.sessionStats.avgMttdMs = this.totalMttdMs / this.state.attacksDetected;
      this.state.sessionStats.attackVelocity = this.state.attacksDetected / Math.max(1, (this.state.totalPackets / 100));

      const attackDate = new Date(timestamp);
      // Map JS getDay (0=Sun, 6=Sat) to 0=Mon, 6=Sun
      const dayIndex = (attackDate.getDay() + 6) % 7;
      const hourIndex = attackDate.getHours();
      this.state.attackHeatmap[dayIndex][hourIndex]++;

      const attack: DetectedAttack = {
        id: randomUUID(),
        timestamp,
        sourceIp: ip,
        attackType: "Port Scan",
        method,
        mlModel,
        reason: `Detected malicious scanning pattern (${portsScanned} ports)`,
        riskLevel,
        portsScanned,
        blocked,
        confidenceScore,
        mttdMs,
        methodTooltip: this.generateMethodTooltip(method, mlModel),
        reasonTooltip: this.generateReasonTooltip(connectionRate, synRatio, uniquePorts, compositeScore(connectionRate, uniquePorts, synRatio)),
        connectionRate,
        synRatio,
      };

      this.state.detectedAttacks.unshift(attack);
      if (this.state.detectedAttacks.length > 50) this.state.detectedAttacks.pop();

      // update global risk level if this is higher
      if (riskLevel === "High") this.state.riskLevel = "High";
      else if (riskLevel === "Medium" && this.state.riskLevel !== "High") this.state.riskLevel = "Medium";
    }
  }

  private addLog(log: TrafficLog) {
    this.state.trafficLogs.unshift(log);
    if (this.state.trafficLogs.length > 200) {
      this.state.trafficLogs.pop();
    }
  }

  private trackPort(port: number) {
    const count = this.portCounts.get(port) || 0;
    this.portCounts.set(port, count + 1);
    
    // Convert to heatmap array
    const sorted = Array.from(this.portCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([p, c]) => ({ port: p, count: c }));
    this.state.portHeatmap = sorted;
  }

  private updateGraph(normal: number, malicious: number, timestamp: string) {
    // Only extract HH:mm:ss
    const time = new Date(timestamp).toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" });
    
    // Only add if not same time, or aggregate
    const last = this.state.trafficGraph[this.state.trafficGraph.length - 1];
    if (last && last.time === time) {
      last.normal += normal;
      last.malicious += malicious;
      last.total += normal + malicious;
    } else {
      this.state.trafficGraph.push({
        time,
        normal,
        malicious,
        total: normal + malicious,
      });
      if (this.state.trafficGraph.length > 60) {
        this.state.trafficGraph.shift();
      }
    }
  }

  private generateMethodTooltip(method: string, mlModel: string | null): string {
    if (method === "Hybrid") return "Triggered by both Signature engine (known scanning pattern > 5 ports) and ML engine (" + mlModel + "). High confidence.";
    if (method === "Signature") return "Triggered by deterministic rules: accessed >= 5 unique destination ports in short timeframe.";
    if (method === "ML") return "Triggered by ML anomaly detection (" + mlModel + ") based on connection rates and SYN flags.";
    return "";
  }

  private generateReasonTooltip(conn: number, syn: number, ports: number, composite: number): string {
    return `Metrics: ConnectionRate=${conn.toFixed(2)}, SYN Ratio=${(syn*100).toFixed(1)}%, Ports=${ports}. Composite Anomaly Score: ${composite.toFixed(2)}`;
  }
}

function compositeScore(conn: number, ports: number, syn: number) {
  return conn * 0.4 + ports * 0.4 + syn * 50 * 0.2;
}
