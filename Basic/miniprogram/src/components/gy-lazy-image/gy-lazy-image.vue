<template>
  <view class="lazy-image" :style="{ width: width, height: height }">
    <!-- 占位图 -->
    <image
      v-if="!loaded"
      class="lazy-image__placeholder"
      :src="placeholder"
      mode="aspectFill"
    />
    
    <!-- 实际图片 -->
    <image
      v-if="shouldLoad"
      class="lazy-image__real"
      :class="{ 'lazy-image__real--loaded': loaded }"
      :src="src"
      :mode="mode"
      :webp="webp"
      @load="onLoad"
      @error="onError"
    />
    
    <!-- 加载失败占位 -->
    <view v-if="error" class="lazy-image__error">
      <text class="lazy-image__error-text">加载失败</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 图片地址 */
    src: string
    /** 宽度 */
    width?: string
    /** 高度 */
    height?: string
    /** 图片模式 */
    mode?: string
    /** 占位图 */
    placeholder?: string
    /** 是否使用 WebP */
    webp?: boolean
    /** 预加载距离（px） */
    preloadDistance?: number
  }>(),
  {
    width: '100%',
    height: '200rpx',
    mode: 'aspectFill',
    placeholder: '/static/images/placeholder.png',
    webp: true,
    preloadDistance: 200,
  }
)

const emit = defineEmits<{
  (e: 'load', event: Event): void
  (e: 'error', event: Event): void
}>()

// 状态
const loaded = ref(false)
const error = ref(false)
const shouldLoad = ref(false)
const observer = ref<UniApp.IntersectionObserver | null>(null)

// 是否在视口内
const inViewport = ref(false)

onMounted(() => {
  initObserver()
})

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})

/**
 * 初始化 IntersectionObserver
 */
function initObserver() {
  // 如果没有 src，直接返回
  if (!props.src) {
    return
  }

  // 创建观察器
  observer.value = uni.createIntersectionObserver(getCurrentInstance()?.proxy as any, {
    thresholds: [0],
    observeAll: false,
  })

  // 监听相对于视口的位置
  observer.value.relativeToViewport({ bottom: props.preloadDistance }).observe('.lazy-image', (res) => {
    if (res.intersectionRatio > 0) {
      inViewport.value = true
      shouldLoad.value = true
      
      // 图片开始加载后，停止观察
      if (observer.value) {
        observer.value.disconnect()
      }
    }
  })
}

/**
 * 图片加载成功
 */
function onLoad(event: Event) {
  loaded.value = true
  error.value = false
  emit('load', event)
}

/**
 * 图片加载失败
 */
function onError(event: Event) {
  error.value = true
  loaded.value = false
  emit('error', event)
}

/**
 * 获取当前组件实例
 */
function getCurrentInstance() {
  // @ts-ignore
  return getCurrentInstance?.() || null
}
</script>

<style lang="scss" scoped>
.lazy-image {
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 8rpx;

  &__placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
  }

  &__real {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.3s ease;

    &--loaded {
      opacity: 1;
    }
  }

  &__error {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
  }

  &__error-text {
    font-size: 24rpx;
    color: #999;
  }
}
</style>