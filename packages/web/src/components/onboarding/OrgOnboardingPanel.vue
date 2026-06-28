<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { createOrg } from '../../utils/orgApi';

const auth = useAuthStore();
const ui = useUiStore();

const orgName = ref('');
const creating = ref(false);
const error = ref<string | null>(null);
const created = ref(false);

async function handleCreate(): Promise<void> {
  if (!orgName.value.trim()) {
    error.value = '请输入组织名称';
    return;
  }
  creating.value = true;
  error.value = null;
  const result = await createOrg(orgName.value.trim());
  creating.value = false;
  if (!result) {
    error.value = '创建失败，你可能已属于其他组织。';
    return;
  }
  auth.setOrg(result.org);
  if (auth.user) {
    auth.user.role = 'admin';
  }
  await auth.refresh();
  created.value = true;
  orgName.value = '';
}

function handleDismiss(): void {
  ui.dismissOrgOnboarding();
}
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <h3>先创建你的组织</h3>
      <button type="button" class="dismiss" @click="handleDismiss" aria-label="关闭">×</button>
    </div>

    <p class="lead">
      创建组织后你将成为管理员，可邀请同事加入；在组织内开设竞赛房、异步比拼成绩。也可以先跳过，直接单人练习。
    </p>

    <ol class="steps">
      <li><strong>创建组织</strong> — 你自动成为管理员</li>
      <li><strong>邀请成员</strong> — 在组织页生成邀请链接</li>
      <li><strong>开设竞赛房</strong> — 选择游戏，邀请同事各自完成挑战</li>
    </ol>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="created" class="success-block">
      <p class="success">组织已创建！你是管理员，可以邀请同事加入了。</p>
      <div class="actions">
        <RouterLink to="/org" class="btn primary">邀请成员</RouterLink>
        <RouterLink to="/sessions/new" class="btn">创建竞赛房</RouterLink>
      </div>
    </div>

    <div v-else class="form-row">
      <input
        v-model="orgName"
        type="text"
        class="input"
        placeholder="组织名称，例如：敏捷研发团队"
        @keydown.enter="handleCreate"
      />
      <button type="button" class="btn primary" :disabled="creating" @click="handleCreate">
        {{ creating ? '创建中…' : '创建组织' }}
      </button>
    </div>

    <button type="button" class="solo-link" @click="handleDismiss">先单人练习，稍后再说</button>
  </section>
</template>

<style scoped>
.panel {
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
}

.dismiss {
  border: none;
  background: transparent;
  font-size: 1.25rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
}

.lead {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.5;
}

.steps {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.6;
}

.form-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.input {
  flex: 1;
  min-width: 12rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fff;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.solo-link {
  margin-top: 0.75rem;
  border: none;
  background: none;
  color: #64748b;
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 0;
}

.solo-link:hover {
  color: #2563eb;
}

.error {
  color: #b91c1c;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.success {
  color: #047857;
  font-size: 0.875rem;
  margin: 0;
}

.success-block {
  margin-top: 0.75rem;
}
</style>
