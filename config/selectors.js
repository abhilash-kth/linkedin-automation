// export const SELECTORS = {
//   // ═════════════════════════════════════════════════════════════════
//   // 🔍 SEARCH BAR
//   // ═════════════════════════════════════════════════════════════════
//   searchBar: {
//     input: [
//       'input[data-testid="typeahead-input"]',
//       'input[componentkey="SearchResults_SearchTyahInputRef"]',
//       'input[placeholder="Search"]',
//       'input[aria-autocomplete="list"]',
//       'input.search-global-typeahead__input',
//     ],
//     tag: "data-search-bar",
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 📝 SEARCH FILTERS
//   // ═════════════════════════════════════════════════════════════════
//   filters: {
//     postsFilter: [
//       'a[aria-label="Filter by Posts"]',
//       'a[href*="/search/results/content/"][role="radio"]',
//     ],
//     peopleFilter: [
//       'a[aria-label="Filter by People"]',
//       'a[href*="/search/results/people/"][role="radio"]',
//     ],
//     sortByPill: [
//       'div[componentkey="SearchResults_filter_pill_sortBy"]',
//       'div[role="button"][aria-label*="Filter by Latest"]',
//       'div[role="button"][aria-label*="Filter by Top"]',
//     ],
//     latestOption: [
//       'div[role="radio"][aria-label="Latest"]',
//     ],
//     showResultsText: "Show results",
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 📄 POST CARD (in search results)
//   // ═════════════════════════════════════════════════════════════════
//   postCard: {
//     container: '[role="listitem"]',
//     tag: "data-post-index",
//     authorLink: 'a[href*="/in/"]:not([href*="/company/"])',
//     authorLinkWithBadge: [
//       'a[aria-label*="Verified Profile"]',
//       'a[aria-label*="3rd"]',
//       'a[aria-label*="2nd"]',
//       'a[aria-label*="1st"]',
//     ],
//     authorName: 'a[href*="/in/"] p span',
//     authorHeadline: 'p.e6590096.a303fa94',
//     postTimeClass: 'p.e6590096.a303fa94.e2049567',
//     postTimePattern: /^(\d+[wdhms])\s*[•·]/,
//     content: '[data-testid="expandable-text-box"]',
//     expandMoreButton: 'button[data-testid="expandable-text-button"]',

//     // ── Three-dot menu ──
//     threeDotMenu: [
//       'button[aria-label*="Open control menu for post"]',
//       'button[aria-label*="Open control menu"]',
//       'button[aria-label*="More actions"]',
//     ],

//     // ── Comment button (from your HTML) ──
//     // <button type="button" componentkey="..." aria-label="Comment">
//     commentButton: 'button[aria-label="Comment"]',

//     likeButton: 'button[aria-label*="Reaction"]',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 🔽 POST DROPDOWN MENU (3-dot)
//   // ═════════════════════════════════════════════════════════════════
//   postDropdown: {
//     menuItem: 'div[role="menuitem"]',
//     copyLinkText: "copy link",
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 💬 COMMENT COMPOSER
//   // From your HTML:
//   // <p data-placeholder="Add a comment..." class="is-empty is-editor-empty">
//   // The parent div is the ProseMirror editor
//   // ═════════════════════════════════════════════════════════════════
//   commentComposer: {
//     // The actual editable area (ProseMirror)
//     textbox: [
//       'div.tiptap.ProseMirror[contenteditable="true"]',
//       'div[contenteditable="true"][aria-label*="comment" i]',
//       'div[contenteditable="true"][aria-label*="Text editor" i]',
//       'div[contenteditable="true"][role="textbox"]',
//       '.ql-editor[contenteditable="true"]',
//     ],
//     // Placeholder paragraph inside ProseMirror
//     placeholder: 'p[data-placeholder="Add a comment..."]',
//     tag: "data-active-comment-box",

