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
    console.log('restore-result', store.restoreSource(), store.persistenceError, store.hasProgress)
    expect(store.restoreSource()).toBe(true)
    expect(store.hasProgress).toBe(true)
  })
})
