import type { EquipmentStateItem, LogItem, Message, ProcessRow } from '../types';

export const menuItems = ['File', 'Process', 'Diagnostics', 'Maintenance', 'Data', 'Alarm', 'Help'];

export const tabs = ['PROCESS PARAMETERS', 'RECIPE EDITOR', 'ALARM HISTORY', 'TRENDING', 'WAFER INFO'];

export const processRows: ProcessRow[] = [
  { parameter: 'RF Power (13.56 MHz)', setpoint: '450', pv: '449.2', unit: 'W', status: 'stable', label: '● STABLE', editable: true },
  { parameter: 'Bias Power (380 kHz)', setpoint: '120', pv: '121.0', unit: 'W', status: 'stable', label: '● STABLE', editable: true },
  { parameter: 'Chamber Pressure', setpoint: '2.50E-3', pv: '2.50E-3', unit: 'Torr', status: 'stable', label: '● OK', editable: true },
  { parameter: 'CF4 Gas Flow', setpoint: '80.0', pv: '80.1', unit: 'sccm', status: 'stable', label: '● OK', editable: true },
  { parameter: 'O2 Gas Flow', setpoint: '8.0', pv: '8.0', unit: 'sccm', status: 'stable', label: '● OK', editable: true },
  { parameter: 'Ar Gas Flow', setpoint: '20.0', pv: '20.2', unit: 'sccm', status: 'stable', label: '● OK', editable: true },
  { parameter: 'ESC Temperature', setpoint: '20.0', pv: '20.1', unit: '°C', status: 'stable', label: '● OK', editable: true },
  { parameter: 'He Backside Pressure', setpoint: '8.0', pv: '7.9', unit: 'Torr', status: 'stable', label: '● OK', editable: true },
  { parameter: 'Throttle Valve Position', setpoint: '72.0', pv: '71.8', unit: '%', status: 'stable', label: '● OK', editable: true },
  { parameter: 'TMP-1 Speed', setpoint: '30000', pv: '30,120', unit: 'RPM', status: 'stable', label: '● OK', editable: true, key: 'tmpSpeed' },
  { parameter: 'RF Reflect Power', setpoint: '<10', pv: '3.2', unit: 'W', status: 'stable', label: '● OK', editable: true },
  { parameter: 'DC Bias Voltage', setpoint: '--', pv: '-186', unit: 'V', status: 'stable', label: '● OK', editable: true },
];

export const initialLogs: LogItem[] = [
  { level: 'info', text: '[08:30:00] SYSTEM READY — NEXUS-E320 SN:E320-2204-007' },
  { level: 'info', text: '[08:30:12] RECIPE CF4_SiO2_HDP_v3 loaded, 7 steps' },
  { level: 'info', text: '[08:30:18] Wafer transfer complete — slot 03, LOT N22AETX0421' },
  { level: 'info', text: '[08:30:25] ESC clamped, He backside ON — 7.9 Torr' },
  { level: 'info', text: '[08:30:30] All pre-checks PASS — ready to run' },
];

export const equipmentState: EquipmentStateItem[] = [
  { label: 'MAIN POWER', tone: 'green' },
  { label: 'SAFETY INTERLOCK', tone: 'green' },
  { label: 'CHAMBER SEALED', tone: 'green' },
  { label: 'PLASMA READY', tone: 'green', key: 'plasma' },
  { label: 'TMP-1 NOMINAL', tone: 'green', key: 'tmp' },
  { label: 'GAS PURGE', tone: 'off' },
  { label: 'ESC ACTIVE', tone: 'green' },
];

export const waferInfo = [
  'SLOT: 03 / 25',
  'LOT ID: N22AETX0421',
  'DEVICE: SiO2_HDP',
  'NODE: 28nm',
  'TARGET: 1200Å',
  'STEP: 3/7',
  'WAFER SN: W-0421-C03',
];

