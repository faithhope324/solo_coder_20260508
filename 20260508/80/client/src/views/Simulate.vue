<template>
  <div class="simulate-page">
    <div class="page-header">
      <div>
        <h2>模拟授权流程</h2>
        <p class="subtitle">体验完整的 OAuth2 授权码模式流程</p>
      </div>
    </div>

    <div class="flow-diagram">
      <div class="step" :class="{ active: currentStep >= 1, done: currentStep > 1 }">
        <div class="step-number">1</div>
        <div class="step-label">选择应用</div>
      </div>
      <div class="arrow" v-if="currentStep >= 1">→</div>
      <div class="step" :class="{ active: currentStep >= 2, done: currentStep > 2 }">
        <div class="step-number">2</div>
        <div class="step-label">用户授权</div>
      </div>
      <div class="arrow" v-if="currentStep >= 2">→</div>
      <div class="step" :class="{ active: currentStep >= 3, done: currentStep > 3 }">
        <div class="step-number">3</div>
        <div class="step-label">获取 Code</div>
      </div>
      <div class="arrow" v-if="currentStep >= 3">→</div>
      <div class="step" :class="{ active: currentStep >= 4, done: currentStep > 4 }">
        <div class="step-number">4</div>
        <div class="step-label">换取 Token</div>
      </div>
      <div class="arrow" v-if="currentStep >= 4">→</div>
      <div class="step" :class="{ active: currentStep >= 5, done: currentStep > 5 }">
        <div class="step-number">5</div>
        <div class="step-label">访问资源</div>
      </div>
    </div>

    <el-row :gutter="24">
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <div class="card-header">
              <el-icon size="20"><Grid /></el-icon>
              <span>选择客户端应用</span>
            </div>
          </template>

          <el-table :data="clients" v-loading="loading" @row-click="selectClient" highlight-current-row>
            <el-table-column label="应用">
              <template #default="{ row }">
                <div class="client-select">
                  <div class="client-avatar">{{ row.name.charAt(0).toUpperCase() }}</div>
                  <div>
                    <div class="client-name">{{ row.name }}</div>
                    <div class="client-desc" v-if="row.description">{{ row.description }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!loading && clients.length === 0" description="请先创建客户端应用">
            <el-button type="primary" @click="$router.push('/clients')">
              去创建
            </el-button>
          </el-empty>
        </el-card>

        <el-card class="content-card" v-if="selectedClient" style="margin-top: 24px;">
          <template #header>
            <div class="card-header">
              <el-icon size="20"><Setting /></el-icon>
              <span>客户端配置</span>
            </div>
          </template>

          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="Client ID">
              <code class="code-inline">{{ selectedClient.id }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="Client Secret">
              <code class="code-inline">{{ selectedClient.secret }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="回调地址">
              <code class="code-inline">{{ selectedClient.redirectUri }}</code>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <el-form label-width="100px">
            <el-form-item label="作用域">
              <el-checkbox-group v-model="selectedScopes">
                <el-checkbox label="read">读取 (read)</el-checkbox>
                <el-checkbox label="write">写入 (write)</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Promotion" @click="startAuthorization" :disabled="selectedScopes.length === 0">
                开始授权流程
              </el-button>
              <el-button @click="resetFlow">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <div class="card-header">
              <el-icon size="20"><Document /></el-icon>
              <span>流程日志</span>
            </div>
          </template>

          <div class="log-container">
            <div v-if="logs.length === 0" class="empty-log">
              <el-icon size="48" color="#c0c4cc"><Files /></el-icon>
              <p>选择客户端并开始授权流程</p>
            </div>
            <div v-else class="log-list">
              <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
                <div class="log-header">
                  <span class="log-step">Step {{ log.step }}</span>
                  <span class="log-time">{{ log.time }}</span>
                </div>
                <div class="log-title">{{ log.title }}</div>
                <div class="log-content" v-if="log.content">
                  <pre>{{ log.content }}</pre>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="callbackVisible" title="授权回调" width="600px">
      <div v-if="callbackData.code">
        <el-alert type="success" :closable="false" class="mb20">
          授权成功！已获取授权码
        </el-alert>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="授权码 (code)">
            <code class="code-inline">{{ callbackData.code }}</code>
          </el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-button type="primary" @click="exchangeToken">用 Code 换取 Access Token</el-button>
      </div>
      <div v-else-if="callbackData.error">
        <el-alert type="error" :closable="false">
          授权失败：{{ callbackData.error }}
        </el-alert>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, Setting, Promotion, Document, Files } from '@element-plus/icons-vue'
import { clientApi } from '../utils/api'
import axios from 'axios'

const clients = ref([])
const loading = ref(false)
const selectedClient = ref(null)
const selectedScopes = ref(['read'])
const currentStep = ref(0)
const logs = ref([])
const callbackVisible = ref(false)
const callbackData = reactive({
  code: null,
  error: null
})

let popupWindow = null
let checkInterval = null
let popupClosedLogged = false

const loadClients = async () => {
  loading.value = true
  try {
    const res = await clientApi.getAll()
    clients.value = res.data
  } catch (err) {
    ElMessage.error('加载客户端列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const selectClient = (row) => {
  selectedClient.value = row
  currentStep.value = 1
  addLog(1, 'info', '已选择客户端', `应用名称: ${row.name}\nClient ID: ${row.id}`)
}

const addLog = (step, type, title, content = '') => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ step, type, title, content, time })
}

const startAuthorization = () => {
  if (!selectedClient.value || selectedScopes.value.length === 0) {
    return
  }

  popupClosedLogged = false
  callbackData.code = null
  callbackData.error = null

  currentStep.value = 2
  const scope = selectedScopes.value.join(' ')
  const authUrl = `/oauth/authorize?client_id=${selectedClient.value.id}&redirect_uri=${encodeURIComponent(selectedClient.value.redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`

  addLog(2, 'info', '构建授权 URL', `GET ${authUrl}`)
  addLog(2, 'info', '跳转授权页面', '用户将在新窗口中完成登录和授权确认')

  const width = 500
  const height = 700
  const left = (window.innerWidth - width) / 2
  const top = (window.innerHeight - height) / 2

  popupWindow = window.open(
    authUrl,
    'OAuth2 Authorization',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  )

  checkInterval = setInterval(checkPopupClosed, 500)

  window.addEventListener('message', handleCallbackMessage)
}

const checkPopupClosed = () => {
  if (popupWindow && popupWindow.closed && !popupClosedLogged) {
    popupClosedLogged = true
    clearInterval(checkInterval)
    checkInterval = null
    window.removeEventListener('message', handleCallbackMessage)
    if (!callbackData.code && !callbackData.error) {
      addLog(2, 'warning', '授权窗口已关闭', '用户可能取消了授权')
    }
  }
}

const handleCallbackMessage = (event) => {
  if (event.data.type === 'oauth2_callback') {
    popupClosedLogged = true
    clearInterval(checkInterval)
    checkInterval = null
    window.removeEventListener('message', handleCallbackMessage)

    if (popupWindow) {
      popupWindow.close()
      popupWindow = null
    }

    if (event.data.code) {
      currentStep.value = 3
      callbackData.code = event.data.code
      callbackData.error = null
      callbackVisible.value = true
      addLog(3, 'success', '获取授权码成功', `code: ${event.data.code}`)
    } else if (event.data.error) {
      callbackData.code = null
      callbackData.error = event.data.error
      callbackVisible.value = true
      addLog(3, 'error', '授权失败', `error: ${event.data.error}`)
    }
  }
}

const exchangeToken = async () => {
  if (!callbackData.code || !selectedClient.value) return

  currentStep.value = 4
  addLog(4, 'info', '换取 Access Token', 'POST /oauth/token')

  try {
    const basicAuth = btoa(`${selectedClient.value.id}:${selectedClient.value.secret}`)

    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', callbackData.code)
    params.append('redirect_uri', selectedClient.value.redirectUri)

    const res = await axios.post('/oauth/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      }
    })

    addLog(4, 'success', '获取 Access Token 成功', JSON.stringify(res.data, null, 2))

    currentStep.value = 5
    addLog(5, 'info', '使用 Token 访问资源', 'GET /api/userinfo')

    const userInfoRes = await axios.get('/api/userinfo', {
      headers: {
        'Authorization': `Bearer ${res.data.access_token}`
      }
    })

    addLog(5, 'success', '访问资源成功', JSON.stringify(userInfoRes.data, null, 2))
    callbackVisible.value = false
    ElMessage.success('完整授权流程已完成！')
  } catch (err) {
    console.error(err)
    const errorMsg = err.response?.data?.error || err.message
    addLog(4, 'error', '换取 Token 失败', errorMsg)
    ElMessage.error('换取 Token 失败')
  }
}

