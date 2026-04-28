export type LogLevel = 'info' | 'warn' | 'err';

export interface ProcessRow {
  parameter: string;
  setpoint: string;
  pv: string;
  unit: string;
  status: 'stable' | 'warn' | 'err';
  label: string;
  editable: boolean;
  key?: 'tmpSpeed';
}

export interface LogItem {
  level: LogLevel;
  text: string;
}

export interface EquipmentStateItem {
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'blue' | 'off';
  key?: 'plasma' | 'tmp';
}

export interface MessageBase {
  id: string;
  type: 'system' | 'agent' | 'user' | 'action' | 'think' | 'screenshot';
}

export interface SystemMessage extends MessageBase {
  type: 'system';
  html: string;
}

export interface ChatMessage extends MessageBase {
  type: 'agent' | 'user';
  text?: string;
  html?: string;
  author?: string;
  confirm?: boolean;
}

export interface ActionMessage extends MessageBase {
  type: 'action' | 'think';
  text: string;
}

export interface ScreenshotMessage extends MessageBase {
  type: 'screenshot';
  image: string;
  label: string;
  time: string;
}

export type Message = SystemMessage | ChatMessage | ActionMessage | ScreenshotMessage;

export type MessageInput = Omit<SystemMessage, 'id'> | Omit<ChatMessage, 'id'> | Omit<ActionMessage, 'id'> | Omit<ScreenshotMessage, 'id'>;
