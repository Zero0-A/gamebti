'use strict';
/**
 * GameBTI · 云服务接入
 *
 * 下面三个值是 WorkBuddy 云服务开通时返回的 publicConfig（resourceId: wbcs_Eqra9YY9RaDzzDHJPvK3Q7）。
 * 这个站点是纯静态、无构建步骤，所以按规范把 publicConfig 原样落到配置里，不做任何推导：
 *   - endpoint 必须是 publicConfig.endpoint，不能换成 location.origin 或别的域名；
 *   - publishableKey 只标识是哪个应用，本身没有权限，服务端还会校验请求来源。
 * 重新开通或迁移环境时，以工具返回的新 publicConfig 为准整体替换。
 */
window.GameCloud = (() => {
  const config = {
    endpoint: 'https://gamebti.app.workbuddy.host',
    publishableKey: 'wbpk_E9TNiuq1xDFmJcBPNniivU_BsqVGxFmXdQPb9Vf4wemDYg2ykPIaP91',
  };
  const TABLE = 'gamebti_results';
  const RECEIPT_KEY = 'gamebti-cloud-receipt-v1';
  const TYPE_PATTERN = /^[EI][SN][TF][JP]$/;

  let client = null;
  let clientFailed = false;

  function getClient() {
    if (client || clientFailed) return client;
    const sdk = window.WorkBuddyCloud;
    if (!sdk || typeof sdk.createWorkBuddyCloud !== 'function') {
      clientFailed = true;
      return null;
    }
    try {
      client = sdk.createWorkBuddyCloud({
        endpoint: config.endpoint,
        publishableKey: config.publishableKey,
      });
    } catch (error) {
      clientFailed = true;
      console.warn('[GameBTI] 云服务初始化失败', error && error.message);
    }
    return client;
  }

  function receipt() {
    try {
      return JSON.parse(localStorage.getItem(RECEIPT_KEY)) || null;
    } catch {
      return null;
    }
  }

  function saveReceipt(signature) {
    try {
      localStorage.setItem(RECEIPT_KEY, JSON.stringify({ signature }));
    } catch {
      /* 隐私模式下写不进本地存储时，只是每次都会重新登记一次 */
    }
  }

  /** 把一次完成的结果登记到云端；同一份答案只登记一次，避免刷新页面重复计数。 */
  async function recordResult(code, signature) {
    if (!TYPE_PATTERN.test(code || '')) return false;
    if (signature && receipt() && receipt().signature === signature) return true;
    const cloud = getClient();
    if (!cloud) return false;
    try {
      const { error } = await cloud.database.from(TABLE).insert({ type_code: code });
      if (error) {
        console.warn('[GameBTI] 结果登记失败', error.message);
        return false;
      }
      if (signature) saveReceipt(signature);
      return true;
    } catch (error) {
      console.warn('[GameBTI] 结果登记异常', error && error.message);
      return false;
    }
  }

  /** 读取云端聚合：各类型份数。读不到返回 null，不抛错。 */
  async function fetchTypeStats() {
    const cloud = getClient();
    if (!cloud) return null;
    try {
      const { data, error } = await cloud.database.rpc('gamebti_type_stats');
      if (error) {
        console.warn('[GameBTI] 云端统计读取失败', error.message);
        return null;
      }
      const rows = Array.isArray(data) ? data : [];
      const total = rows.reduce((sum, row) => sum + (Number(row.shares) || 0), 0);
      return { total, rows };
    } catch (error) {
      console.warn('[GameBTI] 云端统计异常', error && error.message);
      return null;
    }
  }

  function formatNumber(value) {
    return Number(value).toLocaleString('zh-CN');
  }

  function ensureBox() {
    const detail = document.querySelector('#result .result-detail');
    if (!detail) return null;
    const existing = detail.querySelector('.cloud-stat');
    if (existing) return existing;

    const box = document.createElement('div');
    box.className = 'cloud-stat';
    box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<span class="mono">CLOUD RECORD</span><p class="cloud-stat-line">正在读取云端记录…</p>';

    const note = detail.querySelector('.dimension-note');
    if (note && note.parentNode === detail) note.after(box);
    else detail.appendChild(box);
    return box;
  }

  function setLine(box, html, muted) {
    if (!box) return;
    box.classList.toggle('is-muted', !!muted);
    const line = box.querySelector('.cloud-stat-line');
    if (line) line.innerHTML = html;
  }

  /**
   * 结果页出现后调用：先登记本次结果，再读回云端聚合，把「同类占比」补进结果详情。
   * 任何一步失败都只降级成一行说明，不打断答题流程。
   */
  async function afterResult(code, signature) {
    const box = ensureBox();
    if (!box) return;

    const recorded = await recordResult(code, signature);
    const stats = await fetchTypeStats();

    if (!stats) {
      setLine(box, recorded ? '这份结果已收进云端，但云端统计暂时读不到。' : '云端暂时没连上，这份结果只保存在本机。', true);
      return;
    }

    const total = stats.total;
    const mine = stats.rows.find(row => row.code === code);
    const shares = mine ? Number(mine.shares) || 0 : 0;

    if (!total) {
      setLine(box, recorded ? '这份结果已收进云端。' : '云端暂时没连上，这份结果只保存在本机。', !recorded);
      return;
    }

    if (total < 5) {
      setLine(box, `云端已收录 <b>${formatNumber(total)}</b> 份结果，你是其中之一。等更多玩家测完，就能看到同类占比。`, !recorded);
      return;
    }

    const raw = (shares / total) * 100;
    const percent = raw >= 1 ? String(Math.round(raw)) : '<1';
    const parts = [`已收录 <b>${formatNumber(total)}</b> 份结果，其中 <b>${percent}%</b> 和你一样是 ${escapeText(code)}。`];
    if (!recorded) parts.push('<br>这份结果没能同步上去，只保存在本机。');
    setLine(box, parts.join(''), !recorded);
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));
  }

  /** 图鉴里展示参与总量，拿不到就不显示，不影响原有界面。每次打开图鉴都刷新一次。 */
  async function showCommunityTotal(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    const stats = await fetchTypeStats();
    if (!stats || !stats.total) return;
    target.textContent = `云端已收录 ${formatNumber(stats.total)} 份玩家结果`;
    target.hidden = false;
  }

  return { afterResult, showCommunityTotal, config };
})();
