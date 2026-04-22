class Mitigator {
    constructor() {
        this.blockedIPs = new Map();
    }

    blockIP(ip, reason) {
        if (!this.blockedIPs.has(ip)) {
            this.blockedIPs.set(ip, {
                timestamp: Date.now(),
                reason: reason
            });
            console.log(`[MITIGATOR] Blocked IP: ${ip} | Reason: ${reason}`);
        }
    }

    unblockIP(ip) {
        if (this.blockedIPs.has(ip)) {
            this.blockedIPs.delete(ip);
            console.log(`[MITIGATOR] Unblocked IP: ${ip}`);
        }
    }

    isIpBlocked(ip) {
        return this.blockedIPs.has(ip);
    }
}

module.exports = Mitigator;
