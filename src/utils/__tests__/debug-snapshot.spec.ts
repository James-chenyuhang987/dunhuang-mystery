import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { migrateSnapshot, isSnapshot } from '@/utils/utils'
import { GAME_STORAGE_KEY } from '@/stores/game'

describe('debug snapshot', () => {
  it('reports validity for a snapshot created by the current store', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const source = useGameStore()
    source.startGame()
    source.pauseTimer()

    const raw = localStorage.getItem(GAME_STORAGE_KEY)
    expect(raw).toBeTruthy()
    if (!raw) return
    const parsed = migrateSnapshot(JSON.parse(raw))
    console.log('snapshot-validity', isSnapshot(parsed), JSON.stringify(parsed).slice(0, 180))
    expect(isSnapshot(parsed)).toBe(true)

    setActivePinia(createPinia())
    const store = useGameStore()
    const restored = store.restoreSource()
    console.log('restore-result', restored, store.persistenceError, store.hasProgress)
    expect(restored).toBe(true)
    expect(store.hasProgress).toBe(true)
  })
})
