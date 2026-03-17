const statusEl = document.getElementById('status');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const welcomeEl = document.getElementById('welcome');

const setStatus = (message, type = 'empty') => {
  statusEl.textContent = message;
  statusEl.className = 'status';
  if (type === 'ok') statusEl.classList.add('status-ok');
  if (type === 'error') statusEl.classList.add('status-error');
};

const resetForm = () => {
  usernameInput.value = '';
  passwordInput.value = '';
  passwordInput.placeholder = 'Password';
  deleteBtn.style.display = 'none';
  setStatus('No credentials set', 'empty');
};

const loadCredentials = () => {
  chrome.storage.local.get(
    ['ethz_username', 'ethz_password', 'ethz_show_welcome', 'ethz_login_failed'],
    (result) => {
      const username = result.ethz_username;
      const password = result.ethz_password;

      // Show welcome banner on first install
      if (result.ethz_show_welcome) {
        welcomeEl.style.display = 'block';
        // Clear the welcome flag and badge
        chrome.storage.local.remove(['ethz_show_welcome']);
        chrome.action.setBadgeText({ text: '' });
      }

      if (username && password) {
        usernameInput.value = username;
        passwordInput.value = '';
        passwordInput.placeholder = '••••••••';
        deleteBtn.style.display = 'inline-flex';

        if (result.ethz_login_failed) {
          setStatus('⚠ Login failed — update your credentials', 'error');
        } else {
          setStatus('✓ Credentials saved', 'ok');
        }
      } else {
        resetForm();
      }
    }
  );
};

const saveCredentials = () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    setStatus('Please enter username and password', 'error');
    return;
  }

  chrome.storage.local.set(
    { ethz_username: username, ethz_password: password },
    () => {
      // Clear failure state when credentials are updated
      chrome.storage.local.remove(['ethz_login_failed']);

      // Notify background to clear badge
      chrome.runtime.sendMessage({ type: 'CREDENTIALS_UPDATED' });

      passwordInput.value = '';
      passwordInput.placeholder = '••••••••';
      deleteBtn.style.display = 'inline-flex';
      welcomeEl.style.display = 'none';
      setStatus('✓ Credentials saved', 'ok');
    }
  );
};

const deleteCredentials = () => {
  const confirmed = confirm('Delete saved ETHZ credentials?');
  if (!confirmed) return;

  chrome.storage.local.remove(
    ['ethz_username', 'ethz_password', 'ethz_login_failed'],
    () => {
      resetForm();
      welcomeEl.style.display = 'none';
    }
  );
};

const togglePasswordVisibility = () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
};

saveBtn.addEventListener('click', saveCredentials);
deleteBtn.addEventListener('click', deleteCredentials);
toggleBtn.addEventListener('click', togglePasswordVisibility);

loadCredentials();
