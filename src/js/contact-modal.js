/**
 * Contact Us Modal
 * Game-style modal matching auth-ui design
 */

function showContactModal() {
  // Remove existing modal if present
  const existingModal = document.getElementById('contact-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'contact-modal';
  modal.className = 'auth-modal';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="auth-modal-overlay"></div>
    <div class="auth-modal-content has-title-banner">
      <div class="modal-title-banner">
        <h2>📧 Contact Us</h2>
      </div>
      <button class="modal-close-btn" aria-label="Close">&times;</button>
      <div class="modal-content-area">
        <div class="auth-modal-header">
          <p>If you have any questions, please contact us at <strong>tey7101@gmail.com</strong></p>
        </div>
        <div class="auth-modal-body">
          <a href="mailto:tey7101@gmail.com" class="oauth-btn email-login-btn" style="text-decoration: none; justify-content: center;">
            <span class="oauth-btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </span>
            <span class="oauth-btn-text">tey7101@gmail.com</span>
          </a>
        </div>
        <div class="auth-modal-footer">
          <p>We typically respond within 24-48 hours</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Bind events
  const closeBtn = modal.querySelector('.modal-close-btn');
  const overlay = modal.querySelector('.auth-modal-overlay');

  const closeModal = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  closeBtn.onclick = closeModal;
  overlay.onclick = closeModal;

  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Export for global use
if (typeof window !== 'undefined') {
  window.showContactModal = showContactModal;
}
