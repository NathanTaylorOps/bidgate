/* Test-only stub of Chart.js 4 UMD global. Records configs and validates shapes; draws nothing. */
(function () {
  const instances = [];
  class Chart {
    constructor(ctx, config) {
      if (!ctx || typeof ctx.canvas === 'undefined') throw new Error('Chart: bad ctx');
      if (!config || !config.type) throw new Error('Chart: missing type');
      if (!config.data || !Array.isArray(config.data.datasets)) throw new Error('Chart: missing datasets');
      for (const ds of config.data.datasets) {
        if (!Array.isArray(ds.data)) throw new Error('Chart: dataset.data not array');
        for (const v of ds.data) {
          if (v == null) continue;
          if (typeof v === 'number' && Number.isNaN(v)) throw new Error('Chart: NaN in data for ' + config.type);
          if (typeof v === 'object' && !Array.isArray(v)) { for (const k of ['x', 'y', 'r']) if (k in v && Number.isNaN(v[k])) throw new Error('Chart: NaN ' + k + ' in ' + config.type); }
        }
      }
      // exercise plugin hooks with a fake chart area/scales so beforeDraw code runs
      this.ctx = ctx; this.config = config;
      this.chartArea = { top: 10, bottom: 300, left: 40, right: 600 };
      const lin = () => ({ getPixelForValue: v => Number(v) || 0 });
      this.scales = { x: lin(), y: lin(), r: lin() };
      for (const p of config.plugins || []) { if (p.beforeDraw) p.beforeDraw(this); }
      instances.push(this);
    }
    update() {}
    destroy() { const i = instances.indexOf(this); if (i >= 0) instances.splice(i, 1); }
  }
  Chart.defaults = { font: {}, color: '' };
  Chart.__instances = instances;
  window.Chart = Chart;
})();
