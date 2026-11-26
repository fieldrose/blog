/** 站点全部 UI 文案的结构定义，zh / en 两份字典必须实现同一套 key。 */
export interface UIStrings {
  nav: {
    home: string;
    posts: string;
    series: string;
    categories: string;
    tags: string;
    about: string;
    archives: string;
    search: string;
    language: string;
    theme: string;
    settings: string;
  };
  post: {
    publishedAt: string;
    updatedAt: string;
    sharePostIntro: string;
    sharePostOn: string;
    sharePostViaEmail: string;
    tagLabel: string;
    backToTop: string;
    goBack: string;
    editPage: string;
    previousPost: string;
    nextPost: string;
    /** 文章归属专栏时展示的上一节 / 下一节标签。 */
    previousInSeries: string;
    nextInSeries: string;
    /** 返回专栏目录页的链接文案。 */
    backToSeries: string;
    tocHeading: string;
    tocOpen: string;
  };
  pagination: {
    prev: string;
    next: string;
    page: string;
  };
  home: {
    heroSignature: string;
    socialLinks: string;
    heroGreeting: string;
    heroIntro: string;
    heroFullstack: string;
    featured: string;
    recentPosts: string;
    allPosts: string;
    series: string;
    allSeries: string;
    topics: string;
    allTopics: string;
  };
  topics: {
    /** 专题条目数，`{{count}}` 为占位符。 */
    count: string;
    empty: string;
  };
  tags: {
    /** 标签页分组标题。 */
    theme: string;
    tech: string;
    other: string;
    /** 标签旁的文章数，`{{count}}` 为占位符。 */
    count: string;
  };
  categories: {
    /** 文章列表芯片行里的「全部」。 */
    all: string;
    /** 分类的文章数，`{{count}}` 为占位符。 */
    count: string;
  };
  footer: {
    copyright: string;
    allRightsReserved: string;
  };
  pages: {
    tagTitle: string;
    tagDesc: string;

    tagsTitle: string;
    tagsDesc: string;

    postsTitle: string;
    postsDesc: string;

    seriesTitle: string;
    seriesDesc: string;
    /** 专栏文章数，`{{count}}` 为占位符。 */
    seriesCount: string;

    categoriesTitle: string;
    categoriesDesc: string;

    topicsTitle: string;
    topicsDesc: string;

    archivesTitle: string;
    archivesDesc: string;

    searchTitle: string;
    searchDesc: string;
  };
  a11y: {
    skipToContent: string;
    openMenu: string;
    closeMenu: string;
    toggleTheme: string;
    searchPlaceholder: string;
    noResults: string;
    goToPreviousPage: string;
    goToNextPage: string;
  };
  reactions: {
    /** 表情反馈条中视觉隐藏的区块标题。 */
    heading: string;
    like: string;
    fire: string;
    idea: string;
    question: string;
    /** 反馈后端不可用时展示的提示。 */
    unavailable: string;
    /** 未登录用户悬停或点击反馈条时的提示。 */
    signInToReact: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    signOutConfirmTitle: string;
    signOutConfirmBody: string;
    signOutConfirmAction: string;
    signOutCancel: string;
    loginTab: string;
    registerTab: string;
    dialogAriaLabel: string;
    email: string;
    password: string;
    confirmPassword: string;
    githubButton: string;
    submitting: string;
    checkEmailTitle: string;
    checkEmailBody: string;
    backToLogin: string;
    closeDialog: string;
    menuLabel: string;
    /** 表单校验与错误提示文案。 */
    errRequiredEmail: string;
    errRequiredPassword: string;
    errPasswordTooShort: string;
    errPasswordMismatch: string;
    errInvalidCredentials: string;
    errEmailNotConfirmed: string;
    errUserExists: string;
    errRateLimited: string;
    errGeneric: string;
    /** /auth/callback 页面的状态文案。 */
    callbackWorking: string;
    callbackFailed: string;
    callbackBackHome: string;
  };
  readingSettings: {
    tip: string;
    buttonTitle: string;
    panelTitle: string;
    fontSize: string;
    lineHeight: string;
    contentWidth: string;
    reset: string;
    widthNarrow: string;
    widthNormal: string;
    widthWide: string;
    lineTight: string;
    lineComfortable: string;
    lineLoose: string;
    lineExtraLoose: string;
    animationTitle: string;
    simpleAnimation: string;
  };
  notFound: {
    title: string;
    message: string;
    goHome: string;
  };
  demos: {
    /** 用于 <title> 与页面主标题。 */
    title: string;
    description: string;
    /** 页脚入口 / 导航链接文案。 */
    link: string;
  };
  /** dayjs 日期格式字符串，用于 Datetime 组件。 */
  dateFormat: string;
}
