const statusEl = document.getElementById('status');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

const setStatus = (message, ok = false) => {
  statusEl.textContent = message;
  statusEl.classList.toggle('status-ok', ok);
};

const resetForm = () => {
  usernameInput.value = '';
  passwordInput.value = '';
  passwordInput.placeholder = 'Password';
  deleteBtn.style.display = 'none';
  setStatus('No credentials set', false);
};

const loadCredentials = () => {
  chrome.storage.local.get(['ethz_username', 'ethz_password'], (result) => {
    const username = result.ethz_username;
    const password = result.ethz_password;

    if (username && password) {
      usernameInput.value = username;
      passwordInput.value = '';
      passwordInput.placeholder = '••••••••';
      deleteBtn.style.display = 'inline-flex';
      setStatus('✓ Credentials saved', true);
    } else {
      resetForm();
    }
  });
};

const saveCredentials = () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    setStatus('Please enter username and password', false);
    return;
  }

  chrome.storage.local.set(
    { ethz_username: username, ethz_password: password },
    () => {
      passwordInput.value = '';
      passwordInput.placeholder = '••••••••';
      deleteBtn.style.display = 'inline-flex';
      setStatus('✓ Credentials saved', true);
    }
  );
};

const deleteCredentials = () => {
  const confirmed = confirm('Delete saved ETHZ credentials?');
  if (!confirmed) return;

  chrome.storage.local.remove(['ethz_username', 'ethz_password'], () => {
    resetForm();
  });
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
