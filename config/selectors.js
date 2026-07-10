// All LinkedIn CSS selectors in ONE place
// When LinkedIn changes their UI, update ONLY this file

export const SELECTORS = {
  // ── Profile Page ──
  profile: {
    personName: "h2",
    distance: "p, span",
    connectButton: 'a[aria-label], button[aria-label]',
    messageButton: 'a[href*="/messaging/compose/"]',
    messageButtonFallback: 'button, a',
    pendingButton: 'button',
    moreButton: 'button[aria-label]',
    followButton: 'button',
    contactInfoLink: 'a[href*="contact-info"]',
    aboutSection: '#about',
    experienceSection: '#experience',
  },

  // ── Message Composer ──
  composer: {
    contentEditable: '.msg-form__contenteditable',
    contentEditableFallback: '[contenteditable="true"][role="textbox"]',
    contentEditableAria: 'div[contenteditable="true"][aria-label*="Write" i]',
    subjectField: 'input.msg-form__subject, input[name="subject"], input[placeholder*="Subject" i]',
    sendButton: 'button.msg-form__send-btn',
    sendButtonFallback: 'button.msg-form__send-button',
    sendButtonAria: 'button[aria-label="Send message"]',
    sendButtonSubmit: 'form button[type="submit"]',
    formContainer: 'form.msg-form',
    placeholder: '.msg-form__placeholder',
  },

  // ── Connection Invite ──
  invite: {
    addNoteButton: 'button',
    sendButton: 'button',
    sendWithoutNote: 'button',
    noteTextarea: 'textarea[name="message"], #custom-message, textarea',
    inviteUrl: 'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
  },

  // ── Messaging Overlays ──
  overlay: {
    closeButton:
      '.msg-overlay-bubble-header__control[aria-label*="Close" i], .msg-overlay-bubble-header button[aria-label*="Close" i]',
    conversationBubble: '.msg-overlay-conversation-bubble',
  },

  // ── Premium Modal ──
  premium: {
    modal: '.modal-upsell, [aria-labelledby="modal-upsell-header"], .artdeco-modal--layer-default, [role="dialog"]',
    dismissButton:
      'button[aria-label="Dismiss"], button[data-test-modal-close-btn], .artdeco-modal__dismiss, button[aria-label*="Close" i]',
  },

  // ── Toast/Notifications ──
  toast: '.artdeco-toast-item, [role="alert"], .Toastify__toast',

  // ── Search Page ──
  search: {
    searchInput: 'input[aria-label="Search"]',
    searchButton: 'button[aria-label="Search"]',
    resultsContainer: '.search-results-container',
    personResult: '.entity-result__item',
    personName: '.entity-result__title-text a span',
    personHeadline: '.entity-result__primary-subtitle',
    personLocation: '.entity-result__secondary-subtitle',
    connectButtonInSearch: 'button[aria-label*="connect" i]',
    nextPageButton: 'button[aria-label="Next"]',
  },

  // ── Post Page ──
  post: {
    postContent: '.feed-shared-update-v2__description',
    postAuthor: '.update-components-actor__name',
    postTime: '.update-components-actor__sub-description',
    likeCount: '.social-details-social-counts__reactions-count',
    commentCount: '.social-details-social-counts__comments',
    postContainer: '.feed-shared-update-v2',
  },

  // ── Inbox ──
  inbox: {
    conversationItem: '.msg-conversation-listitem, .msg-conversation-card, li[data-view-name="conversation-list-item"]',
    participantName: '.msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3 span',
    messagePreview: '.msg-conversation-card__message-snippet, .msg-conversation-listitem__message-snippet',
    unreadIndicator: '.notification-badge--show, .notification-badge',
    messageBody: '.msg-s-event-listitem__body',
    composerInInbox: '.msg-form__contenteditable',
    sendInInbox: 'button.msg-form__send-button, button[aria-label="Send message"]',
  },

  // ── Contact Info Modal ──
  contactInfo: {
    emailField: 'a[href^="mailto:"]',
    phoneField: 'span.t-14.t-black.t-normal',
    websiteField: 'a[href*="http"]',
    closeModal: 'button[aria-label="Dismiss"]',
  },

  // ── Navigation ──
  nav: {
    globalNav: 'nav.global-nav',
    feedLink: 'a[href="/feed/"]',
    messagingLink: 'a[href="/messaging/"]',
    myNetworkLink: 'a[href="/mynetwork/"]',
  },
};

export default SELECTORS;