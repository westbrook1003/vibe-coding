#!/usr/bin/env node
/**
 * 停止服务：结束占用 3000 / 5173 / 5174 / 4173 端口的进程。
 *
 * Node 实现的原因同 launcher.js —— cmd 无法可靠地解析含中文的 UTF-8 批处理文件。
 */
const { execSync } = require('child_process');

const PORTS = [3000, 5173, 5174, 4173];

function listPids(port) {
  const pids = new Set();
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    for (const row of out.split('\n')) {
      if (!row.includes(`:${port} `)) continue;
      if (!/LISTENING/i.test(row)) continue;
      const parts = row.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
  } catch {
    /* netstat 不可用时静默跳过 */
  }
  return [...pids];
}

function main() {
  console.log('');
  console.log('  正在关闭物资系统相关进程...');
  console.log('');

  let killed = 0;
  for (const port of PORTS) {
    for (const pid of listPids(port)) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`  已结束  端口 ${port}  PID=${pid}`);
        killed += 1;
      } catch {
        console.log(`  跳过    端口 ${port}  PID=${pid}（已退出或无权限）`);
      }
    }
  }

  console.log('');
  console.log(killed > 0 ? `  已关闭 ${killed} 个进程。` : '  没有需要关闭的进程。');
  console.log('');
}

main();
