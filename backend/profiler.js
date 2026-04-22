class Profiler {
    constructor() {
        this.profiles = new Map();
        
        // Cleanup old data every 10 seconds to prevent memory leak
        setInterval(() => this.cleanup(), 10000);
    }

    updateProfile(packet) {
        const { srcIp, dstPort, flags } = packet;
        const now = Date.now();

        if (!this.profiles.has(srcIp)) {
            this.profiles.set(srcIp, {
                ip: srcIp,
                totalPackets: 0,
                synPackets: 0,
                ports: new Set(),
                connections: [], // sliding window of timestamps
                firstSeen: now,
                lastSeen: now
            });
        }

        const profile = this.profiles.get(srcIp);
        profile.totalPackets++;
        profile.lastSeen = now;
        profile.ports.add(dstPort);
        
        if (flags && flags.includes('SYN')) {
            profile.synPackets++;
        }
        
        profile.connections.push(now);
        
        return this.getComputedMetrics(profile, now);
    }

    getComputedMetrics(profile, now) {
        // Keep only connections within the last 5 seconds for rate calculation
        const windowStart = now - 5000;
        profile.connections = profile.connections.filter(t => t >= windowStart);
        
        const connectionRate = profile.connections.length / 5.0; // connections per second over 5s
        const synRatio = profile.totalPackets > 0 ? (profile.synPackets / profile.totalPackets) : 0;
        
        return {
            ip: profile.ip,
            uniquePorts: profile.ports.size,
            connectionRate: parseFloat(connectionRate.toFixed(2)),
            synRatio: parseFloat(synRatio.toFixed(2)),
            totalPackets: profile.totalPackets
        };
    }

    cleanup() {
        const now = Date.now();
        for (const [ip, profile] of this.profiles.entries()) {
            // Remove IPs not seen in 60 seconds
            if (now - profile.lastSeen > 60000) {
                this.profiles.delete(ip);
            }
        }
    }
}

module.exports = Profiler;
