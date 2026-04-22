const crypto = require('crypto');

class Simulator {
    constructor(profiler, detector, mitigator, io) {
        this.profiler = profiler;
        this.detector = detector;
        this.mitigator = mitigator;
        this.io = io;
        
        this.running = false;
        this.attackMode = false;
        this.interval = null;
        this.attackInterval = null;
        this.speedMs = 100;
        
        this.metrics = {
            packetsPerSecond: 0,
            simulatedPackets: 0
        };
        this.packetCounter = 0;
        
        // Calculate PPS every second
        setInterval(() => {
            this.metrics.packetsPerSecond = this.packetCounter;
            this.packetCounter = 0;
        }, 1000);
    }

    generateIP(isAttack = false) {
        if (isAttack) {
            // Keep the attacker IP mostly the same to simulate scan
            return '192.168.1.100'; 
        }
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    generatePacket(isAttack = false) {
        const ip = this.generateIP(isAttack);
        if (this.mitigator.isIpBlocked(ip)) return; // Drop blocked traffic

        const packetList = [];
        
        if (isAttack) {
            // Attack: rapid SYN packets to many ports
            const numPortsToScan = Math.floor(Math.random() * 10) + 5;
            for (let i=0; i<numPortsToScan; i++) {
                packetList.push({
                    srcIp: ip,
                    dstPort: Math.floor(Math.random() * 65535),
                    protocol: 'TCP',
                    size: 64,
                    flags: ['SYN'],
                    timestamp: Date.now()
                });
            }
        } else {
            // Normal: Standard web traffic, low port variety, SYN/ACK mix
            packetList.push({
                srcIp: ip,
                dstPort: [80, 443, 8080, 22, 53][Math.floor(Math.random() * 5)],
                protocol: Math.random() > 0.8 ? 'UDP' : 'TCP',
                size: Math.floor(Math.random() * 1400) + 64,
                flags: Math.random() > 0.5 ? ['SYN'] : ['ACK'],
                timestamp: Date.now()
            });
        }
        
        packetList.forEach(packet => {
            this.packetCounter++;
            this.metrics.simulatedPackets++;
            
            // Send to profiler
            const profile = this.profiler.updateProfile(packet);
            
            // Run detection
            const threat = this.detector.analyze(profile);
            if (threat) {
                this.io.emit('threat_detected', threat);
                if (threat.riskLevel === 'HIGH') {
                    this.mitigator.blockIP(threat.ip, threat.reason);
                    this.io.emit('ip_blocked', { ip: threat.ip, reason: threat.reason });
                }
            }
            
            // Emit live packet randomly to not flood UI
            if (Math.random() < 0.1) {
                this.io.emit('live_traffic', packet);
            }
        });
    }

    start() {
        this.running = true;
        this.interval = setInterval(() => this.generatePacket(), this.speedMs);
        if (this.attackMode) this.startAttack();
    }

    stop() {
        this.running = false;
        clearInterval(this.interval);
        this.stopAttack();
    }

    toggleSimulation() {
        if (this.running) this.stop();
        else this.start();
        return this.running;
    }

    startAttack() {
        this.attackInterval = setInterval(() => this.generatePacket(true), 50); // High frequency burst
    }
    
    stopAttack() {
        clearInterval(this.attackInterval);
    }

    toggleAttackMode() {
        this.attackMode = !this.attackMode;
        if (this.running) {
            if (this.attackMode) this.startAttack();
            else this.stopAttack();
        }
        return this.attackMode;
    }

    getMetrics() {
        return this.metrics;
    }
}

module.exports = Simulator;
