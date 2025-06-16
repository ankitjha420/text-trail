import * as THREE from 'three'
import vert from '../shaders/vert.glsl?raw'
import frag from '../shaders/frag.glsl?raw'
import frag1 from '../shaders/frag1.glsl?raw'

const device = {
    width: window.innerWidth,
    height: window.innerHeight,
}

export class Sketch1 {
    private renderer: THREE.WebGLRenderer
    private readonly scene: THREE.Scene
    private readonly camera: THREE.OrthographicCamera
    private geometry?: THREE.PlaneGeometry
    private material?: THREE.ShaderMaterial
    private mesh?: THREE.Mesh

    private clock: THREE.Clock

    private readonly fluidScene: THREE.Scene
    private readonly fluidQuad: THREE.Mesh
    private readonly fluidMaterial: THREE.ShaderMaterial
    private fluidRenderTarget1: THREE.WebGLRenderTarget
    private fluidRenderTarget2: THREE.WebGLRenderTarget

    private readonly persistColor: number[]
    private readonly targetPersistColor: number[]

    constructor(canvas: HTMLCanvasElement) {
        this.scene = new THREE.Scene()
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
        this.renderer.setSize(device.width, device.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        this.camera = new THREE.OrthographicCamera(
            device.width / -2, device.width / 2,
            device.height / 2, device.height / -2,
            -1000, 1000
        )
        this.camera.position.z = 1

        this.clock = new THREE.Clock()

        this.fluidScene = new THREE.Scene()
        this.fluidRenderTarget1 = new THREE.WebGLRenderTarget(device.width, device.height)
        this.fluidRenderTarget2 = this.fluidRenderTarget1.clone()

        this.fluidMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sampler: { value: null },
                time: { value: 0 },
                rgbPersistFactor: { value: 0.98 },
                alphaPersistFactor: { value: 0.97 },
                noiseFactor: { value: 1.0 },
                noiseScale: { value: 0.0032 },
            },
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
        })

        const fluidGeometry = new THREE.PlaneGeometry(device.width, device.height)
        this.fluidQuad = new THREE.Mesh(fluidGeometry, this.fluidMaterial)
        this.fluidScene.add(this.fluidQuad)

        const startColor = new THREE.Color('#362cb7').toArray()
        this.persistColor = [...startColor]
        this.targetPersistColor = [...startColor]

        setInterval(() => {
            this.targetPersistColor[0] = Math.random()
            this.targetPersistColor[1] = Math.random()
            this.targetPersistColor[2] = Math.random()
        }, 3000)


        this.addGeometry()
        this.render()

        window.addEventListener('resize', this.onResize.bind(this))
    }

    private addGeometry(): void {
        const planeSize = Math.max(device.width, device.height)
        this.geometry = new THREE.PlaneGeometry(planeSize, planeSize)

        const textCanvas = document.createElement('canvas')
        const context = textCanvas.getContext('2d')

        if (context) {
            const textureSize = 2048
            const fontSize = 260
            textCanvas.width = textureSize
            textCanvas.height = textureSize
            context.font = `bold ${fontSize}px Arial`
            context.fillStyle = 'white'
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.fillText('hehe', textCanvas.width / 2, textCanvas.height / 2)
        }

        const textTexture = new THREE.CanvasTexture(textCanvas)
        textTexture.needsUpdate = true

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                sampler: { value: textTexture },
                color: { value: new THREE.Vector3(...this.persistColor) }
            },
            vertexShader: vert,
            fragmentShader: frag1,
            transparent: true,
            side: THREE.DoubleSide
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)
    }

    private onResize(): void {
        device.width = window.innerWidth
        device.height = window.innerHeight

        this.renderer.setSize(device.width, device.height)
        this.camera.left = device.width / -2
        this.camera.right = device.width / 2
        this.camera.top = device.height / 2
        this.camera.bottom = device.height / -2
        this.camera.updateProjectionMatrix()

        this.fluidRenderTarget1.setSize(device.width, device.height)
        this.fluidRenderTarget2.setSize(device.width, device.height)

        this.fluidQuad.geometry = new THREE.PlaneGeometry(device.width, device.height)
    }

    private render(): void {
        const dt = this.clock.getDelta()

        this.persistColor[0] += (this.targetPersistColor[0] - this.persistColor[0]) * dt
        this.persistColor[1] += (this.targetPersistColor[1] - this.persistColor[1]) * dt
        this.persistColor[2] += (this.targetPersistColor[2] - this.persistColor[2]) * dt

        if (this.material) {
            this.material.uniforms.color.value.set(...this.persistColor)
        }

        this.fluidMaterial.uniforms.sampler.value = this.fluidRenderTarget2.texture
        this.fluidMaterial.uniforms.time.value = this.clock.getElapsedTime()

        this.renderer.setRenderTarget(this.fluidRenderTarget1)
        this.renderer.clearColor()
        this.renderer.render(this.fluidScene, this.camera)

        this.renderer.render(this.scene, this.camera)

        this.renderer.setRenderTarget(null)
        this.renderer.render(this.fluidScene, this.camera)
        this.renderer.render(this.scene, this.camera)

        const temp = this.fluidRenderTarget1
        this.fluidRenderTarget1 = this.fluidRenderTarget2
        this.fluidRenderTarget2 = temp

        requestAnimationFrame(this.render.bind(this))
    }
}
