<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useTheme } from '../stores/theme.js'

const { dark } = useTheme()
const canvas = ref(null)
let ctx = null
let raf = 0
let width = 0
let height = 0
let particles = []
let bursts = []
let pointer = { x: -9999, y: -9999 }
let running = false

function themeColors() {
  const style = getComputedStyle(document.documentElement)
  const brand = style.getPropertyValue('--brand').trim() || '#176b5b'
  return { brand }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`
}

function spawnParticles(count) {
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    r: 0.8 + Math.random() * 1.6,
  }))
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = Math.round(width * dpr)
  canvas.value.height = Math.round(height * dpr)
  canvas.value.style.width = `${width}px`
  canvas.value.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const count = Math.min(90, Math.max(24, Math.floor(width * height / 22000)))
  spawnParticles(count)
  bursts = []
}

function clampSpeed(p, maxSpeed) {
  const speed = Math.hypot(p.vx, p.vy)
  if (speed > maxSpeed) {
    p.vx *= maxSpeed / speed
    p.vy *= maxSpeed / speed
  }
}

function pushParticles(x, y, radius, strength) {
  for (const p of particles) {
    const dx = p.x - x
    const dy = p.y - y
    const dist = Math.hypot(dx, dy)
    if (dist < radius && dist > 0.01) {
      const force = (1 - dist / radius) * strength
      p.vx += (dx / dist) * force
      p.vy += (dy / dist) * force
    }
  }
}

function drawFrame() {
  const brandRgb = hexToRgb(themeColors().brand)
  ctx.clearRect(0, 0, width, height)
  const linkDist = 130
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    const dx = p.x - pointer.x
    const dy = p.y - pointer.y
    const dist = Math.hypot(dx, dy)
    if (dist < 150 && dist > 0.01) {
      const force = (150 - dist) / 150
      p.x += (dx / dist) * force * 1.2
      p.y += (dy / dist) * force * 1.2
    }
    clampSpeed(p, 2.2)
    if (p.x < -20) p.x = width + 20
    if (p.x > width + 20) p.x = -20
    if (p.y < -20) p.y = height + 20
    if (p.y > height + 20) p.y = -20
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${brandRgb},0.5)`
    ctx.fill()
  }
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i]
      const b = particles[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d = Math.hypot(dx, dy)
      if (d < linkDist) {
        const alpha = (1 - d / linkDist) * (dark.value ? 0.14 : 0.2)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(${brandRgb},${alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }
  for (let i = bursts.length - 1; i >= 0; i -= 1) {
    const burst = bursts[i]
    burst.life += 0.035
    if (burst.life >= 1) {
      bursts.splice(i, 1)
      continue
    }
    const alpha = (1 - burst.life) * 0.4
    ctx.beginPath()
    ctx.arc(burst.x, burst.y, burst.life * 160, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${brandRgb},${alpha})`
    ctx.lineWidth = 1.5
    ctx.stroke()
    for (const spark of burst.sparks) {
      spark.x += spark.vx
      spark.y += spark.vy
      spark.vx *= 0.96
      spark.vy *= 0.96
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${brandRgb},${alpha * 0.9})`
      ctx.fill()
    }
  }
}

function loop() {
  drawFrame()
  raf = requestAnimationFrame(loop)
}

function onPointerMove(e) {
  pointer.x = e.clientX
  pointer.y = e.clientY
}

function onPointerDown(e) {
  if (prefersReduced()) return
  const x = e.clientX
  const y = e.clientY
  bursts.push({
    x,
    y,
    life: 0,
    sparks: Array.from({ length: 12 }, () => ({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 0.6,
      r: 0.7 + Math.random() * 1.3,
    })),
  })
  if (bursts.length > 6) bursts.shift()
  pushParticles(x, y, 180, 2.4)
}

function onVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(raf)
    running = false
  } else if (!running && !prefersReduced()) {
    raf = requestAnimationFrame(loop)
    running = true
  }
}

function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  if (prefersReduced()) {
    drawFrame()
  } else {
    raf = requestAnimationFrame(loop)
    running = true
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('visibilitychange', onVisibility)
})

watch(dark, () => {
  if (!running && !prefersReduced() && !document.hidden) {
    raf = requestAnimationFrame(loop)
    running = true
  }
})
</script>

<template>
  <canvas ref="canvas" class="particle-field" aria-hidden="true"></canvas>
</template>