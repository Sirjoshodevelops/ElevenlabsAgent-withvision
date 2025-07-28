// Embedded shader code
const fragmentCode = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uOffsets[7];
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform sampler2D uPerlinTexture;

in vec2 vUv;

out vec4 outColor;

const float PI = 3.14159265358979323846;

// Draw a single oval with soft edges and calculate its gradient color
bool drawOval(vec2 polarUv, vec2 polarCenter, float a, float b, bool reverseGradient, float softness, out vec4 color) {
    vec2 p = polarUv - polarCenter;
    float oval = (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b);
    
    float edge = smoothstep(1.0, 1.0 - softness, oval);
    
    if (edge > 0.0) {
        float gradient = reverseGradient ? (1.0 - (p.x / a + 1.0) / 2.0) : ((p.x / a + 1.0) / 2.0);
        color = vec4(vec3(gradient), 0.8 * edge);
        return true;
    }
    return false;
}

// Map grayscale value to a 4-color ramp (color1, color2, color3, color4)
vec3 colorRamp(float grayscale, vec3 color1, vec3 color2, vec3 color3, vec3 color4) {
    if (grayscale < 0.33) {
        return mix(color1, color2, grayscale * 3.0);
    } else if (grayscale < 0.66) {
        return mix(color2, color3, (grayscale - 0.33) * 3.0);
    } else {
        return mix(color3, color4, (grayscale - 0.66) * 3.0);
    }
}

vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// 2D noise for the ring
float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
    );

    return 0.5 + 0.5 * n;
}

float sharpRing(vec2 uv, float theta, float time) {
    float ringStart = 1.0;
    float ringWidth = 0.5;
    float noiseScale = 5.0;
    
    vec2 noiseCoord = vec2(theta / (2.0 * PI), time * 0.1);
    noiseCoord *= noiseScale;
    
    float noise = noise2D(noiseCoord);
    noise = (noise - 0.5) * 4.0;
    
    return ringStart + noise * ringWidth * 1.5;
}

float smoothRing(vec2 uv, float time) {
    float angle = atan(uv.y, uv.x);
    if (angle < 0.0) angle += 2.0 * PI;
    
    vec2 noiseCoord = vec2(angle / (2.0 * PI), time * 0.1);
    noiseCoord *= 6.0;
    
    float noise = noise2D(noiseCoord);
    noise = (noise - 0.5) * 8.0;
    
    float ringStart = 0.9;
    float ringWidth = 0.3;
    
    return ringStart + noise * ringWidth;
}

void main() {
    // Normalize vUv to be centered around (0.0, 0.0)
    vec2 uv = vUv * 2.0 - 1.0;

    // Convert uv to polar coordinates
    float radius = length(uv);
    float theta = atan(uv.y, uv.x);
    if (theta < 0.0) theta += 2.0 * PI; // Normalize theta to [0, 2*PI]

    // Initialize the base color to white
    vec4 color = vec4(1.0, 1.0, 1.0, 1.0);

    // Original parameters for the ovals in polar coordinates
    float originalCenters[7] = float[7](0.0, 0.5 * PI, 1.0 * PI, 1.5 * PI, 2.0 * PI, 2.5 * PI, 3.0 * PI);

    // Parameters for the animated centers in polar coordinates
    float centers[7];
    for (int i = 0; i < 7; i++) {
        centers[i] = originalCenters[i] + 0.5 * sin(uTime / 20.0 + uOffsets[i]);
    }

    float a, b;
    vec4 ovalColor;

    // Check if the pixel is inside any of the ovals
    for (int i = 0; i < 7; i++) {
        float noise = texture(uPerlinTexture, vec2(mod(centers[i] + uTime * 0.05, 1.0), 0.5)).r;
        a = noise * 1.5; // Increased variance: goes from 0.0 to 1.0
        b = noise * 4.5; // Tall semi-minor axis
        bool reverseGradient = (i % 2 == 1); // Reverse gradient for every second oval

        // Calculate the distance in polar coordinates
        float distTheta = abs(theta - centers[i]);
        if (distTheta > PI) distTheta = 2.0 * PI - distTheta; // Shortest distance on circle
        float distRadius = radius;

        float softness = 0.4; // Controls edge softness (e.g. how much blur is applied to the ovals)

        // Check if the pixel is inside the oval in polar coordinates
        if (drawOval(vec2(distTheta, distRadius), vec2(0.0, 0.0), a, b, reverseGradient, softness, ovalColor)) {
            // Blend the oval color with the existing color
            color.rgb = mix(color.rgb, ovalColor.rgb, ovalColor.a);
            color.a = max(color.a, ovalColor.a); // Max alpha
        }
    }
    
    // Calculate both noisy rings
    float ringRadius1 = sharpRing(uv, theta, uTime);
    float ringRadius2 = smoothRing(uv, uTime);
    
    // Blend both rings
    float ringAlpha1 = (radius >= ringRadius1) ? 0.3 : 0.0;
    float ringAlpha2 = smoothstep(ringRadius2 - 0.05, ringRadius2 + 0.05, radius) * 0.25;
    
    float totalRingAlpha = max(ringAlpha1, ringAlpha2);
    
    // Apply screen blend mode for combined rings
    vec3 ringColor = vec3(1.0); // White ring color
    color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - ringColor * totalRingAlpha);

    // Define colours to ramp against greyscale (could increase the amount of colours in the ramp)
    vec3 color1 = vec3(0.0, 0.0, 0.0); // Black
    vec3 color2 = uColor1; // Darker Color
    vec3 color3 = uColor2; // Lighter Color
    vec3 color4 = vec3(1.0, 1.0, 1.0); // White

    // Convert grayscale color to the color ramp
    float luminance = color.r; 
    color.rgb = colorRamp(luminance, color1, color2, color3, color4); // Apply the color ramp

    outColor = color;
}`;

const vertexCode = `#version 300 es
precision highp float;

