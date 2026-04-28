import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  alarmHistory,
  equipmentState,
  initialLogs,
  initialMessages,
  knowledgeBase,
  maintenanceItems,
  menuItems,
  processRows,
  recipeSteps,
  tabs,
  trendCards,
  waferInfo,
} from './data/mockData';
import type { ChatMessage, EquipmentStateItem, LogItem, Message, MessageInput, ProcessRow } from './types';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function App() {
  const hmiRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const logsRef = useRef<HTMLDivElement | null>(null);

  const [clock, setClock] = useState('');
  const [stepSeconds, setStepSeconds] = useState(0);
  const [processRunning, setProcessRunning] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [alarmList, setAlarmList] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [agentAutoExecuted, setAgentAutoExecuted] = useState(false);
  const [liveLogIndex, setLiveLogIndex] = useState(0);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(`${now.toLocaleDateString('zh-CN')} ${now.toTimeString().slice(0, 8)}`);
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!processRunning) return undefined;

    const timer = window.setInterval(() => {
      setStepSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [processRunning]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const node = logsRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (alarmActive) setPanelOpen(true);
  }, [alarmActive]);

  useEffect(() => {
    if (!processRunning || alarmActive) return undefined;

    const liveLogs = [
      'Step 3 resumed from t=222s — CF4 MAIN ETCH continuing',
      'RF Power stable: 449.2W / Bias: 121.0W',
      'Chamber pressure nominal: 2.50E-3 Torr',
      'TMP-1 speed stable: 29,850 RPM',
      'Gas flows nominal — CF4:80.1 O2:8.0 Ar:20.2 sccm',
      'Etch rate estimate: 1,840 Å/min — on target',
      'DC Bias: -186V stable — ESC clamping OK',
      'Step 3 t=240s — 80% complete',
      'He backside pressure: 7.9 Torr — OK',
      'RF reflect power: 3.2W — match network stable',
      'Step 3 t=270s — 90% complete',
      'Endpoint signal monitoring active',
      'Step 3 t=300s — COMPLETE',
      'Transitioning to Step 4: O2 CLEAN',
      'O2 flow: 50 sccm — RF 200W — 30s',
      'Step 4 complete — Step 5: PURGE',
      'N2 purge 60 sccm — 20s',
      'Step 5 complete — RF OFF',
      'Plasma extinguished — He backside venting',
      'ESC release sequence initiated',
      'Wafer de-clamped — transfer robot ready',
      'LOT N22AETX0421 Slot 03 — PROCESS COMPLETE ✓',
    ];

    if (liveLogIndex >= liveLogs.length) return undefined;

    const timer = window.setTimeout(() => {
      appendLog(liveLogs[liveLogIndex], 'info');
      setLiveLogIndex((current) => current + 1);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [processRunning, alarmActive, liveLogIndex]);

  const appendLog = (text: string, level: LogItem['level']) => {
    const now = new Date().toTimeString().slice(0, 8);
    setLogs((current) => [...current, { level, text: `[${now}] ${text}` }]);
  };

  const addMessage = (message: MessageInput) => {
    setMessages((current) => [...current, { id: `${Date.now()}-${Math.random()}`, ...message } as Message]);
  };

  const displayedRows = useMemo<ProcessRow[]>(
    () =>
      processRows.map((row) => {
        if (!processRunning && !alarmActive) return row;

        if (alarmActive && row.key === 'tmpSpeed') {
          return {
            ...row,
            pv: '21,340',
            status: 'err',
            label: '✕ CRITICAL',
          };
        }

        if (processRunning && row.key === 'tmpSpeed') {
          return {
            ...row,
            pv: '29,850',
            status: 'stable',
            label: '● OK',
          };
        }

        if (row.parameter === 'Chamber Pressure') {
          return {
            ...row,
            pv: processRunning ? '2.41E-3' : row.pv,
            status: processRunning ? 'warn' : row.status,
            label: processRunning ? '△ -3.6%' : row.label,
          };
        }

        return row;
      }),
    [processRunning, alarmActive],
  );

  const displayedEquipment = useMemo<EquipmentStateItem[]>(
    () =>
      equipmentState.map((item) => {
        if (item.key === 'plasma') {
          if (alarmActive) return { ...item, tone: 'off', label: 'PLASMA OFF' };
          if (processRunning) return { ...item, tone: 'blue', label: 'PLASMA ON' };
        }

        if (item.key === 'tmp') {
          if (alarmActive) return { ...item, tone: 'red', label: 'TMP-1 FAULT' };
          if (processRunning) return { ...item, tone: 'green', label: 'TMP-1 NOMINAL' };
        }

        return item;
      }),
    [processRunning, alarmActive],
  );

  const stepTime = secToHMS(stepSeconds);
  const activeAlarmText = alarmList.length ? alarmList[0] : '无活动告警';
  const processStateText = processRunning ? '运行中' : alarmActive ? '已中止' : '待机中';
  const quickPrompts = ['分析当前告警', '生成恢复步骤', '检查TMP状态', '立即恢复工艺'];

  const runProcess = () => {
    if (processRunning) return;

    setProcessRunning(true);
    setAlarmActive(false);
    setAlarmList([]);
    setStepSeconds(0);
    setLiveLogIndex(0);

    appendLog('▶ PROCESS STARTED — CF4_SiO2_HDP_v3', 'info');
    appendLog('RF ON: 13.56MHz 450W — Plasma ignition confirmed', 'info');
    appendLog('Step 1: PUMP DOWN — target < 1e-3 Torr', 'info');

    window.setTimeout(() => appendLog('Step 2: GAS STAB — CF4 80 sccm / O2 8 sccm / Ar 20 sccm', 'info'), 1200);
    window.setTimeout(() => appendLog('Step 3: CF4 MAIN ETCH — START', 'info'), 2500);
    window.setTimeout(() => {
      appendLog('WARNING: TMP-1 speed declining — 26,400 RPM', 'warn');
    }, 3500);
    window.setTimeout(() => {
      triggerAlarm();
    }, 5000);
  };

  const triggerAlarm = () => {
    setProcessRunning(false);
    setAlarmActive(true);
    setAlarmList(['E-2015: TMP SPD FAULT']);
    appendLog('CRITICAL E-2015: TMP-1 speed 21,340 RPM — PROCESS ABORTED', 'err');
  };

  const closeAlarm = () => {
    setAlarmActive(false);
  };

  const toggleAgentPanel = () => {
    setPanelOpen((current) => !current);
  };

  const takeScreenshot = async (label: string) => {
    if (!hmiRef.current) return;

    try {
      const canvas = await html2canvas(hmiRef.current, {
        scale: 0.6,
        backgroundColor: '#09111a',
        logging: false,
      });

      addMessage({
        type: 'screenshot',
        image: canvas.toDataURL('image/jpeg', 0.7),
        label,
        time: new Date().toTimeString().slice(0, 8),
      });
    } catch {
      addMessage({ type: 'action', text: '截图失败，使用模拟截图代替' });
    }
  };

  const startAgentAssist = async () => {
    closeAlarm();
    setPanelOpen(true);
    setAgentRunning(true);

    await delay(400);
    addMessage({ type: 'system', html: 'AI Agent 已进入告警处置模式，正在接管异常恢复工作流。' });
    await delay(800);
    addMessage({ type: 'action', text: '正在抓取当前设备工况、参数快照与事件上下文…' });
    await delay(600);
    await takeScreenshot('报警触发时HMI状态');
    await delay(700);
    addMessage({
      type: 'think',
      text: '分析告警 E-2015：TMP-1 转速跌破阈值。当前步骤 Step 3 已中止，优先确认前级压力、TMPC 通信与重启条件。',
    });
    await delay(1000);
    addMessage({
      type: 'agent',
      html:
        '<b>处置结论</b><br><br>· 根因候选：前级压力反冲 / TMPC 通信超时 / 润滑异常<br>· 当前建议：执行 TMP 重启序列并验证恢复阈值<br><br><b>推荐步骤</b><ol class="step-list"><li><span class="step-num">1</span>确认前级压力与阀门状态</li><li><span class="step-num">2</span>打开 TMP Diagnostics 检查驱动通讯</li><li><span class="step-num">3</span>执行 Stop → Cool Down → Restart</li><li><span class="step-num">4</span>恢复至 29,000 RPM 以上后清除报警</li></ol>',
      confirm: !agentAutoExecuted,
    });

    setAgentRunning(false);
  };

  const executeAgentSteps = async () => {
    if (agentAutoExecuted) return;

    setAgentAutoExecuted(true);
    setAgentRunning(true);
    addMessage({ type: 'user', text: '确认执行，由 Agent 自动操控', author: 'LIN_JH' });
    await delay(600);
    addMessage({ type: 'system', html: 'Agent 开始执行自动恢复序列，请勿人工切换控制权限。' });
    await delay(500);
    addMessage({ type: 'think', text: 'Step 1：前级压力 3.8 Torr < 5 Torr，V3/V4 均为 OPEN，满足恢复前检查条件。' });
    await delay(400);
    addMessage({ type: 'action', text: 'VERIFY: 前级压力 3.8 Torr ✓ | V3: OPEN ✓ | V4: OPEN ✓' });
    await delay(800);
    addMessage({ type: 'action', text: 'ACTION: 打开 Diagnostics → TMP Control Panel' });
    await delay(600);
    await takeScreenshot('导航至 Diagnostics TMP Control');
    await delay(700);
    addMessage({ type: 'action', text: 'READ: TMPC状态 — 通信超时 x3，驱动器轻微降频保护' });
    await delay(800);
    addMessage({ type: 'think', text: 'Step 2：执行 TMP 重启序列：STOP → 冷却 60 秒 → RESTART。' });
    await delay(500);
    addMessage({ type: 'action', text: 'ACTION: TMP-1 → 执行 [STOP PUMP]' });
    await delay(2000);
    addMessage({ type: 'action', text: 'WAIT: 当前转速 18,220 → 12,400 → 5,800 RPM → STOP' });
    await delay(1500);
    addMessage({ type: 'action', text: 'ACTION: 进入冷却窗口 60 秒…' });

    for (const time of [60, 45, 30, 15]) {
      await delay(500);
      addMessage({ type: 'action', text: `WAIT: 冷却倒计时 ${time}s…` });
    }

    await delay(500);
    addMessage({ type: 'action', text: 'ACTION: TMP-1 → 执行 [START PUMP]' });
    await delay(800);
    await takeScreenshot('TMP 重启序列执行后状态');
    await delay(700);
    addMessage({ type: 'action', text: 'MONITOR: TMP-1 升速中… 8,200 → 15,600 → 22,100 → 27,400 → 29,850 RPM' });
    await delay(1000);
    addMessage({ type: 'think', text: '转速已恢复至 29,850 RPM，超过恢复阈值，可以清除报警并恢复工艺。' });
    await delay(600);
    addMessage({ type: 'action', text: 'VERIFY: TMP-1 转速 29,850 RPM ✓ — 超过恢复阈值 29,000 RPM' });
    await delay(700);
    addMessage({ type: 'action', text: 'ACTION: Alarm Manager → 选中 E-2015 → 执行 [CLEAR ALARM]' });

    setAlarmList([]);
    appendLog('E-2015 CLEARED — TMP-1 speed nominal 29850 RPM', 'info');
    appendLog('Agent automated recovery sequence completed', 'info');
    await delay(500);
    await takeScreenshot('报警已清除 — HMI 恢复正常');
    await delay(600);
    addMessage({
      type: 'agent',
      html:
        '<b>自动恢复完成</b><br><br>· 根因：TMPC 通信超时导致 TMP-1 降频保护<br>· 动作：执行 TMP 重启序列<br>· 结果：TMP-1 转速恢复至 29,850 RPM，报警已清除<br><br>当前晶圆未损伤，可从 Step 3 断点恢复工艺。',
    });

    setAgentRunning(false);
  };

  const handleUserPrompt = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    addMessage({ type: 'user', text, author: 'LIN_JH' });

    const lower = text.toLowerCase();

    if (lower.includes('立即恢复') || lower.includes('恢复工艺') || lower.includes('resume')) {
      setAgentRunning(true);
      await delay(900);
      addMessage({
        type: 'agent',
        html: '正在执行断点续跑…<br><br>· 从 Step 3 t=222s 断点重新启动<br>· 校验 RF、Plasma、Gas Flow 三个恢复条件',
      });
      await delay(800);
      addMessage({ type: 'action', text: 'ACTION: Process Control → Resume Step 3 from t=222s' });
      await delay(600);
      addMessage({ type: 'action', text: 'VERIFY: RF ON 450W ✓ | Plasma ignited ✓ | Gas flows nominal ✓' });
      await delay(500);
      addMessage({ type: 'system', html: '工艺已恢复运行，Step 3 CF4 MAIN ETCH 继续执行。' });
      setProcessRunning(true);
      setAlarmActive(false);
      setAlarmList([]);
      setAgentRunning(false);
      return;
    }

    setAgentRunning(true);
    await delay(800 + Math.random() * 600);

    const matched = Object.entries(knowledgeBase).find(([key]) => lower.includes(key));
    addMessage({
      type: 'agent',
      html:
        matched?.[1] ??
        `收到请求：“${text}”<br><br>当前未命中精确知识条目。建议尝试更具体的关键词，例如 “TMP”、“RF”、“压力”、“配方”，或直接让系统执行诊断流程。`,
    });
    setAgentRunning(false);
  };

  const sendUserMsg = async () => {
    const text = chatInput.trim();
    if (!text) return;

    setChatInput('');
    await handleUserPrompt(text);
  };

  const sendQuickPrompt = async (text: string) => {
    setPanelOpen(true);
    await handleUserPrompt(text);
  };

  return (
    <div className="app-shell" ref={hmiRef}>
      <header className="title-bar">
        <span className="title-text">⚙ NEXUS-E320 Dry Etch System | HMI v4.2.1 | Operator: LIN_JH</span>
      </header>

      <nav className="menu-bar">
        {menuItems.map((item) => (
          <button className="menu-item" key={item} type="button">
            {item}
          </button>
        ))}
      </nav>

      <div className="toolbar-bar">
        <div className="toolbar-group">
          <button className="toolbar-btn green hmi-btn-lg" onClick={runProcess} type="button">
            ▶
            <br />
            START
          </button>
          <button className="toolbar-btn hmi-btn-lg" type="button">
            ⏸
            <br />
            PAUSE
          </button>
          <button className="toolbar-btn red hmi-btn-wide" onClick={triggerAlarm} type="button">
            ■ ABORT
            <br />
            PROCESS
          </button>
          <div className="toolbar-separator" />
          <button className="toolbar-btn hmi-btn-mid" type="button">
            RECIPE
            <br />
            LOAD
          </button>
          <button className="toolbar-btn hmi-btn-mid" type="button">
            WAFER
            <br />
            MAP
          </button>
          <button className="toolbar-btn hmi-btn-mid" type="button">
            CALIBRATE
          </button>
        </div>
        <div className="toolbar-meta">
          <span>{clock}</span>
          <span>|</span>
          <span>RECIPE: CF4_SiO2_HDP_v3</span>
          <span>|</span>
          <span>LOT: N22AETX0421</span>
        </div>
      </div>

      <main className="hmi-main">
        <section className="left-panel">
          <div className="panel-title">PROCESS DIAGRAM — NEXUS-E320</div>
          <div className="process-diagram process-diagram-hmi">
            <div className="chamber-box hmi" style={{ left: 158, top: 122, width: 200, height: 142 }}>
              PROCESS
              <br />
              CHAMBER
              <br />
              <span className={`chamber-status ${processRunning ? 'run' : 'idle'}`}>{processRunning ? 'RUNNING' : alarmActive ? 'ABORTED' : 'STANDBY'}</span>
            </div>
            <div className="pump-box hmi" style={{ left: 42, top: 430, width: 118, height: 60 }}>
              TMP-1
              <br />
              PUMP
            </div>
            <div className="pump-box hmi" style={{ left: 362, top: 430, width: 118, height: 60 }}>
              DRY
              <br />
              PUMP
            </div>
            <div className="valve-box open hmi" style={{ left: 188, top: 292, width: 72, height: 48 }}>
              V1
              <br />
              OPEN
            </div>
            <div className="valve-box closed hmi" style={{ left: 280, top: 292, width: 72, height: 48 }}>
              V2
              <br />
              CLSD
            </div>
            <div className="valve-box open hmi" style={{ left: 72, top: 386, width: 60, height: 48 }}>
              V3
              <br />
              OPEN
            </div>
            <div className="valve-box open hmi" style={{ left: 398, top: 386, width: 60, height: 48 }}>
              V4
              <br />
              OPEN
            </div>
            <div className="valve-box hmi mfc cf4" style={{ left: 60, top: 46, width: 72, height: 48 }}>
              CF4
              <br />
              MFC
            </div>
            <div className="valve-box hmi mfc o2" style={{ left: 158, top: 46, width: 72, height: 48 }}>
              O2
              <br />
              MFC
            </div>
            <div className="valve-box hmi mfc ar" style={{ left: 256, top: 46, width: 72, height: 48 }}>
              Ar
              <br />
              MFC
            </div>
            <div className="valve-box hmi mfc n2" style={{ left: 354, top: 46, width: 72, height: 48 }}>
              N2
              <br />
              MFC
            </div>
            <div className="pipe v" style={{ left: 95, top: 94, height: 34, background: '#00a0ff' }} />
            <div className="pipe v" style={{ left: 193, top: 94, height: 34, background: '#00cc00' }} />
            <div className="pipe v" style={{ left: 291, top: 94, height: 34, background: '#cc44cc' }} />
            <div className="pipe v" style={{ left: 389, top: 94, height: 34, background: '#cccc00' }} />
            <div className="pipe h" style={{ left: 95, top: 126, width: 294, background: '#00ffff' }} />
            <div className="pipe v" style={{ left: 254, top: 126, height: 164, background: '#00ffff' }} />
            <div className="pipe v" style={{ left: 152, top: 290, height: 138, background: '#ff00ff' }} />
            <div className="pipe v" style={{ left: 424, top: 290, height: 138, background: '#ff00ff' }} />
            <div className="pipe h" style={{ left: 92, top: 414, width: 162, background: '#ff00ff' }} />
            <div className="pipe h" style={{ left: 254, top: 414, width: 170, background: '#ff00ff' }} />
            <div className="pipe v" style={{ left: 254, top: 264, height: 56, background: '#00ffff' }} />
            <div className="sensor-dot hmi press" style={{ left: 144, top: 188 }} />
            <div className="sensor-dot hmi temp" style={{ left: 364, top: 188 }} />

            <div className="diagram-labels hmi">
              CHAMBER PRESS: <span>{processRunning ? '2.4e-3 Torr' : '2.5e-3 Torr'}</span>
              <br />
              FORELINE: <span>3.8 Torr</span>
              <br />
              RF PWR: <span className="rf">450 W</span>
              <br />
              ESC TEMP: <span className="esc">20.1 °C</span>
            </div>
          </div>
        </section>

        <section className="center-panel">
          <div className="tab-strip">
            {tabs.map((tab) => (
              <button className={`tab ${tab === activeTab ? 'active' : ''}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
                {tab}
              </button>
            ))}
          </div>

          <div className="center-content">
            {activeTab === 'PROCESS PARAMETERS' ? (
              <div className="params-area">
                <div className="process-summary-row">
                  <span className="summary-process">PROCESS STEP: 3 / 7</span>
                  <span className="summary-recipe">CF4 MAIN ETCH</span>
                  <span className={`summary-state ${processRunning ? 'running' : alarmActive ? 'alarm' : 'idle'}`}>
                    ■ {processRunning ? 'RUNNING' : alarmActive ? 'ABORTED' : 'IDLE'}
                  </span>
                  <span className="summary-time">Time: {stepTime} / 00:05:00</span>
                </div>

                <table className="params-table hmi-table">
                  <thead>
                    <tr>
                      <th>PARAMETER</th>
                      <th>SETPOINT (SP)</th>
                      <th>PROCESS VALUE (PV)</th>
                      <th>UNIT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row) => (
                      <tr key={row.parameter}>
                        <td>{row.parameter}</td>
                        <td className="val-sp">{row.editable ? <input className="input-cell" defaultValue={row.setpoint} /> : row.setpoint}</td>
                        <td className={statusClass(row.status)}>{row.pv}</td>
                        <td>{row.unit}</td>
                        <td className={statusClass(row.status)}>{row.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="params-footnote">* SP = Setpoint | PV = Process Value | All values nominal unless flagged</div>
              </div>
            ) : null}

            {activeTab === 'RECIPE EDITOR' ? (
              <div className="tab-content-dual">
                <div className="hmi-subpanel">
                  <div className="subpanel-title">RECIPE STEPS</div>
                  <table className="params-table hmi-table">
                    <thead>
                      <tr>
                        <th>STEP</th>
                        <th>NAME</th>
                        <th>DURATION</th>
                        <th>GAS</th>
                        <th>RF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeSteps.map((step) => (
                        <tr key={step.step}>
                          <td>{step.step}</td>
                          <td>{step.name}</td>
                          <td>{step.duration}</td>
                          <td>{step.gas}</td>
                          <td>{step.rf}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hmi-subpanel">
                  <div className="subpanel-title">STEP NOTES</div>
                  <div className="recipe-list hmi-list">
                    {recipeSteps.map((step) => (
                      <div className="recipe-item hmi-list-item" key={`${step.step}-${step.note}`}>
                        <div className="recipe-item-head">
                          <strong>{step.step}</strong>
                          <span>{step.name}</span>
                        </div>
                        <div className="recipe-item-note">{step.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'ALARM HISTORY' ? (
              <div className="tab-content-dual">
                <div className="hmi-subpanel">
                  <div className="subpanel-title">ALARM TIMELINE</div>
                  <table className="params-table hmi-table">
                    <thead>
                      <tr>
                        <th>TIME</th>
                        <th>CODE</th>
                        <th>LEVEL</th>
                        <th>MODULE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alarmHistory.map((item) => (
                        <tr key={`${item.time}-${item.code}`}>
                          <td>{item.time}</td>
                          <td>{item.code}</td>
                          <td>{item.level}</td>
                          <td>{item.module}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hmi-subpanel">
                  <div className="subpanel-title">MAINTENANCE QUEUE</div>
                  <div className="recipe-list hmi-list">
                    {maintenanceItems.map((item) => (
                      <div className="recipe-item hmi-list-item" key={item.item}>
                        <div className="recipe-item-head">
                          <strong>{item.item}</strong>
                          <span>{item.status}</span>
                        </div>
                        <div className="recipe-item-note">责任人：{item.owner} | 周期：{item.cycle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'TRENDING' ? (
              <div className="tab-content-dual">
                <div className="trend-grid hmi-trend-grid">
                  {trendCards.map((item) => (
                    <div className="trend-card hmi-trend-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em className={`trend-${item.tone}`}>{item.delta}</em>
                    </div>
                  ))}
                </div>
                <div className="hmi-subpanel">
                  <div className="subpanel-title">TREND EVENTS</div>
                  <div className="trend-timeline hmi-timeline">
                    <div className="trend-line">
                      <span>08:30</span>
                      <div />
                      <strong>预检查完成，参数稳定</strong>
                    </div>
                    <div className="trend-line">
                      <span>08:31</span>
                      <div />
                      <strong>主刻蚀启动，RF 进入目标区间</strong>
                    </div>
                    <div className="trend-line">
                      <span>08:33</span>
                      <div />
                      <strong>TMP 速度波动，系统进入预警状态</strong>
                    </div>
                    <div className="trend-line">
                      <span>08:34</span>
                      <div />
                      <strong>出现 E-2015 告警，Agent 推荐接管</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'WAFER INFO' ? (
              <div className="tab-content-dual">
                <div className="hmi-subpanel">
                  <div className="subpanel-title">WAFER CONTEXT</div>
                  <div className="wafer-detail-grid hmi-wafer-grid">
                    {waferInfo.map((item) => (
                      <div className="wafer-detail-item hmi-wafer-item" key={item}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hmi-subpanel">
                  <div className="subpanel-title">TRANSFER FLOW</div>
                  <div className="recipe-list hmi-list">
                    <div className="recipe-item hmi-list-item">
                      <div className="recipe-item-head">
                        <strong>晶圆上片</strong>
                        <span>完成</span>
                      </div>
                      <div className="recipe-item-note">Transfer Robot 已完成 Slot 03 上片</div>
                    </div>
                    <div className="recipe-item hmi-list-item">
                      <div className="recipe-item-head">
                        <strong>ESC 吸附</strong>
                        <span>完成</span>
                      </div>
                      <div className="recipe-item-note">He 背压 7.9 Torr，夹持正常</div>
                    </div>
                    <div className="recipe-item hmi-list-item">
                      <div className="recipe-item-head">
                        <strong>工艺执行</strong>
                        <span>{processStateText}</span>
                      </div>
                      <div className="recipe-item-note">支持异常恢复断点续跑</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="log-area hmi-log-area" ref={logsRef}>
            {logs.map((log, index) => (
              <div className={`log-entry log-${log.level}`} key={`${log.text}-${index}`}>
                {log.text}
              </div>
            ))}
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel-title">SYSTEM STATUS</div>

          <div className="status-section">
            <div className="status-label">EQUIPMENT STATE</div>
            <div className="equipment-state-list">
              {displayedEquipment.map((item) => (
                <div className="led-row" key={item.label}>
                  <div className={`led ${item.tone}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="status-section">
            <div className="status-label">ACTIVE ALARMS</div>
            <div className={`alarm-list ${alarmList.length ? 'err' : 'ok'}`}>{alarmList.length ? activeAlarmText : '✓ NO ACTIVE ALARMS'}</div>
          </div>

          <div className="status-section">
            <div className="status-label">PROCESS CONTROL</div>
            <button className="action-btn success" onClick={runProcess} type="button">
              ▶ RUN PROCESS
            </button>
            <button className="action-btn" type="button">
              ⏸ HOLD STEP
            </button>
            <button className="action-btn" type="button">
              ⏭ SKIP STEP
            </button>
            <button className="action-btn danger" onClick={triggerAlarm} type="button">
              ■ ABORT
            </button>
            <button className="action-btn primary" onClick={() => void sendQuickPrompt('分析当前设备状态')} type="button">
              ⚙ TUNE RF
            </button>
            <button className="action-btn" onClick={() => void sendQuickPrompt('生成恢复步骤')} type="button">
              🔧 MAINT MODE
            </button>
          </div>

          <div className="status-section wafer-section">
            <div className="status-label">WAFER INFO</div>
            <div className="wafer-info hmi-wafer-info">
              {waferInfo.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="status-bar">
        <div className="status-cell">PROCESS: {processRunning ? 'RUNNING' : alarmActive ? 'ABORTED' : 'IDLE'}</div>
        <div className={`status-cell ${alarmActive ? 'alarm' : ''}`}>ALARM: {alarmList.length ? 'E-2015 CRITICAL' : 'NONE'}</div>
        <div className="status-cell">OPERATOR: LIN_JH</div>
        <div className="status-cell">MODE: AUTO</div>
        <div className="status-cell status-fill">NEXUS-E320 SN:E320-2204-007 | HMI v4.2.1 | PLC: ONLINE</div>
      </footer>

      <button className={`agent-fab ${alarmActive ? 'alarm-flash' : ''}`} onClick={toggleAgentPanel} title="NEXUS AI Agent" type="button">
        <span className="agent-fab-icon">AI</span>
      </button>

      <section className={`floating-agent ${panelOpen ? 'show' : ''}`}>
        <div className="card-heading agent-heading floating-agent-heading">
          <div>
            <div className="heading-kicker">Agent Collaboration</div>
            <h3>NEXUS AI Agent</h3>
          </div>
          <div className="agent-heading-actions">
            <span className="status-pill small">{agentRunning ? 'EXECUTING' : 'READY'}</span>
            <button className="close-btn" onClick={toggleAgentPanel} type="button">
              {panelOpen ? '−' : '+'}
            </button>
          </div>
        </div>
        {agentRunning ? <div className="running-line" /> : null}

        <div className="agent-quickbar industrial-quickbar">
          {quickPrompts.map((item) => (
            <button className="quick-chip industrial-chip" key={item} onClick={() => void sendQuickPrompt(item)} type="button">
              {item}
            </button>
          ))}
        </div>

        <div className="agent-summary-card industrial-summary-card">
          <div className="agent-summary-title">Agent 处置建议</div>
          <div className="agent-summary-text">
            {alarmActive
              ? '检测到 P1 异常，建议立即进入 TMP 恢复序列并保持人工监管。'
              : processRunning
                ? '设备处于在线执行阶段，Agent 将持续监控关键参数并给出提前预警。'
                : '当前系统处于待机，可预检查配方、设备健康度与上批次记录。'}
          </div>
        </div>

        <div className="messages industrial-messages" ref={messagesRef}>
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} onConfirm={executeAgentSteps} />
          ))}
        </div>

        <div className="input-area industrial-input-area">
          <input
            className="chat-input"
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void sendUserMsg();
              }
            }}
            placeholder="输入问题、调用 Agent 诊断或生成恢复建议…"
            value={chatInput}
          />
          <button className="send-btn" onClick={() => void sendUserMsg()} type="button">
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </section>

      <div className={`overlay ${alarmActive ? 'show' : ''}`} />

      <section className={`alarm-popup industrial-alarm ${alarmActive ? 'show' : ''}`}>
        <div className="alarm-title-bar">
          <span>CRITICAL EVENT / E-2015</span>
          <span style={{ fontSize: 10 }}>TMP SPEED OUT OF RANGE</span>
        </div>
        <div className="alarm-body">
          <div className="alarm-code-row">TMP-1 SPEED 21,340 RPM BELOW SAFE THRESHOLD</div>
          <div className="alarm-info">
            <b>Module:</b> TMP-1 (Osaka TG2200ML)
            <br />
            <b>Trigger:</b> Speed dropped below 25,000 RPM threshold during process
            <br />
            <b>Setpoint:</b> 30,000 RPM
            <br />
            <b>Process:</b> CF4_SiO2_HDP_v3 Step 3 — ABORTED at t=222s
          </div>
          <div className="alarm-btn-row">
            <button className="alarm-btn" onClick={closeAlarm} type="button">
              稍后处理
            </button>
            <button className="alarm-btn" onClick={() => void sendQuickPrompt('分析当前告警')} type="button">
              查看诊断
            </button>
            <button className="alarm-btn ai-assist" onClick={() => void startAgentAssist()} type="button">
              启动 Agent 接管
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageCard({
  message,
  onConfirm,
}: {
  message: Message;
  onConfirm: () => Promise<void>;
}) {
  if (message.type === 'system') {
    return <div className="msg-bubble system-bubble" dangerouslySetInnerHTML={{ __html: message.html }} />;
  }

  if (message.type === 'screenshot') {
    return (
      <div className="msg-row">
        <div className="msg-avatar agent">N</div>
        <div className="msg-content">
          <div className="msg-bubble screenshot-bubble">
            <img alt={message.label} src={message.image} />
            <div className="screenshot-label">{message.label} · {message.time}</div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'action' || message.type === 'think') {
    return (
      <div className="msg-row">
        <div className="msg-avatar agent">N</div>
        <div className="msg-content">
          <div className={`msg-bubble ${message.type === 'action' ? 'action-bubble' : 'think-bubble'}`}>{message.text}</div>
        </div>
      </div>
    );
  }

  const chatMessage = message as ChatMessage;
  const isUser = chatMessage.type === 'user';

  return (
    <div className={`msg-row ${isUser ? 'user' : ''}`}>
      <div className={`msg-avatar ${isUser ? 'user-av' : 'agent'}`}>{isUser ? '林' : 'N'}</div>
      <div className="msg-content">
        <div className="msg-meta">{isUser ? `${new Date().toTimeString().slice(0, 5)}  LIN_JH` : `NEXUS Agent  ${new Date().toTimeString().slice(0, 5)}`}</div>
        <div className={`msg-bubble ${isUser ? 'user-bubble' : 'agent-bubble'}`} dangerouslySetInnerHTML={{ __html: chatMessage.html ?? chatMessage.text ?? '' }} />
        {chatMessage.confirm ? (
          <button className="confirm-btn" onClick={() => void onConfirm()} type="button">
            确认执行 Agent 自动恢复
          </button>
        ) : null}
      </div>
    </div>
  );
}

function statusClass(status: ProcessRow['status']) {
  if (status === 'warn') return 'val-warn';
  if (status === 'err') return 'val-err';
  return 'val-ok';
}

function secToHMS(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default App;
