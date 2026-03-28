// beyondBINARY quantum-prefixed | uvspeed | {+1, 1, -1, +0, 0, -0, +n, n, -n}
// qvid-supply-chain.js — Partnership chain registry for .qvid photonic ecosystem
// Used by uvqbit.html Act VI stack visualization and plan corpus indexer
'use strict';

(function (root) {
  const PARTNERS = Object.freeze([
    {
      name: 'TSMC',
      role: 'Fabrication',
      component: 'COUPE photonic sensor chip',
      status: 'In production (NVIDIA CPO)',
      integrationPoint: 'Same process as NVLink CPO micro-ring resonators',
      tier: 'foundry',
      url: 'https://www.tsmc.com'
    },
    {
      name: 'Lumentum',
      role: 'Laser sources',
      component: 'On-chip laser arrays (8 per photonic engine)',
      status: 'In NVIDIA supply chain',
      integrationPoint: 'Light source for each wavelength channel',
      tier: 'photonic',
      url: 'https://www.lumentum.com'
    },
    {
      name: 'Corning',
      role: 'Fiber optics',
      component: 'Single-mode optical fiber routing (1,152 fibers per switch tray)',
      status: 'In NVIDIA supply chain',
      integrationPoint: 'Photonic transport between engines and systems',
      tier: 'photonic',
      url: 'https://www.corning.com'
    },
    {
      name: 'Zeiss',
      role: 'Optics',
      component: 'Front-end lens elements, T*-coated camera optics',
      status: 'Commercial (Interlock series)',
      integrationPoint: 'Camera optics + lab glass elements',
      tier: 'optics',
      url: 'https://www.zeiss.com'
    },
    {
      name: 'Qualcomm',
      role: 'Mobile SoC',
      component: 'Snapdragon 8 Elite Gen 5 (3nm, Hexagon NPU)',
      status: 'Shipping 2026',
      integrationPoint: 'Phone .qvid sensor host + on-device DCA inference',
      tier: 'compute',
      url: 'https://www.qualcomm.com'
    },
    {
      name: 'EssilorLuxottica',
      role: 'Wearable frames',
      component: 'Ray-Ban Meta frame integration',
      status: 'Meta invested $3.5B',
      integrationPoint: 'Glasses .qvid sensor housing',
      tier: 'wearable',
      url: 'https://www.essilorluxottica.com'
    },
    {
      name: 'Meta',
      role: 'Consumer AR',
      component: 'Reality Labs + Llama AI + Ray-Ban smart glasses',
      status: 'Ray-Ban Gen 2 shipping',
      integrationPoint: 'Glasses AI + display + AR overlay',
      tier: 'consumer',
      url: 'https://about.meta.com'
    },
    {
      name: 'Anduril',
      role: 'Defense',
      component: 'EagleEye helmet + Lattice mesh platform',
      status: 'Launched Oct 2025 ($22B SBMC contract)',
      integrationPoint: 'Military .qvid + tactical mesh fusion',
      tier: 'defense',
      url: 'https://www.anduril.com'
    },
    {
      name: 'RED',
      role: 'Cinema capture',
      component: 'V-RAPTOR XL DSMC3 + RED Connect + REDline Linux',
      status: 'Shipping (Holoscan integration)',
      integrationPoint: '8K120 capture pipeline → .qvid via Holoscan',
      tier: 'cinema',
      url: 'https://www.red.com'
    },
    {
      name: 'NVIDIA',
      role: 'Compute + photonics',
      component: 'Blackwell GB200 NVL72 + Holoscan + CPO + CUDA',
      status: 'Shipping 2025',
      integrationPoint: 'GPU pipeline + photonic fabric + sensor processing',
      tier: 'compute',
      url: 'https://www.nvidia.com'
    },
    {
      name: 'D-Wave',
      role: 'Quantum processing',
      component: 'Advantage2 (4,400 qubits, Zephyr topology, 5ns fast anneal)',
      status: 'Released May 2025',
      integrationPoint: 'QPU classification layer via Leap API',
      tier: 'quantum',
      url: 'https://www.dwavequantum.com'
    },
    {
      name: 'Neuralink',
      role: 'Neural BCI',
      component: 'N1 implant (3,072 electrodes, 200 Mbps)',
      status: 'Clinical trial (PRIME Study, 3 patients)',
      integrationPoint: 'Direct cortical .qvid stream',
      tier: 'neural',
      url: 'https://neuralink.com'
    },
    {
      name: 'EMOTIV',
      role: 'Neural EEG',
      component: 'EPOC X (14-channel, 256 Hz, $849)',
      status: 'Shipping',
      integrationPoint: 'Non-invasive EEG → DCA prefix classification',
      tier: 'neural',
      url: 'https://www.emotiv.com'
    },
    {
      name: 'Sussex (MATD)',
      role: 'Haptics',
      component: 'Ultrasonic acoustic levitation display',
      status: 'Research prototype',
      integrationPoint: 'Mid-air point cloud tokens in lab',
      tier: 'research',
      url: 'https://www.sussex.ac.uk'
    },
    {
      name: 'MIT Tangible Media',
      role: 'Shape display',
      component: 'inFORM physical pixel array',
      status: 'Research (lab only)',
      integrationPoint: 'Tabletop point cloud mirror',
      tier: 'research',
      url: 'https://tangible.media.mit.edu'
    }
  ]);

  const TIERS = Object.freeze({
    foundry:  { order: 0, label: 'Foundry',        color: '#58a6ff' },
    photonic: { order: 1, label: 'Photonic Layer',  color: '#79c0ff' },
    optics:   { order: 2, label: 'Optics',          color: '#d2a8ff' },
    compute:  { order: 3, label: 'Compute',         color: '#7ee787' },
    quantum:  { order: 4, label: 'Quantum',         color: '#f0883e' },
    cinema:   { order: 5, label: 'Cinema',          color: '#ff7b72' },
    consumer: { order: 6, label: 'Consumer',        color: '#ffa657' },
    wearable: { order: 7, label: 'Wearable',        color: '#c9d1d9' },
    defense:  { order: 8, label: 'Defense',          color: '#f85149' },
    neural:   { order: 9, label: 'Neural',           color: '#bc8cff' },
    research: { order: 10, label: 'Research',        color: '#8b949e' }
  });

  function getPartnerByRole(role) {
    return PARTNERS.find(p => p.role.toLowerCase() === role.toLowerCase()) || null;
  }

  function getPartnerByName(name) {
    return PARTNERS.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }

  function getPartnersByTier(tier) {
    return PARTNERS.filter(p => p.tier === tier);
  }

  function getSupplyChainFlow() {
    const sorted = [...PARTNERS].sort((a, b) =>
      (TIERS[a.tier]?.order ?? 99) - (TIERS[b.tier]?.order ?? 99)
    );
    return sorted.map(p => ({
      name: p.name,
      tier: p.tier,
      tierLabel: TIERS[p.tier]?.label || p.tier,
      component: p.component,
      status: p.status
    }));
  }

  function getReadinessReport() {
    const report = { shipping: 0, prototype: 0, research: 0, clinical: 0, total: PARTNERS.length };
    for (const p of PARTNERS) {
      const s = p.status.toLowerCase();
      if (s.includes('shipping') || s.includes('production') || s.includes('released') || s.includes('launched') || s.includes('available')) report.shipping++;
      else if (s.includes('clinical') || s.includes('trial')) report.clinical++;
      else if (s.includes('prototype') || s.includes('invested')) report.prototype++;
      else report.research++;
    }
    report.readinessPercent = Math.round(report.shipping / report.total * 100);
    return report;
  }

  const QvidSupplyChain = {
    PARTNERS,
    TIERS,
    getPartnerByRole,
    getPartnerByName,
    getPartnersByTier,
    getSupplyChainFlow,
    getReadinessReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QvidSupplyChain;
  } else {
    root.QvidSupplyChain = QvidSupplyChain;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
