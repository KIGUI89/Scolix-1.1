(function () {
"use strict";

/* Moteur de templates minimal (sans dépendance) : interprète un sous-ensemble de balises
   <sc-if value="{{ expr }}"> / <sc-for list="{{ expr }}" as="nom"> et les interpolations
   {{ expr }} dans le texte et les attributs, puis construit le DOM directement
   (sans passer par innerHTML, pour éviter les pièges de parsing HTML des tableaux). */

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SVG_TAGS = new Set(['svg', 'path', 'line', 'circle', 'polygon', 'polyline', 'text', 'g', 'rect', 'ellipse']);

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// --- Analyseur : transforme le texte du template en arbre de nœuds ---
function parseTemplate(html) {
  let i = 0;
  const n = html.length;

  function parseNodes() {
    const nodes = [];
    while (i < n) {
      if (html.startsWith('</', i)) return nodes;
      if (html[i] === '<') {
        if (html.startsWith('<!--', i)) {
          const end = html.indexOf('-->', i);
          i = end < 0 ? n : end + 3;
          continue;
        }
        nodes.push(parseElement());
      } else {
        const next = html.indexOf('<', i);
        const raw = html.slice(i, next < 0 ? n : next);
        i = next < 0 ? n : next;
        if (raw) nodes.push({ type: 'text', value: raw });
      }
    }
    return nodes;
  }

  function parseElement() {
    i++; // '<'
    const tagStart = i;
    while (i < n && /[a-zA-Z0-9-]/.test(html[i])) i++;
    const tag = html.slice(tagStart, i);
    const attrs = {};
    while (i < n) {
      while (i < n && /\s/.test(html[i])) i++;
      if (html[i] === '/' && html[i + 1] === '>') { i += 2; return { type: 'element', tag, attrs, children: [] }; }
      if (html[i] === '>') { i++; break; }
      const nameStart = i;
      while (i < n && /[^\s=/>]/.test(html[i])) i++;
      const name = html.slice(nameStart, i);
      if (!name) { i++; continue; }
      let value = '';
      let hadEq = false;
      const save = i;
      while (i < n && /\s/.test(html[i])) i++;
      if (html[i] === '=') {
        hadEq = true;
        i++;
        while (i < n && /\s/.test(html[i])) i++;
        const quote = html[i];
        if (quote === '"' || quote === "'") {
          i++;
          const valStart = i;
          while (i < n && html[i] !== quote) i++;
          value = html.slice(valStart, i);
          i++;
        } else {
          const valStart = i;
          while (i < n && !/[\s>]/.test(html[i])) i++;
          value = html.slice(valStart, i);
        }
      } else {
        i = save;
      }
      attrs[name] = hadEq ? value : '';
    }
    if (VOID_TAGS.has(tag)) return { type: 'element', tag, attrs, children: [] };
    const children = parseNodes();
    if (html.startsWith('</', i)) {
      i += 2;
      while (i < n && html[i] !== '>') i++;
      i++;
    }
    return { type: 'element', tag, attrs, children };
  }

  return parseNodes();
}

// --- Évaluation des expressions {{ a.b.c }} contre un contexte (chaîne de prototypes) ---
const SINGLE_EXPR_RE = /^\{\{\s*([^}]+?)\s*\}\}$/;
const ANY_EXPR_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

function evalPath(ctx, path) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), ctx);
}

// --- Rendu : construit du vrai DOM à partir de l'arbre analysé + du contexte courant ---
function renderChildren(nodes, ctx, svg) {
  const out = [];
  for (const node of nodes) out.push(...renderNode(node, ctx, svg));
  return out;
}

function renderNode(node, ctx, svg) {
  if (node.type === 'text') {
    const text = decodeEntities(node.value.replace(ANY_EXPR_RE, (m, expr) => {
      const v = evalPath(ctx, expr);
      return v === undefined || v === null ? '' : String(v);
    }));
    return [document.createTextNode(text)];
  }

  if (node.tag === 'sc-if') {
    const m = SINGLE_EXPR_RE.exec(node.attrs.value || '');
    const truthy = m ? !!evalPath(ctx, m[1]) : false;
    return truthy ? renderChildren(node.children, ctx, svg) : [];
  }

  if (node.tag === 'sc-for') {
    const m = SINGLE_EXPR_RE.exec(node.attrs.list || '');
    const list = m ? evalPath(ctx, m[1]) : null;
    const asName = node.attrs.as;
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
      const childCtx = Object.assign(Object.create(ctx), { [asName]: item });
      out.push(...renderChildren(node.children, childCtx, svg));
    }
    return out;
  }

  const isSvg = svg || node.tag === 'svg' || SVG_TAGS.has(node.tag);
  const el = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', node.tag)
    : document.createElement(node.tag);

  for (const child of renderChildren(node.children, ctx, isSvg)) el.appendChild(child);

  applyAttrs(el, node.attrs, ctx);

  return [el];
}

const EVENT_ATTRS = { onclick: 'click', onchange: 'change', oninput: 'input', onsubmit: 'submit' };
const BOOL_ATTRS = new Set(['checked', 'disabled', 'readonly']);

