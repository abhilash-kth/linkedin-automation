export const SELECTORS = {
  // ═════════════════════════════════════════════════════════════════
  // 🔍 SEARCH BAR & FILTERS
  // USED_IN: post-scraper.service.js
  // ═════════════════════════════════════════════════════════════════
  searchBar: {
    input: [
      'input[data-testid="typeahead-input"]',
      'input[componentkey="SearchResults_SearchTyahInputRef"]',
      'input[placeholder="Search"]',
      'input[aria-autocomplete="list"]',
      "input.search-global-typeahead__input",
    ],
    tag: "data-search-bar",
  },

  filters: {
    postsFilter: [
      'a[aria-label="Filter by Posts"]',
      'a[href*="/search/results/content/"][role="radio"]',
    ],
    peopleFilter: [
      'a[aria-label="Filter by People"]',
      'a[href*="/search/results/people/"][role="radio"]',
    ],
    sortByPill: [
      'div[componentkey="SearchResults_filter_pill_sortBy"]',
      'div[role="button"][aria-label*="Filter by Latest"]',
      'div[role="button"][aria-label*="Filter by Top"]',
    ],
    latestOption: ['div[role="radio"][aria-label="Latest"]'],
    showResultsText: "Show results",
  },

  // ═════════════════════════════════════════════════════════════════
  // 📄 POST CARD (in search results feed)
  // USED_IN: post-scraper.service.js, post-commenter.service.js
  // ═════════════════════════════════════════════════════════════════
  postCard: {
    container: '[role="listitem"]',
    tag: "data-post-index",
    authorLink: 'a[href*="/in/"]:not([href*="/company/"])',
    authorLinkWithBadge: [
      'a[aria-label*="Verified Profile"]',
      'a[aria-label*="3rd"]',
      'a[aria-label*="2nd"]',
      'a[aria-label*="1st"]',
    ],
    authorName: 'a[href*="/in/"] p span',
    authorHeadline: "p.e6590096.a303fa94",
    postTimeClass: "p.e6590096.a303fa94.e2049567",
    postTimePattern: /^(\d+[wdhms])\s*[•·]/,
    content: '[data-testid="expandable-text-box"]',
    expandMoreButton: 'button[data-testid="expandable-text-button"]',
    threeDotMenu: [
      'button[aria-label*="Open control menu for post"]',
      'button[aria-label*="Open control menu"]',
      'button[aria-label*="More actions"]',
    ],
    commentButton: {
      ariaLabel: 'button[aria-label="Comment"]',
      iconSvgId: "comment-small",
      buttonText: "Comment",
    },
    likeButton: 'button[aria-label*="Reaction"]',
    actionBarSvgIcons: {
      like: "thumbs-up-outline-small",
      comment: "comment-small",
      repost: "repost-small",
      send: "send-privately-small",
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // 🔽 POST DROPDOWN MENU (3-dot on posts)
  // USED_IN: post-commenter.service.js (copyPostLink)
  // ═════════════════════════════════════════════════════════════════
  postDropdown: {
    menuItem: 'div[role="menuitem"]',
    copyLinkText: "copy link",
  },

  // ═════════════════════════════════════════════════════════════════
  // 💬 COMMENT COMPOSER (inline on search results / feed)
  // USED_IN: post-commenter.service.js (commentOnPost)
  // ═════════════════════════════════════════════════════════════════
  commentComposer: {
    textbox: [
      'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
      'div.tiptap.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="comment" i]',
      'div[contenteditable="true"][role="textbox"]',
    ],
    placeholder: 'p[data-placeholder="Add a comment..."]',
    tag: "data-active-comment-box",
    activeEditorSelector: '[data-active-comment-box="true"]',
    submitButton: 'button[componentkey*="commentButtonSection"]',
    submitButtonTexts: ["Comment", "Post", "Reply"],
    submitTag: "data-active-submit",
    activeSubmitSelector: '[data-active-submit="true"]',
    editorInsideCheck: [
      'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
      'div.tiptap.ProseMirror[contenteditable="true"]',
    ],
    commentDisplaySelectors: [
      ".comments-comment-item__main-content",
      ".update-components-text",
      '[class*="comment-item__main"]',
      '[class*="comments-comment"]',
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // 💬 COMMENTS SECTION (on individual post page)
  // USED_IN: comment-checker.service.js, reply flow
  // ═════════════════════════════════════════════════════════════════
  commentsSection: {
    container: [
      ".comments-comments-list",
      ".comments-comment-list",
      '[class*="comments-list"]',
    ],
    commentItem: [
      "article.comments-comment-entity",
      '[class*="comments-comment-entity"]',
    ],
    commentIdAttr: "data-id",
    commentAuthorLink: ".comments-comment-meta__description-container",
    commentAuthorName: ".comments-comment-meta__description-title",
    commentAuthorTitle: ".comments-comment-meta__description-subtitle",
    commentMetaDescription: ".comments-comment-meta__description",
    commentAuthorBadge: ".comments-comment-meta__badge",
    commentText: ".comments-comment-item__main-content .update-components-text",
    commentTextFallback: ".comments-comment-item__main-content",
    commentSocialBar: ".comments-comment-social-bar--cr",
    commentReplyButton: 'button[aria-label*="Reply" i][aria-label*="comment"]',
    repliesContainer: ".comments-replies-list",
    replyEntity:
      'article.comments-comment-entity, [class*="comment-entity--reply"]',
    mentions: 'a[href*="/in/"], a.ql-mention',
    showMoreCommentsButtons: [
      "show more comments",
      "load more",
      "view more comments",
      "show previous",
    ],
    showMoreRepliesButtons: [
      "show more replies",
      "view more replies",
      "load more replies",
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // ↩️ REPLY COMPOSER (on individual post page)
  // USED_IN: post-commenter.service.js (replyToSpecificComment)
  // ═════════════════════════════════════════════════════════════════
  replyComposer: {
    textbox: [
      'div.ql-editor[contenteditable="true"][data-placeholder*="reply" i]',
      'div.ql-editor[contenteditable="true"][data-placeholder*="comment" i]',
      'div.ql-editor[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ],
    tag: "data-active-reply-box",
    submitButton: [
      "button.comments-comment-box__submit-button--cr",
      'button[class*="comment-box__submit-button"]',
      'button[componentkey*="commentButtonSection"]',
    ],
    submitButtonTexts: ["Reply", "Comment", "Post"],
    cancelButton: 'button[aria-label*="Cancel" i]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 👤 PROFILE PAGE — ACTION BUTTONS + DETAILS
  // USED_IN: profile.service.js, connection.service.js, contact-info.service.js
  //
  // Modern LinkedIn top card has:
  //   - Follow/Connect (visible or hidden in More menu)
  //   - Message
  //   - More (dropdown with Connect, Save PDF, Report, etc.)
  // ═════════════════════════════════════════════════════════════════
  profile: {
    // Person name (h1 in main content)
    personName:
      "main h1, main .pv-text-details__left-panel h1, main .text-heading-xlarge",

    // Headline (text below name)
    headline: [
      "main .text-body-medium.break-words",
      "main .pv-text-details__left-panel .text-body-medium",
      "main div.mt2 div.text-body-medium",
      ".text-body-medium.break-words",
    ],

    // Location
    location: [
      ".text-body-small.inline.t-black--light.break-words",
      ".pv-text-details__left-panel .text-body-small",
      ".ph5.pb5 .text-body-small",
      "main .pv-text-details__left-panel span.text-body-small",
      "main div.mt2 .text-body-small.inline",
      "span.text-body-small:not([class*='visually-hidden'])",
    ],

    // Distance badge pattern (1st, 2nd, 3rd)
    distancePattern: "^·?\\s*(1st|2nd|3rd)$",

    // ── Action button area bounds (where buttons live on page) ──
    buttonAreaBounds: { minY: 400, maxY: 800, maxX: 700 },

    // ── Connect button (combined selector for top-level detection) ──
    // Used by both profile.service.js and connection.service.js
    connectAnchor:
      'a[componentkey*="ConnectButton"][componentkey*="_connect"], ' +
      'a[href*="/preload/custom-invite/"]',
    connectAriaPattern: "invite.*to connect",
    connectIconSvgId: "connect-small",
    connectButtonText: "Connect",

    // ── Message button ──
    messageAnchor: 'a[href*="/messaging/compose/"]',
    messageButtonText: "Message",

    // ── More button (opens dropdown with Connect, Save PDF, Report) ──
    // Modern HTML: <button aria-expanded="false"><span>More</span></button>
    // Legacy: <button aria-label="More">
    moreButton: {
      ariaSelectors: [
        'button[aria-label="More"]',
        'button[aria-label*="More actions" i]',
        'button[aria-label*="More options" i]',
      ],
      buttonText: "More",
      expandableAttr: "aria-expanded",
    },

    // ── Pending (already sent invitation) ──
    pendingByComponentKey:
      '[componentkey*="_pending"], [componentkey*=":pending"]',
    pendingAriaPattern:
      '[aria-label*="Pending" i][aria-label*="withdraw" i]',
    pendingButtonText: "Pending",

    // ── Incoming invitation Accept button ──
    incomingAcceptButton:
      'button[aria-label*="Accept" i][aria-label*="request to connect" i]',

    // ── Contact info trigger link ──
    contactInfoLink: [
      'a[href*="/overlay/contact-info/"]',
      'a[href*="contact-info"]',
    ],
    contactInfoText: "contact info",
  },

  // ═════════════════════════════════════════════════════════════════
  // 🔽 MORE MENU DROPDOWN (profile page — opens after More click)
  // USED_IN: connection.service.js
  //
  // HTML: <div popover="manual" role="menu">
  //         <a role="menuitem" href="/preload/custom-invite/...">Connect</a>
  //         <a role="menuitem" href="...">Report / Block</a>
  //       </div>
  // ═════════════════════════════════════════════════════════════════
  moreDropdown: {
    popoverContainer: 'div[popover="manual"][role="menu"], div[role="menu"]',
    menuItem: 'a[role="menuitem"], div[role="menuitem"]',
    connectInDropdown:
      'a[role="menuitem"][componentkey*="ConnectButton"][componentkey*="_connect"], ' +
      'a[role="menuitem"][href*="/preload/custom-invite/"]',
    connectInDropdownText: "Connect",
  },

  // ═════════════════════════════════════════════════════════════════
  // 📨 CONNECTION INVITE FLOW
  // Appears on /preload/custom-invite/?vanityName=... URL
  // USED_IN: connection.service.js
  //
  // HTML: <div role="dialog" class="artdeco-modal send-invite">
  //         <h2>Add a note to your invitation?</h2>
  //         <button aria-label="Add a note">Add a note</button>
  //         <button aria-label="Send without a note">Send without a note</button>
  //       </div>
  // ═════════════════════════════════════════════════════════════════
  inviteFlow: {
    // Dialog container
    dialogContainer: [
      ".send-invite",
      '[aria-labelledby="send-invite-modal"]',
      "h2#send-invite-modal",
    ],
    dialogHeaderText: "add a note to your invitation",

    // Buttons in dialog
    addNoteButton: 'button[aria-label="Add a note"]',
    sendWithoutNoteButton: 'button[aria-label="Send without a note"]',
    sendInvitationButton: [
      'button[aria-label="Send invitation"]',
      'button[aria-label="Send now"]',
      'button[aria-label="Send"]',
    ],
    cancelNoteButton: 'button[aria-label="Cancel adding a note"]',
    noteTextarea: 'textarea[name="message"], textarea#custom-message',

    // Connect anchor (used to re-click when notes limit hit)
    // Same as profile.connectAnchor — kept here for clarity
    connectAnchor:
      'a[componentkey*="ConnectButton"][componentkey*="_connect"], ' +
      'a[href*="/preload/custom-invite/"]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 📇 CONTACT INFO MODAL & LINK
  // USED_IN: contact-info.service.js
  // ═════════════════════════════════════════════════════════════════
  contactInfo: {
    triggerLink: [
      'a[href*="/overlay/contact-info/"]',
      'a[href*="contact-info"]',
    ],
    triggerLinkText: "contact info",
    triggerLinkTag: "data-contact-link",

    modalContainer: [
      '[data-testid="dialog-content"]',
      '[componentkey*="ContactInfoDetailSection"]',
      '[role="dialog"]',
    ],
    sectionContainer: "[componentkey]",
    sectionLabel: "p.e6590096, h3, h4, p",

    labels: {
      website: "website",
      email: "email",
      phone: "phone",
      birthday: "birthday",
      twitter: "twitter",
      address: "address",
    },

    emailField: 'a[href^="mailto:"]',
    websiteField:
      'a[href*="/safety/go/"], a[href^="http"]:not([href*="linkedin.com"])',
    twitterField: 'a[href*="twitter.com"], a[href*="x.com"]',
    phonePattern: /^\+?\d{8,15}$/,
    safetyRedirectPattern: /url=([^&]+)/,
    closeModal: [
      'button[aria-label="Dismiss"]',
      "button[data-test-modal-close-btn]",
      ".artdeco-modal__dismiss",
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // ✉️ MESSAGE COMPOSER (DMs / InMail)
  // USED_IN: message.service.js
  // ═════════════════════════════════════════════════════════════════
  composer: {
    contentEditable: ".msg-form__contenteditable",
    contentEditableAll: [
      ".msg-form__contenteditable",
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="message" i]',
    ],
    subjectField: 'input.msg-form__subject, input[name="subject"]',
    sendButton: "button.msg-form__send-btn",
    sendButtonAll: [
      "button.msg-form__send-btn",
      "button.msg-form__send-button",
      'button[aria-label="Send message"]',
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // 💬 MESSAGING OVERLAYS (bottom-right chat bubbles)
  // USED_IN: navigation.service.js
  // ═════════════════════════════════════════════════════════════════
  overlay: {
    closeButton:
      '.msg-overlay-bubble-header__control[aria-label*="Close" i], .msg-overlay-bubble-header button[aria-label*="Close" i]',
    bubbleContainer: [
      ".msg-overlay-conversation-bubble",
      ".msg-overlay-list-bubble",
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // 💎 PREMIUM UPSELL MODALS
  // Multiple variants:
  //   A) "Send unlimited personalized invites with Premium" — notes limit
  //   B) "Boost your career with Premium" — InMail limit
  //   C) Generic "Try Premium" modals
  // USED_IN: premium.service.js, connection.service.js, message.service.js
  // ═════════════════════════════════════════════════════════════════
  premium: {
    modal: [
      '[data-test-modal-id="modal-upsell"]',
      ".modal-upsell",
      '[aria-labelledby="modal-upsell-header"]',
      ".artdeco-modal--layer-default",
      '[role="dialog"]',
    ],
    dismissButton: [
      "button[data-test-modal-close-btn]",
      'button[aria-label="Dismiss"]',
      ".artdeco-modal__dismiss",
      'button[aria-label*="Close" i]',
    ],
    modalTextPatterns: [
      "try premium",
      "out of free",
      "custom notes",
      "inmail credit",
      "boost your career",
      "start 1 month free trial",
      "message anyone",
      "unlock and message",
      "send unlimited personalized",
      "personalized invites with premium",
      "you're out of free custom notes",
    ],
    notesLimitPopup: {
      headerText: "send unlimited personalized invites",
      bodyTextPatterns: [
        "out of free custom notes",
        "bypass the limit with premium",
      ],
    },
    inMailLimitPopup: {
      headerText: "boost your career with premium",
      bodyTextPatterns: ["message anyone", "4.6x more effective"],
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // ✅ POST-INVITATION "VERIFY IN 2 MINUTES" POPUP
  // Appears AFTER successful invitation. Confirms it was sent.
  // Click "Not now" to dismiss.
  // USED_IN: premium.service.js, connection.service.js
  // ═════════════════════════════════════════════════════════════════
  verifyPopup: {
    container:
      '[data-testid="dialog-content"], [data-sdui-screen*="VerificationNbaDialog"]',
    textPatterns: [
      "verify in 2 minutes",
      "make a stronger impression",
      "verified members get",
      "invitation sent",
    ],
    dismissButton: "button[componentkey]",
    dismissButtonText: "Not now",
    successIcon: 'svg[id="signal-success-large"]',
    successText: "Invitation sent",
  },

  // ═════════════════════════════════════════════════════════════════
  // 🚫 BLOCKING MODALS / OVERLAYS (Reactions, unexpected dialogs)
  // USED_IN: post-commenter.service.js, message.service.js
  // ═════════════════════════════════════════════════════════════════
  blockingModals: {
    containers: [
      '[role="dialog"]',
      ".artdeco-modal",
      ".reactions-modal",
      '[aria-labelledby*="reactions" i]',
      '[aria-label*="Reactions" i]',
    ],
    closeButtons: [
      'button[aria-label*="Dismiss" i]',
      'button[aria-label*="Close" i]',
      "button.artdeco-modal__dismiss",
      "button[data-test-modal-close-btn]",
    ],
  },

    // ═════════════════════════════════════════════════════════════════
  // 💬 COMMENT CHECKER (post page analysis)
  // Detects: author replies, author mentions, non-author mentions,
  //          nested replies to our comment
  // USED_IN: comment-checker.service.js
  // ═════════════════════════════════════════════════════════════════
  commentChecker: {
    commentsSection: [
      ".comments-comments-list",
      '[class*="comments-list"]',
      'section[aria-label*="Comments" i]',
    ],
    showMoreCommentsTexts: [
      "show more comments",
      "load more",
      "view more comments",
      "show previous",
    ],
    showMoreRepliesTexts: [
      "show more replies",
      "view more replies",
      "load more replies",
    ],
    repliesCountPattern: /^\d+ repl(y|ies)$/i,

    ownCommentMarker: "• You",
    authorBadgeText: "author",

    repliesContainer: [
      ".comments-replies-list",
      "[class*='comments-replies-list']",
    ],
    replyEntity: [
      "article.comments-comment-entity",
      "[class*='comment-entity--reply']",
    ],
    commentIdAttr: "data-id",

    contentSelector: [
      ".comments-comment-item__main-content .update-components-text",
      ".comments-comment-item__main-content",
    ],
    scopedContentSelector: [
      ":scope > .comments-thread-entity .comments-thread-item .comments-comment-entity__content",
      ":scope > * .comments-comment-entity__content",
    ],
    mentionSelector: [
      'a[href*="/in/"]',
      "a.ql-mention",
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // 🌐 EXTERNAL TAB DETECTION
  // USED_IN: browser.service.js
  // ═════════════════════════════════════════════════════════════════
  externalTabs: {
    allowedDomains: ["linkedin.com", "licdn.com"],
    blankUrl: "about:blank",
  },

  // ═════════════════════════════════════════════════════════════════
  // 📥 INBOX
  // USED_IN: inbox.service.js, reply-sender.service.js
  // ═════════════════════════════════════════════════════════════════
  inbox: {
    conversationItem: [
      ".msg-conversation-listitem",
      ".msg-conversation-card",
      'li[data-view-name="conversation-list-item"]',
    ],
    participantName: [
      ".msg-conversation-listitem__participant-names",
      ".msg-conversation-card__participant-names",
    ],
    messagePreview: [
      ".msg-conversation-card__message-snippet",
      ".msg-conversation-listitem__message-snippet",
    ],
    unreadIndicator: ".notification-badge--show",
    unreadClasses: [
      "msg-conversation-listitem--unread",
      "msg-conversation-card--unread",
    ],
    messageBody: ".msg-s-event-listitem__body",
    messageItem: ".msg-s-event-listitem, .msg-s-message-list__event",
    threadUrlPattern: "/messaging/thread/",
    threadIdRegex: /\/thread\/([^\/\?]+)/,
  },

  // ═════════════════════════════════════════════════════════════════
  // 🌐 GLOBAL NAVIGATION
  // USED_IN: session.service.js
  // ═════════════════════════════════════════════════════════════════
  nav: {
    globalNav: "nav.global-nav",
    feedLink: 'a[href="/feed/"]',
    messagingLink: 'a[href="/messaging/"]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 🔐 LOGIN
  // USED_IN: auth.controller.js
  // ═════════════════════════════════════════════════════════════════
  login: {
    emailInput: "#username",
    passwordInput: "#password",
    submitButton: 'button[type="submit"]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 📊 URLS
  // USED_IN: everywhere
  // ═════════════════════════════════════════════════════════════════
  urls: {
    feed: "https://www.linkedin.com/feed/",
    messaging: "https://www.linkedin.com/messaging/",
    profile: (vanity) => `https://www.linkedin.com/in/${vanity}/`,
    profileContact: (profileUrl) => {
      const clean = profileUrl.replace(/\/+$/, "");
      return `${clean}/overlay/contact-info/`;
    },
    activityPost: (activityId) =>
      `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
    searchPostsLatest: (keyword) =>
      `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}&sortBy=%5B%22date_posted%22%5D`,
    searchPosts: (keyword) =>
      `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}`,
    inviteConnect: (vanityName) =>
      `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityName}`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 🧪 REGEX PATTERNS
  // ═════════════════════════════════════════════════════════════════
  patterns: {
    vanityName: /\/in\/([^\/\?]+)/,
    postTime: /^(\d+[wdhms])\s*[•·]/,
    distance: /^·?\s*(1st|2nd|3rd)$/,
    phone: /^\+?\d{10,15}$/,
    phoneMatch:
      /(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    verifiedText: /Verified Profile/gi,
    distanceText: /\s*(1st|2nd|3rd|3rd\+)\+?\s*/gi,
    activityUrn: /urn[:%3A]li[:%3A]activity[:%3A](\d+)/i,
    activityIdFromHighlight:
      /highlightedUpdateUrn=urn%3Ali%3Aactivity%3A(\d+)/,
  },

  // ═════════════════════════════════════════════════════════════════
  // 🚫 SKIP LISTS
  // ═════════════════════════════════════════════════════════════════
  skipNames: [
    "Activity",
    "Experience",
    "Education",
    "About",
    "Skills",
    "Interests",
    "People you may know",
    "You might like",
    "Featured",
    "Recommendations",
    "Volunteer experience",
    "Licenses & certifications",
    "Publications",
    "Languages",
    "0 notifications",
  ],
};

export function joinSelectors(selectors) {
  if (typeof selectors === "string") return selectors;
  if (Array.isArray(selectors)) return selectors.join(", ");
  return "";
}

export default SELECTORS;