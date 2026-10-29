#!/usr/bin/env node
/**
 * 一键启动器（Node 实现）。
 *
 * 作用：检测环境 → 拉起后端/前端两个服务窗口 → 打开浏览器 → 打印中文提示。
 *
 * 为什么不让 .bat 直接写中文？
 * cmd 读取 UTF-8 批处理文件时按系统 ANSI 代码页解析，中文会变成乱码并被当成
 * 命令执行。Node 原生按 UTF-8 处理，没有这个问题。详见 README 的「已知坑位」。
 */
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

function line(char = '=') {
  return char.repeat(48);
}

function ok(msg) {
  console.log(`  [OK]   ${msg}`);
}
function warn(msg) {
  console.log(`  [注意] ${msg}`);
}
function fail(msg) {
  console.log(`  [错误] ${msg}`);
}

/** 在新控制台窗口里跑一条命令 */
function openWindow(title, cwd, command) {
  const child = spawn('cmd.exe', ['/k', command], {
    cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();
  return child.pid;
}

function main() {
  console.log('');
  console.log(line());
  console.log('   物资出入库管理系统 · 一键启动');
  console.log(line());
  console.log('');

  // 1. Node 版本
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  if (major < 18) {
    fail(`Node.js 版本过低 (${nodeVersion})，需要 18 以上`);
    process.exit(1);
  }
  ok(`Node.js v${nodeVersion}`);

  // 2. 依赖
  const needInstall = [];
  if (!fs.existsSync(path.join(BACKEND, 'node_modules'))) needInstall.push('backend');
  if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) needInstall.push('frontend');
  if (needInstall.length) {
    warn(`首次运行，正在安装依赖: ${needInstall.join(', ')}（可能需要几分钟）`);
    for (const dir of needInstall) {
      console.log(`       npm --prefix ${dir} install ...`);
      execSync(`npm --prefix ${dir} install`, { cwd: ROOT, stdio: 'inherit' });
    }
    ok('依赖安装完成');
  } else {
    ok('前后端依赖已就绪');
  }

  // 3. .env
  const envFile = path.join(BACKEND, '.env');
  if (!fs.existsSync(envFile)) {
    fs.copyFileSync(path.join(BACKEND, '.env.example'), envFile);
    ok('已生成 backend/.env');
  } else {
    ok('backend/.env 已存在');
  }

  // 4. 数据库
  const envPath = path.join(BACKEND, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  const dbFile = path.resolve(
    path.dirname(envPath),
    env.DB_DATABASE || './data/material-system.sqlite',
  );
  if (!fs.existsSync(dbFile)) {
    warn('首次运行，正在初始化数据库并写入演示数据...');
    execSync('npm --prefix backend run seed', { cwd: ROOT, stdio: 'inherit' });
    ok('数据库初始化完成');
  } else {
    ok('数据库已就绪');
  }

  // 5. 拉起服务
  console.log('');
  console.log('  正在启动后端 (端口 3000) ...');
  openWindow('MaterialSystem-Backend', BACKEND, 'npm run start:dev');
  ok('后端窗口已打开');

  console.log('  等待后端就绪...');
  execSync(process.platform === 'win32' ? 'timeout /t 8 /nobreak >nul' : 'sleep 8', {
    stdio: 'ignore',
    shell: true,
  });

  console.log('  正在启动前端 (端口 5173) ...');
  openWindow('MaterialSystem-Frontend', FRONTEND, 'npm run dev');
  ok('前端窗口已打开');

  execSync(process.platform === 'win32' ? 'timeout /t 5 /nobreak >nul' : 'sleep 5', {
    stdio: 'ignore',
    shell: true,
  });

  // 6. 打开浏览器
  spawn('cmd.exe', ['/c', 'start', '', 'http://localhost:5173'], {
    detached: true,
    stdio: 'ignore',
  }).unref();

  console.log('');
  console.log(line());
  console.log('   启动完成，浏览器已打开');
  console.log('');
  console.log('   前端页面:  http://localhost:5173');
  console.log('   接口文档:  http://localhost:3000/api-docs');
  console.log('   登录账号:  admin  /  admin');
  console.log('');
  console.log('   提示：首次登录会要求修改密码，请按提示完成。');
  console.log('   关闭服务：在两个新打开的窗口里按 Ctrl+C，');
  console.log('           或运行本目录下的 停止.bat');
  console.log(line());
  console.log('');
}

main();