function applyAttrs(el, attrs, ctx) {
  for (const name in attrs) {
    if (name.startsWith('hint-') || name === 'style-hover') continue;
    const raw = attrs[name];
    const lower = name.toLowerCase();

    if (EVENT_ATTRS[lower]) {
      const m = SINGLE_EXPR_RE.exec(raw);
      const fn = m ? evalPath(ctx, m[1]) : undefined;
      if (typeof fn === 'function') el.addEventListener(EVENT_ATTRS[lower], fn);
      continue;
    }

    if (BOOL_ATTRS.has(name)) {
      const m = SINGLE_EXPR_RE.exec(raw);
      const boolVal = m ? !!evalPath(ctx, m[1]) : true;
      if (name === 'readonly') el.readOnly = boolVal; else el[name] = boolVal;
      if (boolVal) el.setAttribute(name, ''); else el.removeAttribute(name);
      continue;
    }

    const m = SINGLE_EXPR_RE.exec(raw);
    let finalVal;
    if (m) {
      const v = evalPath(ctx, m[1]);
      if (v === undefined) continue;
      finalVal = String(v);
    } else {
      finalVal = decodeEntities(raw.replace(ANY_EXPR_RE, (mm, expr) => {
        const v = evalPath(ctx, expr);
        return v === undefined || v === null ? '' : String(v);
      }));
    }
    el.setAttribute(name, finalVal);
    if (name === 'value' && 'value' in el) el.value = finalVal;
  }
}


const CRIT = [
  { key: 'pedago', label: 'Pédagogie', hint: "Structure du cours, progression, supports." },
  { key: 'clarte', label: 'Clarté', hint: "Les notions sont-elles exposées de façon compréhensible ?" },
  { key: 'ponct', label: 'Ponctualité', hint: "Respect des horaires et du volume horaire prévu." },
  { key: 'innov', label: 'Innovation', hint: "Méthodes, outils et supports renouvelés." },
  { key: 'inter', label: 'Interaction', hint: "Écoute, réponses aux questions, participation." },
  { key: 'dispo', label: 'Disponibilité', hint: "Accessibilité hors séance, réactivité." }
];
const LIKERT = ['Insuffisant', 'Perfectible', 'Satisfaisant', 'Bien', 'Excellent'];
const NAV = [
  { g: 'Navigation', items: [
    { id: 'admin', label: 'Dashboard' },
    { id: 'teacher', label: 'Enseignants' },
    { id: 'grades', label: 'Grades' },
    { id: 'direction', label: 'Départements' },
    { id: 'semestres', label: 'Semestres' },
    { id: 'etudiants', label: 'Étudiants' },
    { id: 'cours', label: 'Cours' },
    { id: 'enrollment', label: 'Enrollment' },
    { id: 'campaigns', label: 'Campagnes' },
    { id: 'criteria', label: 'Critères' },
    { id: 'utilisateurs', label: 'Utilisateurs' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'ml', label: 'IA & Clusters' },
    { id: 'biais', label: 'Biais détectés' },
    { id: 'classification', label: 'Classification' },
    { id: 'alertes', label: 'Alertes' }
  ]},
  { g: 'Maquettes', items: [
    { id: 'import', label: 'Import de données' },
    { id: 'eval', label: 'Formulaire étudiant' },
    { id: 'mobile', label: 'Vues mobiles' }
  ]}
];
const TODO = {
  grades: ['Module M2', 'Grades', "11 grades académiques enregistrés"],
  semestres: ['Module M2', 'Semestres académiques', "Historique et cycles configurés"],
  etudiants: ['Module M1', 'Étudiants', "Recherchez un étudiant directement, ou choisissez un niveau pour parcourir la liste"],
  cours: ['Module M1', 'Cours', "Choisissez un département pour consulter ses cours"],
  enrollment: ['Module M1', 'Inscriptions', "197 inscriptions · année sélectionnée"],
  utilisateurs: ['Module M8', 'Gestion des utilisateurs', "121 comptes d'accès répertoriés sur la plateforme"],
  analytics: ['Module M5', 'Analyse avancée', "Analyse multicritère · classements détaillés"],
  biais: ['Module M6', 'Détection des anomalies et biais', "Analyse statistique (z-score) identifiant les notations anormalement divergentes"],
  classification: ['Module M5', 'Classification des enseignants', "Exceptionnel (> 80 %) · En progression (60–80 %) · À accompagner (< 60 %)"],
  alertes: ['Module M3 · M5', 'Alertes', "Seuils de ponctualité dépassés et écarts d'indicateurs à traiter"]
};
const HEAD = {
  admin: ['Module M5 · M7', 'Tableau de bord administration', "Vue d'ensemble des scores pondérés, du classement et des taux de réponse pour l'année en cours."],
  direction: ['Module M5 · M7', 'Vue direction', "Alertes prioritaires, comparaison inter-département et tendances historiques sur six semestres."],
  teacher: ['Module M1 · M2', 'Enseignants', "Gérez le registre des enseignants de l'établissement."],
  teacherDetail: ['Module M2 · M7', 'Fiche enseignant', "Profil sur les six critères, comparaison auto-évaluation / étudiants / audit interne, commentaires anonymisés."],
  eval: ['Module M2', "Formulaire d'évaluation étudiant", "Échelle Likert 1–5 sur les six critères pondérés, réponses anonymisées par hachage SHA-256."],
  import: ['Module M1', 'Import et intégration de données', "Mapping intelligent des colonnes, validation ligne à ligne, import partiel et historique avec rollback."],
  campaigns: ['Module M4', 'Campagnes et notifications', "Envoi automatique selon le calendrier académique, relances espacées et suivi du taux de réponse."],
  ml: ['Module M6', 'Analyse et intelligence artificielle', "Détection des biais d'évaluateur, prédiction des scores et regroupement des profils d'enseignants."],
  criteria: ['Module M2', 'Critères et pondérations', "Six critères par défaut, pondération par département avec validation de la somme à 100 % et versionnement."],
  mobile: ['Applications mobiles', 'Vues mobiles', "Formulaire étudiant et profil enseignant en format téléphone, avec file de synchronisation hors ligne."]
};
const ACC = '#5980a6';
const ICONS = {
  admin: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  teacher: 'M4 20c0-3 2.7-5 6-5s6 2 6 5M10 5a3 3 0 100 6 3 3 0 000-6',
  grades: 'M12 4a4 4 0 100 8 4 4 0 000-8M9 13l-1 7 4-2 4 2-1-7',
  direction: 'M5 21V5h9v16M9 21v-4M14 10h5v11M8 8h2M8 12h2',
  semestres: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  etudiants: 'M3 9l9-4 9 4-9 4-9-4M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4',
  cours: 'M4 5h7v14H4zM13 5h7v14h-7',
  enrollment: 'M3 20c0-3 2.7-5 6-5s6 2 6 5M9 5a3 3 0 100 6 3 3 0 000-6M19 8v6M16 11h6',
  campaigns: 'M4 11l12-5v10L4 13zM4 11v3M17 9a3 3 0 010 5',
  criteria: 'M4 7l2 2 3-3M4 16l2 2 3-3M13 8h7M13 17h7',
  utilisateurs: 'M3 20c0-3 2.7-5 6-5s6 2 6 5M9 5a3 3 0 100 6 3 3 0 000-6M18 12a2 2 0 100 4 2 2 0 000-4',
  analytics: 'M5 20V11M11 20V4M17 20v-6M3 20h18',
  ml: 'M6 6a2 2 0 100 4 2 2 0 000-4M18 6a2 2 0 100 4 2 2 0 000-4M12 15a2 2 0 100 4 2 2 0 000-4M7.6 9.6l3.4 4.2M16.4 9.6L13 13.8M8 8h8',
  biais: 'M3 12h4l2 6 4-14 2 8h6',
  classification: 'M12 4a8 8 0 100 16 8 8 0 000-16M12 8a4 4 0 100 8 4 4 0 000-8M12 11.2a.8.8 0 100 1.6.8.8 0 000-1.6',
  alertes: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  import: 'M12 16V4M8 8l4-4 4 4M4 18v2h16v-2',
  eval: 'M9 4h6v3H9zM6 6h12v14H6zM9 12h6M9 16h6',
  mobile: 'M8 3h8v18H8zM11 18h2'
};


