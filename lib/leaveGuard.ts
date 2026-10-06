// A page with unsaved edits registers its question here, so navigations that
// are not link clicks (the sidebar logout button) can ask before leaving.
let question: (() => string) | null = null;

export function setLeaveQuestion(q: (() => string) | null) {
  question = q;
}

/** True when it is fine to leave: nothing unsaved, or the admin confirmed. */
export function confirmLeave(): boolean {
  return question == null || window.confirm(question());
}
