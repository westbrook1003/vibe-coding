#!/usr/bin/env node
/**
 * 发布一个 GitHub Release（脚本本身不含任何密钥）。
 *
 * 用法：
 *   set GH_TOKEN=ghp_xxxxxxxxxxxx        (Windows cmd，先设置环境变量)
 *   node docs/publish-release.js
 *
 * 可选环境变量：
 *   GH_TOKEN / GITHUB_TOKEN   必填，GitHub Personal Access Token（需 repo 权限）
 *   GH_REPO                   选填，默认为 westbrook1003/vibe-coding
 *   GH_TAG                    选填，默认为 v1
 *   GH_TITLE                  选填，默认为 "v1 · 物资出入库管理系统首个版本"
 *
 * Release 正文取自同目录的 RELEASE-v1.md。
 */
const fs = require('fs');
const path = require('path');

const REPO = process.env.GH_REPO || 'westbrook1003/vibe-coding';
const TAG = process.env.GH_TAG || 'v1';
const TITLE = process.env.GH_TITLE || 'v1 · 物资出入库管理系统首个版本';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

if (!TOKEN) {
  console.error('❌ 未找到 token。请先设置环境变量，例如：');
  console.error('   set GH_TOKEN=ghp_xxxxxxxxxxxx');
  process.exit(1);
}

const bodyFile = path.join(__dirname, 'RELEASE-v1.md');
if (!fs.existsSync(bodyFile)) {
  console.error(`❌ 找不到发布说明文件：${bodyFile}`);
  process.exit(1);
}
const body = fs.readFileSync(bodyFile, 'utf8');

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'material-system-release-script',
};

(async () => {
  console.log(`目标仓库: ${REPO}`);
  console.log(`目标标签: ${TAG}`);

  // 幂等：同标签已有 Release 就直接报出来，不重复创建
  const existing = await fetch(
    `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`,
    { headers },
  );
  if (existing.ok) {
    const r = await existing.json();
    console.log(`ℹ️ 已存在 Release：${r.html_url}`);
    console.log(`   draft=${r.draft}  prerelease=${r.prerelease}`);
    return;
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tag_name: TAG,
      target_commitish: 'main',
      name: TITLE,
      body,
      draft: false,
      prerelease: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ 创建失败 HTTP ${res.status}`);
    console.error('  ', JSON.stringify(data).slice(0, 400));
    process.exit(1);
  }
  console.log('✅ Release 创建成功');
  console.log(`   名称: ${data.name}`);
  console.log(`   类型: ${data.draft ? '草稿' : data.prerelease ? '预发布' : '正式发布'}`);
  console.log(`   地址: ${data.html_url}`);
})();
