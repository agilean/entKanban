export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
};

const MAX_ENTRIES = 300;
const entries: LogEntry[] = [];

function pushEntry(level: LogLevel, category: string, message: string, details?: Record<string, unknown>): void {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  const line = `[${entry.timestamp}] ${level.toUpperCase()} ${category}: ${message}`;
  if (details) {
    console.log(line, details);
  } else {
    console.log(line);
  }
}

export function logInfo(category: string, message: string, details?: Record<string, unknown>): void {
  pushEntry('info', category, message, details);
}

export function logWarn(category: string, message: string, details?: Record<string, unknown>): void {
  pushEntry('warn', category, message, details);
}

export function logError(category: string, message: string, details?: Record<string, unknown>): void {
  pushEntry('error', category, message, details);
}

export function listLogs(limit = 100, level?: LogLevel): LogEntry[] {
  const filtered = level ? entries.filter((entry) => entry.level === level) : entries;
  return filtered.slice(-limit).reverse();
}

export function clearLogs(): void {
  entries.length = 0;
}
