export const state = {
  user: null,
  profile: null,
  profileCompletion: 0,
  dashboard: null,
  recommendations: [],
  recommendationFilter: "all", // 'all' | 'saved'
  recommendationSearch: "",
  compareIds: [],
  marketAnalyses: [],
  activeMarketId: null,
  financialScenarios: [],
  activeFinancialScenario: null,
  businessPlans: [],
  activePlanId: null,
  roadmaps: [],
  activeRoadmapId: null,
  chatMessages: [],
  chatStartupId: "",
  schemes: [],
  schemeCategory: "All",
  schemeSearch: "",
  route: "dashboard",
  authModalOpen: false,
  authMode: "login", // 'login' | 'register'
  sidebarOpen: false,
  busy: {},
  discoverDraft: null,
  discoverError: "",
};

export function resetPrivateState() {
  state.user = null;
  state.profile = null;
  state.profileCompletion = 0;
  state.dashboard = null;
  state.recommendations = [];
  state.compareIds = [];
  state.marketAnalyses = [];
  state.activeMarketId = null;
  state.financialScenarios = [];
  state.activeFinancialScenario = null;
  state.businessPlans = [];
  state.activePlanId = null;
  state.roadmaps = [];
  state.activeRoadmapId = null;
  state.chatMessages = [];
  state.chatStartupId = "";
}
