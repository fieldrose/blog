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
    /** Visually hidden section title for the emoji reaction bar. */
    heading: string;
    like: string;
    fire: string;
    idea: string;
    question: string;
    /** Shown when the reactions backend is unavailable. */
    unavailable: string;
    /** Prompt when a signed-out user hovers/clicks the bar. */
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
    /** Validation / error messages. */
    errRequiredEmail: string;
    errRequiredPassword: string;
    errPasswordTooShort: string;
    errPasswordMismatch: string;
    errInvalidCredentials: string;
    errEmailNotConfirmed: string;
    errUserExists: string;
    errRateLimited: string;
    errGeneric: string;
    /** /auth/callback page. */
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
    /** <title> + page heading. */
    title: string;
    description: string;
    /** Footer entry / nav link. */
    link: string;
  };
  /** dayjs 日期格式字符串，用于 Datetime 组件。 */
  dateFormat: string;
}
