import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { assetUrl } from '@/utils/assets'

const ultravioletShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) } },
  vertexShader:
    'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; varying vec2 vUv;
    float l(vec3 c){return dot(c,vec3(.2126,.7152,.0722));} float w(vec3 c){float d=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));return smoothstep(.72,.98,l(c))*(1.-smoothstep(.08,.32,d));} float a(vec3 c){float y=min(c.r,c.g)-c.b,b=max(c.r,c.g),q=abs(c.r-c.g);return smoothstep(.08,.34,y)*smoothstep(.18,.78,b)*(1.-smoothstep(.38,.72,q));}
    vec3 u(vec3 s){float v=l(s),d=max(s.r,max(s.g,s.b))-min(s.r,min(s.g,s.b));float x=mix(v,max(s.r,max(s.g,s.b)),clamp(d*.35,0.,.25));return mix(mix(vec3(.006,.012,.055),vec3(.075,.025,.26),smoothstep(.02,.48,x)),vec3(.22,.18,.62),smoothstep(.45,.92,x));}
    void main(){vec3 s=texture2D(tDiffuse,vUv).rgb;vec2 p=vec2(2.4)/resolution;float f=w(s),k=a(s),g=(w(texture2D(tDiffuse,vUv+vec2(p.x,0.)).rgb)+w(texture2D(tDiffuse,vUv-vec2(p.x,0.)).rgb)+w(texture2D(tDiffuse,vUv+vec2(0.,p.y)).rgb)+w(texture2D(tDiffuse,vUv-vec2(0.,p.y)).rgb))*.25,h=(a(texture2D(tDiffuse,vUv+vec2(p.x,0.)).rgb)+a(texture2D(tDiffuse,vUv-vec2(p.x,0.)).rgb)+a(texture2D(tDiffuse,vUv+vec2(0.,p.y)).rgb)+a(texture2D(tDiffuse,vUv-vec2(0.,p.y)).rgb)+a(texture2D(tDiffuse,vUv+p).rgb)+a(texture2D(tDiffuse,vUv-p).rgb))*.1667;vec3 c=u(s)+g*vec3(.10,.22,.62)+h*vec3(.54,.22,.025);c=mix(c,vec3(1.,.61,.10),k*.94);gl_FragColor=vec4(mix(c,vec3(.62,.96,1.),f),1.);}`,
}
type Hooks = {
  onInitialize?: () => void
  onRender?: (camera: THREE.PerspectiveCamera) => void
  onDispose?: () => void
}
export interface SceneManagerOptions {
  host: Ref<HTMLDivElement | null>
  getUrl: () => string
  getUltravioletUrl: () => string
  isUltraviolet: () => boolean
  onUltravioletError?: () => void
  hooks?: Hooks
}
export interface SceneManagerApi {
  status: Ref<'loading' | 'ready' | 'error'>
  hasTexture: Ref<boolean>
  renderedUltraviolet: Ref<boolean>
  fov: Ref<number>
  longitude: Ref<number>
  latitude: Ref<number>
  getRenderer: () => THREE.WebGLRenderer | undefined
  getCssRenderer: () => CSS2DRenderer | undefined
  getScene: () => THREE.Scene | undefined
  getCamera: () => THREE.PerspectiveCamera | undefined
  getSphere: () => THREE.Mesh | undefined
  getMaterial: () => THREE.MeshBasicMaterial | undefined
  getHotspotGroup: () => THREE.Group | undefined
  getComposer: () => EffectComposer | undefined
  getUvPass: () => ShaderPass | undefined
  render: () => void
  schedule: () => void
  resize: () => void
  loadTexture: () => void
  retry: () => void
  captureFrame?: (mimeType?: string, quality?: number) => string | null
  dispose: () => void
  rebuildHooks: (hooks: Hooks) => void
}

export function useSceneManager(options: SceneManagerOptions): SceneManagerApi {
  const status = ref<'loading' | 'ready' | 'error'>('loading'),
    hasTexture = ref(false),
    renderedUltraviolet = ref(false),
    fov = ref(70),
    longitude = ref(0),
    latitude = ref(0)
  let renderer: THREE.WebGLRenderer | undefined,
    cssRenderer: CSS2DRenderer | undefined,
    scene: THREE.Scene | undefined,
    camera: THREE.PerspectiveCamera | undefined,
    sphere: THREE.Mesh | undefined,
    material: THREE.MeshBasicMaterial | undefined,
    geometry: THREE.SphereGeometry | undefined,
    hotspotGroup: THREE.Group | undefined,
    composer: EffectComposer | undefined,
    ultravioletPass: ShaderPass | undefined,
    outputPass: OutputPass | undefined,
    observer: ResizeObserver | undefined
  let requestId = 0,
    loadId = 0,
    timeout: ReturnType<typeof setTimeout> | undefined,
    contextLost = false,
    hooks: Hooks = options.hooks ?? {}
  const radius = 10,
    pixelRatio = () => Math.min(window.devicePixelRatio || 1, 1.5)
  const schedule = () => {
    cancelAnimationFrame(requestId)
    requestId = requestAnimationFrame(render)
  }
  const render = () => {
    if (!renderer || !camera || !scene) return
    const p = THREE.MathUtils.degToRad(90 - latitude.value),
      t = THREE.MathUtils.degToRad(longitude.value)
    camera.lookAt(Math.sin(p) * Math.cos(t), Math.cos(p), Math.sin(p) * Math.sin(t))
    camera.fov = fov.value
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    if (composer && ultravioletPass?.enabled) composer.render()
    else renderer.render(scene, camera)
    cssRenderer?.render(scene, camera)
    hooks.onRender?.(camera)
  }
  const resize = () => {
    const h = options.host.value,
      w = h?.clientWidth ?? 0,
      ht = h?.clientHeight ?? 0
    if (!w || !ht || !renderer || !camera) return
    renderer.setSize(w, ht)
    cssRenderer?.setSize(w, ht)
    composer?.setSize(w, ht)
    ultravioletPass?.uniforms.resolution?.value.set(w * pixelRatio(), ht * pixelRatio())
    camera.aspect = w / ht
    schedule()
  }
  const onLost = (e: Event) => {
    e.preventDefault()
    contextLost = true
    ++loadId
    clearTimeout(timeout)
    status.value = 'error'
  }
  const initialize = () => {
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        // Keep the last rendered frame readable for the postcard/screenshot action.
        preserveDrawingBuffer: true,
      })
      renderer.setPixelRatio(pixelRatio())
      renderer.domElement.addEventListener('webglcontextlost', onLost)
      options.host.value?.append(renderer.domElement)
      cssRenderer = new CSS2DRenderer()
      cssRenderer.domElement.className = 'panorama-css2d'
      cssRenderer.domElement.style.pointerEvents = 'none'
      options.host.value?.append(cssRenderer.domElement)
      scene = new THREE.Scene()
      hotspotGroup = new THREE.Group()
      scene.add(hotspotGroup)
      camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100)
      composer = new EffectComposer(renderer)
      composer.setPixelRatio(pixelRatio())
      composer.addPass(new RenderPass(scene, camera))
      ultravioletPass = new ShaderPass(ultravioletShader)
      ultravioletPass.enabled = false
      composer.addPass(ultravioletPass)
      outputPass = new OutputPass()
      composer.addPass(outputPass)
      geometry = new THREE.SphereGeometry(radius, 64, 32)
      geometry.scale(-1, 1, 1)
      material = new THREE.MeshBasicMaterial({ color: '#b9a47c' })
      sphere = new THREE.Mesh(geometry, material)
      scene.add(sphere)
      observer = new ResizeObserver(resize)
      if (options.host.value) observer.observe(options.host.value)
      resize()
      hooks.onInitialize?.()
      loadTexture()
    } catch {
      status.value = 'error'
    }
  }
  const loadTexture = () => {
    const id = ++loadId,
      useUv = options.isUltraviolet() && Boolean(options.getUltravioletUrl()),
      source = assetUrl(useUv ? options.getUltravioletUrl() : options.getUrl())
    clearTimeout(timeout)
    status.value = 'loading'
    renderedUltraviolet.value = false
    if (ultravioletPass) ultravioletPass.enabled = false
    const fail = () => {
      if (id !== loadId) return
      ++loadId
      clearTimeout(timeout)
      renderedUltraviolet.value = false
      if (ultravioletPass) ultravioletPass.enabled = false
      status.value = 'error'
      if (useUv) options.onUltravioletError?.()
    }
    if (contextLost || !source || !material || !ultravioletPass) {
      fail()
      return
    }
    timeout = setTimeout(fail, 30000)
    new THREE.TextureLoader().load(
      source,
      (texture) => {
        if (id !== loadId || !material || !ultravioletPass) {
          texture.dispose()
          return
        }
        clearTimeout(timeout)
        texture.colorSpace = THREE.SRGBColorSpace
        material.map?.dispose()
        material.map = texture
        material.color.set('#fff')
        material.needsUpdate = true
        ultravioletPass.enabled = useUv
        renderedUltraviolet.value = useUv
        hasTexture.value = true
        status.value = 'ready'
        schedule()
      },
      undefined,
      fail,
    )
  }
  const dispose = () => {
    ++loadId
    clearTimeout(timeout)
    cancelAnimationFrame(requestId)
    hooks.onDispose?.()
    observer?.disconnect()
    renderer?.domElement.removeEventListener('webglcontextlost', onLost)
    material?.map?.dispose()
    material?.dispose()
    geometry?.dispose()
    ultravioletPass?.dispose()
    outputPass?.dispose()
    composer?.dispose()
    renderer?.dispose()
    if (!contextLost) renderer?.forceContextLoss()
    renderer?.domElement.remove()
    cssRenderer?.domElement.remove()
    renderer = undefined
    cssRenderer = undefined
    scene = undefined
    camera = undefined
    sphere = undefined
    material = undefined
    geometry = undefined
    hotspotGroup = undefined
    composer = undefined
    ultravioletPass = undefined
    outputPass = undefined
  }
  const retry = () => {
    if (!contextLost && renderer && material) {
      loadTexture()
      return
    }
    dispose()
    contextLost = false
    hasTexture.value = false
    status.value = 'loading'
    initialize()
  }
  const captureFrame = (mimeType = 'image/png', quality?: number): string | null => {
    const target = renderer?.domElement
    if (!target || !scene || !camera || !target.width || !target.height || !hasTexture.value)
      return null
    try {
      render()
      return target.toDataURL(mimeType, quality)
    } catch {
      // A remote texture without CORS taints the canvas; callers can keep the UI usable.
      return null
    }
  }
  const rebuildHooks = (next: Hooks) => {
    hooks = { ...hooks, ...next }
  }
  onMounted(initialize)
  onBeforeUnmount(dispose)
  return {
    status,
    hasTexture,
    renderedUltraviolet,
    fov,
    longitude,
    latitude,
    getRenderer: () => renderer,
    getCssRenderer: () => cssRenderer,
    getScene: () => scene,
    getCamera: () => camera,
    getSphere: () => sphere,
    getMaterial: () => material,
    getHotspotGroup: () => hotspotGroup,
    getComposer: () => composer,
    getUvPass: () => ultravioletPass,
    render,
    schedule,
    resize,
    loadTexture,
    retry,
    captureFrame,
    dispose,
    rebuildHooks,
  }
}