//     // Submit button (from your HTML):
//     // <button componentkey="CgsI...commentButtonSection...">Comment</button>
//     submitButton: 'button[componentkey*="commentButtonSection"]',
//     submitButtonTexts: ["Comment", "Post", "Reply"],
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 💬 COMMENTS SECTION (below post)
//   // ═════════════════════════════════════════════════════════════════
//   commentsSection: {
//     container: [
//       '.comments-comments-list',
//       '.comments-comment-list',
//       '[class*="comments-list"]',
//     ],
//     commentItem: [
//       'article.comments-comment-entity',
//       'article.comments-comment-item',
//       '[class*="comments-comment-entity"]',
//     ],
//     commentAuthorLink: 'a[href*="/in/"]',
//     commentAuthorName: [
//       '.comments-comment-meta__actor-link',
//       '.comments-post-meta__name-text',
//       'a.app-aware-link span[dir="ltr"]',
//     ],
//     commentText: [
//       '.comments-comment-item__main-content',
//       '.update-components-text',
//       '[class*="comment-item__main"]',
//     ],
//     replyButton: 'button[aria-label*="Reply" i], button[aria-label="Reply to comment"]',
//     showMoreComments: [
//       'button[aria-label*="Load more comments"]',
//       'button[aria-label*="Show more comments"]',
//     ],
//     authorBadge: '.comments-post-meta__badge, [class*="author-badge"]',
//     ownCommentClass: 'comments-comment-entity--self',
//     repliesContainer: '.comments-comment-item__replies',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // ↩️ REPLY COMPOSER
//   // ═════════════════════════════════════════════════════════════════
//   replyComposer: {
//     textbox: [
//       'div.tiptap.ProseMirror[contenteditable="true"]',
//       'div[contenteditable="true"][aria-label*="reply" i]',
//       'div[contenteditable="true"][aria-label*="Text editor" i]',
//     ],
//     tag: "data-reply-box",
//     submitButton: 'button[componentkey*="commentButtonSection"]',
//     cancelButton: 'button[aria-label*="Cancel" i]',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 👤 PROFILE PAGE
//   // ═════════════════════════════════════════════════════════════════
//   profile: {
//     personName: "h1, h2",
//     headline: ".text-body-medium.break-words",
//     location: [
//       ".text-body-small.inline.t-black--light.break-words",
//       ".pv-text-details__left-panel .text-body-small",
//       ".ph5.pb5 .text-body-small",
//     ],
//     distance: "p, span",
//     distancePattern: /^·?\s*(1st|2nd|3rd)$/,
//     connectButton: 'a[aria-label], button[aria-label]',
//     messageButton: 'a[href*="/messaging/compose/"]',
//     messageButtonText: "Message",
//     pendingButton: 'button',
//     pendingText: "Pending",
//     moreButton: 'button[aria-label]',
//     moreButtonAria: ["more actions", "more"],
//     contactInfoLink: [
//       'a[href*="/overlay/contact-info/"]',
//       'a[href*="contact-info"]',
//     ],
//     contactInfoText: "contact info",
//     buttonAreaBounds: {
//       minY: 400,
//       maxY: 800,
//       maxX: 700,
//     },
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 📇 CONTACT INFO MODAL
//   // ═════════════════════════════════════════════════════════════════
//   contactInfo: {
//     modalContainer: [
//       '[componentkey*="ContactInfoDetailSection"]',
//       '[role="dialog"]',
//     ],
//     sectionContainer: '[componentkey]',
//     sectionLabel: 'p.e6590096, h3, h4',
//     labels: {
//       website: "website",
//       email: "email",
//       phone: "phone",
//       birthday: "birthday",
//       twitter: "twitter",
//     },
//     emailField: 'a[href^="mailto:"]',
//     websiteField: 'a[href*="/safety/go/"], a[href^="http"]:not([href*="linkedin.com"])',
//     twitterField: 'a[href*="twitter.com"], a[href*="x.com"]',
//     phonePattern: /^\+?\d{10,15}$/,
//     safetyRedirectPattern: /url=([^&]+)/,
//     closeModal: [
//       'button[aria-label="Dismiss"]',
//       'button[data-test-modal-close-btn]',
//       '.artdeco-modal__dismiss',
//     ],
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // ✉️ MESSAGE COMPOSER
//   // ═════════════════════════════════════════════════════════════════
//   composer: {
//     contentEditable: '.msg-form__contenteditable',
//     contentEditableAll: [
//       '.msg-form__contenteditable',
//       '[contenteditable="true"][role="textbox"]',
//       'div[contenteditable="true"][aria-label*="message" i]',
//     ],
//     subjectField: 'input.msg-form__subject, input[name="subject"]',
//     sendButton: 'button.msg-form__send-btn',
//     sendButtonAll: [
//       "button.msg-form__send-btn",
//       "button.msg-form__send-button",
//       'button[aria-label="Send message"]',
//     ],
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 🤝 CONNECTION INVITE MODAL
//   // ═════════════════════════════════════════════════════════════════
//   invite: {
//     addNoteText: "Add a note",
//     sendButtonTexts: ["Send", "Send invitation", "Send without a note"],
//     noteTextarea: 'textarea[name="message"], #custom-message, textarea',
//     inviteUrlBuilder: (vanityName) =>
//       `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityName}`,
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 💬 MESSAGING OVERLAYS
//   // ═════════════════════════════════════════════════════════════════
//   overlay: {
//     closeButton:
//       '.msg-overlay-bubble-header__control[aria-label*="Close" i], .msg-overlay-bubble-header button[aria-label*="Close" i]',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 💎 PREMIUM MODAL
//   // ═════════════════════════════════════════════════════════════════
//   premium: {
//     modal: [
//       '.modal-upsell',
//       '[aria-labelledby="modal-upsell-header"]',
//       '.artdeco-modal--layer-default',
//       '[role="dialog"]',
//     ],
//     dismissButton: [
//       'button[aria-label="Dismiss"]',
//       'button[data-test-modal-close-btn]',
//       '.artdeco-modal__dismiss',
//     ],
//     modalTextPatterns: [
//       "try premium",
//       "out of free",
//       "custom notes",
//       "inmail credit",
//     ],
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 📥 INBOX
//   // ═════════════════════════════════════════════════════════════════
//   inbox: {
//     conversationItem: [
//       '.msg-conversation-listitem',
//       '.msg-conversation-card',
//       'li[data-view-name="conversation-list-item"]',
//     ],
//     participantName: [
//       '.msg-conversation-listitem__participant-names',
//       '.msg-conversation-card__participant-names',
//     ],
//     unreadIndicator: '.notification-badge--show',
//     messageBody: '.msg-s-event-listitem__body',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 🌐 GLOBAL NAVIGATION
//   // ═════════════════════════════════════════════════════════════════
//   nav: {
//     globalNav: 'nav.global-nav',
//     feedLink: 'a[href="/feed/"]',
//     messagingLink: 'a[href="/messaging/"]',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 🔐 LOGIN
//   // ═════════════════════════════════════════════════════════════════
//   login: {
//     emailInput: '#username',
//     passwordInput: '#password',
//     submitButton: 'button[type="submit"]',
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 📊 URLS
//   // ═════════════════════════════════════════════════════════════════
//   urls: {
//     feed: "https://www.linkedin.com/feed/",
//     messaging: "https://www.linkedin.com/messaging/",
//     profile: (vanity) => `https://www.linkedin.com/in/${vanity}/`,
//     profileContact: (profileUrl) => {
//       const clean = profileUrl.replace(/\/+$/, "");
//       return `${clean}/overlay/contact-info/`;
//     },
//     searchPostsLatest: (keyword) =>
//       `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}&sortBy=%5B%22date_posted%22%5D`,
//     searchPosts: (keyword) =>
//       `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}`,
//     inviteConnect: (vanityName) =>
//       `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityName}`,
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 🧪 REGEX PATTERNS
//   // ═════════════════════════════════════════════════════════════════
//   patterns: {
//     vanityName: /\/in\/([^\/\?]+)/,
//     postTime: /^(\d+[wdhms])\s*[•·]/,
//     distance: /^·?\s*(1st|2nd|3rd)$/,
//     phone: /^\+?\d{10,15}$/,
//     phoneMatch: /(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g,
//     email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
//     verifiedText: /Verified Profile/gi,
//     distanceText: /\s*(1st|2nd|3rd|3rd\+)\+?\s*/gi,
//   },

