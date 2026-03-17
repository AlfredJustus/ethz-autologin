const steps = [
  document.getElementById('step-1'),
  document.getElementById('step-2'),
  document.getElementById('step-3')
];
const progress = document.getElementById('progress');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');
let currentStep = 0;

const goTo = (index) => {
  steps[currentStep].classList.remove('active');
  currentStep = index;
  steps[currentStep].classList.add('active');
  progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;

  const input = steps[currentStep].querySelector('input');
  if (input) setTimeout(() => input.focus(), 100);
};

// Handle the chrome:// link
document.getElementById('pw-manager-link').addEventListener('click', (e) => {
  e.preventDefault();
  try {
    chrome.tabs.create({ url: 'chrome://password-manager/passwords?q=ethz' });
  } catch {
    const el = e.target;
    const originalText = el.textContent;
    navigator.clipboard.writeText('chrome://password-manager/passwords?q=ethz').then(() => {
      el.textContent = 'Link copied! Paste in a new tab.';
      setTimeout(() => { el.textContent = originalText; }, 3000);
    }).catch(() => {
      el.textContent = 'Go to: chrome://password-manager/passwords?q=ethz';
      setTimeout(() => { el.textContent = originalText; }, 5000);
    });
  }
});

// Step 1: Username → next
document.getElementById('next-1').addEventListener('click', () => {
  const val = usernameInput.value.trim();
  if (!val) {
    document.getElementById('error-1').textContent = 'Please enter your username.';
    usernameInput.focus();
    return;
  }
  document.getElementById('error-1').textContent = '';
  goTo(1);
});

// Step 2: Password → save
document.getElementById('next-2').addEventListener('click', () => {
  const pw = passwordInput.value.trim();
  if (!pw) {
    document.getElementById('error-2').textContent = 'Please enter your password.';
    passwordInput.focus();
    return;
  }
  document.getElementById('error-2').textContent = '';

  const username = usernameInput.value.trim();
  chrome.storage.local.set(
    { ethz_username: username, ethz_password: pw },
    () => {
      chrome.storage.local.remove(['ethz_show_welcome', 'ethz_login_failed']);
      chrome.action.setBadgeText({ text: '' });
      goTo(2);
    }
  );
});

// Skip buttons
document.getElementById('skip-1').addEventListener('click', () => {
  document.getElementById('done-message').textContent =
    'No worries — click the extension icon anytime to add your credentials.';
  steps[currentStep].classList.remove('active');
  currentStep = 2;
  steps[2].classList.add('active');
  progress.style.width = '100%';
});

document.getElementById('skip-2').addEventListener('click', () => {
  document.getElementById('done-message').textContent =
    'No worries — click the extension icon anytime to finish setup.';
  steps[currentStep].classList.remove('active');
  currentStep = 2;
  steps[2].classList.add('active');
  progress.style.width = '100%';
});

// Enter key advances
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('next-1').click();
});
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('next-2').click();
});

// Password toggle
toggleBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

// Clear errors on input
usernameInput.addEventListener('input', () => {
  document.getElementById('error-1').textContent = '';
});
passwordInput.addEventListener('input', () => {
  document.getElementById('error-2').textContent = '';
});

// Init progress
progress.style.width = '33%';
