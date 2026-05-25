<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo">
          <el-icon :size="28" color="#fff"><Key /></el-icon>
          <span class="title">OAuth2 客户端管理系统</span>
        </div>
        <el-menu
          mode="horizontal"
          :default-active="$route.path"
          class="nav-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/clients" to="/clients">
            <el-icon><Grid /></el-icon>
            <span>客户端管理</span>
          </el-menu-item>
          <el-menu-item index="/auth-records" to="/auth-records">
            <el-icon><Tickets /></el-icon>
            <span>授权记录</span>
          </el-menu-item>
          <el-menu-item index="/simulate" to="/simulate">
            <el-icon><Cpu /></el-icon>
            <span>模拟授权</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Key, Grid, Tickets, Cpu } from '@element-plus/icons-vue'

const router = useRouter()

const handleMenuSelect = (index) => {
  router.push(index)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  height: 64px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 40px;
}

.title {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin-left: 10px;
}

.nav-menu {
  background: transparent;
  border-bottom: none;
  flex: 1;
}

.nav-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.85);
  border-bottom: 2px solid transparent;
  height: 64px;
  line-height: 64px;
}

.nav-menu .el-menu-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.nav-menu .el-menu-item.is-active {
  color: #fff;
  border-bottom-color: #fff;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 24px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
