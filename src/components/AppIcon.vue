<script setup lang="ts">
defineProps<{ name: 'arrow' | 'compass' | 'sound' | 'close' | 'eye' | 'book' | 'check' | 'home' | 'expand' | 'reload' | 'map' | 'users' | 'archive' | 'lock' }>()
const paths = {
  arrow: 'M4 12h15m-6-6 6 6-6 6', compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2 6-6 2 2-6 6-2Z',
  sound: 'M4 9v6h4l5 4V5L8 9H4Zm12-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14', close: 'm6 6 12 12M6 18 18 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  book: 'M12 5v16M3 3l9 2 9-2v16l-9 2-9-2V3Z', check: 'm5 12 4 4L19 6', home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5', reload: 'M20 8a9 9 0 1 0 1 7M20 3v6h-6',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  archive: 'M3 6h18M5 6v15h14V6M4 3h16v3M9 11h6',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3M5 10h14v11H5V10Zm7 4v3',
}
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :data-icon="name"><path :d="paths[name]" /></svg></template>
