const statusEl = document.getElementById('status');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

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
    ['ethz_username', 'ethz_password', 'ethz_login_failed'],
    (result) => {
      if (result.ethz_username && result.ethz_password) {
        usernameInput.value = result.ethz_username;
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
      chrome.storage.local.remove(['ethz_login_failed']);
      chrome.runtime.sendMessage({ type: 'CREDENTIALS_UPDATED' });

      passwordInput.value = '';
      passwordInput.placeholder = '••••••••';
      deleteBtn.style.display = 'inline-flex';
      setStatus('✓ Credentials saved', 'ok');
    }
  );
};

const deleteCredentials = () => {
  if (!confirm('Delete saved ETHZ credentials?')) return;

  chrome.storage.local.remove(
    ['ethz_username', 'ethz_password', 'ethz_login_failed'],
    () => resetForm()
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
