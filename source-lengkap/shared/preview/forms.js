import { previewMessage } from './transport.js';

/** Public previews do not collect identity, files, credentials or financial entries. */
export function protectPreviewForms(scope) {
  function protect() {
    document
      .querySelectorAll('form input, form textarea, form select, input[type="file"]')
      .forEach((input) => {
        if (!input.disabled) input.disabled = true;
        input.title = previewMessage;
      });
    document.querySelectorAll('form canvas').forEach((canvas) => {
      canvas.style.pointerEvents = 'none';
      canvas.setAttribute('aria-disabled', 'true');
    });
    document.querySelectorAll('form button[type="submit"]').forEach((button) => {
      if (!button.disabled) button.disabled = true;
      button.title = previewMessage;
    });
  }
  scope.listen(
    document,
    'submit',
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  scope.listen(
    document,
    'click',
    (event) => {
      if (event.target.closest('a[aria-disabled="true"]')) event.preventDefault();
    },
    true,
  );
  const observer = new MutationObserver(protect);
  observer.observe(document.body, { childList: true, subtree: true });
  scope.add(() => observer.disconnect());
  protect();
}
