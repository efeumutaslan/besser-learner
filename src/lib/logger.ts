// Basit API request logger
// Uretimde: her istegi method, path, sure ve status ile loglar
// Yavas sorgu uyarisi: 500ms ustu istekler WARN olarak loglanir

const SLOW_THRESHOLD = 500; // ms

export function apiLog(
  method: string,
  path: string,
  status: number,
  startTime: number
) {
  const duration = Date.now() - startTime;
  const level = duration > SLOW_THRESHOLD ? "WARN" : "INFO";
  const slow = duration > SLOW_THRESHOLD ? " [SLOW]" : "";

  console.log(
    `[${level}] ${method} ${path} ${status} ${duration}ms${slow}`
  );
}

export function startTimer(): number {
  return Date.now();
}
