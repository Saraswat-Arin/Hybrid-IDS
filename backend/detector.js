const { v4: uuidv4 } = require('crypto');

class Detector {
    constructor(mitigator) {
        this.mitigator = mitigator;
        this.logs = [];
        this.threatDist = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        
        // Adaptive baselines
        this.baseline = {
            connRateAvg: 2.0, // initial guess
            samples: 0
        };
    }

    updateBaseline(metrics) {
        // Sliding average for adaptive detection
        const { connectionRate } = metrics;
        if (connectionRate > 0 && connectionRate < 20) { // Exclude obvious attacks from baseline
            this.baseline.connRateAvg = (this.baseline.connRateAvg * this.baseline.samples + connectionRate) / (this.baseline.samples + 1);
            this.baseline.samples = Math.min(this.baseline.samples + 1, 1000); // cap samples
        }
    }

    analyze(metrics) {
        if (this.mitigator.isIpBlocked(metrics.ip)) return null;

        this.updateBaseline(metrics);
        
        let riskScore = 0;
        let reasons = [];
        let detectionType = 'None';
        
        // 1. Signature-Based Checks (Fixed Rules)
        // High unique ports in short time
        if (metrics.uniquePorts > 15) {
            riskScore += 50;
            reasons.push(`Rapid sequential port probing detected (${metrics.uniquePorts} ports)`);
            detectionType = 'Signature-based';
        }

        // 2. Anomaly-Based Checks (Statistical / Adaptive)
        // Connection rate spikes compared to baseline
        const rateDeviation = metrics.connectionRate / (this.baseline.connRateAvg || 1);
        if (rateDeviation > 5 && metrics.connectionRate > 10) {
            riskScore += 30;
            reasons.push(`Anomalous connection rate spike (${metrics.connectionRate.toFixed(1)} conn/sec) vs baseline (${this.baseline.connRateAvg.toFixed(1)})`);
            if (detectionType === 'None') detectionType = 'Anomaly-based';
            else detectionType = 'Hybrid';
        }
        
        // High SYN ratio (Typical of SYN Stealth Scans)
        if (metrics.synRatio > 0.8 && metrics.totalPackets > 10) {
            riskScore += 30;
            reasons.push(`Abnormal SYN ratio (${(metrics.synRatio * 100).toFixed(0)}%)`);
            if (detectionType === 'None') detectionType = 'Anomaly-based';
            else detectionType = 'Hybrid';
        }

        if (riskScore > 0) {
            let riskLevel = 'LOW';
            if (riskScore >= 40 && riskScore < 70) riskLevel = 'MEDIUM';
            else if (riskScore >= 70) riskLevel = 'HIGH';

            const threatLog = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
                timestamp: Date.now(),
                ip: metrics.ip,
                metrics: metrics,
                riskScore: riskScore,
                riskLevel: riskLevel,
                detectionType: detectionType,
                reason: reasons.join(' | ')
            };

            // Avoid logging same IP repeatedly unless it escalated
            const recentLog = this.logs.find(l => l.ip === metrics.ip && (Date.now() - l.timestamp < 2000));
            if (!recentLog || recentLog.riskLevel !== riskLevel) {
                this.logs.push(threatLog);
                this.threatDist[riskLevel]++;
                
                // keep logs bounded
                if (this.logs.length > 200) this.logs.shift();
                
                return threatLog;
            }
        }
        
        return null;
    }
}

module.exports = Detector;
