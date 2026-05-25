<template>
  <div class="auth-records-page">
    <div class="page-header">
      <div>
        <h2>授权记录</h2>
        <p class="subtitle">查看和管理所有用户授权记录，支持撤销授权</p>
      </div>
      <el-button :icon="Refresh" @click="loadRecords">
        刷新
      </el-button>
    </div>

    <el-card class="content-card">
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div class="user-info">
              <div class="user-avatar">{{ row.username.charAt(0).toUpperCase() }}</div>
              <span class="username">{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="应用" min-width="160">
          <template #default="{ row }">
            <div class="client-info">
              <div class="client-avatar-sm">{{ row.clientName.charAt(0).toUpperCase() }}</div>
              <span>{{ row.clientName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="authorizedAt" label="授权时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.authorizedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="作用域" min-width="180">
          <template #default="{ row }">
            <div class="scope-tags">
              <el-tag v-for="s in row.scope.split(' ')" :key="s" size="small" :type="getScopeType(s)">
                {{ getScopeLabel(s) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="token" label="Access Token" min-width="200">
          <template #default="{ row }">
            <div class="code-text">
              <span v-if="row.revoked" class="revoked-token">已撤销</span>
              <span v-else>{{ truncateToken(row.token) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.revoked ? 'info' : 'success'" size="small">
              {{ row.revoked ? '已撤销' : '有效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              link
              :icon="CircleClose"
              @click="confirmRevoke(row)"
              :disabled="row.revoked"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && records.length === 0" description="暂无授权记录">
        <el-button type="primary" @click="$router.push('/simulate')">
          去模拟授权
        </el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, CircleClose } from '@element-plus/icons-vue'
import { authRecordApi } from '../utils/api'

const records = ref([])
const loading = ref(false)

const loadRecords = async () => {
  loading.value = true
  try {
    const res = await authRecordApi.getAll()
    records.value = res.data
  } catch (err) {
    ElMessage.error('加载授权记录失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const confirmRevoke = (row) => {
  ElMessageBox.confirm(
    `确定要撤销用户「${row.username}」对应用「${row.clientName}」的授权吗？`,
    '撤销授权确认',
    {
      confirmButtonText: '撤销',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await authRecordApi.revoke(row.id)
      const record = records.value.find(r => r.id === row.id)
      if (record) {
        record.revoked = true
      }
      ElMessage.success('授权已撤销')
    } catch (err) {
      ElMessage.error('撤销失败')
      console.error(err)
    }
  }).catch(() => {})
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getScopeType = (scope) => {
  const types = {
    'read': '',
    'write': 'warning'
  }
  return types[scope] || 'info'
}

const getScopeLabel = (scope) => {
  const labels = {
    'read': '读取',
    'write': '写入'
  }
  return labels[scope] || scope
}

const truncateToken = (token) => {
  if (!token) return ''
  return token.substring(0, 8) + '...' + token.substring(token.length - 6)
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.auth-records-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
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

.content-card {
  border-radius: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.username {
  font-weight: 500;
  color: #303133;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.client-avatar-sm {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.scope-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.code-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #606266;
}

.revoked-token {
  color: #909399;
  font-style: italic;
}
</style>