let state = {
    screen: 'login', nav: 'sidebar', mfa: false, theme: 'light', collapsed: false,
    hist: ['admin'], hidx: 0, histOpen: false,
    answers: { clarte: 4 },
    weights: { pedago: 25, clarte: 20, ponct: 15, innov: 15, inter: 15, dispo: 10 }
  };


const navTo = (id) => setState(s => {
    if (s.screen === id) return { histOpen: false };
    const hist = s.hist.slice(0, s.hidx + 1).concat(id);
    return { screen: id, hist, hidx: hist.length - 1, histOpen: false };
  });

const go = (id) => (e) => { if (e) e.preventDefault(); navTo(id); };

function poly(vals, r0) {
    return vals.map((v, i) => {
      const a = (-90 + i * 60) * Math.PI / 180, r = r0 * v / 5;
      return (170 + r * Math.cos(a)).toFixed(1) + ',' + (140 + r * Math.sin(a)).toFixed(1);
    }).join(' ');
  }

function extraVals() {
    const scr = state.screen;
    const tog = (on) => ({ bg: on ? 'var(--color-accent)' : 'var(--color-neutral-300)', align: on ? 'auto' : '0' });
    const cat = (s) => s >= 80 ? { label: 'Exceptionnel', tag: 'tag-exc' } : (s >= 60 ? { label: 'En progression', tag: 'tag-prog' } : { label: 'À accompagner', tag: 'tag-watch' });
    return {
      scGrades: scr === 'grades', scSemestres: scr === 'semestres', scEtudiants: scr === 'etudiants',
      scCours: scr === 'cours', scEnroll: scr === 'enrollment', scUsers: scr === 'utilisateurs',
      scAnalytics: scr === 'analytics', scBiais: scr === 'biais', scClass: scr === 'classification',
      scAlertes: scr === 'alertes',

      gradesRows: [
        ['Professeur Titulaire', 1, 0], ['Professeur', 2, 2], ['Maître de Conférences', 3, 0],
        ['Maître Assistant', 4, 4], ['Chargé de Cours', 5, 0], ['Assistant', 6, 8],
        ["Attaché Temporaire d'Enseignement et de Recherche (ATER)", 7, 0], ['Docteur', 8, 4],
        ['Doctorant Enseignant', 9, 0], ['Ingénieur Enseignant', 10, 3], ['Vacataire', 11, 0]
      ].map(([label, rank, n]) => ({ label, rank: '#' + rank, n })),

      semRows: [
        { label: 'Semestre 2 — 2025/2026', year: '2025/2026', period: '01/03/2026 — 31/07/2026', on: true, t: tog(true) },
        { label: 'Semestre 1 — 2025/2026', year: '2025/2026', period: '01/10/2025 — 28/02/2026', on: false, t: tog(false) }
      ],

      levels: [
        { label: 'Licence 1', code: 'L1', n: 20 }, { label: 'Licence 2', code: 'L2', n: 20 },
        { label: 'Licence 3', code: 'L3', n: 20 }, { label: 'Master 1', code: 'M1', n: 20 },
        { label: 'Master 2', code: 'M2', n: 20 }
      ],
      depts: [
        { label: 'Génie Logiciel', code: 'GL', courses: 5, teachers: 6 },
        { label: 'Intelligence Artificielle', code: 'IA', courses: 4, teachers: 6 },
        { label: 'Réseaux et Systèmes', code: 'RS', courses: 5, teachers: 7 },
        { label: "Systèmes d'Information", code: 'SI', courses: 6, teachers: 2 }
      ],

      enrollRows: [
        ['Sena ADJETE', 'SI-M2-0100', 'Gouvernance SI', 'GOV501', "Systèmes d'Information", 'Semestre 1 — 2025/2026'],
        ['Samuel AKAKPO', 'IA-M1-0099', 'Deep Learning', 'DL401', 'Intelligence Artificielle', 'Semestre 2 — 2025/2026'],
        ['Samuel AKAKPO', 'IA-M1-0099', 'MLOps', 'MLOPS501', 'Intelligence Artificielle', 'Semestre 1 — 2025/2026'],
        ['Patrick KOMI', 'RS-L3-0098', 'Administration Système Linux', 'LIN301', 'Réseaux et Systèmes', 'Semestre 1 — 2025/2026'],
        ['Patrick KOMI', 'RS-L3-0098', 'Sécurité Réseaux', 'SEC302', 'Réseaux et Systèmes', 'Semestre 2 — 2025/2026'],
        ['Mensah DOGBE', 'GL-L2-0097', 'Programmation Orientée Objet', 'POO201', 'Génie Logiciel', 'Semestre 1 — 2025/2026'],
        ['Emefa LAWSON', 'SI-L1-0096', 'Gestion de Projet SI', 'GPSI302', "Systèmes d'Information", 'Semestre 1 — 2025/2026']
      ].map(([name, mat, course, code, dept, sem]) => ({ name, mat, course, code, dept, sem, t: tog(true) })),

      userRows: [
        ['abla.mensah6@edu-eval.local', 'Enseignant', 'Abla MENSAH'],
        ['abla.nika3@edu-eval.local', 'Enseignant', 'Abla NIKA'],
        ['afi.boko16@edu-eval.local', 'Enseignant', 'Afi BOKO'],
        ['daniel.tete17@edu-eval.local', 'Enseignant', 'Daniel TETE'],
        ['david.adjovi4@edu-eval.local', 'Enseignant', 'David ADJOVI'],
        ['a.benali@univ.exemple.fr', 'Administrateur', '—'],
        ['marie.allode1@edu-eval.local', 'Enseignant', 'Marie ALLODE']
      ].map(([mail, role, profile]) => ({
        mail, role, profile, created: '12/08/2026',
        tag: role === 'Administrateur' ? 'tag-outline' : 'tag-accent'
      })),

      teacherRows: [
        ['David ADJETE', 'ENS-015', 'Intelligence Artificielle', 'Ingénieur Enseignant', 'Réseaux Cisco'],
        ['David ADJOVI', 'ENS-004', 'Réseaux et Systèmes', 'Ingénieur Enseignant', 'Django REST'],
        ['Yao AGBODJAN', 'ENS-008', 'Génie Logiciel', 'Assistant', 'Génie logiciel'],
        ['Eric AKAKPO', 'ENS-007', 'Intelligence Artificielle', 'Maître Assistant', 'Génie logiciel'],
        ['Grace AKPABIE', 'ENS-012', 'Réseaux et Systèmes', 'Assistant', 'Base de données'],
        ['Marie ALLODE', 'ENS-001', 'Génie Logiciel', 'Docteur', 'Base de données'],
        ['Patrick AYITE', 'ENS-020', "Systèmes d'Information", 'Docteur', 'Réseaux Cisco']
      ].map(([name, mat, dept, grade, spec]) => ({
        name, mat, dept, grade, spec, t: tog(true),
        initials: name.split(' ').map(p => p[0]).join('').slice(0, 2)
      })),

      classRows: [
        ['Marie ALLODE', 'Génie Logiciel', 74.4], ['Ruth KOMI', 'Génie Logiciel', 71.8],
        ['Grace AKPABIE', 'Réseaux et Systèmes', 63.6], ['Patrick AYITE', "Systèmes d'Information", 63.4],
        ['Eric AKAKPO', 'Intelligence Artificielle', 63.4], ['Samuel KPODAR', 'Intelligence Artificielle', 61.3],
        ['Abla NIKA', "Systèmes d'Information", 59.3], ['David ADJOVI', 'Réseaux et Systèmes', 53.4]
      ].map(([name, dept, score], i) => ({
        name, dept, rank: i + 1, score: score.toFixed(1).replace('.', ',') + '/100',
        w: score + '%', ...cat(score), catLabel: cat(score).label, catTag: cat(score).tag
      })),
      classKpis: [
        { label: 'Exceptionnel', value: 0, note: 'score > 80 %', bg: 'var(--color-tile)', fg: 'var(--color-accent-800)' },
        { label: 'En progression', value: 6, note: '60 à 80 %', bg: 'var(--color-tile)', fg: 'var(--color-accent-900)' },
        { label: 'À accompagner', value: 2, note: '< 60 %', bg: 'var(--color-tile)', fg: 'var(--color-neutral-900)' }
      ],

      analyticsKpis: [
        { label: 'Total soumissions', value: '163' }, { label: 'Enseignants évalués', value: '8' },
        { label: 'Score moyen global', value: '65,1', unit: '/100' }, { label: 'Taux de participation', value: '38,1', unit: '%' },
        { label: 'Étudiants ayant évalué', value: '58' }, { label: "Étudiants n'ayant pas évalué", value: '16' },
        { label: 'NPS', value: '100' }, { label: 'Taux de satisfaction', value: '41,1', unit: '%' }
      ],
      biaisTeachers: [
        ['Abla NIKA', 'Ponctualité', '2,4', '−2,6', 'Critique'],
        ['David ADJOVI', 'Clarté des explications', '2,6', '−2,3', 'Critique'],
        ['Marie ALLODE', 'Disponibilité', '4,9', '+2,4', 'À surveiller'],
        ['Eric AKAKPO', 'Organisation du cours', '2,9', '−2,1', 'À surveiller']
      ].map(([name, crit, avg, z, sev]) => ({
        name, crit, avg, z, sev, tag: sev === 'Critique' ? 'tag-crit' : 'tag-watch2'
      })),
      alerteRows: [
        { level: 'Critique', title: 'Trois retards en un mois — T. AMRANI', body: 'Seuil configuré dépassé (3 retards / mois). Direction et RH notifiés automatiquement.', when: 'il y a 2 h', bg: 'var(--color-tile)', bd: 'var(--color-divider)', tag: 'tag-crit' },
        { level: 'Critique', title: 'Score sous le seuil — D. ADJOVI', body: 'Score global 53,4/100, sous le seuil « À accompagner ». Un plan de formation est proposé.', when: 'il y a 5 h', bg: 'var(--color-tile)', bd: 'var(--color-divider)', tag: 'tag-crit' },
        { level: 'À surveiller', title: 'Taux de réponse insuffisant — Systèmes d\u2019Information', body: '47 % à quatre jours de la clôture de la campagne. Une relance ciblée est proposée.', when: 'hier', bg: 'var(--color-tile)', bd: 'var(--color-divider)', tag: 'tag-surv' },
        { level: 'Information', title: 'Écart anormal détecté — Génie Logiciel', body: 'Baisse de 0,34 sur le critère Clarté par rapport à la tendance des trois derniers semestres.', when: 'il y a 3 j', bg: 'transparent', bd: 'var(--color-divider)', tag: 'tag-info' }
      ]
    };
  }

