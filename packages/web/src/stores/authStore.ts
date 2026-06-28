import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  fetchMe,
  logout as logoutRequest,
  startFeishuLogin,
  type AuthOrg,
  type AuthUser,
} from '../utils/authApi';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const org = ref<AuthOrg | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isLoggedIn = computed(() => user.value !== null);
  const hasOrg = computed(() => org.value !== null);
  const isOrgAdmin = computed(() => user.value?.role === 'admin');

  async function initialize(): Promise<void> {
    if (initialized.value) {
      return;
    }
    loading.value = true;
    try {
      const me = await fetchMe();
      if (me) {
        user.value = me.user;
        org.value = me.org;
      }
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      const me = await fetchMe();
      user.value = me?.user ?? null;
      org.value = me?.org ?? null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  function login(state?: string): void {
    startFeishuLogin(state);
  }

  async function logout(): Promise<void> {
    await logoutRequest();
    user.value = null;
    org.value = null;
  }

  function setOrg(nextOrg: AuthOrg | null): void {
    org.value = nextOrg;
    if (user.value) {
      user.value = {
        ...user.value,
        orgId: nextOrg?.id ?? null,
        role: nextOrg ? user.value.role : 'member',
      };
    }
  }

  return {
    user,
    org,
    loading,
    initialized,
    isLoggedIn,
    hasOrg,
    isOrgAdmin,
    initialize,
    refresh,
    login,
    logout,
    setOrg,
  };
});
