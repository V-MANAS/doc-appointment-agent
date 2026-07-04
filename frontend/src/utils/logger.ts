export const logger = {
  info: (message: string, ...optionalParams: any[]) => {
    console.log(`%c[INFO] ${message}`, 'color: #3b82f6; font-weight: bold;', ...optionalParams);
  },
  warn: (message: string, ...optionalParams: any[]) => {
    console.warn(`%c[WARN] ${message}`, 'color: #f59e0b; font-weight: bold;', ...optionalParams);
  },
  error: (message: string, ...optionalParams: any[]) => {
    console.error(`%c[ERROR] ${message}`, 'color: #ef4444; font-weight: bold;', ...optionalParams);
  },
  debug: (message: string, ...optionalParams: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`%c[DEBUG] ${message}`, 'color: #10b981;', ...optionalParams);
    }
  }
};

export default logger;