const resetFlow = () => {
  currentStep.value = 0
  logs.value = []
  callbackData.code = null
  callbackData.error = null
  callbackVisible.value = false
  selectedClient.value = null
  selectedScopes.value = ['read']
  popupClosedLogged = false
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  if (popupWindow) {
    popupWindow.close()
    popupWindow = null
  }
  window.removeEventListener('message', handleCallbackMessage)
}

onMounted(() => {
  loadClients()
})

onUnmounted(() => {
  popupClosedLogged = false
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  if (popupWindow) {
    popupWindow.close()
    popupWindow = null
  }
  window.removeEventListener('message', handleCallbackMessage)
})
</script>

<style scoped>
.simulate-page {
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.flow-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  flex-wrap: wrap;
  gap: 8px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: all 0.3s;
}

.step.active {
  opacity: 1;
}

.step.done .step-number {
  background: #67c23a;
  color: white;
}

.step-number {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  color: #909399;
  transition: all 0.3s;
}

.step.active .step-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.step-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.arrow {
  color: #dcdfe6;
  font-size: 20px;
  font-weight: bold;
}

.content-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.client-select {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.client-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
}

.client-name {
  font-weight: 500;
  color: #303133;
}

.client-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.code-inline {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #606266;
  word-break: break-all;
}

.log-container {
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
}

.empty-log {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #909399;
}

.empty-log p {
  margin-top: 12px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  padding: 12px;
  border-radius: 8px;
  background: #f5f7fa;
  border-left: 3px solid #909399;
}

.log-item.info {
  border-left-color: #409eff;
  background: #ecf5ff;
}

.log-item.success {
  border-left-color: #67c23a;
  background: #f0f9eb;
}

.log-item.error {
  border-left-color: #f56c6c;
  background: #fef0f0;
}

.log-item.warning {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.log-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.log-step {
  font-size: 11px;
  font-weight: 600;
  color: #909399;
  background: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.log-time {
  font-size: 11px;
  color: #c0c4cc;
  font-family: 'Monaco', 'Menlo', monospace;
}

.log-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
}

.log-content pre {
  margin: 0;
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
}

.mb20 {
  margin-bottom: 20px;
}
</style>
