<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from '../../stores/uiStore';

const ui = useUiStore();

function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    ui.closeSetupGuide();
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    ui.closeSetupGuide();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.setupGuideOpen"
      class="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
      @click="handleBackdropClick"
    >
      <article class="modal">
        <header class="modal-header">
          <h2 id="setup-guide-title">欢迎来到 getKanban</h2>
          <button
            type="button"
            class="btn-close"
            aria-label="关闭说明"
            @click="ui.closeSetupGuide()"
          >
            ×
          </button>
        </header>

        <div class="modal-body">
          <p class="intro">
            你正在 <strong>Day 9</strong> 准备阶段。当前棋盘是团队的真实状态，主界面即为看板。
          </p>
          <ul class="basics">
            <li>浏览各列 WIP 与卡片位置，点击卡片右上角 ⓘ 查看详情。</li>
            <li>准备阶段可填充优先列、将列底骰子拖到卡片上分配。</li>
            <li>分配完成后点击「掷骰子」：动画结束后显示剩余工作量并自动结算。</li>
          </ul>

          <section class="flow-rules">
            <h3>流程与掷骰规则</h3>
            <ul>
              <li>
                <strong>跨岗掷骰：</strong>A / D / T 骰子可拖到任意有剩余工作的列；若骰子类型与列不匹配，掷骰点数按 <strong>÷ 2</strong> 计算（产能减半）。
              </li>
              <li>
                <strong>进入分析：</strong>只有<strong>优先列</strong>的卡片可以拖入分析列，不能从存量直接进分析。
              </li>
              <li>
                <strong>当日拉卡：</strong>当天刚从存量拉入优先列的卡片，需<strong>次日</strong>才能进入分析。
              </li>
            </ul>
          </section>

          <section class="special-cards">
            <h3>特殊卡片说明</h3>
            <dl>
              <div class="card-entry">
                <dt>F1 · 固定交付日</dt>
                <dd>须在 Day 15 前部署。按期免 $1,500 罚金；逾期在发布日扣 $1,500。</dd>
              </div>
              <div class="card-entry">
                <dt>F2 · 固定交付日（奖励型）</dt>
                <dd>须在 Day 21 前部署。按期获得 $500 奖励；逾期无奖励。</dd>
              </div>
              <div class="card-entry">
                <dt>I1 · 基础设施</dt>
                <dd>进入<strong>就绪列</strong>后生效：就绪列改为每日均可发布（部署频率 = 1）。</dd>
              </div>
              <div class="card-entry">
                <dt>I2 · 技术债</dt>
                <dd>
                  进入<strong>就绪列</strong>后生效：测试列所有卡片测试工作量 -2，新进测试列的卡也会自动减 2。
                </dd>
              </div>
              <div class="card-entry">
                <dt>I3 · 流程改进</dt>
                <dd>部署后向存量加入 S29–S33 五张新功能卡，优先于标准功能流动。</dd>
              </div>
            </dl>
          </section>

          <p class="tip">发布日（Day 9 / 12 / 15…）侧栏会列出已触发的特殊效果。随时可通过顶部「游戏说明」再次打开本页。</p>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-start" @click="ui.closeSetupGuide()">开始游戏</button>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgb(15 23 42 / 45%);
  backdrop-filter: blur(4px);
}

.modal {
  width: min(32rem, 100%);
  max-height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
  border-radius: 0.875rem;
  background: #fff;
  border: 1px solid #bfdbfe;
  box-shadow: 0 24px 48px rgb(15 23 42 / 18%);
  color: #1e3a5f;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.25rem 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.btn-close {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: #64748b;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #334155;
}

.modal-body {
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.intro {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.55;
}

.basics {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.flow-rules {
  margin-bottom: 1rem;
  padding: 0.75rem 0.875rem;
  border-radius: 0.5rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.flow-rules h3 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #166534;
}

.flow-rules ul {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: #334155;
}

.flow-rules li + li {
  margin-top: 0.375rem;
}

.special-cards {
  margin-bottom: 0.875rem;
  padding: 0.75rem 0.875rem;
  border-radius: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.special-cards h3 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #1e40af;
}

.special-cards dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-entry dt {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #1e40af;
}

.card-entry dd {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #334155;
}

.tip {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.45;
}

.modal-footer {
  padding: 0.75rem 1.25rem 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.btn-start {
  width: 100%;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-start:hover {
  background: #1d4ed8;
}
</style>