export const recipeSteps = [
  { step: 'Step 1', name: 'PUMP DOWN', duration: '00:00:45', gas: 'N/A', rf: '0 W', note: '抽真空至目标腔压' },
  { step: 'Step 2', name: 'GAS STABILIZE', duration: '00:00:30', gas: 'CF4 / O2 / Ar', rf: '0 W', note: '稳定气体流量与压力' },
  { step: 'Step 3', name: 'CF4 MAIN ETCH', duration: '00:05:00', gas: 'CF4 80 / O2 8 / Ar 20', rf: '450 W', note: '主刻蚀步骤' },
  { step: 'Step 4', name: 'O2 CLEAN', duration: '00:00:30', gas: 'O2 50', rf: '200 W', note: '腔体清洗' },
  { step: 'Step 5', name: 'N2 PURGE', duration: '00:00:20', gas: 'N2 60', rf: '0 W', note: '氮气吹扫' },
  { step: 'Step 6', name: 'VENT', duration: '00:00:15', gas: 'N/A', rf: '0 W', note: '释放腔体压力' },
  { step: 'Step 7', name: 'UNLOAD', duration: '00:00:20', gas: 'N/A', rf: '0 W', note: '晶圆下片' },
];

export const alarmHistory = [
  { time: '08:34:12', code: 'E-2015', level: 'Critical', module: 'TMP-1', status: 'Active' },
  { time: '07:48:33', code: 'W-1042', level: 'Warning', module: 'Gas Box', status: 'Cleared' },
  { time: '06:51:20', code: 'I-0007', level: 'Info', module: 'Recipe', status: 'Closed' },
  { time: '昨天 22:14:05', code: 'E-1003', level: 'Critical', module: 'RF Match', status: 'Closed' },
];

export const trendCards = [
  { label: 'Etch Rate', value: '1840 Å/min', delta: '+1.8%', tone: 'good' },
  { label: 'Uniformity', value: '97.6%', delta: '+0.4%', tone: 'good' },
  { label: 'Reflect Power', value: '3.2 W', delta: '-0.9W', tone: 'stable' },
  { label: 'Pressure Drift', value: '0.09 mTorr', delta: '+0.02', tone: 'warn' },
];

export const maintenanceItems = [
  { item: 'TMP 轴承检查', owner: '设备工程', cycle: '每周', status: '待执行' },
  { item: 'RF Match 校验', owner: '工艺工程', cycle: '每周', status: '进行中' },
  { item: 'MFC 零点校准', owner: '设备工程', cycle: '每月', status: '已完成' },
  { item: 'ESC 表面清洁', owner: '制造支持', cycle: '每班', status: '已完成' },
];

export const knowledgeBase: Record<string, string> = {
  rf: '**RF电源调谐**：当反射功率 >10W 时，进入 Process Control → Tune RF，点击 Auto-Tune 等待约 15 秒。手动调谐：调整 C1 Capacitor 使反射功率最小化。',
  pressure: '**腔室压力控制**：通过节气阀调节。压力偏低 → 节气阀开度减小；偏高 → 节气阀开度增大。自动模式下 PLC 自动调节，响应时间约 2-5 秒。',
  tmp: '**TMP（涡轮分子泵）故障处理**：E-2015 为 TMP 转速超范围，参考 §4.3。重启步骤：STOP → 冷却60s → RESTART → 等待恢复 >29,000 RPM。',
  esc: '**ESC（静电吸盘）操作**：夹持前确认 He 背压 7-9 Torr。释放流程：RF OFF → 等待 10s → ESC Unclamp → He OFF → 晶圆传出。',
  gas: '**气体流量调节**：MFC 流量通过 Process Parameters 表格中 SP 列输入修改，建议每次调整幅度不超过 ±10%。',
  recipe: '**配方管理**：Recipe Editor 标签页可编辑步骤参数。修改前需先 Lock Recipe 解锁，修改后 Save As 新版本。生产配方需工程师级别权限。',
  帮助: '我可以帮助您处理 NEXUS-E320 相关问题：设备报警处理、工艺参数调整、配方操作、预防性维护等。请描述您遇到的具体问题。',
};

export const initialMessages: Message[] = [
  {
    id: 'boot',
    type: 'system',
    html: '🤖 NEXUS AI Agent 已就绪<br><span class="inline-subtle">知识库已加载 · NEXUS-E320 操作手册 v2.1</span>',
  },
];
