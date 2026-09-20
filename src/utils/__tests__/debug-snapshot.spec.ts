import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { GAME_STORAGE_KEY } from '@/stores/game'
import { migrateSnapshot, isSnapshot } from '@/utils/utils'

describe('debug snapshot', () => {
  it('reports snapshot validity', () => {
    const raw = readFileSync('/tmp/dunhuang-snapshot.json', 'utf8')
    const parsed = migrateSnapshot(JSON.parse(raw))
    console.log('snapshot-validity', isSnapshot(parsed), JSON.stringify(parsed).slice(0, 180))
    expect(isSnapshot(parsed)).toBe(true)
    localStorage.clear()
    localStorage.setItem(GAME_STORAGE_KEY, raw)
    setActivePinia(createPinia())
    const store = useGameStore()
    const restored = store.restoreSource()
    console.log('restore-result', restored, store.persistenceError, store.hasProgress)
    if (restored) {
      expect(store.hasProgress).toBe(true)
      return
    }
    // A snapshot made before a built-in level update is valid data but must be
    // rejected and reset instead of silently applying answers to new questions.
    expect(store.persistenceError).toMatch(/题目配置已更新|故事版本已更新|旧进度未载入/)
    expect(store.hasProgress).toBe(false)
  })
})
