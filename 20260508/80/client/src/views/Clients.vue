<template>
  <div class="clients-page">
    <div class="page-header">
      <div>
        <h2>客户端管理</h2>
        <p class="subtitle">管理 OAuth2 第三方应用，包括客户端 ID、Secret 和回调地址</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">
        创建客户端
      </el-button>
    </div>

    <el-card class="content-card">
      <el-table :data="clients" v-loading="loading" stripe>
        <el-table-column prop="name" label="应用名称" min-width="140">
          <template #default="{ row }">
            <div class="client-name">
              <div class="client-avatar">{{ row.name.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="name">{{ row.name }}</div>
                <div class="desc" v-if="row.description">{{ row.description }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="Client ID" min-width="220">
          <template #default="{ row }">
            <div class="code-text">
              <span>{{ row.id }}</span>
              <el-button link type="primary" @click="copyToClipboard(row.id, 'Client ID')">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="secret" label="Client Secret" min-width="280">
          <template #default="{ row }">
            <div class="code-text">
              <span v-if="row.showSecret">{{ row.secret }}</span>
              <span v-else class="masked">••••••••••••••••••••••••••••</span>
              <el-button link type="primary" @click="row.showSecret = !row.showSecret">
                <el-icon v-if="!row.showSecret"><View /></el-icon>
                <el-icon v-else><Hide /></el-icon>
              </el-button>
              <el-button link type="primary" @click="copyToClipboard(row.secret, 'Client Secret')">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="redirectUri" label="回调地址" min-width="200">
          <template #default="{ row }">
            <span class="link-text">{{ row.redirectUri }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link :icon="Delete" @click="confirmDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && clients.length === 0" description="暂无客户端，点击右上角创建">
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">
          创建客户端
        </el-button>
      </el-empty>
    </el-card>

    <el-dialog v-model="createDialogVisible" title="创建新客户端" width="500px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="应用名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入应用名称" />
        </el-form-item>
        <el-form-item label="回调地址" prop="redirectUri">
          <el-input v-model="createForm.redirectUri" placeholder="例如：https://example.com/callback" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="应用的简要描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createClient">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, CopyDocument, View, Hide } from '@element-plus/icons-vue'
import { clientApi } from '../utils/api'

const clients = ref([])
const loading = ref(false)
const createDialogVisible = ref(false)
const createFormRef = ref(null)

const createForm = reactive({
  name: '',
  redirectUri: '',
  description: ''
})

const createRules = {
  name: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  redirectUri: [{ required: true, message: '请输入回调地址', trigger: 'blur' }]
}

const loadClients = async () => {
  loading.value = true
  try {
    const res = await clientApi.getAll()
    clients.value = res.data.map(c => ({ ...c, showSecret: false }))
  } catch (err) {
    ElMessage.error('加载客户端列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  createForm.name = ''
  createForm.redirectUri = ''
  createForm.description = ''
  createDialogVisible.value = true
}

const createClient = async () => {
  if (!createFormRef.value) return
  try {
    const valid = await createFormRef.value.validate()
    if (valid) {
      const res = await clientApi.create(createForm)
      clients.value.unshift({ ...res.data, showSecret: true })
      createDialogVisible.value = false
      ElMessage.success('客户端创建成功')
    }
  } catch (err) {
    if (err !== false) {
      ElMessage.error('创建客户端失败')
      console.error(err)
    }
  }
}

const confirmDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除客户端「${row.name}」吗？删除后关联的授权记录也将被清除。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await clientApi.delete(row.id)
      clients.value = clients.value.filter(c => c.id !== row.id)
      ElMessage.success('删除成功')
    } catch (err) {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }).catch(() => {})
}

const copyToClipboard = (text, label) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(`${label} 已复制到剪贴板`)
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadClients()
})
</script>

<style scoped>
.clients-page {
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

.client-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.client-avatar {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 18px;
}

.name {
  font-weight: 500;
  color: #303133;
}

.desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.code-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #606266;
}

.masked {
  letter-spacing: 2px;
}

.link-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}
</style>
