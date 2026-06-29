import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getHello } from '../api/hello'

export const useHelloStore = defineStore('hello', () => {
  const message = ref('加载中...')
  const loading = ref(false)

  async function fetchHello() {
    loading.value = true
    try {
      const data = await getHello()
      message.value = data.message
    } catch (e) {
      message.value = '后端未启动或请求失败'
    } finally {
      loading.value = false
    }
  }

  return { message, loading, fetchHello }
})
