/* ==========================================================================
   物资系统 · UI 原型交互脚本
   说明：全部为前端演示逻辑，无后端。拼音码由内置字表近似生成（真实实现用 pinyin4j / pinyin-pro）。
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 演示数据 ---------- */
  window.ITEMS = [
    { py: 'wsm', name: '无线鼠标', unit: '个', price: 29.9,  platform: '淘宝',   stock: 3, cat: '数码配件' },
    { py: 'wsm,sb', name: '无线鼠标 Pro', unit: '个', price: 89.0, platform: '京东', stock: 1, cat: '数码配件' },
    { py: 'sjx', name: '数据线', unit: '条', price: 12.9,  platform: '拼多多', stock: 12, cat: '数码配件' },
    { py: 'sjp', name: '手机支架', unit: '个', price: 18.5,  platform: '1688',   stock: 6, cat: '数码配件' },
    { py: 'a4z', name: 'A4 纸', unit: '包', price: 23.0,  platform: '京东',   stock: 0, cat: '办公用品' },
    { py: 'zm',  name: '签字笔', unit: '支', price: 3.5,   platform: '淘宝',   stock: 26, cat: '办公用品' },
    { py: 'jd',  name: '订书机', unit: '个', price: 15.0,  platform: '线下',   stock: 2, cat: '办公用品' },
    { py: 'yj',  name: '文件夹', unit: '个', price: 4.5,   platform: '淘宝',   stock: 18, cat: '办公用品' },
    { py: 'wsc', name: '洗手液', unit: '瓶', price: 19.9,  platform: '天猫',   stock: 4, cat: '家居耗材' },
    { py: 'cs',  name: '抽纸', unit: '提', price: 32.0,  platform: '天猫',   stock: 7, cat: '家居耗材' },
    { py: 'db',  name: '拖把', unit: '把', price: 26.5,  platform: '拼多多', stock: 2, cat: '家居耗材' },
    { py: 'lb',  name: '垃圾袋', unit: '卷', price: 9.9,   platform: '拼多多', stock: 15, cat: '家居耗材' },
    { py: 'ch',  name: '插线板', unit: '个', price: 45.0,  platform: '京东',   stock: 3, cat: '数码配件' },
    { py: 'ec',  name: '耳机', unit: '副', price: 199.0, platform: '京东',   stock: 1, cat: '数码配件' },
    { py: 'wjx', name: '文件夹架', unit: '个', price: 35.0, platform: '1688',  stock: 0, cat: '办公用品' }
  ];

  window.RECEIVERS = [
    { name: '张三',       remark: '技术部' },
    { name: '李四',       remark: '行政部' },
    { name: '王五',       remark: '项目A施工组' },
    { name: '项目A施工组', remark: '' },
    { name: '办公室',     remark: '公共领用' }
  ];

  /* ---------- 演示用拼音首字母字表（近似） ---------- */
  var PY = {
    '无': 'w', '线': 'x', '鼠': 's', '标': 'b', '手': 's', '机': 'j', '支': 'z', '架': 'j',
    '数': 's', '据': 'j', '线': 'x', '纸': 'z', '签': 'q', '名': 'm', '笔': 'b', '订': 'd',
    '书': 's', '机': 'j', '文': 'w', '件': 'j', '夹': 'j', '洗': 'x', '手': 's', '液': 'y',
    '抽': 'c', '提': 't', '拖': 't', '把': 'b', '垃': 'l', '圾': 'j', '袋': 'd', '插': 'c',
    '线': 'x', '板': 'b', '耳': 'e', '机': 'j', '办': 'b', '公': 'g', '用': 'y', '品': 'p',
    '家': 'j', '居': 'j', '耗': 'h', '材': 'c', '数': 's', '码': 'm', '电': 'd', '子': 'z',
    '餐': 'c', '纸': 'z', '卷': 'j', '本': 'b', '物': 'w', '资': 'z', '用': 'y', '个': 'g',
    '条': 't', '支': 'z', '包': 'b', '瓶': 'p', '把': 'b', '副': 'f', '提': 't', '台': 't',
    '维': 'w', '修': 'x', '工': 'g', '具': 'j', '劳': 'l', '保': 'b', '安': 'a', '全': 'q',
    '反': 'f', '光': 'g', '射': 's', '灯': 'd', '照': 'z', '明': 'm', '插': 'c', '座': 'z'
  };

  window.toPinyin = function (name) {
    var out = '';
    for (var i = 0; i < name.length; i++) {
      var c = name.charAt(i);
      if (/[a-zA-Z0-9]/.test(c)) { out += c.toLowerCase(); }
      else if (PY[c]) { out += PY[c]; }
    }
    return out;
  };

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  window.$ = $; window.$$ = $$;

  /* ---------- Toast ---------- */
  window.toast = function (msg, type) {
    var wrap = $('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (type === 'err' ? ' err' : '');
    t.innerHTML = '<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      (type === 'err'
        ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'
        : '<path d="M20 6 9 17l-5-5"/>') +
      '</svg><span></span>';
    $('span', t).textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  };

  /* ---------- 模态开关 ---------- */
  window.openModal = function (id) { var m = document.getElementById(id); if (m) m.classList.add('open'); };
  window.closeModal = function (id) { var m = document.getElementById(id); if (m) m.classList.remove('open'); };
  document.addEventListener('click', function (e) {
    var o = e.target.closest('.overlay');
    if (o && e.target === o) o.classList.remove('open');
    var x = e.target.closest('[data-close]');
    if (x) { var id = x.getAttribute('data-close'); var m = document.getElementById(id); if (m) m.classList.remove('open'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.overlay.open').forEach(function (m) { m.classList.remove('open'); });
  });

  /* ---------- 拼音码联想 ---------- */
  function matchItems(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    return window.ITEMS.filter(function (it) {
      if (it.name.toLowerCase().indexOf(q) >= 0) return true;
      return it.py.split(',').some(function (c) { return c.trim().indexOf(q) === 0; });
    });
  }

  window.initSuggest = function (inputSel, listSel, onPick, filterFn) {
    var input = $(inputSel), list = $(listSel);
    if (!input || !list) return;
    var hl = -1;

    function items() {
      var list0 = matchItems(input.value);
      return filterFn ? list0.filter(filterFn) : list0;
    }

    function render() {
      var found = items();
      if (!found.length) {
        list.innerHTML = '<div class="snone">未找到匹配的物资 &nbsp;<a href="#" data-newitem="' +
          input.value.replace(/"/g, '') + '">新建「' + input.value.replace(/[<>&]/g, '') + '」</a></div>';
        list.classList.add('open');
        return;
      }
      list.innerHTML = found.map(function (it, i) {
        return '<div class="sitem" data-i="' + i + '">' +
          '<span class="mono" style="color:var(--ink-3);font-size:12px;min-width:52px">' + it.py.split(',')[0] + '</span>' +
          '<span class="sname">' + it.name + '</span>' +
          '<span class="sc">/ ' + it.unit + ' · ¥' + it.price.toFixed(2) + ' · ' + it.platform + '</span>' +
          '<span class="sp">结存 ' + it.stock + '</span></div>';
      }).join('');
      list.classList.add('open');
      hl = -1;
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', function () { if (input.value) render(); });

    input.addEventListener('keydown', function (e) {
      var rows = $$('.sitem', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!rows.length) return;
        hl = e.key === 'ArrowDown'
          ? (hl + 1) % rows.length
          : (hl - 1 + rows.length) % rows.length;
        rows.forEach(function (r, i) { r.classList.toggle('hl', i === hl); });
        rows[hl].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var found = items();
        if (hl >= 0 && rows[hl]) { pick(found[hl]); }
        else if (found.length === 1) { pick(found[0]); }
      } else if (e.key === 'Escape') {
        list.classList.remove('open');
      }
    });

    function pick(it) {
      input.value = it.py.split(',')[0];
      list.classList.remove('open');
      if (onPick) onPick(it);
    }

    list.addEventListener('mousedown', function (e) {
      var row = e.target.closest('.sitem');
      if (row) {
        e.preventDefault();
        var found = items();
        pick(found[+row.getAttribute('data-i')]);
        return;
      }
      var nw = e.target.closest('[data-newitem]');
      if (nw) {
        e.preventDefault();
        var nm = nw.getAttribute('data-newitem');
        input.value = '';
        list.classList.remove('open');
        if (onPick) onPick({ newItem: true, name: nm });
      }
    });
  };

  /* ---------- 表格文本过滤 ---------- */
  window.initFilter = function (inputSel, tableSel) {
    var input = $(inputSel), table = $(tableSel);
    if (!input || !table) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      $$('tbody tr', table).forEach(function (tr) {
        var hit = !q || tr.textContent.toLowerCase().indexOf(q) >= 0;
        tr.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      var empty = table.parentNode.querySelector('[data-filter-empty]');
      if (empty) empty.style.display = shown ? 'none' : '';
    });
  };

  /* ---------- Tab 切换 ---------- */
  window.initTabs = function (tabSel, panelSel) {
    var tabs = $$(tabSel);
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        $$('[data-panel]', $(panelSel)).forEach(function (p) {
          p.style.display = p.getAttribute('data-panel') === t.getAttribute('data-tab') ? '' : 'none';
        });
      });
    });
  };

  /* ---------- 表单提交模拟 ---------- */
  window.initForm = function (formSel, okMsg) {
    var f = $(formSel);
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      $$('[required]', f).forEach(function (el) {
        if (!el.value.trim()) {
          el.classList.add('error');
          bad = true;
        } else { el.classList.remove('error'); }
      });
      if (bad) { toast('请填写必填项', 'err'); return; }
      toast(okMsg || '保存成功');
      if (f.getAttribute('data-reset') === '1') f.reset();
    });
    $$('.input, .select', f).forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('error'); });
    });
  };

  /* ---------- 侧边栏当前项 ---------- */
  (function () {
    var here = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-item').forEach(function (n) {
      var href = (n.getAttribute('href') || '').split('/').pop();
      if (href === here) n.classList.add('active');
    });
  })();
})();
