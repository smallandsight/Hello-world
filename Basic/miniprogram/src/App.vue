<script>
export default {
  onLaunch() {
    console.log('App Launch - 古月租车小程序')
    // 检查登录态
    this.checkLoginStatus()
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  },
  methods: {
    checkLoginStatus() {
      const token = uni.getStorageSync('token')
      if (token) {
        console.log('用户已登录')
      }
    }
  }
}
</script>

<style lang="scss">
/* 全局样式变量 */
page {
  --primary-color: #1890FF;
  --primary-light: #40a9ff;
  --primary-dark: #096dd9;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #f5222d;
  --text-primary: #262626;
  --text-secondary: #595959;
  --text-tertiary: #8c8c8c;
  --border-color: #d9d9d9;
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

/* 全局重置 */
view, text, image {
  box-sizing: border-box;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 文字截断 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
