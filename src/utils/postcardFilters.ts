export const STYLIZED_POSTCARD_FILTERS = ['anime', 'line-art', 'ink-wash'] as const

export type StylizedPostcardFilter = (typeof STYLIZED_POSTCARD_FILTERS)[number]
export type PostcardFilter = 'original' | StylizedPostcardFilter
export type PostcardFilterMode = PostcardFilter | 'random'

export interface PostcardPixelBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)))
const pixelOffset = (x: number, y: number, width: number): number => (y * width + x) * 4

function luminance(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const result = new Float32Array(width * height)
  for (let index = 0; index < result.length; index += 1) {
    const offset = index * 4
    result[index] =
      (data[offset] ?? 0) * 0.2126 +
      (data[offset + 1] ?? 0) * 0.7152 +
      (data[offset + 2] ?? 0) * 0.0722
  }
  return result
}

function boxBlur(values: Float32Array, width: number, height: number): Float32Array {
  const result = new Float32Array(values.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      let count = 0
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const sampleY = Math.max(0, Math.min(height - 1, y + offsetY))
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = Math.max(0, Math.min(width - 1, x + offsetX))
          sum += values[sampleY * width + sampleX] ?? 0
          count += 1
        }
      }
      result[y * width + x] = sum / count
    }
  }
  return result
}

function sobel(values: Float32Array, width: number, height: number): Float32Array {
  const result = new Float32Array(values.length)
  const sample = (x: number, y: number): number =>
    values[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))] ?? 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gx =
        -sample(x - 1, y - 1) +
        sample(x + 1, y - 1) -
        2 * sample(x - 1, y) +
        2 * sample(x + 1, y) -
        sample(x - 1, y + 1) +
        sample(x + 1, y + 1)
      const gy =
        -sample(x - 1, y - 1) -
        2 * sample(x, y - 1) -
        sample(x + 1, y - 1) +
        sample(x - 1, y + 1) +
        2 * sample(x, y + 1) +
        sample(x + 1, y + 1)
      result[y * width + x] = Math.hypot(gx, gy)
    }
  }
  return result
}

function edgePreservingSmooth(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length)
  const light = luminance(data, width, height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const centerIndex = y * width + x
      const centerLight = light[centerIndex] ?? 0
      const sums = [0, 0, 0]
      let totalWeight = 0
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const sampleY = Math.max(0, Math.min(height - 1, y + offsetY))
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = Math.max(0, Math.min(width - 1, x + offsetX))
          const sampleIndex = sampleY * width + sampleX
          const difference = Math.abs((light[sampleIndex] ?? 0) - centerLight)
          if (difference > 38) continue
          const weight = difference < 14 ? 2 : 1
          const offset = sampleIndex * 4
          sums[0] = (sums[0] ?? 0) + (data[offset] ?? 0) * weight
          sums[1] = (sums[1] ?? 0) + (data[offset + 1] ?? 0) * weight
          sums[2] = (sums[2] ?? 0) + (data[offset + 2] ?? 0) * weight
          totalWeight += weight
        }
      }
      const target = centerIndex * 4
      result[target] = clampByte((sums[0] ?? 0) / totalWeight)
      result[target + 1] = clampByte((sums[1] ?? 0) / totalWeight)
      result[target + 2] = clampByte((sums[2] ?? 0) / totalWeight)
      result[target + 3] = data[target + 3] ?? 255
    }
  }
  return result
}

function animeFilter(source: PostcardPixelBuffer): Uint8ClampedArray {
  const smoothed = edgePreservingSmooth(source.data, source.width, source.height)
  const edges = sobel(luminance(smoothed, source.width, source.height), source.width, source.height)
  const result = new Uint8ClampedArray(smoothed.length)
  const colorStep = 42
  for (let index = 0; index < source.width * source.height; index += 1) {
    const offset = index * 4
    const red = smoothed[offset] ?? 0
    const green = smoothed[offset + 1] ?? 0
    const blue = smoothed[offset + 2] ?? 0
    const average = (red + green + blue) / 3
    const outline = 1 - Math.min(0.52, Math.max(0, ((edges[index] ?? 0) - 38) / 260))
    result[offset] = clampByte(
      (Math.round((average + (red - average) * 1.22) / colorStep) * colorStep + 8) * outline,
    )
    result[offset + 1] = clampByte(
      (Math.round((average + (green - average) * 1.22) / colorStep) * colorStep + 8) * outline,
    )
    result[offset + 2] = clampByte(
      (Math.round((average + (blue - average) * 1.22) / colorStep) * colorStep + 8) * outline,
    )
    result[offset + 3] = source.data[offset + 3] ?? 255
  }
  return result
}

function lineArtFilter(source: PostcardPixelBuffer): Uint8ClampedArray {
  const light = luminance(source.data, source.width, source.height)
  const blurred = boxBlur(boxBlur(light, source.width, source.height), source.width, source.height)
  const edges = sobel(blurred, source.width, source.height)
  const result = new Uint8ClampedArray(source.data.length)
  for (let index = 0; index < source.width * source.height; index += 1) {
    const offset = index * 4
    const ink = Math.min(238, Math.max(0, ((edges[index] ?? 0) - 14) * 2.45))
    const faintShade = (255 - (blurred[index] ?? 255)) * 0.07
    const paper = clampByte(250 - ink - faintShade)
    result[offset] = clampByte(paper + 4)
    result[offset + 1] = clampByte(paper + 2)
    result[offset + 2] = paper
    result[offset + 3] = source.data[offset + 3] ?? 255
  }
  return result
}

function inkWashFilter(source: PostcardPixelBuffer): Uint8ClampedArray {
  const light = luminance(source.data, source.width, source.height)
  const blurred = boxBlur(light, source.width, source.height)
  const edges = sobel(blurred, source.width, source.height)
  const result = new Uint8ClampedArray(source.data.length)
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = y * source.width + x
      const offset = pixelOffset(x, y, source.width)
      const washLevel = Math.round((blurred[index] ?? 0) / 51) * 51
      const grain = (((x * 17 + y * 29 + ((x * y) % 31)) % 23) - 11) * 0.38
      const wash = washLevel - Math.min(115, (edges[index] ?? 0) * 0.58) + grain
      result[offset] = clampByte(wash * 1.03 + 7)
      result[offset + 1] = clampByte(wash * 0.98 + 5)
      result[offset + 2] = clampByte(wash * 0.89 + 2)
      result[offset + 3] = source.data[offset + 3] ?? 255
    }
  }
  return result
}

export function randomPostcardFilter(random: () => number = Math.random): StylizedPostcardFilter {
  const value = random()
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0
  return STYLIZED_POSTCARD_FILTERS[Math.floor(normalized * STYLIZED_POSTCARD_FILTERS.length)]!
}

export function applyPostcardFilterPixels(
  source: PostcardPixelBuffer,
  filter: PostcardFilter,
): PostcardPixelBuffer {
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    source.width <= 0 ||
    source.height <= 0 ||
    source.data.length !== source.width * source.height * 4
  )
    throw new RangeError('Invalid postcard pixel buffer')

  const data =
    filter === 'original'
      ? new Uint8ClampedArray(source.data)
      : filter === 'anime'
        ? animeFilter(source)
        : filter === 'line-art'
          ? lineArtFilter(source)
          : inkWashFilter(source)
  return { data, width: source.width, height: source.height }
}