function renderVals() {
    const s = state, R = 110;
    const scr = s.screen;
    const head = HEAD[scr] || TODO[scr] || HEAD.admin;
    const w = s.weights;
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    const answered = CRIT.filter(c => s.answers[c.key]).length;

    const items = NAV.flatMap(g => g.items).map(it => ({
      ...it, go: go(it.id), d: ICONS[it.id],
      cur: it.id === scr ? 'page' : undefined,
      line: it.id === scr ? ACC : 'transparent',
      fg: it.id === scr ? 'var(--color-text)' : 'var(--color-neutral-600)',
      weight: it.id === scr ? 500 : 400,
      bg: it.id === scr ? 'var(--color-neutral-200)' : 'transparent',
      topFg: it.id === scr ? 'var(--color-text)' : 'var(--color-neutral-600)',
      topBg: it.id === scr ? 'var(--color-neutral-200)' : 'transparent'
    }));
    const groups = NAV.map(g => ({ title: g.g, items: g.items.map(it => items.find(i => i.id === it.id)) }));

    const trend = [3.62, 3.74, 3.81, 3.95, 4.02, 4.12];
    const tx = i => (i * 62).toFixed(0);
    const ty = v => (110 - (v - 3.4) * 100).toFixed(1);

    const heat = [
      ['Informatique', [3.8, 3.9, 4.0, 4.1, 4.2, 4.3]],
      ['Gestion', [3.5, 3.6, 3.6, 3.8, 3.9, 3.9]],
      ['Génie civil', [4.0, 4.1, 4.0, 4.2, 4.4, 4.4]],
      ['Lettres', [3.3, 3.4, 3.6, 3.5, 3.7, 3.8]],
      ['Sciences éco.', [3.9, 3.9, 4.1, 4.1, 4.0, 4.2]]
    ];
    const ramp = ['#eef6ff', '#d6ebff', '#b5d9fd', '#94bce3', '#749dc4', '#597ea3', '#416180', '#2c455d'];

    return {
      isLogin: scr === 'login', isApp: scr !== 'login',
      passwordStep: scr === 'login' && !s.mfa, mfaStep: scr === 'login' && s.mfa,
      toMfa: (e) => { e.preventDefault(); setState({ mfa: true }); },
      backToPassword: (e) => { e.preventDefault(); setState({ mfa: false }); },
      enterApp: (e) => { e.preventDefault(); setState({ screen: 'admin' }); },
      logout: (e) => { e.preventDefault(); setState({ screen: 'login', mfa: false }); },

      expanded: !s.collapsed,
      labelDisplay: s.collapsed ? 'none' : 'block',
      navJustify: s.collapsed ? 'center' : 'flex-start',
      sidebarW: s.collapsed ? '64px' : '206px',
      collapseMargin: s.collapsed ? '0' : 'auto',
      collapseLabel: s.collapsed ? 'Étendre le menu' : 'Réduire le menu',
      toggleSidebar: (e) => { if (e) e.preventDefault(); setState(st => ({ collapsed: !st.collapsed })); },
      dotAccent: '#3B82F6',
      dotAccent2: '#818CF8',
      dotNeutral: '#9CA3AF',
      dotUrgent: '#F97316',
      dotRank: '#22C55E',
      dotSem: '#F97316',
      dotExc: '#3B82F6',
      dotProg: '#818CF8',
      dotWatch: '#F97316',
      dotInfo: '#22C55E',
      dotCount: '#22C55E',
      dotVerif: '#F97316',
      dotMethod: '#F97316',
      dotZscore: '#22C55E',
      dotSurv: '#EAB308',
      dotCrit: '#F97316',
      dotWatch2: '#22C55E',
      dotAll: 'initial',
      theme: s.theme || 'dark',
      logoFilter: (s.theme || 'dark') === 'dark' ? 'invert(1)' : 'none',
      themeLabel: (s.theme || 'dark') === 'dark' ? 'Passer en thème jour' : 'Passer en thème nuit',
      themeIcon: (s.theme || 'dark') === 'dark'
        ? 'M12 5V3M12 21v-2M5 12H3M21 12h-2M6.5 6.5L5 5M19 19l-1.5-1.5M6.5 17.5L5 19M19 5l-1.5 1.5M12 8a4 4 0 100 8 4 4 0 000-8'
        : 'M20 14.5A8 8 0 019.5 4 8.2 8.2 0 1020 14.5',
      toggleTheme: (e) => { if (e) e.preventDefault(); setState(st => ({ theme: (st.theme || 'dark') === 'dark' ? 'light' : 'dark' })); },
      isSide: s.nav === 'sidebar', isTop: s.nav === 'top',
      setSide: () => setState({ nav: 'sidebar' }),
      setTop: () => setState({ nav: 'top' }),
      items, groups,
      topItems: items.slice(0, 7),
      moreItems: items.slice(7),
      moreValue: items.slice(7).some(i => i.id === scr) ? scr : '',
      goSelect: (e) => { const v = e.target.value; if (v) navTo(v); },
      kicker: head[0], title: head[1], subtitle: head[2],
      noBack: s.hidx <= 0 ? true : undefined,
      noFwd: s.hidx >= s.hist.length - 1 ? true : undefined,
      goBack: (e) => { if (e) e.preventDefault(); setState(st => st.hidx > 0 ? { hidx: st.hidx - 1, screen: st.hist[st.hidx - 1], histOpen: false } : { histOpen: false }); },
      goFwd: (e) => { if (e) e.preventDefault(); setState(st => st.hidx < st.hist.length - 1 ? { hidx: st.hidx + 1, screen: st.hist[st.hidx + 1], histOpen: false } : { histOpen: false }); },
      toggleHist: (e) => { if (e) e.preventDefault(); setState(st => ({ histOpen: !st.histOpen })); },
      histOpen: s.histOpen,
      histItems: s.hist.map((id, i) => ({
        label: (items.find(x => x.id === id) || { label: id }).label,
        bg: i === s.hidx ? 'var(--color-neutral-200)' : 'transparent',
        go: (e) => { if (e) e.preventDefault(); setState({ hidx: i, screen: id, histOpen: false }); }
      })),

      scAdmin: scr === 'admin', scDirection: scr === 'direction',
      scTeacher: scr === 'teacherDetail', scTeacherList: scr === 'teacher',
      scEval: scr === 'eval', scImport: scr === 'import', scCampaigns: scr === 'campaigns',
      scMl: scr === 'ml', scCriteria: scr === 'criteria', scMobile: scr === 'mobile',
      scTodo: false, todoLabel: (TODO[scr] || ['', ''])[1],
      ...extraVals(),
      goTeacher: go('teacherDetail'), goMl: go('ml'), goCriteria: go('criteria'),

      kpis: [
        { label: 'Score global moyen', value: '4,12', note: '+0,10 vs S2 2025 · sur 5' },
        { label: 'Taux de réponse', value: '68 %', note: '3 214 réponses sur 4 720 invitations' },
        { label: 'Enseignants suivis', value: '104', note: '7 départements, 312 cours' },
        { label: 'Alertes ouvertes', value: '9', note: '4 ponctualité · 5 performance' }
      ],
      ranking: [
        { name: 'K. Haddad', dept: 'Génie civil', score: '4,58', punct: '98 %', profile: 'Exceptionnel', w: '92%' },
        { name: 'L. Ferrand', dept: 'Informatique', score: '4,41', punct: '95 %', profile: 'Exceptionnel', w: '88%' },
        { name: 'S. Meddah', dept: 'Informatique', score: '4,12', punct: '91 %', profile: 'En progression', w: '82%' },
        { name: 'N. Ouali', dept: 'Sciences éco.', score: '3,94', punct: '88 %', profile: 'En progression', w: '79%' },
        { name: 'R. Delmas', dept: 'Gestion', score: '3,61', punct: '76 %', profile: 'En progression', w: '72%' },
        { name: 'T. Amrani', dept: 'Lettres', score: '2,88', punct: '64 %', profile: 'À accompagner', w: '58%' }
      ].map(r => ({ ...r, tag: r.profile === 'Exceptionnel' ? 'tag-exc' : (r.profile === 'En progression' ? 'tag-prog' : 'tag-watch') })),
      response: [
        { name: 'Informatique', pct: '81%' }, { name: 'Génie civil', pct: '74%' },
        { name: 'Sciences éco.', pct: '69%' }, { name: 'Gestion', pct: '58%' },
        { name: 'Lettres', pct: '47%' }
      ],
      trendLine: trend.map((v, i) => tx(i) + ',' + ty(v)).join(' '),
      trendDots: trend.map((v, i) => ({ x: tx(i), y: ty(v) })),

      alerts: [
        { level: 'Critique', when: 'il y a 2 h', title: 'Trois retards en un mois — T. Amrani', body: "Seuil configuré dépassé (3 retards / mois). Direction et RH notifiés automatiquement.", bg: 'var(--color-tile)', bd: 'var(--color-divider)', tag: 'tag-crit' },
        { level: 'À surveiller', when: 'hier', title: 'Taux de réponse insuffisant — Lettres', body: "47 % à quatre jours de la clôture. Une relance ciblée est proposée.", bg: 'var(--color-tile)', bd: 'var(--color-divider)', tag: 'tag-surv' },
        { level: 'Information', when: 'il y a 3 j', title: 'Écart anormal détecté — Gestion', body: "Baisse de 0,34 sur le critère Clarté par rapport à la tendance des trois derniers semestres.", bg: 'transparent', bd: 'var(--color-divider)', tag: 'tag-info' }
      ],
      semesters: ['S1 23', 'S2 23', 'S1 24', 'S2 24', 'S1 25', 'S2 25'],
      heatRows: heat.map(([name, cells]) => ({
        name,
        cells: cells.map(v => {
          const step = Math.min(7, Math.max(0, Math.round((v - 3.2) / 1.3 * 7)));
          return { v: v.toFixed(1).replace('.', ','), bg: ramp[step], fg: step > 4 ? '#f2f2f3' : '#1d1f20' };
        })
      })),
      profiles: [
        { name: 'Exceptionnel — score > 80 %', count: 21, w: '20%' },
        { name: 'En progression — 60 à 80 %', count: 68, w: '65%' },
        { name: 'À accompagner — < 60 %', count: 15, w: '15%' }
      ],

      triple: [
        { name: 'Notes étudiants', val: '4,12', w: '82%', color: '#2c455d' },
        { name: 'Auto-évaluation', val: '4,38', w: '88%', color: '#94bce3' },
        { name: 'Audit interne', val: '3,86', w: '77%', color: '#7a7a7d' }
      ],
      radarRings: [1, 2, 3, 4].map(k => ({ pts: poly([5, 5, 5, 5, 5, 5], R * k / 4) })),
      radarAxes: CRIT.map((c, i) => {
        const a = (-90 + i * 60) * Math.PI / 180;
        return { x: (170 + R * Math.cos(a)).toFixed(1), y: (140 + R * Math.sin(a)).toFixed(1) };
      }),
      radarLabels: CRIT.map((c, i) => {
        const a = (-90 + i * 60) * Math.PI / 180, r = R + 24;
        const x = 170 + r * Math.cos(a), y = 140 + r * Math.sin(a);
        return { label: c.label, x: x.toFixed(0), y: (y + 4).toFixed(0), anchor: x > 178 ? 'start' : (x < 162 ? 'end' : 'middle') };
      }),
      radarStudents: poly([4.2, 4.5, 3.6, 3.9, 4.4, 3.4], R),
      radarAuto: poly([4.6, 4.4, 4.2, 4.5, 4.3, 4.0], R),
      radarAudit: poly([4.0, 4.2, 3.8, 3.5, 4.1, 3.6], R),
      comments: [
        { text: "Les travaux pratiques sont très bien préparés, on voit la progression d'une séance à l'autre.", meta: 'M1 Informatique · 14 commentaires similaires' },
        { text: "Le rythme est parfois trop rapide sur la fin du cours, il manque un temps de synthèse.", meta: 'L3 Informatique · 9 commentaires similaires' },
        { text: "Toujours joignable par courriel, réponses en moins de 24 h.", meta: 'M1 Informatique · 6 commentaires similaires' }
      ],
      recos: [
        { title: 'Gestion du temps de séance', crit: 'Ponctualité', meta: 'Atelier interne · 6 h · prochaine session 12 mars' },
        { title: 'Classe inversée et outils numériques', crit: 'Innovation', meta: 'Catalogue externe · 14 h · certifiant' },
        { title: 'Techniques de synthèse en fin de cours', crit: 'Clarté', meta: 'Auto-formation · 2 h · vidéo' }
      ],

      formPct: Math.round(answered / 6 * 100) + '%',
      formLabel: answered + ' critères sur 6',
      criteriaForm: CRIT.map(c => ({
        label: c.label, hint: c.hint, weight: w[c.key],
        options: LIKERT.map((lab, i) => {
          const n = i + 1, on = s.answers[c.key] === n;
          return {
            n, label: lab,
            border: on ? ACC : 'var(--color-divider)',
            bg: on ? 'color-mix(in srgb, ' + ACC + ' 12%, transparent)' : 'transparent',
            pick: () => setState(st => ({ answers: { ...st.answers, [c.key]: n } }))
          };
        })
      })),

      steps: [
        ['1', 'Fichier', 'enseignants_2026.xlsx'], ['2', 'Mapping', 'en cours'],
        ['3', 'Validation', '17 anomalies'], ['4', 'Import', 'en attente']
      ].map(([i, label, note], k) => ({
        i, label, note,
        bg: k === 1 ? 'color-mix(in srgb, ' + ACC + ' 10%, transparent)' : 'var(--color-bg)',
        num: k <= 1 ? ACC : 'var(--color-neutral-500)'
      })),
      nextStep: () => setState({ screen: 'import' }),
      mapping: [
        { src: 'Nom_Ens', sample: 'Meddah', target: 'nom_enseignant', conf: '98 %', tag: 'tag-accent' },
        { src: 'Prenom', sample: 'Samir', target: 'prenom_enseignant', conf: '96 %', tag: 'tag-accent' },
        { src: 'Mail', sample: 's.meddah@univ.fr', target: 'email', conf: '91 %', tag: 'tag-accent' },
        { src: 'Dept', sample: 'INFO', target: 'departement', conf: '74 %', tag: 'tag-neutral' },
        { src: 'Charge_H', sample: '128', target: 'volume_horaire', conf: '52 %', tag: 'tag-outline' }
      ],
      errors: [
        { n: '7', label: 'Adresses e-mail invalides', rows: 'lignes 44, 91, 132, 187, 340, 512, 908' },
        { n: '5', label: 'Doublons détectés', rows: 'même e-mail sur deux lignes' },
        { n: '3', label: 'Champ obligatoire manquant', rows: 'département absent' },
        { n: '2', label: 'Format de date invalide', rows: 'date_recrutement' }
      ],
      history: [
        { date: '18 août 2026', file: 'cours_S1_2026.csv', status: 'Succès', tag: 'tag-accent' },
        { date: '02 août 2026', file: 'etudiants_L3.xlsx', status: 'Partiel', tag: 'tag-neutral' },
        { date: '21 juil. 2026', file: 'enseignants_v2.xlsx', status: 'Échec', tag: 'tag-outline' },
        { date: '30 juin 2026', file: 'export_erp.csv', status: 'Succès', tag: 'tag-accent' }
      ],

      campaigns: [
        { name: 'Évaluation fin de semestre — S1 2026', status: 'En cours', tag: 'tag-accent', close: '28 août', scope: '7 départements · 312 cours · 4 720 invitations', pct: '68%', resp: '3 214 / 4 720 · 68 %' },
        { name: 'Évaluation à mi-parcours — Informatique', status: 'Clôturée', tag: 'tag-neutral', close: '12 juin', scope: '1 département · 42 cours · 890 invitations', pct: '81%', resp: '721 / 890 · 81 %' },
        { name: 'Audit interne — Gestion', status: 'Programmée', tag: 'tag-outline', close: '15 sept.', scope: '1 département · 6 auditeurs · 28 séances', pct: '0%', resp: 'démarrage 1ᵉʳ sept.' }
      ],
      sequence: [
        { when: 'J+0', label: 'Envoi initial', note: 'lien unique par étudiant, TTL 7 jours' },
        { when: 'J+3', label: 'Première relance', note: 'uniquement aux non-répondants' },
        { when: 'J+5', label: 'Seconde relance', note: 'dernier rappel, plafonné à 2' },
        { when: 'J+7', label: 'Clôture automatique', note: 'calcul des scores et mise en cache' }
      ],

      bias: [
        { hash: 'a91f…3c7', avg: '2,1', z: '−2,8', kind: 'sévère' },
        { hash: 'c04b…9e1', avg: '4,9', z: '+2,6', kind: 'indulgent' },
        { hash: '7d2e…41a', avg: '2,3', z: '−2,3', kind: 'sévère' },
        { hash: 'f38c…0b5', avg: '4,8', z: '+2,1', kind: 'indulgent' }
      ],
      predPast: [3.62, 3.74, 3.81, 3.95, 4.02].map((v, i) => (i * 48) + ',' + (140 - (v - 3.4) * 120).toFixed(0)).join(' '),
      predFuture: '192,66 240,54 288,44 336,36',
      predBand: '192,66 240,44 288,28 336,16 336,56 288,60 240,66 192,66',
      features: [
        { name: 'Ponctualité', w: '34%' }, { name: 'Clarté', w: '27%' },
        { name: 'Interaction', w: '21%' }, { name: 'Taux de réponse', w: '18%' }
      ],
      clusters: [
        { size: 24, name: 'Innovants', body: "Notes élevées en innovation et interaction, ponctualité moyenne.", strong: 'Innovation' },
        { size: 31, name: 'Méthodiques', body: "Ponctualité et structure fortes, innovation plus basse.", strong: 'Ponctualité' },
        { size: 34, name: 'Pédagogues', body: "Clarté et disponibilité au-dessus de la médiane du département.", strong: 'Clarté' },
        { size: 15, name: 'À accompagner', body: "Écarts sur au moins trois critères, tendance en baisse.", strong: '—' }
      ],

      weights: CRIT.map(c => ({
        label: c.label, pct: w[c.key] + ' %', value: w[c.key],
        set: (e) => { const v = +e.target.value; setState(st => ({ weights: { ...st.weights, [c.key]: v } })); },
        inc: () => setState(st => ({ weights: { ...st.weights, [c.key]: Math.min(40, st.weights[c.key] + 5) } })),
        dec: () => setState(st => ({ weights: { ...st.weights, [c.key]: Math.max(0, st.weights[c.key] - 5) } }))
      })),
      weightTotal: total,
      weightInvalid: total !== 100,
      weightTag: total === 100 ? 'tag-accent' : 'tag-outline',
      weightMsg: total === 100 ? 'somme valide' : 'la somme doit faire 100 %',
      thresholds: [
        { name: 'Exceptionnel', range: '> 80 %' },
        { name: 'En progression', range: '60 – 80 %' },
        { name: 'À accompagner', range: '< 60 %' }
      ],
      versions: [
        { tag: 'v3 · actif', label: 'Pédagogie 25 % · Clarté 20 %', meta: 'A. Benali — 14 août 2026' },
        { tag: 'v2', label: 'Pédagogie 30 % · Ponctualité 10 %', meta: 'A. Benali — 3 févr. 2026' },
        { tag: 'v1', label: 'Pondération uniforme', meta: 'Import initial — 12 sept. 2025' }
      ],

      mobileScale: LIKERT.map((lab, i) => ({
        n: i + 1, label: lab,
        border: i === 3 ? ACC : 'var(--color-divider)',
        bg: i === 3 ? 'color-mix(in srgb, ' + ACC + ' 12%, transparent)' : 'transparent'
      })),
      mobileCriteria: [
        { label: 'Pédagogie', val: '4,2', w: '84%' }, { label: 'Clarté', val: '4,5', w: '90%' },
        { label: 'Ponctualité', val: '3,6', w: '72%' }, { label: 'Innovation', val: '3,9', w: '78%' },
        { label: 'Interaction', val: '4,4', w: '88%' }, { label: 'Disponibilité', val: '3,4', w: '68%' }
      ]
    };
  }




// --- Amorçage : parse le template une seule fois, puis rend l'écran courant à chaque changement d'état ---
let templateAst = null;
const root = document.getElementById("app");

function render() {
  const ctx = renderVals();
  const nodes = renderChildren(templateAst, ctx, false);
  root.innerHTML = "";
  for (const node of nodes) root.appendChild(node);
}

function setState(updater) {
  const partial = typeof updater === "function" ? updater(state) : updater;
  state = Object.assign({}, state, partial);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  const tplEl = document.getElementById("tpl");
  templateAst = parseTemplate(tplEl.textContent);
  render();
});

})();
