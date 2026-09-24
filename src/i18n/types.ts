export interface UIStrings {
  nav: {
    home: string;
    posts: string;
    tags: string;
    about: string;
    archives: string;
    search: string;
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
    socialLinks: string;
    heroGreeting: string;
    heroIntro: string;
    heroFullstack: string;
    featured: string;
    recentPosts: string;
    allPosts: string;
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
  };
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
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
  };
  notFound: {
    title: string;
    message: string;
    goHome: string;
  };
  stats: {
    /** <title> + page heading. */
    title: string;
    description: string;
    loading: string;
    unavailable: string;
    noData: string;
    totalPv: string;
    totalUv: string;
    pvLabel: string;
    uvLabel: string;
    topPostsTitle: string;
    vitalsTitle: string;
    reactionsTitle: string;
    viewsLabel: string;
    metricLcp: string;
    metricCls: string;
    metricInp: string;
    ratingGood: string;
    ratingNeedsImprovement: string;
    ratingPoor: string;
    /** Footer entry. */
    statsLink: string;
  };
}
