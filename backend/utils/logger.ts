import fs from 'fs';
import path from 'path';

// Assurez-vous que le dossier logs/ existe
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

function formatMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  // Ne pas ajouter de {meta} si meta est vide
  if (meta === undefined || meta === null) {
      return `[${timestamp}] [${level}] ${message}\n`;
  }
  
  const metaString = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
  return `[${timestamp}] [${level}] ${message} ${metaString}\n`;
}

function writeLog(level: string, message: string, meta?: any) {
  const formattedMessage = formatMessage(level, message, meta);
  
  // Écriture console
  if (level === 'ERROR') {
    console.error(formattedMessage.trim());
  } else if (level === 'WARN') {
    console.warn(formattedMessage.trim());
  } else {
    console.log(formattedMessage.trim());
  }
  
  // Écriture fichier (fs natif)
  fs.appendFile(logFile, formattedMessage, (err) => {
    if (err) console.error(`Failed to write to log file: ${err.message}`);
  });
}

export const logger = {
  info: (message: string, meta?: any) => writeLog('INFO', message, meta),
  warn: (message: string, meta?: any) => writeLog('WARN', message, meta),
  error: (message: string, meta?: any) => writeLog('ERROR', message, meta)
};

export default logger;
