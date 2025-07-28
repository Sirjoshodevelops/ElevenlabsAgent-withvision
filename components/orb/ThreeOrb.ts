import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

const vertexShader = `
uniform float u_time;

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

uniform float u_frequency;

void main() {
    float noise = 3.0 * pnoise(position + u_time, vec3(10.0));
    float displacement = (u_frequency / 30.) * (noise / 10.);
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
uniform float u_red;
uniform float u_blue;
uniform float u_green;
void main() {
    gl_FragColor = vec4(vec3(u_red, u_green, u_blue), 1.0);
}
`;

export interface OrbParams {
  red: number;
  green: number;
  blue: number;
  threshold: number;
  strength: number;
  radius: number;
}

export class ThreeOrb {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.Mesh;
  private bloomComposer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private uniforms: any;
  private clock: THREE.Clock;
  private rafId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private canvas: HTMLCanvasElement;
  private resizeObserver?: ResizeObserver;

  public params: OrbParams = {
    red: 1.0,
    green: 1.0,
    blue: 1.0,
    threshold: 0.5,
    strength: 0.5,
    radius: 0.8
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);

    // Initialize scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, -2, 14);
    this.camera.lookAt(0, 0, 0);

    // Setup post-processing
    const renderScene = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512));
    this.bloomPass.threshold = this.params.threshold;
    this.bloomPass.strength = this.params.strength;
    this.bloomPass.radius = this.params.radius;

    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.addPass(renderScene);
    this.bloomComposer.addPass(this.bloomPass);
    this.bloomComposer.addPass(new OutputPass());

    // Setup uniforms and material
    this.uniforms = {
      u_time: { type: 'f', value: 0.0 },
      u_frequency: { type: 'f', value: 0.0 },
      u_red: { type: 'f', value: 1.0 },
      u_green: { type: 'f', value: 1.0 },
      u_blue: { type: 'f', value: 1.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader
    });

    // Create geometry and mesh
    const geometry = new THREE.IcosahedronGeometry(4, 30);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.material.wireframe = true;
    this.scene.add(this.mesh);

    // Setup mouse tracking
    this.setupMouseTracking();
    
    // Setup resize observer
    this.setupResizeObserver();
    
    // Initial resize
    this.updateSize();
    
    // Start animation
    this.animate();
  }

  private setupMouseTracking() {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const windowHalfX = rect.width / 2;
      const windowHalfY = rect.height / 2;
      this.mouseX = (e.clientX - rect.left - windowHalfX) / 100;
      this.mouseY = (e.clientY - rect.top - windowHalfY) / 100;
    };

    this.canvas.addEventListener('mousemove', handleMouseMove);
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        this.updateSize();
      }
    });

    const parent = this.canvas.parentElement;
    if (parent) {
      this.resizeObserver.observe(parent);
    }
  }

  private updateSize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 512);
    
    this.canvas.width = size;
    this.canvas.height = size;
    
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(size, size);
    this.bloomComposer.setSize(size, size);
  }

  public updateColors(color1: string, color2: string) {
    try {
      const c1 = new THREE.Color(color1);
      const c2 = new THREE.Color(color2);
      
      // Blend the colors
      const blended = c1.clone().lerp(c2, 0.5);
      
      this.uniforms.u_red.value = blended.r;
      this.uniforms.u_green.value = blended.g;
      this.uniforms.u_blue.value = blended.b;
      
      this.params.red = blended.r;
      this.params.green = blended.g;
      this.params.blue = blended.b;
    } catch (error) {
      console.error('Failed to update colors:', error);
    }
  }

  public updateVolume(inputVolume: number, outputVolume: number) {
    // Use output volume to drive the frequency uniform
    // Scale it to a reasonable range for the shader
    const frequency = Math.max(0, outputVolume * 100);
    this.uniforms.u_frequency.value = frequency;
    
    // Also update bloom strength based on volume
    const volumeIntensity = Math.max(inputVolume, outputVolume);
    this.bloomPass.strength = this.params.strength + (volumeIntensity * 2);
  }

  public updateParams(newParams: Partial<OrbParams>) {
    Object.assign(this.params, newParams);
    
    if (newParams.red !== undefined) this.uniforms.u_red.value = newParams.red;
    if (newParams.green !== undefined) this.uniforms.u_green.value = newParams.green;
    if (newParams.blue !== undefined) this.uniforms.u_blue.value = newParams.blue;
    if (newParams.threshold !== undefined) this.bloomPass.threshold = newParams.threshold;
    if (newParams.strength !== undefined) this.bloomPass.strength = newParams.strength;
    if (newParams.radius !== undefined) this.bloomPass.radius = newParams.radius;
  }

  private animate = () => {
    if (!this.renderer) return;

    // Update camera position based on mouse
    this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.05;
    this.camera.position.y += (-this.mouseY - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.scene.position);

    // Update time uniform
    this.uniforms.u_time.value = this.clock.getElapsedTime();

    // Render
    this.bloomComposer.render();

    this.rafId = requestAnimationFrame(this.animate);
  };

  public dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.resizeObserver?.disconnect();
    
    // Dispose Three.js resources
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.bloomComposer.dispose();
  }
}