//   // ═════════════════════════════════════════════════════════════════
//   // 🚫 SKIP LISTS
//   // ═════════════════════════════════════════════════════════════════
//   skipNames: [
//     "Activity", "Experience", "Education", "About", "Skills",
//     "Interests", "People you may know", "You might like",
//     "Featured", "Recommendations", "Volunteer experience",
//     "Licenses & certifications", "Publications", "Languages",
//     "0 notifications",
//   ],
// };

// export function joinSelectors(selectors) {
//   if (typeof selectors === "string") return selectors;
//   if (Array.isArray(selectors)) return selectors.join(", ");
//   return "";
// }

// export default SELECTORS;

// ═══════════════════════════════════════════════════════════════════
// ALL LinkedIn CSS SELECTORS IN ONE PLACE
//
// When LinkedIn changes their UI, update ONLY this file
//
// Documentation format:
//   USED_IN: <service/controller file names>
//   PURPOSE: <what it targets>
// ═══════════════════════════════════════════════════════════════════

export const SELECTORS = {

  // ═════════════════════════════════════════════════════════════════
  // 🔍 SEARCH BAR & FILTERS
  // USED_IN: post-scraper.service.js, search.service.js
  // ═════════════════════════════════════════════════════════════════
  searchBar: {
    input: [
      'input[data-testid="typeahead-input"]',
      'input[componentkey="SearchResults_SearchTyahInputRef"]',
      'input[placeholder="Search"]',
      'input[aria-autocomplete="list"]',
      'input.search-global-typeahead__input',
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
    latestOption: [
      'div[role="radio"][aria-label="Latest"]',
    ],
    showResultsText: "Show results",
  },

  // ═════════════════════════════════════════════════════════════════
  // 📄 POST CARD (in search results)
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
    authorHeadline: 'p.e6590096.a303fa94',
    postTimeClass: 'p.e6590096.a303fa94.e2049567',
    postTimePattern: /^(\d+[wdhms])\s*[•·]/,
    content: '[data-testid="expandable-text-box"]',
    expandMoreButton: 'button[data-testid="expandable-text-button"]',
    threeDotMenu: [
      'button[aria-label*="Open control menu for post"]',
      'button[aria-label*="Open control menu"]',
      'button[aria-label*="More actions"]',
    ],
    commentButton: 'button[aria-label="Comment"]',
    likeButton: 'button[aria-label*="Reaction"]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 🔽 POST DROPDOWN MENU (3-dot)
  // USED_IN: post-commenter.service.js (copyPostLink)
  // ═════════════════════════════════════════════════════════════════
  postDropdown: {
    menuItem: 'div[role="menuitem"]',
    copyLinkText: "copy link",
  },

  // ═════════════════════════════════════════════════════════════════
  // 💬 COMMENT COMPOSER (on search results page)
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
    submitButton: 'button[componentkey*="commentButtonSection"]',
    submitButtonTexts: ["Comment", "Post", "Reply"],
  },

  // ═════════════════════════════════════════════════════════════════
  // 💬 COMMENTS SECTION (on individual post page)
  // USED_IN: comment-checker.service.js, post-commenter.service.js (replyToSpecificComment)
  // ═════════════════════════════════════════════════════════════════
  commentsSection: {
    container: [
      '.comments-comments-list',
      '.comments-comment-list',
      '[class*="comments-list"]',
    ],
    commentItem: [
      'article.comments-comment-entity',
      '[class*="comments-comment-entity"]',
    ],
    commentIdAttr: 'data-id',
    commentAuthorLink: '.comments-comment-meta__description-container',
    commentAuthorName: '.comments-comment-meta__description-title',
    commentAuthorTitle: '.comments-comment-meta__description-subtitle',
    commentMetaDescription: '.comments-comment-meta__description', // has "• You"
    commentAuthorBadge: '.comments-comment-meta__badge', // has "Author"
    commentText: '.comments-comment-item__main-content .update-components-text',
    commentTextFallback: '.comments-comment-item__main-content',
    commentSocialBar: '.comments-comment-social-bar--cr',
    commentReplyButton: 'button[aria-label*="Reply" i][aria-label*="comment"]',
    repliesContainer: '.comments-replies-list',
    replyEntity: 'article.comments-comment-entity, [class*="comment-entity--reply"]',
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
    // Quill editor for replies
    textbox: [
      'div.ql-editor[contenteditable="true"][data-placeholder*="reply" i]',
      'div.ql-editor[contenteditable="true"][data-placeholder*="comment" i]',
      'div.ql-editor[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
    ],
    tag: "data-active-reply-box",
    submitButton: [
      'button.comments-comment-box__submit-button--cr',
      'button[class*="comment-box__submit-button"]',
      'button[componentkey*="commentButtonSection"]',
    ],
    submitButtonTexts: ["Reply", "Comment", "Post"],
    cancelButton: 'button[aria-label*="Cancel" i]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 👤 PROFILE PAGE
  // USED_IN: profile.service.js, contact-info.service.js
  // ═════════════════════════════════════════════════════════════════
  profile: {
    personName: "h1, h2",
    headline: ".text-body-medium.break-words",
    location: [
      ".text-body-small.inline.t-black--light.break-words",
      ".pv-text-details__left-panel .text-body-small",
      ".ph5.pb5 .text-body-small",
    ],
    distance: "p, span",
    distancePattern: /^·?\s*(1st|2nd|3rd)$/,
    connectButton: 'a[aria-label], button[aria-label]',
    messageButton: 'a[href*="/messaging/compose/"]',
    messageButtonText: "Message",
    pendingButton: 'button',
    pendingText: "Pending",
    moreButton: 'button[aria-label]',
    moreButtonAria: ["more actions", "more"],
    contactInfoLink: [
      'a[href*="/overlay/contact-info/"]',
      'a[href*="contact-info"]',
    ],
    contactInfoText: "contact info",

    // Incoming invitation detection (from your HTML)
    incomingAcceptButton: 'button[aria-label*="Accept" i][aria-label*="request to connect" i]',

    buttonAreaBounds: {
      minY: 400,
      maxY: 800,
      maxX: 700,
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // 📇 CONTACT INFO MODAL
  // USED_IN: contact-info.service.js
  // ═════════════════════════════════════════════════════════════════
  contactInfo: {
    modalContainer: [
      '[data-testid="dialog-content"]',
      '[componentkey*="ContactInfoDetailSection"]',
      '[role="dialog"]',
    ],
    sectionContainer: '[componentkey]',
    sectionLabel: 'p.e6590096, h3, h4',
    labels: {
      website: "website",
      email: "email",
      phone: "phone",
      birthday: "birthday",
      twitter: "twitter",
    },
    emailField: 'a[href^="mailto:"]',
    websiteField: 'a[href*="/safety/go/"], a[href^="http"]:not([href*="linkedin.com"])',
    twitterField: 'a[href*="twitter.com"], a[href*="x.com"]',
    phonePattern: /^\+?\d{10,15}$/,
    safetyRedirectPattern: /url=([^&]+)/,
    closeModal: [
      'button[aria-label="Dismiss"]',
      'button[data-test-modal-close-btn]',
      '.artdeco-modal__dismiss',
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // ✉️ MESSAGE COMPOSER (Direct Messages / InMail)
  // USED_IN: message.service.js
  // ═════════════════════════════════════════════════════════════════
  composer: {
    contentEditable: '.msg-form__contenteditable',
    contentEditableAll: [
      '.msg-form__contenteditable',
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="message" i]',
    ],
    subjectField: 'input.msg-form__subject, input[name="subject"]',
    sendButton: 'button.msg-form__send-btn',
    sendButtonAll: [
      "button.msg-form__send-btn",
      "button.msg-form__send-button",
      'button[aria-label="Send message"]',
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // 🤝 CONNECTION INVITE MODAL
  // USED_IN: connection.service.js
  // ═════════════════════════════════════════════════════════════════
  invite: {
    addNoteText: "Add a note",
    sendButtonTexts: ["Send", "Send invitation", "Send without a note"],
    noteTextarea: 'textarea[name="message"], #custom-message, textarea',
    inviteUrlBuilder: (vanityName) =>
      `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityName}`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 💬 MESSAGING OVERLAYS (bottom-right chat bubbles)
  // USED_IN: navigation.service.js
  // ═════════════════════════════════════════════════════════════════
  overlay: {
    closeButton:
      '.msg-overlay-bubble-header__control[aria-label*="Close" i], .msg-overlay-bubble-header button[aria-label*="Close" i]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 💎 PREMIUM MODAL
  // USED_IN: premium.service.js
  // ═════════════════════════════════════════════════════════════════
  premium: {
    modal: [
      '.modal-upsell',
      '[aria-labelledby="modal-upsell-header"]',
      '.artdeco-modal--layer-default',
      '[role="dialog"]',
    ],
    dismissButton: [
      'button[aria-label="Dismiss"]',
      'button[data-test-modal-close-btn]',
      '.artdeco-modal__dismiss',
    ],
    modalTextPatterns: [
      "try premium",
      "out of free",
      "custom notes",
      "inmail credit",
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // 📥 INBOX (messaging page)
  // USED_IN: inbox.service.js, reply-sender.service.js
  // ═════════════════════════════════════════════════════════════════
  inbox: {
    conversationItem: [
      '.msg-conversation-listitem',
      '.msg-conversation-card',
      'li[data-view-name="conversation-list-item"]',
    ],
    participantName: [
      '.msg-conversation-listitem__participant-names',
      '.msg-conversation-card__participant-names',
    ],
    messagePreview: [
      '.msg-conversation-card__message-snippet',
      '.msg-conversation-listitem__message-snippet',
    ],
    unreadIndicator: '.notification-badge--show',
    unreadClasses: [
      "msg-conversation-listitem--unread",
      "msg-conversation-card--unread",
    ],
    messageBody: '.msg-s-event-listitem__body',
    messageItem: '.msg-s-event-listitem, .msg-s-message-list__event',
    threadUrlPattern: '/messaging/thread/',
    threadIdRegex: /\/thread\/([^\/\?]+)/,
  },

  // ═════════════════════════════════════════════════════════════════
  // 🌐 GLOBAL NAVIGATION
  // USED_IN: session.service.js
  // ═════════════════════════════════════════════════════════════════
  nav: {
    globalNav: 'nav.global-nav',
    feedLink: 'a[href="/feed/"]',
    messagingLink: 'a[href="/messaging/"]',
  },

  // ═════════════════════════════════════════════════════════════════
  // 🔐 LOGIN
  // USED_IN: auth.controller.js
  // ═════════════════════════════════════════════════════════════════
  login: {
    emailInput: '#username',
    passwordInput: '#password',
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
    activityPost: (activityId) => `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
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
    phoneMatch: /(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    verifiedText: /Verified Profile/gi,
    distanceText: /\s*(1st|2nd|3rd|3rd\+)\+?\s*/gi,
    activityUrn: /urn[:%3A]li[:%3A]activity[:%3A](\d+)/i,
    activityIdFromHighlight: /highlightedUpdateUrn=urn%3Ali%3Aactivity%3A(\d+)/,
  },

  // ═════════════════════════════════════════════════════════════════
  // 🚫 SKIP LISTS
  // ═════════════════════════════════════════════════════════════════
  skipNames: [
    "Activity", "Experience", "Education", "About", "Skills",
    "Interests", "People you may know", "You might like",
    "Featured", "Recommendations", "Volunteer experience",
    "Licenses & certifications", "Publications", "Languages",
    "0 notifications",
  ],
};

export function joinSelectors(selectors) {
  if (typeof selectors === "string") return selectors;
  if (Array.isArray(selectors)) return selectors.join(", ");
  return "";
}

export default SELECTORS;