import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, AppConfigView, AppLocale, ScanAnalysis, ScanListItem, ScanRecord, SkillLocalPriority, SkillRecord } from '../src-core/types.ts';
import { getSkillLocalPriority } from '../src-core/analysis/local-priority.ts';
import { coerceValidatedScanRecord } from '../src-core/validation/scan-schema.ts';

const severityOrder = { high: 3, medium: 2, low: 1 } as const;
const localeStorageKey = 'skill-doctor-locale';

type Locale = AppLocale;
type TranslationValues = Record<string, string | number>;
type StatusState = {
  key: TranslationKey;
  values?: TranslationValues;
};

const emptyConfig: AppConfigView = {
  apiKey: '',
  hasApiKey: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKeyHint: undefined,
  model: 'gpt-5.4',
  provider: 'openai',
  scan: {
    maxDepth: 5,
    includeProjectRoots: true,
    includeGlobalRoots: true,
    enableFallbackDiscovery: true,
    extraRoots: [],
  },
  analysis: {
    timeoutMs: 20000,
    maxSkills: 12,
  },
};

type ConnectionTestResult = {
  ok?: boolean;
  status: string;
  message: string;
  model?: string;
};

type ScanTargetMode = 'select' | 'input';
type DirectoryBrowserState = {
  rootPath: string;
  currentPath: string;
  parentPath: string | null;
  directories: Array<{ name: string; path: string }>;
};

type LoadScanOptions = {
  successStatus?: StatusState;
};

type DemoDatasetKey = 'default' | 'openclaw';

