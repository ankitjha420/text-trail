// imports ->
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import GUI from 'lil-gui'
import vert from '../shaders/vert.glsl?raw'
import frag from '../shaders/frag.glsl?raw'
import { settings } from './gui'
import gsap from 'gsap'
import {WebGLRenderTarget} from "three";

// constants ->
const device = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
}
const text = "hehe"

export class Sketch {
    canvas: HTMLCanvasElement
    scene: THREE.Scene
    camera: THREE.OrthographicCamera
    renderer: THREE.WebGLRenderer
    clock: THREE.Clock
    controls: OrbitControls
    gui: GUI
    time: number
    mesh?: THREE.Mesh
    material?: THREE.Material
    geometry?: THREE.BufferGeometry
    stats?: Stats
    ambientLight?: THREE.AmbientLight
    directionalLight?: THREE.DirectionalLight
    renderBufferA: WebGLRenderTarget
    renderBufferB: WebGLRenderTarget
    postFXScene: THREE.Scene
    postFXGeometry?: THREE.PlaneGeometry
    postFXMaterial?: THREE.ShaderMaterial
    postFXMesh?: THREE.Mesh

    constructor(canvas: HTMLCanvasElement) {
        this.time = 0

        this.canvas = canvas
        this.scene = new THREE.Scene()
        this.postFXScene = new THREE.Scene()
        this.camera = new THREE.OrthographicCamera(
            -1 * device.width / 2,
            device.width / 2,
            device.height / 2,
            -1 * device.height / 2,
            0.1,
            100
        )
        this.camera.position.set(0, 0, 1)
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))
        this.scene.add(this.camera)

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        })
        this.renderer.setSize(device.width, device.height)
        this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2))
        this.renderer.setClearColor(0x000000, 1)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.autoClear = false

        this.renderBufferA = new WebGLRenderTarget(
            device.width * device.pixelRatio,
            device.height * device.pixelRatio
        )
        this.renderBufferB = this.renderBufferA.clone()

        this.controls = new OrbitControls(this.camera, canvas)
        this.gui = new GUI({
            width: 340,
            title: 'Settings',
        })
        this.clock = new THREE.Clock()

        this.initStats()
        this.init()
    }

    addGeometry(): void {
        const planeSize = Math.max(device.width, device.height)
        this.geometry = new THREE.PlaneGeometry(planeSize, planeSize)
        const textCanvas = document.createElement('canvas')
        // const textCanvas = this.canvas
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
            context.fillText(text, textCanvas.width / 2, textCanvas.height / 2)
        }

        const textTexture = new THREE.CanvasTexture(textCanvas);
        textTexture.needsUpdate = true
        this.material = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            side: THREE.DoubleSide
        })
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)

        this.addFXScreen()
        this.addLights()
        this.addHelpers()
    }

    addFXScreen(): void {
        this.postFXGeometry = new THREE.PlaneGeometry(device.width, device.height)
        this.postFXMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sampler: {value: null},
                time: {value: 0},
                mousePos: {value: new THREE.Vector2(0, 0)}
            },
            vertexShader: vert,
            fragmentShader: frag
        })
        this.postFXMesh = new THREE.Mesh(this.postFXGeometry, this.postFXMaterial)
        this.postFXScene.add(this.postFXMesh)
    }

    render(): void {
        this.stats?.begin()
        this.time += 0.005

        this.renderer.setRenderTarget(this.renderBufferA)
        this.renderer.render(this.postFXScene, this.camera)
        this.renderer.render(this.scene, this.camera)
        this.renderer.setRenderTarget(null);

        (this.postFXMesh!.material as THREE.ShaderMaterial).uniforms.sampler.value = this.renderBufferA.texture
        this.renderer.render(this.postFXScene, this.camera)

        const temp = this.renderBufferA
        this.renderBufferA = this.renderBufferB
        this.renderBufferB = temp

        this.controls.update()
        this.stats?.end()
        requestAnimationFrame(this.render.bind(this))
    }

    onMouseMove(e: MouseEvent): void {
        const x = (e.pageX / innerWidth) * 2 - 1
        const y = (1 - e.pageY / innerHeight) * 2 - 1;
        (this.postFXMesh?.material as THREE.ShaderMaterial).uniforms.mousePos.value.set(x, y)
    }

    init(): void {
        this.addGeometry()
        this.resize()
        this.render()
        document.addEventListener('mousemove', this.onMouseMove.bind(this))
    }

    initStats(): void {
        this.stats = new Stats()
        this.stats.showPanel(0)
        this.stats.addPanel(new Stats.Panel('MB', '#f8f', '#212'))
        this.stats.dom.style.cssText = 'position:absolute;top:0;left:0;'
        document.body.appendChild(this.stats.dom)
    }

    addLights(): void {
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2)
        this.directionalLight.target = this.mesh!
        this.directionalLight.position.set(5, 5, 5)
        this.directionalLight.castShadow = true
        this.directionalLight.shadow.mapSize.width = 1024
        this.directionalLight.shadow.mapSize.height = 1024

        this.scene.add(this.directionalLight)

        this.ambientLight = new THREE.AmbientLight(
            new THREE.Color(1, 1, 1),
            0.5
        )
        this.scene.add(this.ambientLight)
    }

    resize(): void {
        window.addEventListener('resize', this.onResize.bind(this))
    }

    onResize(): void {
        device.width = window.innerWidth
        device.height = window.innerHeight

        // this.camera.aspect = device.width / device.height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(device.width, device.height)
    }

    addHelpers(): void {
        const geometrySettings = this.gui.addFolder('Geometry settings').close()
        const ambientLightSettings = this.gui.addFolder('Light settings').close()

        const eventsSettings = this.gui.addFolder('Trigger events')

        geometrySettings.add(this.mesh!.position, 'y')
            .name('y position')
            .min(-2)
            .max(2)
            .step(0.01)

        geometrySettings.add(this.mesh!, 'visible').name('visibility')

        settings.spin = () => {
            gsap.to(this.mesh!.rotation, {
                duration: 1,
                y: this.mesh!.rotation.y + Math.PI * 2,
            })
        }

        eventsSettings.add(settings, 'spin').name('spin')

        ambientLightSettings
            .addColor(settings, 'ambientLightColor')
            .name('ambient light color')
            .onChange(() => {
                this.ambientLight!.color.set(settings.ambientLightColor)
            })

        ambientLightSettings
            .add(this.ambientLight!, 'intensity')
            .name('ambient light intensity')
            .min(0)
            .max(10)
            .step(0.1)
    }
}
