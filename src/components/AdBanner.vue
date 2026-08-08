<script setup>
import { ref, computed } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { adConfig } from '../config/ads.js'

const props = defineProps({
  placement: { type: String, default: 'sidebar' },
  dismissible: { type: Boolean, default: true },
})

const emit = defineEmits(['dismiss'])
const visible = ref(true)
const imgFailed = ref(false)

const ad = computed(() => adConfig[props.placement] || adConfig.sidebar)
const hasRealAd = computed(() => !!ad.value.image && !!ad.value.link)

function onDismiss() {
  visible.value = false
  emit('dismiss')
}
</script>

<template>
  <Transition name="ad-fade">
    <div v-if="visible" class="ad-banner" :class="`ad-${placement}`">
      <!-- 真实广告 -->
      <a
        v-if="hasRealAd && !imgFailed"
        class="ad-link"
        :href="ad.link"
        target="_blank"
        rel="nofollow noopener sponsored"
      >
        <div class="ad-inner">
          <div class="ad-tag">AD</div>
          <div class="ad-content">
            <img class="ad-img" :src="ad.image" alt="广告" @error="imgFailed = true" />
          </div>
          <span class="ad-label">赞助内容</span>
        </div>
      </a>

      <!-- 占位：招商广告位 -->
      <div v-else class="ad-link">
        <div class="ad-inner">
          <div class="ad-tag">AD</div>
          <div class="ad-content">
            <div class="ad-placeholder">
              <span class="ad-placeholder-icon">📢</span>
              <span class="ad-placeholder-text">{{ ad.text }}</span>
            </div>
          </div>
          <span class="ad-label">赞助内容</span>
        </div>
      </div>

      <button v-if="dismissible" class="ad-close" aria-label="关闭广告" @click.stop="onDismiss">
        <el-icon :size="12"><Close /></el-icon>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.ad-banner {
  position: relative;
  margin: 0 auto;
  border-radius: 14px;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  transition: box-shadow .2s;
}
.ad-banner:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }

.ad-sidebar { max-width: 300px; }
.ad-footer { max-width: 100%; margin-bottom: 20px; }

.ad-link { display: block; text-decoration: none; color: inherit; }

.ad-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  gap: 6px;
}

.ad-tag {
  font-size: 10px; font-weight: 700; letter-spacing: .12em;
  color: var(--muted); text-transform: uppercase;
}

.ad-content {
  width: 100%; display: flex; justify-content: center;
  align-items: center; min-height: 60px;
}

.ad-img { max-width: 100%; height: auto; border-radius: 8px; }

.ad-placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 18px 24px; color: var(--muted);
  background: color-mix(in srgb, var(--brand-soft) 50%, transparent);
  border-radius: 8px; width: 100%;
}
.ad-placeholder-icon { font-size: 28px; }
.ad-placeholder-text { font-size: 13px; text-align: center; }

.ad-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; }

.ad-close {
  position: absolute; top: 6px; right: 6px;
  width: 20px; height: 20px; border: 0; border-radius: 50%;
  background: rgba(128,128,128,.45); color: #fff;
  cursor: pointer; display: grid; place-items: center;
  font-size: 11px; opacity: 0; transition: opacity .2s, background .2s;
}
.ad-banner:hover .ad-close { opacity: 1; }
.ad-close:hover { background: rgba(128,128,128,.7); }

.ad-fade-enter-active, .ad-fade-leave-active { transition: all .35s ease; }
.ad-fade-enter-from, .ad-fade-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 960px) { .ad-sidebar { max-width: 100%; } }
</style>