in vec2 position;

out vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0, 1);
}`;

const POSITION_LOCATION = 0;
const QUAD_POSITIONS = new Float32Array([
  -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0,
]);
const PERLIN_NOISE =
  "https://storage.googleapis.com/eleven-public-cdn/images/perlin-noise.png";

export class Orb {
  private static noiseImage: HTMLImageElement;

  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private startTime: number;
  private targetSpeed = 0;
  private speed = 0.5;
  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private colorA: number[] = [0, 0, 0];
  private colorB: number[] = [0, 0, 0];
  private offsets = new Float32Array(7).map(() => Math.random() * Math.PI * 2);

  public constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      depth: false,

    const noise = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noise);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([128, 128, 128, 255])
    );
    if (!Orb.noiseImage) {
      Orb.noiseImage = new Image();
      Orb.noiseImage.crossOrigin = "anonymous";
      Orb.noiseImage.src = PERLIN_NOISE;
    }
    if (Orb.noiseImage.complete) {
      this.copyNoiseImage();
    } else {
      Orb.noiseImage.addEventListener("load", this.copyNoiseImage);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);
    gl.vertexAttribPointer(POSITION_LOCATION, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(POSITION_LOCATION);

    this.updateColors("#2792DC", "#9CE6E6");

    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      const size = entry.devicePixelContentBoxSize
        ? entry.devicePixelContentBoxSize[0]
        : entry.contentBoxSize[0];

      canvas.width = Math.min(512, size.inlineSize);
      canvas.height = Math.min(512, size.blockSize);
      this.updateViewport();
    });

    const parent = canvas.parentElement;
    if (parent) {
      try {
        this.resizeObserver.observe(parent, {
          box: "device-pixel-content-box",
        });
      console.error(this.gl.getProgramInfoLog(this.program));
    }

    this.startTime = performance.now();
    this.rafId = requestAnimationFrame(this.render);
  }

  public dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.resizeObserver?.disconnect();
    this.gl = null as unknown as WebGL2RenderingContext;
    this.program = null as unknown as WebGLProgram;
  }

  public updateViewport() {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  public updateColors(a: string, b: string) {
    if (!this.gl) return;

    this.colorA = this.updateColor("uColor1", a) ?? this.colorA;
    this.colorB = this.updateColor("uColor2", b) ?? this.colorB;
  }

  public updateVolume(input: number, output: number) {
    this.targetSpeed = 0.2 + (1 - Math.pow(output - 1, 2)) * 1.8;
    if (this.targetSpeed > this.speed) {
      this.speed = this.targetSpeed;
    }

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.program, "uInputVolume"),
      input
    );
    this.gl.uniform1f(
      this.gl.getUniformLocation(this.program, "uOutputVolume"),
      output
    );
  }

  private updateColor(name: string, hex: string) {
    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      // Convert sRGB to linear to match our Three.js implementation
      const color = [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
      this.gl.uniform3fv(this.gl.getUniformLocation(this.program, name), color);
      return color;
    } catch (e) {
      console.error(`[ConversationalAI] Failed to parse ${hex} as color:`, e);
    }
  }

  private setupProgram(fragmentCode: string, vertexCode: string) {
    const fragment = this.getShader(this.gl.FRAGMENT_SHADER, fragmentCode);
    const vertex = this.getShader(this.gl.VERTEX_SHADER, vertexCode);
    if (!fragment || !vertex) {
      throw new Error("Failed to compile shaders");
    }

    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, fragment);
    this.gl.attachShader(this.program, vertex);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(this.gl.getProgramInfoLog(this.program));
      throw new Error("Failed to link program");
    }

    this.gl.useProgram(this.program);
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.program, "uPerlinTexture"),
      0
    );
    this.gl.uniform1fv(
      this.gl.getUniformLocation(this.program, "uOffsets"),
      this.offsets
    );
    this.gl.uniform3fv(
      this.gl.getUniformLocation(this.program, "uColor1"),
      this.colorA
    );
    this.gl.uniform3fv(
      this.gl.getUniformLocation(this.program, "uColor2"),
      this.colorB
    );

    return this.program;
  }

  private getShader(type: GLenum, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  private copyNoiseImage = () => {
    if (!this.gl) {
      return;
    }

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      Orb.noiseImage
    );
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
  };

  public toDataURL = () => {
    return (this.gl.canvas as HTMLCanvasElement).toDataURL("image/png");
  };

  public render = () => {
    if (!this.gl) {
      this.rafId = null;
      return;
    }

    const time = (performance.now() - this.startTime) / 1000;
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "uTime"), time);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    this.rafId = requestAnimationFrame(this.render);
  };
}