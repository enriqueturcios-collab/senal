'use client'

import { useEffect, useRef } from 'react'

// ─── Vertex shader ─────────────────────────────────────────────────────────────
const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// ─── Fragment shader ───────────────────────────────────────────────────────────
const FRAG = `
  precision highp float;
  uniform float u_time;
  uniform vec2  u_res;

  // Value noise primitives
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 17.5);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),              hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // Fractal Brownian Motion — rotated each octave to break axis alignment
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2  m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) {
      v += a * vnoise(p);
      p  = m * p + vec2(5.2, 1.3);
      a *= 0.5;
    }
    return v;
  }

  // 4-stop colour ramp (t in [0,1])
  vec3 ramp(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3) {
    float s = clamp(t, 0.0, 1.0) * 3.0;
    vec3 c  = mix(c0, c1, clamp(s,       0.0, 1.0));
         c  = mix(c,  c2, clamp(s - 1.0, 0.0, 1.0));
         c  = mix(c,  c3, clamp(s - 2.0, 0.0, 1.0));
    return c;
  }

  // ─── Elemental palettes ──────────────────────────────────────────────────────

  // Lava / Magma — near-black crust → deep red → molten orange
  vec3 pal_lava(float t) {
    return ramp(t,
      vec3(0.03, 0.00, 0.00),
      vec3(0.52, 0.04, 0.00),
      vec3(0.90, 0.22, 0.01),
      vec3(1.00, 0.62, 0.08)
    );
  }

  // Agua / Océano — midnight blue → deep blue → cerulean → teal
  vec3 pal_agua(float t) {
    return ramp(t,
      vec3(0.00, 0.04, 0.18),
      vec3(0.00, 0.22, 0.55),
      vec3(0.00, 0.55, 0.78),
      vec3(0.08, 0.85, 0.82)
    );
  }

  // Hojas / Bosque — near-black → dark forest → deep green → lime
  vec3 pal_hojas(float t) {
    return ramp(t,
      vec3(0.01, 0.06, 0.01),
      vec3(0.05, 0.27, 0.05),
      vec3(0.16, 0.52, 0.08),
      vec3(0.52, 0.80, 0.10)
    );
  }

  // Crepúsculo / Dusk — deep violet → magenta → crimson → gold
  vec3 pal_dusk(float t) {
    return ramp(t,
      vec3(0.06, 0.00, 0.14),
      vec3(0.40, 0.05, 0.32),
      vec3(0.85, 0.18, 0.24),
      vec3(1.00, 0.65, 0.12)
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    // Aspect-correct centred coordinates
    vec2 p  = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0) * 3.2;

    float t = u_time * 0.055;

    // ── Double domain warp (gives the organic, lava-lamp quality) ────────────
    vec2 q = vec2(
      fbm(p + t * 0.70),
      fbm(p + vec2(1.3, 4.8) + t * 0.55)
    );
    vec2 r = vec2(
      fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.40),
      fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.35)
    );
    float f = clamp(fbm(p + 4.0 * r + t * 0.20), 0.0, 1.0);

    // ── Smooth palette cycling (≈ 33 s per theme, ~2 min full cycle) ────────
    float cycle = mod(u_time * 0.030, 4.0);
    float ph    = smoothstep(0.20, 0.80, fract(cycle));

    vec3 colA, colB;
    if      (cycle < 1.0) { colA = pal_lava(f);  colB = pal_agua(f);  }
    else if (cycle < 2.0) { colA = pal_agua(f);  colB = pal_hojas(f); }
    else if (cycle < 3.0) { colA = pal_hojas(f); colB = pal_dusk(f);  }
    else                  { colA = pal_dusk(f);   colB = pal_lava(f);  }

    vec3 col = mix(colA, colB, ph);

    // ── Radial vignette for depth ─────────────────────────────────────────────
    float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.35;
    col *= clamp(vig, 0.0, 1.0);

    // ── Gamma lift (keeps darks from crushing) ───────────────────────────────
    col = pow(max(col, 0.0), vec3(0.88));

    gl_FragColor = vec4(col, 1.0);
  }
`

// ─── React component ───────────────────────────────────────────────────────────

interface Props {
  className?: string
  style?: React.CSSProperties
}

export function ElementalGradient({ className, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return

    function compile(type: number, src: string): WebGLShader {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error('[ElementalGradient] shader error:', gl!.getShaderInfoLog(s))
      }
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[ElementalGradient] link error:', gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    // Full-screen triangle — 3 vertices covering all of clip space
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1,  3, -1,  -1, 3]),
      gl.STATIC_DRAW,
    )
    const posLoc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes  = gl.getUniformLocation(prog, 'u_res')

    function resize() {
      const w   = canvas!.clientWidth
      const h   = canvas!.clientHeight
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      canvas!.width  = Math.round(w * dpr)
      canvas!.height = Math.round(h * dpr)
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let rafId: number
    const t0 = performance.now()

    function frame() {
      const elapsed = (performance.now() - t0) * 0.001
      gl!.uniform1f(uTime, elapsed)
      gl!.uniform2f(uRes, canvas!.width, canvas!.height)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  )
}
