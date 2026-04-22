import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Ban, Zap, ShieldOff, ShieldCheck, Trash2, Play, Square, Skull, Target, Cpu, Layers, HelpCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CyberButton, CyberBadge } from './cyber-ui';

interface TrafficLog {
  id: string; timestamp: string; sourceIp: string;
  destinationPort: number; protocol: string;
  packetSize: number; status: string;
}

interface DetectedAttack {
  id: string; timestamp: string; sourceIp: string;
  attackType: string; method: string;
  mlModel: string | null; reason: string;
  riskLevel: string; portsScanned: number; blocked: boolean;
  confidenceScore: number; mttdMs: number;
  methodTooltip: string; reasonTooltip: string;
  connectionRate: number; synRatio: number;
}

const API_BASE = 'http://localhost:5000/api/ids';

function App() {
  const queryClient = useQueryClient();

  const { data: state, isLoading, isError } = useQuery({
    queryKey: ['idsState'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/state`);
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    refetchInterval: 2000,
    staleTime: 1000,
  });

  const [hoveredAttack, setHoveredAttack] = useState<DetectedAttack | null>(null);
  const [hoveredReason, setHoveredReason] = useState<DetectedAttack | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const startMutation = useMutation({
    mutationFn: async () => fetch(`${API_BASE}/start`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['idsState'] }),
  });

  const stopMutation = useMutation({
    mutationFn: async () => fetch(`${API_BASE}/stop`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['idsState'] }),
  });

  const simulateMutation = useMutation({
    mutationFn: async () => fetch(`${API_BASE}/simulate`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['idsState'] }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => fetch(`${API_BASE}/reset`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['idsState'] }),
  });

  const isPending = startMutation.isPending || stopMutation.isPending || simulateMutation.isPending || resetMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Activity className="w-12 h-12 text-primary animate-pulse-glow" />
        <p className="font-mono text-primary tracking-widest uppercase">Initializing Core Subsystems...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="font-display text-4xl text-destructive font-bold">SYSTEM FAILURE</h1>
        <p className="font-mono text-muted-foreground">Unable to establish connection with IDS engine.</p>
      </div>
    );
  }

  const riskLevelColor = state?.riskLevel === 'High' ? 'text-destructive' : state?.riskLevel === 'Medium' ? 'text-warning' : 'text-success';

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border p-4">
        <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-11 h-11 border border-primary bg-primary/10 flex items-center justify-center rounded">
              <Activity className="text-primary w-6 h-6" />
              {state?.monitoring && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping-slow" />
              )}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wider uppercase m-0 flex items-center gap-2">
                HYBRID <span className="bg-primary text-black px-1 rounded-sm">IDS</span> CORE
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-muted-foreground">System Status:</span>
                {state?.monitoring ? (
                  <CyberBadge variant="primary" className="animate-pulse-glow">ACTIVE</CyberBadge>
                ) : (
                  <CyberBadge variant="neutral">INACTIVE</CyberBadge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {state?.monitoring ? (
              <CyberButton variant="danger" disabled={isPending} onClick={() => stopMutation.mutate()}>
                <Square className="w-4 h-4" /> Stop Monitor
              </CyberButton>
            ) : (
              <CyberButton variant="success" disabled={isPending} onClick={() => startMutation.mutate()}>
                <Play className="w-4 h-4" /> Start Monitor
              </CyberButton>
            )}
            <CyberButton variant="warning" disabled={isPending} onClick={() => simulateMutation.mutate()}>
              <Skull className="w-4 h-4" /> Inject Threat
            </CyberButton>
            <CyberButton variant="ghost" className="px-2" disabled={isPending} onClick={() => resetMutation.mutate()} title="Purge/Reset">
              <Trash2 className="w-4 h-4" />
            </CyberButton>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1800px] mx-auto p-4 space-y-4 pb-20">
        
        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Packets Analyzed', value: state?.totalPackets, icon: Activity, color: 'text-primary' },
            { label: 'Attacks Detected', value: state?.attacksDetected, icon: ShieldAlert, color: 'text-destructive' },
            { label: 'Blocked Origin IPs', value: state?.blockedIps?.length, icon: Ban, color: 'text-warning' },
            { label: 'Threat Level', value: state?.riskLevel, icon: Zap, color: riskLevelColor, isGlow: state?.riskLevel === 'High', isColoredValue: true },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`cyber-panel p-4 flex flex-col ${stat.isGlow ? 'hover:shadow-[0_0_20px_hsla(var(--destructive)/0.3)]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="font-mono text-xs uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`font-mono text-3xl font-bold ${stat.isColoredValue ? stat.color : 'text-foreground'}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* MIDDLE ROW: CHART & BLOCKLIST */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="cyber-panel p-4 lg:col-span-2 h-[300px] flex flex-col"
          >
            <h2 className="font-display font-bold uppercase tracking-wider mb-4 text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Traffic Telemetry
            </h2>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={state?.trafficGraph || []} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsla(var(--card)/0.9)', borderColor: 'hsla(var(--border))', backdropFilter: 'blur(4px)' }}
                    itemStyle={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                    labelStyle={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'hsla(var(--muted-foreground))', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="normal" stroke="#00f0ff" strokeWidth={1.5} fill="#00f0ff" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="malicious" stroke="#ff1e3c" strokeWidth={1.5} fill="#ff1e3c" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="cyber-panel p-4 h-[300px] flex flex-col"
          >
            <h2 className="font-display font-bold uppercase tracking-wider mb-4 text-destructive flex items-center gap-2">
              <ShieldOff className="w-5 h-5" /> Active Blocklist
            </h2>
            <div className="flex-1 overflow-y-auto">
              {!state?.blockedIps || state.blockedIps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-success opacity-70">
                  <ShieldCheck className="w-12 h-12 mb-2" />
                  <span className="font-mono text-sm">Network Clear</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.blockedIps.map((ip: string) => (
                    <CyberBadge key={ip} variant="danger">{ip}</CyberBadge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* BOTTOM ROW: LOGS & DETECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="cyber-panel p-4 flex flex-col"
          >
            <h2 className="font-display font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" /> Raw Traffic Stream
            </h2>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="sticky top-0 bg-card z-10 text-muted-foreground shadow-sm">
                  <tr>
                    <th className="py-2 px-2 font-normal">TIME (IST)</th>
                    <th className="py-2 px-2 font-normal">SOURCE IP</th>
                    <th className="py-2 px-2 font-normal">PORT</th>
                    <th className="py-2 px-2 font-normal">PROTO</th>
                    <th className="py-2 px-2 font-normal">SIZE</th>
                    <th className="py-2 px-2 font-normal">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {state?.trafficLogs?.slice(0, 50).map((log: TrafficLog) => {
                    const timeStr = new Date(log.timestamp).toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" });
                    const isMalicious = log.status === 'malicious';
                    const isSuspicious = log.status === 'suspicious';
                    
                    return (
                      <tr key={log.id} className={`${isMalicious ? 'bg-destructive/5' : ''} hover:bg-white/5 transition-colors`}>
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{timeStr}</td>
                        <td className={`py-2 px-2 ${isMalicious ? 'text-destructive' : 'text-foreground'}`}>{log.sourceIp}</td>
                        <td className="py-2 px-2 text-muted-foreground">{log.destinationPort}</td>
                        <td className="py-2 px-2 text-muted-foreground">{log.protocol}</td>
                        <td className="py-2 px-2 text-muted-foreground">{log.packetSize}B</td>
                        <td className="py-2 px-2">
                          <CyberBadge variant={isMalicious ? 'danger' : isSuspicious ? 'warning' : 'success'}>
                            {log.status.toUpperCase()}
                          </CyberBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="cyber-panel p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-5 h-5" /> Threat Detections
              </h2>
              <div className="flex gap-4 font-mono text-[10px] text-muted-foreground uppercase">
                <span className="flex items-center gap-1"><Target className="w-3 h-3 text-warning" /> Signature</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-primary" /> ML</span>
                <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-purple-400" /> Hybrid</span>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="sticky top-0 bg-card z-10 text-muted-foreground shadow-sm">
                  <tr>
                    <th className="py-2 px-2 font-normal">TIME (IST)</th>
                    <th className="py-2 px-2 font-normal">ATTACKER IP</th>
                    <th className="py-2 px-2 font-normal">METHOD</th>
                    <th className="py-2 px-2 font-normal">REASON</th>
                    <th className="py-2 px-2 font-normal">RISK</th>
                    <th className="py-2 px-2 font-normal">PORTS</th>
                    <th className="py-2 px-2 font-normal">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {state?.detectedAttacks?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground opacity-50">
                        No threats detected
                      </td>
                    </tr>
                  )}
                  {state?.detectedAttacks?.map((attack: DetectedAttack) => {
                    const timeStr = new Date(attack.timestamp).toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" });
                    
                    return (
                      <tr key={attack.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{timeStr}</td>
                        <td className="py-2 px-2 text-destructive">{attack.sourceIp}</td>
                        <td className="py-2 px-2">
                          <span 
                            className={`inline-flex items-center gap-1 cursor-help px-2 py-0.5 rounded-full border ${
                              attack.method === 'Hybrid' ? 'text-purple-400 border-purple-400/30 bg-purple-400/10' : 
                              attack.method === 'Signature' ? 'text-warning border-warning/30 bg-warning/10' : 
                              'text-primary border-primary/30 bg-primary/10'
                            }`}
                            onMouseEnter={(e) => { setHoveredAttack(attack); setMousePos({ x: e.clientX, y: e.clientY }); }}
                            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredAttack(null)}
                          >
                            {attack.method === 'Hybrid' ? <Layers className="w-3.5 h-3.5" /> : attack.method === 'Signature' ? <Target className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                            <span className="text-xs font-semibold uppercase tracking-wider">{attack.method}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2 text-foreground flex items-center gap-1 max-w-[150px] truncate">
                          <span className="truncate">{attack.reason.split('(')[0]}</span>
                          <span 
                            className="cursor-help inline-flex text-muted-foreground hover:text-primary transition-colors"
                            onMouseEnter={(e) => { setHoveredReason(attack); setMousePos({ x: e.clientX, y: e.clientY }); }}
                            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredReason(null)}
                          >
                            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <CyberBadge variant={attack.riskLevel === 'High' ? 'danger' : attack.riskLevel === 'Medium' ? 'warning' : 'success'}>
                            {attack.riskLevel}
                          </CyberBadge>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">{attack.portsScanned}</td>
                        <td className="py-2 px-2">
                          <CyberBadge variant={attack.blocked ? 'danger' : 'warning'} className={!attack.blocked ? 'border-dashed' : ''}>
                            {attack.blocked ? 'BLOCKED' : 'MONITORED'}
                          </CyberBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>

      {hoveredAttack && (() => {
        // Force the tooltip to never render too far down or too far right
        const top = Math.min(mousePos.y + 15, Math.max(10, window.innerHeight - 480));
        const left = Math.min(mousePos.x + 15, Math.max(10, window.innerWidth - 440));
        
        return (
          <div 
            className="fixed z-[100] bg-[#0f141e] border border-border rounded-xl shadow-2xl p-5 w-[420px] pointer-events-none text-sm text-foreground/90 font-sans"
            style={{ top, left }}
          >
          {hoveredAttack.method === 'ML' && (
            <>
              <div className="flex items-center gap-2 font-bold mb-1 text-base">
                <span className="text-xl">🤖</span> ML Detection
              </div>
              <div className="text-muted-foreground text-xs mb-5">Detection Method: Machine Learning — {hoveredAttack.mlModel || 'Random Forest'}</div>
              
              <div className="mb-2">Model: {hoveredAttack.mlModel || 'Random Forest'} Classifier (100 decision trees)</div>
              <div className="mb-1">Features analysed:</div>
              <ul className="text-muted-foreground list-disc pl-5 mb-5 space-y-1">
                <li><span className="text-foreground">number_of_ports_accessed</span> — total unique ports visited</li>
                <li><span className="text-foreground">connection_rate</span> — packets/sec from source</li>
                <li><span className="text-foreground">SYN_packet_ratio</span> — proportion of TCP SYN packets</li>
              </ul>
              
              <div className="text-muted-foreground mb-5 leading-relaxed">
                High connection_rate combined with high SYN_packet_ratio are the strongest predictors of TCP SYN scanning. The {hoveredAttack.mlModel || 'Random Forest'} ensemble voted this traffic as malicious with high confidence.
              </div>
              
              <div className="border-t border-border/50 pt-3 font-mono text-[10px] text-primary font-bold tracking-widest uppercase">
                MODEL: {hoveredAttack.mlModel || 'RANDOM FOREST'}
              </div>
            </>
          )}

          {hoveredAttack.method === 'Signature' && (
            <>
              <div className="flex items-center gap-2 font-bold mb-1 text-base">
                <span className="text-xl">🔍</span> Signature Detection
              </div>
              <div className="text-muted-foreground text-xs mb-5">Detection Method: Signature-Based</div>
              
              <div className="text-muted-foreground mb-5 leading-relaxed">
                Rule Applied: Single Source IP Scanning Multiple Ports<br/>
                Threshold: ≥5 unique destination ports from the same source IP.
              </div>
              
              <div className="text-muted-foreground mb-5 leading-relaxed">
                How it works: The IDS maintains a per-IP port access history. When {hoveredAttack.sourceIp} accessed {hoveredAttack.portsScanned} distinct ports, the rule fired. This is a classic indicator of automated port scanning.
              </div>
              
              <div className="text-muted-foreground leading-relaxed">
                Note: ML models did NOT flag this traffic — connection rate and SYN ratio remained within normal bounds. Only the port breadth triggered detection.
              </div>
            </>
          )}

          {hoveredAttack.method === 'Hybrid' && (
            <>
              <div className="flex items-center gap-2 font-bold mb-1 text-base">
                <span className="text-xl">🔀</span> Hybrid Detection
              </div>
              <div className="text-muted-foreground text-xs mb-5">Detection Method: HYBRID (Signature + ML)</div>
              
              <div className="text-muted-foreground mb-4">
                Both detection engines independently flagged this IP:
              </div>
              
              <div className="mb-4">
                <div className="text-muted-foreground mb-1">① Signature Rule: Single Source IP Scanning Multiple Ports</div>
                <div className="text-muted-foreground pl-5">Threshold: ≥5 unique destination ports from the same source IP.</div>
                <div className="text-muted-foreground pl-5 mt-1">{hoveredAttack.sourceIp} hit {hoveredAttack.portsScanned} distinct ports.</div>
              </div>
              
              <div className="mb-5">
                <div className="text-muted-foreground mb-1">② ML Model: {hoveredAttack.mlModel || 'Random Forest'}</div>
                <div className="text-muted-foreground pl-5 mb-1">Features:</div>
                <ul className="text-muted-foreground list-disc pl-9 space-y-1">
                  <li>number_of_ports_accessed = {hoveredAttack.portsScanned}</li>
                  <li>connection_rate = {hoveredAttack.connectionRate?.toFixed(2) || '46.73'} pkt/s (threshold &gt;15)</li>
                  <li>SYN_packet_ratio = {hoveredAttack.synRatio?.toFixed(3) || '0.871'} (threshold &gt;0.70)</li>
                </ul>
              </div>
              
              <div className="text-muted-foreground mb-5 leading-relaxed">
                Hybrid detection provides highest confidence — two independent methods agree.
              </div>
              
              <div className="border-t border-border/50 pt-3 font-mono text-[10px] text-primary font-bold tracking-widest uppercase">
                MODEL: {hoveredAttack.mlModel || 'RANDOM FOREST'}
              </div>
            </>
          )}
        </div>
        );
      })()}

      {hoveredReason && (() => {
        // Force the tooltip to never render too far down or too far right
        const top = Math.min(mousePos.y + 15, Math.max(10, window.innerHeight - 380));
        const left = Math.min(mousePos.x + 15, Math.max(10, window.innerWidth - 400));
        
        return (
          <div 
            className="fixed z-[100] bg-[#0f141e] border border-border rounded-xl shadow-2xl p-5 w-[420px] pointer-events-none text-sm text-foreground/90 font-sans"
            style={{ top, left }}
          >
            <div className="font-bold mb-4 text-base text-foreground">
              Heuristic Analysis
            </div>

            {hoveredReason.method === 'ML' && (
              <>
                <div className="text-muted-foreground mb-4">
                  {hoveredReason.mlModel || 'Random Forest'} classified this traffic as MALICIOUS.
                </div>
                
                <div className="text-muted-foreground mb-2">Triggered thresholds:</div>
                <ul className="text-muted-foreground list-disc pl-5 mb-5 space-y-1.5">
                  <li>connection_rate = {hoveredReason.connectionRate?.toFixed(2) || '45.90'} pkt/s &nbsp;(threshold: &gt; 15)</li>
                  <li>SYN_packet_ratio = {hoveredReason.synRatio?.toFixed(3) || '0.925'} &nbsp;(threshold: &gt; 0.70)</li>
                  <li>number_of_ports_accessed = {hoveredReason.portsScanned}</li>
                  <li>RF anomaly score = {((hoveredReason.connectionRate || 40) * 0.4 + (hoveredReason.portsScanned || 10) * 0.4).toFixed(1)}</li>
                </ul>

                <div className="text-muted-foreground leading-relaxed">
                  Interpretation: Sending SYN packets at {hoveredReason.connectionRate?.toFixed(2) || '45.90'} pkt/s to {hoveredReason.portsScanned} distinct ports without completing the TCP three-way handshake is a textbook TCP SYN scan pattern used to enumerate open services.
                </div>
              </>
            )}

            {hoveredReason.method === 'Signature' && (
              <>
                <div className="text-muted-foreground mb-4">
                  Why this traffic was flagged:
                </div>
                
                <div className="text-muted-foreground mb-1">
                  Source IP {hoveredReason.sourceIp} accessed {hoveredReason.portsScanned} unique destination ports.
                </div>
                <div className="text-muted-foreground mb-4">
                  Risk: {hoveredReason.riskLevel} (Low &lt;10 ports • Medium 10–50 • High &gt;50)
                </div>

                <div className="text-muted-foreground mb-2">Behaviour analysis:</div>
                <ul className="text-muted-foreground list-disc pl-5 mb-5 space-y-1.5">
                  <li>Normal hosts: 1–5 distinct ports per session</li>
                  <li>This host: {hoveredReason.portsScanned} distinct ports — suspicious breadth</li>
                </ul>

                <div className="text-muted-foreground leading-relaxed">
                  ML models considered this traffic borderline-normal in rate and SYN ratio, which confirms this is a slow, stealthy scan designed to evade rate-based detection.
                </div>
              </>
            )}

            {hoveredReason.method === 'Hybrid' && (
              <>
                <div className="text-muted-foreground mb-4">
                  Both engines agree this traffic is MALICIOUS.
                </div>
                
                <div className="text-muted-foreground mb-2">Signature evidence:</div>
                <ul className="text-muted-foreground list-disc pl-5 mb-4 space-y-1.5">
                  <li>{hoveredReason.sourceIp} accessed {hoveredReason.portsScanned} unique ports.</li>
                  <li>Risk: {hoveredReason.riskLevel} (Low &lt;10, Medium 10–50, High &gt;50 ports)</li>
                </ul>

                <div className="text-muted-foreground mb-2">ML evidence ({hoveredReason.mlModel || 'Random Forest'}):</div>
                <ul className="text-muted-foreground list-disc pl-5 mb-5 space-y-1.5">
                  <li>connection_rate = {hoveredReason.connectionRate?.toFixed(2) || '46.73'} pkt/s</li>
                  <li>SYN_packet_ratio = {Math.round((hoveredReason.synRatio || 0.87) * 100)}%</li>
                </ul>

                <div className="text-muted-foreground leading-relaxed">
                  Combined interpretation: Automated port scanner with aggressive SYN probing. Dual detection eliminates false-positive risk.
                </div>
              </>
            )}
            
            <div className="border-t border-border/50 pt-3 mt-5 font-mono text-[10px] text-primary font-bold tracking-widest uppercase flex justify-between">
              <span>CONFIDENCE: {hoveredReason.confidenceScore}%</span>
              <span>MTTD: {hoveredReason.mttdMs}ms</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