const translations = {
  en: {
    language: 'Language',
    english: 'English',
    chinese: '中文',
    openSettings: 'Settings',
    openHistory: 'History',
    closePanel: 'Close',
    quickActions: 'Quick actions',
    focusWorkspace: 'Focus workspace',
    currentSnapshot: 'Current snapshot',
    settingsDrawerTitle: 'Global settings',
    historyDrawerTitle: 'Scan history',
    loadingLocalData: 'Loading local data…',
    loadedStoredCount: 'Loaded {count} stored scan record{suffix}.',
    noStoredScanDemo: 'No stored scan found. Showing demo dataset.',
    failedInitialState: 'Failed to load initial state: {message}',
    loadedSnapshot: 'Loaded snapshot {id}.',
    failedSnapshot: 'Failed to load snapshot {id}.',
    runningScan: 'Running scan and storing immutable snapshot…',
    createdSnapshot: 'Created snapshot {id}.',
    deleteConfirm: 'Delete scan {id}?',
    deletedSnapshot: 'Deleted snapshot {id}.',
    savedConfig: 'Saved global configuration to ~/.skill-doctor/config.json.',
    testingConnection: 'Testing model connection…',
    connectionOk: 'Model connection test succeeded.',
    connectionFail: 'Model connection test failed: {message}',
    metricSkills: 'skills',
    metricConflicts: 'conflicts',
    metricHighRisk: 'high risk',
    inspectorEyebrow: 'React + TypeScript Inspector',
    heroTitle: 'Audit agent skills like infrastructure, not hidden prompt glue.',
    heroBody: 'Skill Doctor now runs on typed scan records, typed config state, and a typed React UI over the local Node API.',
    useStoredHistory: 'Use stored history',
    useDemoDataset: 'Use demo dataset',
    demoDatasetGeneric: 'Generic demo',
    demoDatasetOpenClaw: 'OpenClaw demo',
    demoDatasetLabel: 'Demo dataset',
    dataSource: 'Data source',
    storedScanHistory: 'Stored scan history',
    demoDataset: 'Demo dataset',
    generatedProject: 'Generated {date} · project {project}',
    runEyebrow: 'Run',
    createScanSnapshot: 'Create scan snapshot',
    projectPath: 'Project path',
    projectPathMode: 'Path mode',
    selectPathMode: 'Select',
    inputPathMode: 'Input',
    browseProjectPath: 'Browse project path',
    chooseCurrentFolder: 'Use current folder',
    browseParent: 'Up one level',
    recentPaths: 'Recent paths',
    loadingDirectories: 'Loading directories…',
    noDirectoriesFound: 'No subdirectories found here.',
    projectPathPlaceholder: '/abs/path/to/project',
    working: 'Working…',
    runNewScan: 'Run new scan',
    settingsEyebrow: 'Settings',
    globalModelConfig: 'Global model config',
    provider: 'Provider',
    baseUrl: 'Base URL',
    model: 'Model',
    apiKey: 'API key',
    maxDepth: 'Max depth',
    enableFallbackDiscovery: 'Enable fallback discovery',
    includeGlobalRoots: 'Include global roots',
    includeProjectRoots: 'Include project roots',
    extraScanRoots: 'Extra scan roots',
    extraScanRootsHint: 'One absolute path per line. These roots are treated as user-configured scan sources.',
    analysisTimeout: 'Analysis timeout ms',
    analysisMaxSkills: 'Analysis max skills',
    saveSettings: 'Save settings',
    testConnection: 'Test connection',
    apiKeyConfigured: 'API key status',
    apiKeyConfiguredYes: 'Configured',
    apiKeyConfiguredNo: 'Not configured',
    apiKeyLeaveBlank: 'Leave blank to keep the currently stored key unchanged.',
    noModelConfigured: 'no model configured',
    mandatoryAnalysisHint: 'Every new scan runs through the model analysis stage. Configure the provider, base URL, model, and API key here.',
    modelLayerEyebrow: 'Model Layer',
    enhancedAnalysis: 'Enhanced analysis',
    missing: 'missing',
    findings: 'Findings',
    recommendations: 'Recommendations',
    aiSpotlights: 'AI Spotlights',
    overviewEyebrow: 'Overview',
    workspaceHealth: 'Workspace health',
    totalSkills: 'Total skills',
    projectSkills: 'Project skills',
    globalSkills: 'Global skills',
    systemSkills: 'System skills',
    conflictCount: 'Conflict count',
    highRiskSkills: 'High risk skills',
    rootsEyebrow: 'Roots',
    scannedDirectories: 'Scanned directories',
    notAvailableShort: 'n/a',
    skillsSuffix: '{count} skills',
    noSkillRoots: 'No skill roots were found.',
    historyEyebrow: 'History',
    storedScanRecords: 'Stored scan records',
    searchProjectIdPath: 'Search project, id, or path',
    allRecords: 'All records',
    validOnly: 'Valid only',
    brokenOnly: 'Broken only',
    historyFromDate: 'History from date',
    historyToDate: 'History to date',
    validRecords: 'Valid records',
    brokenRecords: 'Broken records',
    conflicts: 'Conflicts',
    unknownProject: 'unknown-project',
    broken: 'broken',
    brokenSnapshotWarning: 'This snapshot no longer matches the expected schema and cannot be opened safely.',
    invalid: 'Invalid',
    open: 'Open',
    deleteBroken: 'Delete broken',
    delete: 'Delete',
    noStoredScanMatched: 'No stored scan matched the current filter.',
    inventoryEyebrow: 'Inventory',
    installedSkills: 'Installed skills',
    searchNameTriggerPath: 'Search name, trigger, path',
    allScopes: 'All scopes',
    projectScope: 'Project',
    globalScope: 'Global',
    systemScope: 'System',
    noDescriptionParsed: 'No description parsed.',
    riskSuffix: '{severity} risk',
    noSkillsMatched: 'No skills matched the current filters.',
    detailEyebrow: 'Detail',
    selectedSkill: 'Selected skill',
    storedSnapshotInvalid: 'Stored snapshot is invalid',
    invalidSnapshotHelp: 'Delete this broken record from history, or switch to another snapshot.',
    selectSkillHelp: 'Select a skill to inspect its precedence, files, risk profile, and compatibility.',
    identityEyebrow: 'Identity',
    precedenceLabel: 'precedence {value}',
    triggers: 'Triggers',
    none: 'none',
    compatibility: 'Compatibility',
    riskFindings: 'Risk findings',
    localPrioritySummary: 'Local priority summary',
    totalPriorityScore: 'Total priority score',
    riskScore: 'Risk score',
    issueScore: 'Issue score',
    scopeBonus: 'Scope bonus',
    riskBreakdown: 'Risk breakdown',
    issueBreakdown: 'Issue breakdown',
    localPriorityLegacy: 'This snapshot predates persisted local-priority metadata. The breakdown below was reconstructed locally.',
    noRiskPatterns: 'No risky patterns found.',
    aiSpotlight: 'AI spotlight',
    noModelSpotlight: 'No model spotlight for this skill in the current scan.',
    files: 'Files',
    resolutionChain: 'Resolution chain',
    noCompetingSkill: 'No competing skill with the same normalized key.',
    suggestedFix: 'Suggested fix:',
    noConflictsDetected: 'No conflicts detected.',
    resolutionEyebrow: 'Resolution',
    precedenceChains: 'Precedence chains',
    winner: 'winner: {name}',
    noPrecedenceChains: 'No precedence chains to show.',
    analysisCompleted: 'Model analysis completed at {date}.',
    legacyDisabled: 'This is a legacy snapshot from before model analysis became mandatory.',
    analysisMissingConfig: 'Model analysis is mandatory, but apiKey, baseUrl, or model is missing.',
    analysisFailed: 'Model analysis failed: {message}',
    noAnalysisResult: 'No model analysis result available.',
  },
  'zh-CN': {
    language: '语言',
    english: 'English',
    chinese: '中文',
    openSettings: '设置',
    openHistory: '历史',
    closePanel: '关闭',
    quickActions: '快捷操作',
    focusWorkspace: '聚焦工作区',
    currentSnapshot: '当前快照',
    settingsDrawerTitle: '全局设置',
    historyDrawerTitle: '扫描历史',
    loadingLocalData: '正在加载本地数据…',
    loadedStoredCount: '已加载 {count} 条历史扫描记录{suffix}。',
    noStoredScanDemo: '没有找到历史扫描，正在展示演示数据。',
    failedInitialState: '初始化加载失败：{message}',
    loadedSnapshot: '已加载快照 {id}。',
    failedSnapshot: '加载快照 {id} 失败。',
    runningScan: '正在执行扫描并保存不可变快照…',
    createdSnapshot: '已创建快照 {id}。',
    deleteConfirm: '确认删除扫描 {id} 吗？',
    deletedSnapshot: '已删除快照 {id}。',
    savedConfig: '已将全局配置保存到 ~/.skill-doctor/config.json。',
    testingConnection: '正在测试模型连接…',
    connectionOk: '模型连接测试成功。',
    connectionFail: '模型连接测试失败：{message}',
    metricSkills: '技能数',
    metricConflicts: '冲突数',
    metricHighRisk: '高风险',
    inspectorEyebrow: 'React + TypeScript 检查器',
    heroTitle: '像审计基础设施一样审计 agent skills，而不是把它们当成隐形提示词胶水。',
    heroBody: 'Skill Doctor 现在基于类型化扫描记录、类型化配置状态，以及运行在本地 Node API 之上的类型化 React UI。',
    useStoredHistory: '使用历史记录',
    useDemoDataset: '使用演示数据',
    demoDatasetGeneric: '通用演示',
    demoDatasetOpenClaw: 'OpenClaw 演示',
    demoDatasetLabel: '演示数据集',
    dataSource: '数据来源',
    storedScanHistory: '历史扫描记录',
    demoDataset: '演示数据集',
    generatedProject: '生成时间 {date} · 项目 {project}',
    runEyebrow: '执行',
    createScanSnapshot: '创建扫描快照',
    projectPath: '项目路径',
    projectPathMode: '路径模式',
    selectPathMode: '选择',
    inputPathMode: '输入',
    browseProjectPath: '浏览项目路径',
    chooseCurrentFolder: '使用当前目录',
    browseParent: '返回上一级',
    recentPaths: '最近使用路径',
    loadingDirectories: '正在加载目录…',
    noDirectoriesFound: '当前目录下没有子目录。',
    projectPathPlaceholder: '/abs/path/to/project',
    working: '处理中…',
    runNewScan: '执行新扫描',
    settingsEyebrow: '设置',
    globalModelConfig: '全局模型配置',
    provider: '提供方',
    baseUrl: 'Base URL',
    model: '模型',
    apiKey: 'API Key',
    maxDepth: '最大深度',
    enableFallbackDiscovery: '启用兜底发现',
    includeGlobalRoots: '包含全局目录',
    includeProjectRoots: '包含项目目录',
    extraScanRoots: '额外扫描目录',
    extraScanRootsHint: '每行一个绝对路径。这些目录会被视为用户配置的扫描来源。',
    analysisTimeout: '分析超时毫秒数',
    analysisMaxSkills: '分析技能上限',
    saveSettings: '保存设置',
    testConnection: '测试连接',
    apiKeyConfigured: 'API key 状态',
    apiKeyConfiguredYes: '已配置',
    apiKeyConfiguredNo: '未配置',
    apiKeyLeaveBlank: '留空表示保留当前已保存的 key，不会覆盖。',
    noModelConfigured: '未配置模型',
    mandatoryAnalysisHint: '每次新扫描都会进入模型分析阶段，请在这里配置 provider、base URL、model 和 API key。',
    modelLayerEyebrow: '模型层',
    enhancedAnalysis: '增强分析',
    missing: '缺失',
    findings: '发现项',
    recommendations: '建议项',
    aiSpotlights: 'AI 聚焦',
    overviewEyebrow: '总览',
    workspaceHealth: '工作区健康度',
    totalSkills: '技能总数',
    projectSkills: '项目技能',
    globalSkills: '全局技能',
    systemSkills: '系统技能',
    conflictCount: '冲突数',
    highRiskSkills: '高风险技能',
    rootsEyebrow: '目录根',
    scannedDirectories: '扫描目录',
    notAvailableShort: '无',
    skillsSuffix: '{count} 个技能',
    noSkillRoots: '没有找到任何技能根目录。',
    historyEyebrow: '历史',
    storedScanRecords: '历史扫描记录',
    searchProjectIdPath: '搜索项目、id 或路径',
    allRecords: '全部记录',
    validOnly: '仅有效',
    brokenOnly: '仅损坏',
    historyFromDate: '历史开始日期',
    historyToDate: '历史结束日期',
    validRecords: '有效记录',
    brokenRecords: '损坏记录',
    conflicts: '冲突数',
    unknownProject: '未知项目',
    broken: '损坏',
    brokenSnapshotWarning: '该快照已不再符合预期 schema，无法安全打开。',
    invalid: '无效',
    open: '打开',
    deleteBroken: '删除损坏项',
    delete: '删除',
    noStoredScanMatched: '没有历史扫描匹配当前筛选条件。',
    inventoryEyebrow: '清单',
    installedSkills: '已安装技能',
    searchNameTriggerPath: '搜索名称、触发词或路径',
    allScopes: '全部范围',
    projectScope: '项目',
    globalScope: '全局',
    systemScope: '系统',
    noDescriptionParsed: '未解析到描述。',
    riskSuffix: '{severity} 风险',
    noSkillsMatched: '没有技能匹配当前筛选条件。',
    detailEyebrow: '详情',
    selectedSkill: '当前技能',
    storedSnapshotInvalid: '历史快照无效',
    invalidSnapshotHelp: '请删除这条损坏记录，或切换到其他快照。',
    selectSkillHelp: '选择一个技能，以查看其优先级、文件、风险画像和兼容性。',
    identityEyebrow: '身份',
    precedenceLabel: '优先级 {value}',
    triggers: '触发词',
    none: '无',
    compatibility: '兼容性',
    riskFindings: '风险发现',
    localPrioritySummary: '本地优先级摘要',
    totalPriorityScore: '优先级总分',
    riskScore: '风险得分',
    issueScore: '问题得分',
    scopeBonus: '范围加分',
    riskBreakdown: '风险拆解',
    issueBreakdown: '问题拆解',
    localPriorityLegacy: '这条快照早于本地优先级元数据落盘版本，以下拆解为前端本地重算结果。',
    noRiskPatterns: '未发现高风险模式。',
    aiSpotlight: 'AI 聚焦',
    noModelSpotlight: '当前扫描中没有针对该技能的模型聚焦结果。',
    files: '文件',
    resolutionChain: '解析链路',
    noCompetingSkill: '没有发现使用相同规范化 key 的竞争技能。',
    suggestedFix: '建议修复：',
    noConflictsDetected: '未发现冲突。',
    resolutionEyebrow: '解析',
    precedenceChains: '优先级链路',
    winner: '胜出者：{name}',
    noPrecedenceChains: '没有可展示的优先级链路。',
    analysisCompleted: '模型分析已于 {date} 完成。',
    legacyDisabled: '这是模型分析强制开启之前留下的历史快照。',
    analysisMissingConfig: '模型分析是必经阶段，但 apiKey、baseUrl 或 model 缺失。',
    analysisFailed: '模型分析失败：{message}',
    noAnalysisResult: '没有可用的模型分析结果。',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => readInitialLocale());
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [demoScans, setDemoScans] = useState<Record<DemoDatasetKey, ScanRecord | null>>({ default: null, openclaw: null });
  const [selectedDemoDataset, setSelectedDemoDataset] = useState<DemoDatasetKey>('default');
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [scanLoadError, setScanLoadError] = useState<string | null>(null);
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'healthy' | 'broken'>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [scanTargetMode, setScanTargetMode] = useState<ScanTargetMode>('input');
  const [directoryBrowser, setDirectoryBrowser] = useState<DirectoryBrowserState | null>(null);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [source, setSource] = useState<'history' | 'demo'>('history');
  const [status, setStatus] = useState<StatusState>({ key: 'loadingLocalData' });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfigView>(emptyConfig);
  const [scanTarget, setScanTarget] = useState('.');
  const [isBusy, setIsBusy] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const settingsFormRef = useRef<HTMLFormElement | null>(null);
  const t = (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setIsHistoryOpen(false);
      setIsSettingsOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const [configData, scansData, demoData, openClawDemoData] = await Promise.all([
          requestJson<AppConfigView>('/api/config').catch(() => emptyConfig),
          requestJson<ScanListItem[]>('/api/scans').catch(() => []),
          fetchJson<ScanRecord>('/data/demo-scan.json'),
          fetchJson<ScanRecord>('/data/demo-scan-openclaw.json').catch(() => null),
        ]);

        if (!active) return;
        setConfig(configData ?? emptyConfig);
        setScans(scansData ?? []);
        setDemoScans({
          default: demoData ? coerceValidatedScanRecord(demoData, 'demo dataset') : null,
          openclaw: openClawDemoData ? coerceValidatedScanRecord(openClawDemoData, 'openclaw demo dataset') : null,
        });

        if ((scansData ?? []).length) {
          await loadScan(scansData[0].id, {
            successStatus: {
              key: 'loadedStoredCount',
              values: {
                count: scansData.length,
                suffix: scansData.length === 1 ? '' : 's',
              },
            },
          });
          if (!active) return;
        } else {
          setSource('demo');
          setStatus({ key: 'noStoredScanDemo' });
        }
      } catch (error) {
        if (!active) return;
        setStatus({ key: 'failedInitialState', values: { message: messageOf(error) } });
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  const activeDemoScan = demoScans[selectedDemoDataset];
  const data = source === 'demo' ? activeDemoScan : currentScan;
  const analysis = data?.analysis ?? null;
  const summary = data?.summary ?? {
    totalSkills: 0,
    projectSkills: 0,
    globalSkills: 0,
    systemSkills: 0,
    highRiskSkills: 0,
    conflictCount: 0,
    rootCount: 0,
  };

  useEffect(() => {
    if (!data?.skills?.length) return;
    if (data.skills.some((skill) => skill.id === selectedSkillId)) return;
    setSelectedSkillId(data.skills[0].id);
  }, [data, selectedSkillId]);

  const filteredSkills = useMemo(() => {
    const skills = data?.skills ?? [];
    return skills.filter((skill) => {
      const haystack = `${skill.name} ${skill.description} ${skill.path} ${skill.triggers.join(' ')}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase().trim());
      const matchesScope = scope === 'all' || skill.scope === scope;
      return matchesSearch && matchesScope;
    });
  }, [data, scope, search]);

  const filteredHistory = useMemo(() => {
    return scans.filter((scan) => {
      const haystack = `${scan.id} ${scan.project?.name ?? ''} ${scan.project?.path ?? ''}`.toLowerCase();
      const matchesSearch = !historySearch || haystack.includes(historySearch.toLowerCase().trim());
      const matchesStatus =
        historyStatusFilter === 'all' ||
        (historyStatusFilter === 'broken' && scan.broken) ||
        (historyStatusFilter === 'healthy' && !scan.broken);
      const matchesDate = matchHistoryDateRange(scan.generatedAt, historyDateFrom, historyDateTo);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [historyDateFrom, historyDateTo, historySearch, historyStatusFilter, scans]);

  const historyMetrics = useMemo(() => {
    return filteredHistory.reduce(
      (accumulator, scan) => {
        if (scan.broken) {
          accumulator.broken += 1;
          return accumulator;
        }
        accumulator.healthy += 1;
        accumulator.conflicts += scan.summary?.conflictCount || 0;
        accumulator.highRiskSkills += scan.summary?.highRiskSkills || 0;
        return accumulator;
      },
      {
        healthy: 0,
        broken: 0,
        conflicts: 0,
        highRiskSkills: 0,
      },
    );
  }, [filteredHistory]);

  const recentProjectPaths = useMemo(() => {
    const values = new Set<string>();
    const result: string[] = [];
    for (const scan of scans) {
      const projectPath = scan.project?.path;
      if (!projectPath || scan.broken || projectPath === 'unknown-project' || values.has(projectPath)) continue;
      values.add(projectPath);
      result.push(projectPath);
      if (result.length >= 6) break;
    }
    return result;
  }, [scans]);

  const selectedSkill = useMemo(() => {
    return (data?.skills ?? []).find((item) => item.id === selectedSkillId) ?? null;
  }, [data, selectedSkillId]);

  const selectedChain = useMemo(() => {
    if (!selectedSkill) return null;
    return (data?.resolutionChains ?? []).find((item) => item.key === selectedSkill.groupKey) ?? null;
  }, [data, selectedSkill]);

  const selectedSkillSpotlight = useMemo(() => {
    if (!selectedSkill || !analysis?.skillSpotlights) return null;
    return analysis.skillSpotlights.find((item) => item.skillId === selectedSkill.id) ?? null;
  }, [analysis, selectedSkill]);

  const selectedLocalPriority = useMemo(() => {
    if (!selectedSkill) return null;
    return getSkillLocalPriority(selectedSkill);
  }, [selectedSkill]);

  async function loadScan(id: string, options: LoadScanOptions = {}) {
    setScanLoadError(null);
    setIsBusy(true);
    try {
      const record = await requestJson<ScanRecord>(`/api/scans/${encodeURIComponent(id)}`);
      setCurrentScan(record);
      setSource('history');
      setStatus(options.successStatus || { key: 'loadedSnapshot', values: { id } });
    } catch (error) {
      setCurrentScan(null);
      setSource('history');
      setScanLoadError(messageOf(error));
      setStatus({ key: 'failedSnapshot', values: { id } });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus({ key: 'runningScan' });
    try {
      const record = await requestJson<ScanRecord>('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: scanTarget || '.', analysisLanguage: locale }),
      });
      const scansData = await requestJson<ScanListItem[]>('/api/scans');
      setScans(scansData);
      setCurrentScan(record);
      setScanLoadError(null);
      setSource('history');
      setStatus({ key: 'createdSnapshot', values: { id: record.id } });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteScan(id: string) {
    if (!window.confirm(t('deleteConfirm', { id }))) return;
    setIsBusy(true);
    try {
      await requestJson(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const scansData = await requestJson<ScanListItem[]>('/api/scans');
      setScans(scansData);
      const deletedBrokenCurrent = scanLoadError && scans.some((scan) => scan.id === id && scan.broken);
      if (currentScan?.id === id || deletedBrokenCurrent) {
        if (scansData.length) {
          await loadScan(scansData[0].id);
        } else {
          setCurrentScan(null);
          setScanLoadError(null);
          setSource('demo');
        }
      }
      setStatus({ key: 'deletedSnapshot', values: { id } });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = readConfigForm(event.currentTarget, config);
    setIsBusy(true);
    try {
      const next = await requestJson<AppConfigView>('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setConfig(next);
      setStatus({ key: 'savedConfig' });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTestConnection() {
    if (!settingsFormRef.current) return;
    const payload = readConfigForm(settingsFormRef.current, config);
    setIsBusy(true);
    setConnectionTest({ status: 'running', message: t('testingConnection'), model: payload.model });
    try {
      const result = await requestJson<ConnectionTestResult>('/api/config/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setConnectionTest(result);
      setStatus(result.ok ? { key: 'connectionOk' } : { key: 'connectionFail', values: { message: result.message } });
    } finally {
      setIsBusy(false);
    }
  }

  async function loadDirectory(pathname?: string) {
    setIsDirectoryLoading(true);
    try {
      const url = pathname ? `/api/fs/directories?path=${encodeURIComponent(pathname)}` : '/api/fs/directories';
      const data = await requestJson<DirectoryBrowserState>(url);
      setDirectoryBrowser(data);
      setScanTarget(data.currentPath);
    } finally {
      setIsDirectoryLoading(false);
    }
  }

  const heroMetrics: Array<[string, number]> = [
    [t('metricSkills'), summary.totalSkills],
    [t('metricConflicts'), summary.conflictCount],
    [t('metricHighRisk'), summary.highRiskSkills],
  ];

  return (
    <div className="app-shell">
      <div className="backdrop backdrop-a" />
      <div className="backdrop backdrop-b" />
      <main className="shell">
        <section className="topbar">
          <div className="language-switcher panel inset">
            <span>{t('language')}</span>
            <div className="language-actions">
              <button className={`button secondary ${locale === 'en' ? 'active' : ''}`} type="button" onClick={() => setLocale('en')}>
                {t('english')}
              </button>
              <button className={`button secondary ${locale === 'zh-CN' ? 'active' : ''}`} type="button" onClick={() => setLocale('zh-CN')}>
                {t('chinese')}
              </button>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="button secondary" type="button" onClick={() => setIsHistoryOpen(true)}>
              {t('openHistory')}
            </button>
            <button className="button secondary" type="button" onClick={() => setIsSettingsOpen(true)}>
              {t('openSettings')}
            </button>
          </div>
        </section>
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">{t('inspectorEyebrow')}</p>
            <h1>{t('heroTitle')}</h1>
            <p className="lede">{t('heroBody')}</p>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={() => setSource('history')} disabled={!scans.length}>
                {t('useStoredHistory')}
              </button>
              <button className="button secondary" type="button" onClick={() => setSource('demo')} disabled={!activeDemoScan}>
                {t('useDemoDataset')}
              </button>
              <button className="button secondary" type="button" onClick={() => setIsHistoryOpen(true)}>
                {t('openHistory')}
              </button>
              <button className="button secondary" type="button" onClick={() => setIsSettingsOpen(true)}>
                {t('openSettings')}
              </button>
            </div>
          </div>
          <div className="hero-side panel inset">
            <div className="metric-stack">
              {heroMetrics.map(([label, value]) => (
                <div className="mini-metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="source-card">
              <span>{t('dataSource')}</span>
              <strong>{source === 'history' ? t('storedScanHistory') : t('demoDataset')}</strong>
              {source === 'demo' ? (
                <p>{t('demoDatasetLabel')}: {selectedDemoDataset === 'openclaw' ? t('demoDatasetOpenClaw') : t('demoDatasetGeneric')}</p>
              ) : null}
              <p>{t('generatedProject', { date: formatDate(data?.generatedAt, locale), project: data?.project?.path ?? data?.scannedProject ?? t('notAvailableShort') })}</p>
            </div>
            <div className="status-line">{t(status.key, status.values)}</div>
            <div className="hero-command-card">
              <span>{t('quickActions')}</span>
              <strong>{t('focusWorkspace')}</strong>
              <p>{t('currentSnapshot')}: {data?.id || t('notAvailableShort')}</p>
            </div>
          </div>
        </section>

        <section className="grid top-grid">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('runEyebrow')}</p>
                <h2>{t('createScanSnapshot')}</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleCreateScan}>
              <label>
                <span>{t('projectPathMode')}</span>
                <div className="segmented-control">
                  <button
                    className={`button secondary ${scanTargetMode === 'select' ? 'active' : ''}`}
                    type="button"
                    onClick={async () => {
                      setScanTargetMode('select');
                      if (!directoryBrowser) {
                        await loadDirectory();
                      } else if (scanTargetMode !== 'select') {
                        setScanTarget(directoryBrowser.currentPath);
                      }
                    }}
                  >
                    {t('selectPathMode')}
                  </button>
                  <button
                    className={`button secondary ${scanTargetMode === 'input' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setScanTargetMode('input')}
                  >
                    {t('inputPathMode')}
                  </button>
                </div>
              </label>
              <label>
                <span>{t('projectPath')}</span>
                {scanTargetMode === 'select' ? (
                  <div className="path-browser">
                    {recentProjectPaths.length ? (
                      <div className="path-browser-recent">
                        <span>{t('recentPaths')}</span>
                        <div className="tags">
                          {recentProjectPaths.map((projectPath) => (
                            <button
                              key={projectPath}
                              className={`tag-button ${scanTarget === projectPath ? 'active' : ''}`}
                              type="button"
                              onClick={() => {
                                setScanTarget(projectPath);
                                void loadDirectory(projectPath);
                              }}
                            >
                              {projectPath}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="path-browser-toolbar">
                      <input value={directoryBrowser?.currentPath || scanTarget} readOnly />
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => directoryBrowser?.parentPath && loadDirectory(directoryBrowser.parentPath)}
                        disabled={!directoryBrowser?.parentPath || isDirectoryLoading}
                      >
                        {t('browseParent')}
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => directoryBrowser?.currentPath && setScanTarget(directoryBrowser.currentPath)}
                        disabled={!directoryBrowser?.currentPath}
                      >
                        {t('chooseCurrentFolder')}
                      </button>
                    </div>
                    <div className="path-browser-list">
                      {isDirectoryLoading ? (
                        <div className="empty-state">{t('loadingDirectories')}</div>
                      ) : directoryBrowser?.directories?.length ? (
                        directoryBrowser.directories.map((directory) => (
                          <button
                            key={directory.path}
                            className={`path-browser-item ${scanTarget === directory.path ? 'active' : ''}`}
                            type="button"
                            onClick={() => {
                              setScanTarget(directory.path);
                              void loadDirectory(directory.path);
                            }}
                          >
                            <strong>{directory.name}</strong>
                            <small className="mono">{directory.path}</small>
                          </button>
                        ))
                      ) : (
                        <div className="empty-state">{t('noDirectoriesFound')}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <input value={scanTarget} onChange={(event) => setScanTarget(event.target.value)} placeholder={t('projectPathPlaceholder')} />
                )}
              </label>
              <div className="form-actions">
                <button className="button primary" type="submit" disabled={isBusy}>
                  {isBusy ? t('working') : t('runNewScan')}
                </button>
              </div>
            </form>
          </div>
          <div className="panel overview-panel">
            <div className="section-heading"><div><p className="eyebrow">{t('overviewEyebrow')}</p><h2>{t('workspaceHealth')}</h2></div></div>
            {source === 'demo' ? (
              <div className="filters">
                <button
                  className={`button secondary ${selectedDemoDataset === 'default' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedDemoDataset('default')}
                  disabled={!demoScans.default}
                >
                  {t('demoDatasetGeneric')}
                </button>
                <button
                  className={`button secondary ${selectedDemoDataset === 'openclaw' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedDemoDataset('openclaw')}
                  disabled={!demoScans.openclaw}
                >
                  {t('demoDatasetOpenClaw')}
                </button>
              </div>
            ) : null}
            <div className="metric-grid">
              <MetricCard label={t('totalSkills')} value={summary.totalSkills} />
              <MetricCard label={t('projectSkills')} value={summary.projectSkills} />
              <MetricCard label={t('globalSkills')} value={summary.globalSkills} />
              <MetricCard label={t('systemSkills')} value={summary.systemSkills} />
              <MetricCard label={t('conflictCount')} value={summary.conflictCount} />
              <MetricCard label={t('highRiskSkills')} value={summary.highRiskSkills} />
            </div>
          </div>
        </section>

        <section className="grid top-grid">
          <div className="panel">
            <div className="section-heading"><div><p className="eyebrow">{t('modelLayerEyebrow')}</p><h2>{t('enhancedAnalysis')}</h2></div></div>
            <div className="analysis-card">
              <p className="analysis-status">
                <span className={`badge ${analysis?.status === 'error' ? 'high' : analysis?.status === 'completed' ? 'low' : ''}`}>{analysis?.status || t('missing')}</span>
                <span>{analysis?.model || t('noModelConfigured')}</span>
              </p>
              <p>{analysisMessage(analysis, locale)}</p>
              {analysis?.summary ? <p className="analysis-summary">{analysis.summary}</p> : null}
              {analysis?.findings?.length ? <ListBlock title={t('findings')} items={analysis.findings} /> : null}
              {analysis?.recommendations?.length ? <ListBlock title={t('recommendations')} items={analysis.recommendations} /> : null}
              {analysis?.skillSpotlights?.length ? (
                <div>
                  <h3>{t('aiSpotlights')}</h3>
                  <div className="spotlight-list">
                    {analysis.skillSpotlights.map((item) => (
                      <button
                        key={`${item.skillId}-${item.label}`}
                        className={`spotlight-card ${item.skillId === selectedSkillId ? 'active' : ''}`}
                        type="button"
                        onClick={() => setSelectedSkillId(item.skillId)}
                      >
                        <span className="badge">{item.label}</span>
                        <strong>{skillName(data, item.skillId)}</strong>
                        <p>{item.rationale}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="panel">
            <div className="section-heading"><div><p className="eyebrow">{t('rootsEyebrow')}</p><h2>{t('scannedDirectories')}</h2></div></div>
            <div className="root-list">
              {(data?.roots ?? []).length ? data!.roots.map((root) => (
                <article className="root-card" key={`${root.path}-${root.scope}`}>
                  <header>
                    <strong>{root.label}</strong>
                    <div className="badges">
                      <span className={`badge ${root.scope}`}>{root.scope}</span>
                      <span className="badge">{root.agent}</span>
                      <span className="badge">{root.confidence || t('notAvailableShort')}</span>
                      <span className="badge">{t('skillsSuffix', { count: root.skillsCount ?? 0 })}</span>
                    </div>
                  </header>
                  <p className="mono">{root.path}</p>
                </article>
              )) : <div className="empty-state">{t('noSkillRoots')}</div>}
            </div>
          </div>
        </section>

        <section className="grid lower-grid">
          <div className="panel wide">
            <div className="section-heading with-controls">
              <div><p className="eyebrow">{t('inventoryEyebrow')}</p><h2>{t('installedSkills')}</h2></div>
              <div className="filters">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchNameTriggerPath')} />
                <select value={scope} onChange={(event) => setScope(event.target.value)}>
                  <option value="all">{t('allScopes')}</option>
                  <option value="project">{t('projectScope')}</option>
                  <option value="global">{t('globalScope')}</option>
                  <option value="system">{t('systemScope')}</option>
                </select>
              </div>
            </div>
            <div className="skills-list">
              {filteredSkills.length ? filteredSkills.map((skill) => {
                const topSeverity = topRiskSeverity(skill);
                return (
                  <article className={`skill-row ${skill.id === selectedSkillId ? 'active' : ''}`} key={skill.id} onClick={() => setSelectedSkillId(skill.id)}>
                    <header>
                      <strong>{skill.name}</strong>
                      <div className="badges">
                        <span className={`badge ${skill.scope}`}>{skill.scope}</span>
                        <span className="badge">{skill.agent}</span>
                        {skill.rootConfidence ? <span className="badge">{skill.rootConfidence}</span> : null}
                        {topSeverity ? <span className={`badge ${topSeverity}`}>{t('riskSuffix', { severity: topSeverity })}</span> : null}
                      </div>
                    </header>
                    <p>{skill.description || t('noDescriptionParsed')}</p>
                    <div className="skill-meta">
                      <small className="mono">{skill.path}</small>
                      <div className="tags">
                        {skill.triggers.slice(0, 4).map((trigger) => <span className="tag" key={`${skill.id}-${trigger}`}>{trigger}</span>)}
                      </div>
                    </div>
                  </article>
                );
              }) : <div className="empty-state">{t('noSkillsMatched')}</div>}
            </div>
          </div>

          <aside className="panel detail-panel">
            <div className="section-heading"><div><p className="eyebrow">{t('detailEyebrow')}</p><h2>{t('selectedSkill')}</h2></div></div>
            {scanLoadError ? (
              <div className="detail-empty detail-error">
                <div>
                  <strong>{t('storedSnapshotInvalid')}</strong>
                  <p>{scanLoadError}</p>
                  <p>{t('invalidSnapshotHelp')}</p>
                </div>
              </div>
            ) : selectedSkill ? (
              <div className="detail-block">
                <section>
                  <div className="section-heading">
                    <div><p className="eyebrow">{t('identityEyebrow')}</p><h2>{selectedSkill.name}</h2></div>
                    <div className="badges">
                      <span className={`badge ${selectedSkill.scope}`}>{selectedSkill.scope}</span>
                      <span className="badge">{selectedSkill.agent}</span>
                      <span className="badge">{t('precedenceLabel', { value: selectedSkill.precedence })}</span>
                    </div>
                  </div>
                  <p>{selectedSkill.description || t('noDescriptionParsed')}</p>
                  <p className="mono">{selectedSkill.path}</p>
                </section>
                <section>
                  <h3>{t('triggers')}</h3>
                  <div className="inline-list">
                    {selectedSkill.triggers.length ? selectedSkill.triggers.map((trigger) => <span className="tag" key={trigger}>{trigger}</span>) : <span className="tag">{t('none')}</span>}
                  </div>
                </section>
                <section>
                  <h3>{t('compatibility')}</h3>
                  <div className="compatibility">{selectedSkill.compatibility.map((item) => <span className="badge" key={item}>{item}</span>)}</div>
                </section>
                <section>
                  <h3>{t('riskFindings')}</h3>
                  {selectedSkill.risks.length ? [...selectedSkill.risks]
                    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
                    .map((risk) => <p key={`${risk.file}-${risk.id}`}><span className={`badge ${risk.severity}`}>{risk.severity}</span> {risk.label} · <span className="mono">{risk.file}</span></p>)
                    : <p>{t('noRiskPatterns')}</p>}
                </section>
                <section>
                  <h3>{t('localPrioritySummary')}</h3>
                  {selectedLocalPriority ? (
                    <div className="priority-grid">
                      <MetricCard label={t('totalPriorityScore')} value={selectedLocalPriority.totalScore} />
                      <MetricCard label={t('riskScore')} value={selectedLocalPriority.riskScore} />
                      <MetricCard label={t('issueScore')} value={selectedLocalPriority.issueScore} />
                      <MetricCard label={t('scopeBonus')} value={selectedLocalPriority.scopeBonus} />
                      <PriorityBreakdown
                        title={t('riskBreakdown')}
                        values={selectedLocalPriority}
                        type="risk"
                      />
                      <PriorityBreakdown
                        title={t('issueBreakdown')}
                        values={selectedLocalPriority}
                        type="issue"
                      />
                      {!selectedSkill.localPriority ? <p className="priority-note">{t('localPriorityLegacy')}</p> : null}
                    </div>
                  ) : null}
                </section>
                <section>
                  <h3>{t('aiSpotlight')}</h3>
                  {selectedSkillSpotlight ? (
                    <div className="selected-spotlight">
                      <p className="analysis-status"><span className="badge low">{selectedSkillSpotlight.label}</span><span>{skillName(data, selectedSkillSpotlight.skillId)}</span></p>
                      <p>{selectedSkillSpotlight.rationale}</p>
                    </div>
                  ) : <p>{t('noModelSpotlight')}</p>}
                </section>
                <section>
                  <h3>{t('files')}</h3>
                  <code>{selectedSkill.files.join('\n')}</code>
                </section>
                <section>
                  <h3>{t('resolutionChain')}</h3>
                  {selectedChain ? (
                    <>
                      <p>{selectedChain.reason}</p>
                      {selectedChain.candidates.map((candidate) => (
                        <div className="chain-candidate" key={candidate.id}>
                          <div>
                            <strong>{candidate.name}</strong>
                            <div className="badges">
                              <span className={`badge ${candidate.scope}`}>{candidate.scope}</span>
                              <span className="badge">{candidate.agent}</span>
                              {candidate.confidence ? <span className="badge">{candidate.confidence}</span> : null}
                            </div>
                          </div>
                          <small className="mono">{candidate.path}</small>
                        </div>
                      ))}
                    </>
                  ) : <p>{t('noCompetingSkill')}</p>}
                </section>
              </div>
            ) : <div className="detail-empty">{t('selectSkillHelp')}</div>}
          </aside>
        </section>

        <section className="grid bottom-grid">
          <PanelList title={t('conflicts')} eyebrow={t('conflicts')}>
            {(data?.conflicts ?? []).length ? data!.conflicts.map((conflict) => (
              <article className="conflict-card" key={conflict.id}>
                <header><strong>{conflict.title}</strong><span className={`badge ${conflict.severity}`}>{conflict.severity}</span></header>
                <p>{conflict.summary}</p>
                <div className="tags">{conflict.skills.map((skillId) => <span className="tag" key={skillId}>{skillName(data, skillId)}</span>)}</div>
                <p><strong>{t('suggestedFix')}</strong> {conflict.suggestedFix}</p>
              </article>
            )) : <div className="empty-state">{t('noConflictsDetected')}</div>}
          </PanelList>

          <PanelList title={t('precedenceChains')} eyebrow={t('resolutionEyebrow')}>
            {(data?.resolutionChains ?? []).length ? data!.resolutionChains.map((chain) => (
              <article className="chain-card" key={chain.key}>
                <header><strong>{chain.name}</strong><span className="badge">{t('winner', { name: skillName(data, chain.winnerSkillId) })}</span></header>
                <p>{chain.reason}</p>
                {chain.candidates.map((candidate) => (
                  <div className="chain-candidate" key={candidate.id}>
                    <div>
                      <strong>{candidate.name}</strong>
                      <div className="badges">
                        <span className={`badge ${candidate.scope}`}>{candidate.scope}</span>
                        <span className="badge">{candidate.agent}</span>
                      </div>
                    </div>
                    <small className="mono">{candidate.path}</small>
                  </div>
                ))}
              </article>
            )) : <div className="empty-state">{t('noPrecedenceChains')}</div>}
          </PanelList>
        </section>

        <Drawer
          open={isHistoryOpen}
          side="left"
          title={t('historyDrawerTitle')}
          closeLabel={t('closePanel')}
          onClose={() => setIsHistoryOpen(false)}
        >
          <div className="drawer-scroll">
            <div className="filters drawer-filters">
              <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={t('searchProjectIdPath')} />
              <select value={historyStatusFilter} onChange={(event) => setHistoryStatusFilter(event.target.value as 'all' | 'healthy' | 'broken')}>
                <option value="all">{t('allRecords')}</option>
                <option value="healthy">{t('validOnly')}</option>
                <option value="broken">{t('brokenOnly')}</option>
              </select>
              <input type="date" value={historyDateFrom} onChange={(event) => setHistoryDateFrom(event.target.value)} aria-label={t('historyFromDate')} />
              <input type="date" value={historyDateTo} onChange={(event) => setHistoryDateTo(event.target.value)} aria-label={t('historyToDate')} />
            </div>
            <div className="history-metrics">
              <MetricCard label={t('validRecords')} value={historyMetrics.healthy} />
              <MetricCard label={t('brokenRecords')} value={historyMetrics.broken} />
              <MetricCard label={t('conflicts')} value={historyMetrics.conflicts} />
              <MetricCard label={t('highRiskSkills')} value={historyMetrics.highRiskSkills} />
            </div>
            <div className="stack-list">
              {filteredHistory.length ? filteredHistory.map((scan) => (
                <article
                  className={`history-row ${scan.id === currentScan?.id && source === 'history' ? 'active' : ''} ${scan.broken ? 'broken' : ''}`}
                  key={scan.id}
                >
                  <div>
                    <div className="history-headline">
                      <strong>{scan.project?.name || t('unknownProject')}</strong>
                      {scan.broken ? <span className="badge high">{t('broken')}</span> : null}
                    </div>
                    <p>
                      {scan.broken
                        ? t('brokenSnapshotWarning')
                        : `${formatDate(scan.generatedAt, locale)} · ${t('skillsSuffix', { count: scan.summary?.totalSkills || 0 })} · ${(scan.summary?.conflictCount || 0)} ${t('conflicts').toLowerCase()}`}
                    </p>
                    <small className="mono">{scan.project?.path || scan.storage?.filePath || scan.id}</small>
                  </div>
                  <div className="history-actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={async () => {
                        await loadScan(scan.id);
                        if (!scan.broken) setIsHistoryOpen(false);
                      }}
                      disabled={isBusy || scan.broken}
                    >
                      {scan.broken ? t('invalid') : t('open')}
                    </button>
                    <button className="button danger" type="button" onClick={() => handleDeleteScan(scan.id)} disabled={isBusy}>
                      {scan.broken ? t('deleteBroken') : t('delete')}
                    </button>
                  </div>
                </article>
              )) : <div className="empty-state">{t('noStoredScanMatched')}</div>}
            </div>
          </div>
        </Drawer>

        <Drawer
          open={isSettingsOpen}
          side="right"
          title={t('settingsDrawerTitle')}
          closeLabel={t('closePanel')}
          onClose={() => setIsSettingsOpen(false)}
        >
          <form
            key={`${config.provider}-${config.baseUrl}-${config.model}-${config.scan.maxDepth}-${config.analysis.timeoutMs}-${config.analysis.maxSkills}`}
            ref={settingsFormRef}
            className="form-grid compact settings-form drawer-scroll"
            onSubmit={handleSaveConfig}
          >
            <label>
              <span>{t('provider')}</span>
              <input name="provider" defaultValue={config.provider} />
            </label>
            <label>
              <span>{t('baseUrl')}</span>
              <input name="baseUrl" defaultValue={config.baseUrl} />
            </label>
            <label>
              <span>{t('model')}</span>
              <input name="model" defaultValue={config.model} />
            </label>
            <label>
              <span>{t('apiKey')}</span>
              <input name="apiKey" type="password" defaultValue="" />
              <small>
                {t('apiKeyConfigured')}: {config.hasApiKey ? t('apiKeyConfiguredYes') : t('apiKeyConfiguredNo')}
                {config.apiKeyHint ? ` (${config.apiKeyHint})` : ''}
                {' '}
                {t('apiKeyLeaveBlank')}
              </small>
            </label>
            <label>
              <span>{t('maxDepth')}</span>
              <input name="maxDepth" type="number" min="1" max="12" defaultValue={config.scan.maxDepth} />
            </label>
            <Checkbox name="enableFallbackDiscovery" defaultChecked={config.scan.enableFallbackDiscovery} label={t('enableFallbackDiscovery')} />
            <Checkbox name="includeGlobalRoots" defaultChecked={config.scan.includeGlobalRoots} label={t('includeGlobalRoots')} />
            <Checkbox name="includeProjectRoots" defaultChecked={config.scan.includeProjectRoots} label={t('includeProjectRoots')} />
            <label className="textarea-field">
              <span>{t('extraScanRoots')}</span>
              <textarea name="extraRoots" rows={4} defaultValue={(config.scan.extraRoots || []).join('\n')} />
              <small>{t('extraScanRootsHint')}</small>
            </label>
            <label>
              <span>{t('analysisTimeout')}</span>
              <input name="analysisTimeoutMs" type="number" min="1000" step="1000" defaultValue={config.analysis.timeoutMs} />
            </label>
            <label>
              <span>{t('analysisMaxSkills')}</span>
              <input name="analysisMaxSkills" type="number" min="1" max="30" defaultValue={config.analysis.maxSkills} />
            </label>
            <div className="form-actions">
              <button className="button primary" type="submit" disabled={isBusy}>{t('saveSettings')}</button>
              <button className="button secondary" type="button" onClick={handleTestConnection} disabled={isBusy}>{t('testConnection')}</button>
            </div>
            {connectionTest ? (
              <div className="connection-test">
                <p className="analysis-status">
                  <span className={`badge ${connectionTest.ok ? 'low' : connectionTest.status === 'running' ? '' : 'high'}`}>{connectionTest.status}</span>
                  <span>{connectionTest.model || config.model || t('noModelConfigured')}</span>
                </p>
                <p>{connectionTest.message}</p>
              </div>
            ) : null}
            <p className="analysis-summary">{t('mandatoryAnalysisHint')}</p>
          </form>
        </Drawer>
      </main>
    </div>
  );
}

function Checkbox({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <label className="checkbox-row">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function PriorityBreakdown({ title, values, type }: { title: string; values: SkillLocalPriority; type: 'risk' | 'issue' }) {
  const counts = type === 'risk'
    ? [
        ['high', values.highRiskCount],
        ['medium', values.mediumRiskCount],
        ['low', values.lowRiskCount],
      ]
    : [
        ['high', values.highIssueCount],
        ['medium', values.mediumIssueCount],
        ['low', values.lowIssueCount],
      ];

  return (
    <div className="priority-breakdown">
      <strong>{title}</strong>
      <div className="badges">
        {counts.map(([severity, count]) => (
          <span className={`badge ${severity}`} key={`${type}-${severity}`}>{severity}: {count}</span>
        ))}
      </div>
    </div>
  );
}

function Drawer({
  open,
  side,
  title,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean;
  side: 'left' | 'right';
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`drawer-shell ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label={title} />
      <aside className={`drawer-panel ${side}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">{title}</p>
            <h2>{title}</h2>
          </div>
          <button className="button secondary" type="button" onClick={onClose}>{closeLabel}</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function PanelList({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>
      <div className="stack-list">{children}</div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="analysis-list">{items.map((item) => <p key={item}>{item}</p>)}</div>
    </div>
  );
}

function readConfigForm(formElement: HTMLFormElement, config: AppConfigView): Partial<AppConfig> {
  const form = new FormData(formElement);
  const apiKey = `${form.get('apiKey') || ''}`.trim();
  const payload: Partial<AppConfig> = {
    provider: `${form.get('provider') || ''}`.trim(),
    baseUrl: `${form.get('baseUrl') || ''}`.trim(),
    model: `${form.get('model') || ''}`.trim(),
    scan: {
      ...config.scan,
      maxDepth: Number(form.get('maxDepth') || 5),
      enableFallbackDiscovery: form.get('enableFallbackDiscovery') === 'on',
      includeProjectRoots: form.get('includeProjectRoots') === 'on',
      includeGlobalRoots: form.get('includeGlobalRoots') === 'on',
      extraRoots: `${form.get('extraRoots') || ''}`.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    },
    analysis: {
      ...config.analysis,
      timeoutMs: Number(form.get('analysisTimeoutMs') || 20000),
      maxSkills: Number(form.get('analysisMaxSkills') || 12),
    },
  };
  if (apiKey) {
    payload.apiKey = apiKey;
  }
  return payload;
}

function topRiskSeverity(skill: SkillRecord): 'high' | 'medium' | 'low' | undefined {
  return [...skill.risks].map((risk) => risk.severity).sort((a, b) => severityOrder[b] - severityOrder[a])[0];
}

function skillName(data: ScanRecord | null, skillId: string): string {
  return data?.skills.find((skill) => skill.id === skillId)?.name ?? skillId;
}

function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return 'unknown';
  return new Date(value).toLocaleString(locale);
}

function analysisMessage(analysis: ScanAnalysis | null, locale: Locale): string {
  if (!analysis) return translate(locale, 'noAnalysisResult');
  if (analysis.status === 'completed') return translate(locale, 'analysisCompleted', { date: formatDate(analysis.generatedAt, locale) });
  if (analysis.status === 'skipped' && analysis.reason === 'disabled') return translate(locale, 'legacyDisabled');
  if (analysis.reason === 'missing_config') return translate(locale, 'analysisMissingConfig');
  if (analysis.status === 'error') return translate(locale, 'analysisFailed', { message: analysis.message || analysis.reason || 'unknown error' });
  return translate(locale, 'noAnalysisResult');
}

function matchHistoryDateRange(generatedAt: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!generatedAt) return false;
  const scanDate = generatedAt.slice(0, 10);
  if (from && scanDate < from) return false;
  if (to && scanDate > to) return false;
  return true;
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      throw new Error(parsed.message || parsed.error || text);
    } catch {
      throw new Error(text);
    }
  }
  return response.json() as Promise<T>;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function translate(locale: Locale, key: TranslationKey, values?: TranslationValues): string {
  const template = translations[locale][key] || translations.en[key];
  return `${template}`.replace(/\{(\w+)\}/g, (_, name: string) => `${values?.[name] ?? ''}`);
}

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(localeStorageKey);
  return stored === 'zh-CN' ? 'zh-CN' : 'en';
}
