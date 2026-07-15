/**
 * 德塔（NDO）游戏入口
 */
import * as Phaser from 'phaser'
import { createGameConfig } from './config.js'
import * as events from './events.js'

let gameInstance = null

export function createGame(parent, token, nickname) {
  if (gameInstance) {
    destroyGame()
  }
  const config = createGameConfig(parent)
  gameInstance = new Phaser.Game(config)
  gameInstance.registry.set('token', token)
  gameInstance.registry.set('nickname', nickname)
  return gameInstance
}

export function destroyGame() {
  if (gameInstance) {
    console.log('[main] destroyGame: 正在销毁 Phaser 实例')
    gameInstance.destroy(true)
    gameInstance = null
  }
}

export function pauseGame() {
  if (!gameInstance) return
  const world = gameInstance.scene.getScene('WorldScene')
  if (world && world.scene.isActive()) world.scene.pause()
}

export function resumeGame() {
  if (!gameInstance) return
  const world = gameInstance.scene.getScene('WorldScene')
  if (world && world.scene.isPaused()) world.scene.resume()
}

/** 禁用 Phaser 键盘（聊天输入时） */
export function disableKeyboard() {
  const world = gameInstance?.scene.getScene('WorldScene')
  if (world && world.input.keyboard) {
    world.input.keyboard.enabled = false
  }
}

/** 启用 Phaser 键盘 */
export function enableKeyboard() {
  if (gameInstance) {
    gameInstance.registry.set('chatCooldown', Date.now())  // 冷却时间戳
  }
  const world = gameInstance?.scene.getScene('WorldScene')
  if (world && world.input.keyboard) {
    world.input.keyboard.enabled = true
  }
}

/** 检查是否在聊天关闭冷却期内 */
export function isChatCooldown() {
  if (!gameInstance) return false
  const cooldown = gameInstance.registry.get('chatCooldown') || 0
  return Date.now() - cooldown < 400
}

/** Vue → Phaser：发送聊天消息 */
export function sendChatMessage(nickname, text) {
  const world = gameInstance?.scene.getScene('WorldScene')
  if (world && world.showChatBubble) {
    world.showChatBubble(nickname, text)
  }
  if (world) {
    world.registry.set('chatOpen', false)
  }
}

/** Vue → Phaser：关闭聊天 */
export function closeChat() {
  const world = gameInstance?.scene.getScene('WorldScene')
  if (world) {
    world.registry.set('chatOpen', false)
  }
}
